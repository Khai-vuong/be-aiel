import { Injectable } from '@nestjs/common';
import { ContextBuilderService } from '../../orchestrator/context-builder.service';
import {
  OuterApiProvider,
  OuterApiService,
  OuterApiRequest,
} from '../outer-api/outer-api.service';

import {parseJsonStrings} from 'src/common/utils/parseJSON';
import { RAG_CAPABILITY_ENTRIES } from './capability-entries';

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
  ) {}

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

      const plannerSystemPrompt = this.contextBuilderService.buildSystemPrompt({
        role: params.userRole,
        caller: 'RAG-admin',
        customSystemPrompt:
          'You are a capability planner for a RAG pipeline. ' +
          'Return ONLY valid JSON with shape [{id, parameters}]. ' +
          'with parameters as a JSON object. ' +
          'Select only from provided capability catalog.\n' +
          commandCatalog,
        onlyUseSystemPrompt: true,
      });

      const outerAPIRequest: OuterApiRequest = {
        prompt: params.prompt,
        role: params.userRole,
        provider: params.provider ?? 'groq',
        temperature: 0.3,
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