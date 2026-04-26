import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
	OuterApiProvider,
	OuterApiService,
} from '../outer-api/outer-api.service';

export interface QuizGenerationInput {
	prompt: string;
	role?: string;
	provider?: OuterApiProvider;
	temperature?: number;
	instructionPrompt?: string;
}

export interface GeneratedQuizQuestion {
	content: string;
	options_json?: Record<string, unknown> | unknown[];
	answer_key_json: Record<string, unknown> | unknown[];
	points: number;
}

export interface QuizGenerationResult {
	text: string;
	questions: GeneratedQuizQuestion[];
	provider: OuterApiProvider;
	rawText: string;
}

@Injectable()
export class QuizGenerationService {
	private readonly logger = new Logger(QuizGenerationService.name);
	private readonly providerOrder: OuterApiProvider[] = ['gemini', 'groq', 'openai'];

	constructor(private readonly outerApiService: OuterApiService) {}

	async generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationResult> {
		if (!input.prompt || input.prompt.trim().length === 0) {
			throw new BadRequestException('Prompt cannot be empty');
		}

		const providersToTry = this.buildProviderTryOrder(input.provider);
		const errors: string[] = [];

		for (const provider of providersToTry) {
			try {
				const aiResult = await this.outerApiService.chat({
					prompt: input.prompt,
					caller: 'quiz-generator',
					provider,
					temperature: input.temperature,
					instructionPrompt: input.instructionPrompt,
				});

				const { text, questions } = this.parseAndValidateResponse(aiResult.text);

				return {
					text,
					questions,
					provider: aiResult.provider,
					rawText: aiResult.text,
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				errors.push(`${provider}: ${message}`);
				this.logger.warn(
					`Quiz generation failed with provider ${provider}. Trying next provider. Reason: ${message}`,
				);
			}
		}

		throw new BadRequestException(
			`Quiz generation failed for all providers. Details: ${errors.join(' | ')}`,
		);
	}

	private buildProviderTryOrder(preferredProvider?: OuterApiProvider): OuterApiProvider[] {
		if (!preferredProvider) {
			return [...this.providerOrder];
		}

		return [
			preferredProvider,
			...this.providerOrder.filter((provider) => provider !== preferredProvider),
		];
	}

	private parseAndValidateResponse(rawText: string): { text: string; questions: GeneratedQuizQuestion[] } {
		const payload = this.parseJsonPayload(rawText);

		if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
			throw new BadRequestException(
				'Quiz generation response must be a JSON object with "text" and "questions" fields.',
			);
		}

		const obj = payload as Record<string, unknown>;

		const text = typeof obj['text'] === 'string' ? obj['text'].trim() : '';

		const questionNodes = obj['questions'];
		if (!Array.isArray(questionNodes)) {
			throw new BadRequestException(
				'Quiz generation response must contain a "questions" array.',
			);
		}

		if (questionNodes.length === 0) {
			throw new BadRequestException('Quiz generation response contains no questions');
		}

		const questions = questionNodes.map((node, index) => this.normalizeQuestion(node, index));
		return { text, questions };
	}

	private parseJsonPayload(text: string): unknown {
		const trimmed = text.trim();
		const candidates = this.collectJsonCandidates(trimmed);

		for (const candidate of candidates) {
			try {
				return JSON.parse(candidate);
			} catch {
				continue;
			}
		}

		this.logger.warn(`Unable to parse quiz generation response as JSON: ${trimmed.slice(0, 250)}`);
		throw new BadRequestException(
			'Quiz generation response is not valid JSON. Expected an array of questions or an object with a questions array.',
		);
	}

	private collectJsonCandidates(raw: string): string[] {
		const candidates: string[] = [raw];

		const fencedBlock = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
		if (fencedBlock?.[1]) {
			candidates.push(fencedBlock[1].trim());
		}

		const extractedJson = this.extractFirstJsonContainer(raw);
		if (extractedJson) {
			candidates.push(extractedJson);
		}

		return Array.from(new Set(candidates.filter((v) => v.length > 0)));
	}

	private extractFirstJsonContainer(value: string): string | null {
		const firstObject = value.indexOf('{');
		const firstArray = value.indexOf('[');

		const starts = [firstObject, firstArray].filter((idx) => idx >= 0);
		if (starts.length === 0) {
			return null;
		}

		const start = Math.min(...starts);
		const opening = value[start];
		const closing = opening === '{' ? '}' : ']';

		let depth = 0;
		let inString = false;
		let escaped = false;

		for (let i = start; i < value.length; i += 1) {
			const ch = value[i];

			if (inString) {
				if (escaped) {
					escaped = false;
				} else if (ch === '\\') {
					escaped = true;
				} else if (ch === '"') {
					inString = false;
				}
				continue;
			}

			if (ch === '"') {
				inString = true;
				continue;
			}

			if (ch === opening) {
				depth += 1;
			} else if (ch === closing) {
				depth -= 1;
				if (depth === 0) {
					return value.slice(start, i + 1);
				}
			}
		}

		return null;
	}

	private normalizeQuestion(
		questionNode: unknown,
		index: number,
	): GeneratedQuizQuestion {
		if (!questionNode || typeof questionNode !== 'object' || Array.isArray(questionNode)) {
			throw new BadRequestException(`Question at index ${index} must be a JSON object`);
		}

		const question = questionNode as Record<string, unknown>;
		const content = this.ensureNonEmptyString(question.content, `questions[${index}].content`);
		const answerKey = this.ensureJsonValue(
			question.answer_key_json,
			`questions[${index}].answer_key_json`,
			true,
		);
		if (!answerKey) {
			throw new BadRequestException(`questions[${index}].answer_key_json is required`);
		}
		const options = this.ensureJsonValue(
			question.options_json,
			`questions[${index}].options_json`,
			false,
		);

		let points = 1;
		if (question.points !== undefined && question.points !== null) {
			if (typeof question.points !== 'number' || !Number.isFinite(question.points)) {
				throw new BadRequestException(`questions[${index}].points must be a valid number`);
			}
			points = question.points;
		}

		const normalized: GeneratedQuizQuestion = {
			content,
			answer_key_json: answerKey,
			points,
		};

		if (options !== undefined) {
			normalized.options_json = options;
		}

		return normalized;
	}

	private ensureNonEmptyString(value: unknown, fieldName: string): string {
		if (typeof value !== 'string' || value.trim().length === 0) {
			throw new BadRequestException(`${fieldName} must be a non-empty string`);
		}

		return value.trim();
	}

	private ensureJsonValue(
		value: unknown,
		fieldName: string,
		required: boolean,
	): Record<string, unknown> | unknown[] | undefined {
		if (value === undefined || value === null) {
			if (required) {
				throw new BadRequestException(`${fieldName} is required`);
			}
			return undefined;
		}

		if (Array.isArray(value)) {
			return value;
		}

		if (typeof value === 'object') {
			return value as Record<string, unknown>;
		}

		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed.length === 0) {
				if (required) {
					throw new BadRequestException(`${fieldName} cannot be empty`);
				}
				return undefined;
			}

			try {
				const parsed = JSON.parse(trimmed);
				if (parsed && (typeof parsed === 'object' || Array.isArray(parsed))) {
					return parsed as Record<string, unknown> | unknown[];
				}
			} catch {
				throw new BadRequestException(`${fieldName} must be valid JSON`);
			}
		}

		throw new BadRequestException(`${fieldName} must be a JSON object, array, or JSON string`);
	}
}
