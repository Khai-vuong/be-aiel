// import { Injectable } from '@nestjs/common';
// import { ContextBuilderService } from '../../orchestrator/context-builder.service';
// import {
//   OuterApiProvider,
//   OuterApiService,
//   OuterApiRequest,
// } from '../outer-api/outer-api.service';

// import {parseJsonStrings} from 'src/common/utils/parseJSON';
// import { RAG_CAPABILITY_ENTRIES } from './capability-entries';
// import { RagPlanExecuterService } from './rag-plan-executer.service';

// export type ExecutionAction = {
//   capabilityId: string;
//   resolvedParameters?: any;
// };

// export type PlannerResponse = {
//   actions: ExecutionAction[];
//   doneReasoning: boolean;
// }

// export type plannerInputDTO = {
//   prompt: string;
//   userRole: string;
//   metadata?: any;
//   provider?: OuterApiProvider;
//   accumulateEvidence?: string;
// }

// @Injectable()
// export class RagPlannerService {
//   constructor(
//     private readonly contextBuilderService: ContextBuilderService,
//     private readonly outerAPIService: OuterApiService,
//     private readonly planExecuterService: RagPlanExecuterService,
//   ) {}

//   async buildMetadataDescription(metadata: any): Promise<string> {
//     if (!metadata || typeof metadata !== 'object') {
//       return '';
//     }

//     const entries = Object.entries(metadata).filter(
//       ([, value]) => value !== undefined && value !== null && String(value).trim() !== '',
//     );

//     if (entries.length === 0) {
//       return '';
//     }

//     const description = entries
//       .map(([key, value]) => `${key}:${String(value)}`)
//       .join(', ');

//     const hasClassId = Object.prototype.hasOwnProperty.call(metadata, 'classId')
//       && String((metadata as { classId?: unknown }).classId ?? '').trim() !== '';

//     const resolutionHints = hasClassId
//       ? [
//           `Here are the resolved names to ids of objects relate to classId=${metadata.classId}`,
//         ].join(' ')
//       : '';

//     const classId = String((metadata as { classId?: unknown }).classId ?? '').trim();
//     let quizMappingContext = '';

//     if (classId) {
//       try {
//         const [quizEntry] = await this.planExecuterService.execute([
//           {
//             capabilityId: 'class-quizzes',
//             resolvedParameters: { classId },
//           },
//         ]);

//         if (quizEntry?.result) {
//           quizMappingContext = [
//             `Quiz mapping for class ${classId}:`,
//             String(quizEntry.result),
//           ].join('\n');
//         }
//       } catch (error) {
//         const message = error instanceof Error ? error.message : String(error);
//         quizMappingContext = `Quiz mapping for class ${classId}: unavailable (${message})`;
//       }
//     }

//     return [
//       `Current context: ${description}`,
//       resolutionHints,
//       quizMappingContext,
//     ]
//       .filter((item) => item.trim().length > 0)
//       .join('\n');
//   }

//   buildCommandCatalog(role: string = 'Admin'): string {
//     const catalog = RAG_CAPABILITY_ENTRIES
//       .filter((entry) => entry.allowedRoles.includes(role))
//       .map((entry) =>
//         JSON.stringify({
//           id: entry.id,
//           description: entry.description,
//           parameters: entry.parameters,
//         }),
//       )
//       .join(', ');

//     return `[${catalog}]`;
//   }

//   async selectActionsFromPrompt(
//     params: plannerInputDTO,
//   ): Promise<PlannerResponse> {
//     try {
//       const commandCatalog = this.buildCommandCatalog(params.userRole);
//       const metadataDescription = await this.buildMetadataDescription(params.metadata);

//       const plannerPrompt = 
//       `current context: ${metadataDescription}\n` + 
//       `Accumulate evidence from the ReAct loops: ${params.accumulateEvidence ?? 'none'}\n` +
//       `User request: ${params.prompt}\n`;


//       const instructionPrompt = 
//           'You are a planner for a RAG pipeline. ' +
//           'Your task is to determine if the evidence provided is sufficient to answer the user question. ' +
//           'If yes, return the string "true". ' +
//           'If not, return ONLY one valid JSON object with shape {capabilityId, parameters}. ' +
//           'parameters must be a JSON object. ' +
//           'DO NOT answer the user question. ' +
//           'Select only from provided action catalog below.\n' +
//           commandCatalog;

//       const outerAPIRequest: OuterApiRequest = {
//         prompt: plannerPrompt,
//         provider: params.provider ?? 'groq',
//         caller: 'rag-planner',
//         temperature: 0.1,
//         instructionPrompt: instructionPrompt,
//       };

//       const response = await this.outerAPIService.chat(outerAPIRequest);
//       const parsedResponse = parseJsonStrings(response.text);

//       // Check if response indicates reasoning is complete (true)
//       if (response.text === "true" || parsedResponse === true || parsedResponse === 'true') {
//         return { actions: [], doneReasoning: true };
//       }

//       // Handle array responses - take first element
//       const normalizedItem = Array.isArray(parsedResponse)
//         ? parsedResponse[0]
//         : parsedResponse;

//       if (!normalizedItem || typeof normalizedItem !== 'object') {
//         return { actions: [], doneReasoning: false };
//       }

//       const candidate = normalizedItem as {
//         id?: unknown;
//         capabilityId?: unknown;
//         parameters?: unknown;
//         resolvedParameters?: unknown;
//       };

//       const capabilityId =
//         typeof candidate.capabilityId === 'string'
//           ? candidate.capabilityId
//           : typeof candidate.id === 'string'
//             ? candidate.id
//             : '';

//       if (!capabilityId) {
//         return { actions: [], doneReasoning: false };
//       }

//       return {
//         actions: [
//           {
//             capabilityId,
//             resolvedParameters:
//               candidate.resolvedParameters ?? candidate.parameters ?? {},
//           },
//         ],
//         doneReasoning: false,
//       };
//     } catch (error) {
//       console.error('Error selecting capabilities from prompt:', error);
//       throw error;
//     }
//   }
// }
