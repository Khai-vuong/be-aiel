import { Injectable } from '@nestjs/common';
import { ContextBuilderService } from 'src/modules/ai/orchestrator/context-builder.service';
import {
	OuterApiProvider,
	OuterApiRequest,
	OuterApiService,
} from 'src/modules/ai/services/outer-api/outer-api.service';
import { parseJsonStrings } from 'src/common/utils/parseJSON';
import { RAG_CAPABILITY_ENTRIES } from 'src/modules/ai/services/RAG/capability-entries';
import { RagPlanExecuterService } from 'src/modules/ai/services/RAG/rag-plan-executer.service';

const SENTINEL_DONE = 'true';
const SENTINEL_OUT_OF_SCOPE = 'out_of_scope';

export type ExecutionAction = {
	capabilityId: string;
	resolvedParameters?: Record<string, unknown>;
};

export type PlannerResponse = {
	actions: ExecutionAction[];
	doneReasoning: boolean;
	outOfScope?: boolean;
};

export type plannerInputDTO = {
	prompt: string;
	userRole: string;
	metadata?: Record<string, unknown>;
	provider?: OuterApiProvider;
	accumulateEvidence?: string;
};

@Injectable()
export class RagPlannerService {
	constructor(
		private readonly contextBuilderService: ContextBuilderService,
		private readonly outerAPIService: OuterApiService,
		private readonly planExecuterService: RagPlanExecuterService,
	) {}

