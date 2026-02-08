import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
export function SwaggerAiChat() {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'AI multi-agent chat entrypoint',
      description:
        'Receive a user message, run intent classification, and route the request to the right internal agent. Requires a valid JWT and role-based access.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['text'],
        properties: {
          text: {
            type: 'string',
            description: 'User prompt to process',
            example: 'Please analyze the recent quiz scores for class L01',
          },
          serviceType: {
            type: 'string',
            enum: ['SYSTEM_CONTROL', 'STUDY_ANALYST', 'TUTOR', 'TEACHING_ASSISTANT'],
            description: 'Optional hint to bias the orchestrator toward a specific service pipeline',
          },
          conversationId: {
            type: 'string',
            description: 'Optional conversation identifier to continue a previous session',
          },
          context: {
            type: 'object',
            description: 'Arbitrary metadata or pre-built context to pass downstream',
          },
        },
      },
      description:
        'Minimum payload requires the text field; other properties are optional cues for the orchestrator.',
    }),
    ApiResponse({
      status: 200,
      description: 'Intent classification result and routing decision',
      schema: {
        type: 'object',
        properties: {
          text: { type: 'string', example: 'Please analyze the recent quiz scores for class L01' },
          role: { type: 'string', example: 'ADMIN' },
          decisions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string', example: 'data_analysis' },
                score: { type: 'number', format: 'float', example: 0.82 },
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid payload' }),
    ApiResponse({ status: 401, description: 'Missing or invalid JWT' }),
    ApiResponse({ status: 500, description: 'Internal server error' }),
  );
}
