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
  metadata?: RagMetadata;
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
      const parsedResponse = parseJsonStrings(response.text) as RagCapabilityExecution[];
      return Array.isArray(parsedResponse) ? parsedResponse : [];
    } catch (error) {
      console.error('Error selecting capabilities from prompt:', error);
      throw error;
    }
  }
}