	async buildMetadataDescription(metadata: Record<string, unknown> | undefined): Promise<string> {
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
			.map(([key, value]) => `${key}:${String(value)}`)
			.join(', ');

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
			classId
				? `Here are the resolved names to ids of objects related to classId=${classId}`
				: '',
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

	private hasNoEvidence(accumulateEvidence?: string): boolean {
		const normalized = String(accumulateEvidence ?? '').trim().toLowerCase();
		return normalized === '' || normalized === 'none' || normalized === '[]';
	}

	private buildSystemPrompt(commandCatalog: string): string {
		return [
			'You are a planner for a RAG pipeline.',
			'Your ONLY job is to decide the next single action needed to gather evidence for the user question.',
			'You must NEVER answer the user question directly.',
			'',
			'## Response rules — return exactly ONE of the following:',
			'',
			`1. The string "${SENTINEL_DONE}"`,
			'   -> when the accumulated evidence is already sufficient to answer the question.',
			'',
			`2. The string "${SENTINEL_OUT_OF_SCOPE}"`,
			'   -> when the question cannot be answered using any of the available capabilities.',
			'',
			'3. A single valid JSON object: {"capabilityId": "...", "parameters": {...}}',
			'   -> when more evidence is needed. Select ONLY from the catalog below.',
			'   "parameters" must be a JSON object (never a string).',
			'',
			'## Important',
			'- Do NOT wrap JSON in markdown code fences.',
			'- Do NOT return an array; return a single JSON object.',
			`- If there is no accumulated evidence yet, you must return a JSON action - never "${SENTINEL_DONE}".`,
			`- If evidenceStatus is "none", returning "${SENTINEL_DONE}" is invalid.`,
			'',
			'## Semantic hints for Vietnamese queries',
			'- "bat thuong", "loi he thong", "hoat dong bat thuong", "kiem tra he thong" -> prefer "log-retrive"',
			'- "hoc vien dang ky", "enrollment", "tinh trang dang ky" -> use "enrollments"',
			'- "diem quiz", "ket qua bai kiem tra", "performance" -> use "class-overview" or "analyze-quiz-performance"',
			'- "hoc sinh yeu", "duoi nguong", "threshold" -> use "analyze-quiz-performance"',
			'- "lo hong kien thuc", "cau sai nhieu", "misconception" -> use "knowledge-gap"',
			'- "xu huong", "trend", "thang nao hoc tot" -> use "teaching-recommendation"',
			'',
			'## Action catalog',
			commandCatalog,
		].join('\n');
	}

	private buildPlannerPrompt(params: plannerInputDTO, metadataDescription: string): string {
		const noEvidence = this.hasNoEvidence(params.accumulateEvidence);
		const evidenceStatus = noEvidence ? 'none' : 'available';

		return [
			`current context: ${metadataDescription}`,
			`evidenceStatus: ${evidenceStatus}`,
			`accumulatedEvidence: ${params.accumulateEvidence ?? 'none'}`,
			`userRequest: ${params.prompt}`,
		].join('\n');
	}

	private normalizeActionCandidate(candidate: unknown): ExecutionAction | null {
		if (!candidate || typeof candidate !== 'object') {
			return null;
		}

		const action = candidate as {
			id?: unknown;
			capabilityId?: unknown;
			parameters?: unknown;
			resolvedParameters?: unknown;
		};

		const capabilityId =
			typeof action.capabilityId === 'string'
				? action.capabilityId
				: typeof action.id === 'string'
					? action.id
					: '';

		if (!capabilityId) {
			return null;
		}

		const resolvedParameters =
			action.resolvedParameters && typeof action.resolvedParameters === 'object'
				? (action.resolvedParameters as Record<string, unknown>)
				: action.parameters && typeof action.parameters === 'object'
					? (action.parameters as Record<string, unknown>)
					: {};

		return { capabilityId, resolvedParameters };
	}

	private pickFallbackAction(prompt: string): ExecutionAction | null {
		const normalized = prompt.toLowerCase();
		const preferredLogCapability =
			RAG_CAPABILITY_ENTRIES.find((entry) => entry.id === 'log-retrive')?.id ??
			RAG_CAPABILITY_ENTRIES.find((entry) => entry.id.includes('log'))?.id;

		if (
			preferredLogCapability &&
			/bat thuong|bất thường|loi he thong|lỗi hệ thống|kiem tra he thong|kiểm tra hệ thống|anomaly|log/i.test(normalized)
		) {
			return {
				capabilityId: preferredLogCapability,
				resolvedParameters: { limit: 20, offset: 0 },
			};
		}

		const first = RAG_CAPABILITY_ENTRIES[0];
		return first ? { capabilityId: first.id, resolvedParameters: {} } : null;
	}

	async selectActionsFromPrompt(
		params: plannerInputDTO,
	): Promise<PlannerResponse> {
		try {
			const commandCatalog = this.buildCommandCatalog(params.userRole);
			const metadataDescription = await this.buildMetadataDescription(params.metadata);
			const plannerPrompt = this.buildPlannerPrompt(params, metadataDescription);
			const instructionPrompt = this.buildSystemPrompt(commandCatalog);

			const outerAPIRequest: OuterApiRequest = {
				prompt: plannerPrompt,
				provider: params.provider ?? 'groq',
				caller: 'rag-planner',
				temperature: 0.1,
				instructionPrompt,
			};

			const response = await this.outerAPIService.chat(outerAPIRequest);
			const parsedResponse = parseJsonStrings(response.text);
			const noEvidence = this.hasNoEvidence(params.accumulateEvidence);

			const normalizedRaw = typeof response.text === 'string' ? response.text.trim().toLowerCase() : '';

			if (normalizedRaw === SENTINEL_OUT_OF_SCOPE || parsedResponse === SENTINEL_OUT_OF_SCOPE) {
				return { actions: [], doneReasoning: true, outOfScope: true };
			}

			if (!Array.isArray(parsedResponse) && (parsedResponse === true || parsedResponse === 'true' || normalizedRaw === 'true')) {
				if (!noEvidence) {
					return { actions: [], doneReasoning: true };
				}

				const fallback = this.pickFallbackAction(params.prompt);
				return {
					actions: fallback ? [fallback] : [],
					doneReasoning: false,
				};
			}

			// If response is [] and there is no evidence yet, enforce at least one action.
			if (Array.isArray(parsedResponse) && parsedResponse.length === 0) {
				if (noEvidence) {
					const fallback = this.pickFallbackAction(params.prompt);
					return {
						actions: fallback ? [fallback] : [],
						doneReasoning: false,
					};
				}

				return { actions: [], doneReasoning: true };
			}

			const normalizedItem = Array.isArray(parsedResponse)
				? parsedResponse[0]
				: parsedResponse;

			const action = this.normalizeActionCandidate(normalizedItem);
			if (!action) {
				if (noEvidence) {
					const fallback = this.pickFallbackAction(params.prompt);
					return {
						actions: fallback ? [fallback] : [],
						doneReasoning: false,
					};
				}

				return { actions: [], doneReasoning: false };
			}

			return {
				actions: [action],
				doneReasoning: false,
			};
		} catch (error) {
			console.error('Error selecting capabilities from prompt:', error);
			throw error;
		}
	}
}
