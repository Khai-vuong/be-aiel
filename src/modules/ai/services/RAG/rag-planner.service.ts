import { Injectable } from '@nestjs/common';
import { ContextBuilderService } from '../../orchestrator/context-builder.service';
import {
  OuterApiProvider,
  OuterApiService,
  OuterApiRequest,
} from '../outer-api/outer-api.service';

import {parseJsonStrings} from 'src/common/utils/parseJSON';
import { RAG_CAPABILITY_ENTRIES } from './capability-entries';
import { RagPlanExecuterService } from './rag-plan-executer.service';

export type RagCapabilityExecution = {
  capabilityId: string;
  resolvedParameters?: any;
};


//For frontend context
export type RagMetadata = {
  classId?: string;
  courseId?: string;
};

export type plannerInputDTO = {
  prompt: string;
  userRole: string;
  metadata?: any;
  provider?: OuterApiProvider;
}

@Injectable()
export class RagPlannerService {
  constructor(
    private readonly contextBuilderService: ContextBuilderService,
    private readonly outerAPIService: OuterApiService,
    private readonly planExecuterService: RagPlanExecuterService,
  ) {}

  async buildMetadataDescription(metadata: any): Promise<string> {
    if (!metadata || typeof metadata !== 'object') {
      return '';
    }

    const entries = Object.entries(metadata).filter(
      ([, value]) => value !== undefined && value !== null && String(value).trim() !== '',
    );

    if (entries.length === 0) {
      return '';
    }

    const description = entries
      .map(([key, value]) => `${key} ${String(value)}`)
      .join(', ');

    const hasClassId = Object.prototype.hasOwnProperty.call(metadata, 'classId')
      && String((metadata as { classId?: unknown }).classId ?? '').trim() !== '';

    const resolutionHints = hasClassId
      ? [
          'When a classId is available in metadata and the user mentions a quiz name or file name instead of an ID, resolve it from the current class first.',
          'Do not guess IDs from names; prefer lookup steps when the user provides human-readable names.',
        ].join(' ')
      : '';

    const classId = String((metadata as { classId?: unknown }).classId ?? '').trim();
    let quizMappingContext = '';

    if (classId) {
      try {
        const [quizEntry] = await this.planExecuterService.execute([
          {
            capabilityId: 'class-quizzes',
            resolvedParameters: { classId },
          },
        ]);

        if (quizEntry?.result) {
          quizMappingContext = [
            `Quiz mapping for class ${classId}:`,
            String(quizEntry.result),
          ].join('\n');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        quizMappingContext = `Quiz mapping for class ${classId}: unavailable (${message})`;
      }
    }

    return [
      `Current context: ${description}`,
      resolutionHints,
      quizMappingContext,
    ]
      .filter((item) => item.trim().length > 0)
      .join('\n');
  }

  buildCommandCatalog(role: string = 'Admin'): string {
    const catalog = RAG_CAPABILITY_ENTRIES
      .filter((entry) => entry.allowedRoles.includes(role))
      .map((entry) =>
        JSON.stringify({
          id: entry.id,
          description: entry.description,
          parameters: entry.parameters,
        }),
      )
      .join(', ');

    return `[${catalog}]`;
  }

  async selectCapabilitiesFromPrompt(
    params: plannerInputDTO,
  ): Promise<RagCapabilityExecution[]> {
    try {
      const commandCatalog = this.buildCommandCatalog(params.userRole);
      const metadataDescription = await this.buildMetadataDescription(params.metadata);
      const plannerPrompt = params.prompt;
      const plannerSystemPrompt = this.contextBuilderService.buildSystemPrompt({
        role: params.userRole,
        caller: 'RAG-admin',
        customSystemPrompt:
          metadataDescription + '\n' +
          'You are a capability planner for a RAG pipeline. ' +
          'Return ONLY valid JSON with shape [{id, parameters}]. ' +
          'with parameters as a JSON object. ' +
          'Select only from provided capability catalog.\n' +
          '\n=== CRITICAL INSTRUCTIONS FOR QUIZ NAME RESOLUTION ===\n' +
          '1. If user mentions a QUIZ NAME (human-readable text like "variable and data types", "Introduction to Programming"), ' +
          'you MUST plan a class-quizzes step FIRST to get the quiz ID list.\n' +
          '2. After retrieving quizzes, use the quiz ID (not the name) in class-overview, analyze-quiz-performance, or knowledge-gap.\n' +
          '3. Correct multi-step sequence when quiz name detected:\n' +
          '   [{id: "class-quizzes", parameters: {classId: "class001"}},\n' +
          '    {id: "class-overview", parameters: {classId: "class001", quizId: "quiz123"}}]\n' +
          '4. If quizId parameter looks like a real ID (not text), use it directly.\n' +
          '5. DO NOT answer the user question, return a strict json array of capability calls ONLY',
        onlyUseSystemPrompt: true,
      });

      const outerAPIRequest: OuterApiRequest = {
        prompt: plannerPrompt,
        role: params.userRole,
        provider: params.provider ?? 'groq',
        temperature: 0.1,
        customSystemPrompt: plannerSystemPrompt,
        onlyUseSystemPrompt: true,
      };

      const response = await this.outerAPIService.chat(outerAPIRequest);
      const parsedResponse = parseJsonStrings(response.text);

      if (!Array.isArray(parsedResponse)) {
        return [];
      }

      const normalized = parsedResponse
        .map((item): RagCapabilityExecution | null => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const candidate = item as {
            id?: unknown;
            capabilityId?: unknown;
            parameters?: unknown;
            resolvedParameters?: unknown;
          };

          const capabilityId =
            typeof candidate.capabilityId === 'string'
              ? candidate.capabilityId
              : typeof candidate.id === 'string'
                ? candidate.id
                : '';

          if (!capabilityId) {
            return null;
          }

          return {
            capabilityId,
            resolvedParameters:
              candidate.resolvedParameters ?? candidate.parameters ?? {},
          };
        })
        .filter((item): item is RagCapabilityExecution => item !== null);

      return normalized;
    } catch (error) {
      console.error('Error selecting capabilities from prompt:', error);
      throw error;
    }
  }
}
