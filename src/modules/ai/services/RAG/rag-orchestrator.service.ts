// import { Injectable, Logger } from '@nestjs/common';
// import { PrismaService } from '../../../../prisma.service';
// import {
//   OuterApiProvider,
//   OuterApiService,
// } from '../outer-api/outer-api.service';
// import {
//   RagCapabilityExecution,
//   RagPlannerService,
// } from './rag-planner.service';
// import {
//   RAG_CAPABILITY_ENTRIES,
// } from './capability-entries';

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { OuterApiProvider, OuterApiService } from "../outer-api/outer-api.service";
import { RagPlannerService } from "./rag-planner.service";
import { AiRequestDto } from "../../dtos/ai-request.dto";
import { JwtPayload } from "src/modules/users/jwt.strategy";
import { RagPlanExecuterService } from "./rag-plan-executer.service";


export type RagOrchestratorRequest = {
  aiRequest: AiRequestDto;
  user: JwtPayload;
}

@Injectable()
export class RagOrchestratorService{
  private readonly logger = new Logger(RagOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outerApiService: OuterApiService,
    private readonly ragPlannerService: RagPlannerService,
    private readonly planExecuterService: RagPlanExecuterService,
  ) {}

  async chat(params: RagOrchestratorRequest) {
    //Step 1: planning phase
    // const a : plannerInputDTO;
    const actionPlanList = await this.ragPlannerService.selectCapabilitiesFromPrompt({
      prompt: params.aiRequest.text,
      userRole: params.user.role,
      metadata: params.aiRequest.metadata,
      provider: params.aiRequest.provider! as OuterApiProvider,
    });


    //Step 2: context retrieval phase
    //     contextualData: {
    //     capabilityId: string;
    //     result: any;
    // }[]
    const contextualData = await this.planExecuterService.execute(actionPlanList);

    //Step 3: prompt composition phase
    // const contextString = JSON.stringify(contextualData, null, 2); //không dùng json stringify, format bên execute luôn
    const systemPrompt = [
      'You are given retrieved internal context data from system capabilities.',
      'Use this context as the primary source of truth when answering.',
      'If context is missing for some part, state that explicitly.',
      '',
      '--- RAG CONTEXT START ---',
      contextualData.map((ctx) => `${ctx.result}`).join('\n'),
      '--- RAG CONTEXT END ---',
      '',
    ].join('\n');

    //step 4: Actual LLM call with context retrived
    const llmResponse = await this.outerApiService.chat({
      prompt: params.aiRequest.text,
      caller: 'rag-orchestrator',
      provider: params.aiRequest.provider as OuterApiProvider,

      instructionPrompt: systemPrompt,

      temperature: 0.7,
    });

    //step 5: response assembly and return
    return {
      userPrompt: params.aiRequest.text,
      response: llmResponse.text,
      provider: llmResponse.provider,
      systemPrompt: llmResponse.systemPrompt,
      capabilityPlan: actionPlanList,
      contextualData,
      customSystemPrompt: systemPrompt,

    };
  }

}
