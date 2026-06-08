import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from '../../providers/gemini.provider';
import { AiProgressReporter } from '../../stream/ai-stream.types';
import {
	OuterApiProvider,
	OuterApiService,
} from '../outer-api/outer-api.service';
import { RagPlanExecuterService } from '../RAG/rag-plan-executer.service';

export interface QuizGenerationInput {
	prompt: string;
	role?: string;
	provider?: OuterApiProvider;
	temperature?: number;
	instructionPrompt?: string;
	metadata?: Record<string, unknown>;
	progress?: AiProgressReporter;
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

type QuizFileContext = {
	url: string;
	mime_type: string;
	filename: string;
};

type QuizFileSummary = {
	fileId: string;
	fileName: string;
};

type QuizFileResolution = {
	fileContext: QuizFileContext;
	classId?: string;
	requestedFileQuery?: string;
	availableFiles?: QuizFileSummary[];
	selectedFile?: QuizFileSummary;
};

@Injectable()
export class QuizGenerationService {
	private readonly logger = new Logger(QuizGenerationService.name);
	private readonly defaultInstructionPrompt =
		'Return ONLY a valid JSON object (no markdown, no code fences, no extra text). ' +
		'The object must have exactly these fields: ' +
		'"text" (string): your explanation or reasoning for the generated questions; ' +
		'"questions" (array): the list of quiz questions. ' +
		'Each question object must include: ' +
		'"content" (string, required), ' +
		'"options_json" (object, required for multiple-choice, e.g. {"A":"Paris","B":"London","C":"Berlin"}), ' +
		'"answer_key_json" (object, required, e.g. {"correct":"A"}), ' +
		'"points" (number, optional, defaults to 1). ' +
		'Example: {"text":"Here are 2 questions.","questions":[{"content":"What is the capital of France?","options_json":{"A":"Paris","B":"London","C":"Berlin"},"answer_key_json":{"correct":"A"},"points":1}]}';

	constructor(
		private readonly outerApiService: OuterApiService,
		private readonly geminiProvider: GeminiProvider,
		private readonly ragPlanExecuterService: RagPlanExecuterService,
	) {}

	async generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationResult> {
		if (!input.prompt || input.prompt.trim().length === 0) {
			throw new BadRequestException('Prompt cannot be empty');
		}

		input.progress?.({
			stage: 'quiz.start',
			message: 'Đang khởi tạo luồng tạo quiz...',
		});

		const instructionPrompt =
			input.instructionPrompt && input.instructionPrompt.trim().length > 0
				? input.instructionPrompt
				: this.defaultInstructionPrompt;
		const fileResolution = await this.resolveQuizFileContext(
			input.prompt,
			input.metadata,
			input.progress,
		);

		if (fileResolution) {
			input.progress?.({
				stage: 'quiz.file.ready',
				message: 'Đã lấy được file, đang dùng Gemini để đọc nội dung và tạo quiz...',
				data: {
					filename: fileResolution.fileContext.filename,
					mimeType: fileResolution.fileContext.mime_type,
					classId: fileResolution.classId,
					selectedFileId: fileResolution.selectedFile?.fileId,
				},
			});

			input.progress?.({
				stage: 'quiz.llm.generate',
				message: 'Đang đọc file và suy luận nội dung quiz...',
			});

			const aiResponse = await this.geminiProvider.chat(
				input.prompt,
				{
					temperature: input.temperature,
					systemPrompt: this.buildFileAwareInstructionPrompt(
						instructionPrompt,
						fileResolution,
					),
					fileContext: fileResolution.fileContext,
				},
			);

			input.progress?.({
				stage: 'quiz.parse',
				message: 'Đang phân tích kết quả quiz từ Gemini...',
			});

			const { text, questions } = this.parseAndValidateResponse(aiResponse);

			input.progress?.({
				stage: 'quiz.done',
				message: 'Đã hoàn tất tạo quiz từ file.',
			});

			return {
				text,
				questions,
				provider: 'gemini',
				rawText: aiResponse,
			};
		}

		input.progress?.({
			stage: 'quiz.generate',
			message: 'Đang tạo quiz theo cách thông thường...',
		});

		input.progress?.({
			stage: 'quiz.llm.generate',
			message: 'Nhà cung cấp AI đang sinh nội dung quiz...',
		});

		const aiResult = await this.outerApiService.chat({
			prompt: input.prompt,
			caller: 'quiz-generator',
			provider: input.provider,
			temperature: input.temperature,
			instructionPrompt,
		});

		input.progress?.({
			stage: 'quiz.parse',
			message: 'Đang phân tích kết quả quiz...',
		});

		const { text, questions } = this.parseAndValidateResponse(aiResult.text);

		input.progress?.({
			stage: 'quiz.done',
			message: 'Đã hoàn tất tạo quiz.',
		});

		return {
			text,
			questions,
			provider: aiResult.provider,
			rawText: aiResult.text,
		};
	}

	private buildFileAwareInstructionPrompt(
		basePrompt: string,
		resolution?: QuizFileResolution,
	): string {
		const classContext = resolution?.availableFiles?.length
			? this.formatClassFileInventory(resolution)
			: '';
		const selectedFileContext = resolution?.selectedFile
			? `Selected file: [${resolution.selectedFile.fileId}] ${resolution.selectedFile.fileName}`
			: '';

		return [
			basePrompt,
			'If a file is attached, treat it as the primary source of truth.',
			'Generate quiz questions only from the file content and the user prompt.',
			'If the file content is insufficient, explicitly say so in the text field and still return valid JSON.',
			classContext,
			selectedFileContext,
		].join(' ');
	}

	private formatClassFileInventory(resolution: QuizFileResolution): string {
		const header = resolution.classId
			? `Class context for classId=${resolution.classId}:`
			: 'Class context:';
		const inventory = resolution.availableFiles
			?.map((file) => `- [${file.fileId}] ${file.fileName}`)
			.join(' ')
			.trim() ?? '';
		const requested = resolution.requestedFileQuery
			? `Requested file hint: ${resolution.requestedFileQuery}`
			: '';

		return [header, inventory, requested].filter(Boolean).join(' ');
	}

	private async resolveQuizFileContext(
		prompt: string,
		metadata?: Record<string, unknown>,
		progress?: AiProgressReporter,
	): Promise<QuizFileResolution | null> {
		if (!metadata || typeof metadata !== 'object') {
			if (this.promptSuggestsFileUsage(prompt)) {
				throw new BadRequestException(
					'Quiz generation needs file metadata. Provide metadata.fileId or metadata.classId when asking to generate quiz from a file.',
				);
			}
			return null;
		}

		const directFileContext = this.normalizeDirectFileContext(metadata);
		if (directFileContext) {
			progress?.({
				stage: 'quiz.file.context',
				message: 'Đã nhận sẵn file context từ client.',
				data: {
					filename: directFileContext.filename,
					mimeType: directFileContext.mime_type,
				},
			});
			return { fileContext: directFileContext };
		}

		const fileId = this.extractFileId(metadata);
		if (!fileId) {
			const classId = this.extractClassId(metadata);
			if (!classId) {
				if (this.promptSuggestsFileUsage(prompt)) {
					throw new BadRequestException(
						'Quiz generation needs file metadata. Provide metadata.fileId or metadata.classId when asking to generate quiz from a file.',
					);
				}
				return null;
			}

			const requestedFileQuery = this.extractRequestedFileQuery(prompt, metadata);
			return this.resolveFileFromClassFiles(classId, requestedFileQuery, progress, prompt);
		}

		progress?.({
			stage: 'quiz.file.resolve',
			message: 'Đang lấy metadata của file để đọc nội dung...',
			data: { fileId },
		});

		const [fileEntry] = await this.ragPlanExecuterService.execute([
			{
				capabilityId: 'get-file',
				resolvedParameters: { fileId },
			},
		]);

		if (!fileEntry || fileEntry.error || !fileEntry.result) {
			throw new BadRequestException(
				fileEntry?.error || `Unable to resolve file metadata for fileId: ${fileId}`,
			);
		}

		const fileContext = this.parseFileContextResult(fileEntry.result);
		if (!fileContext) {
			throw new BadRequestException(`Unable to parse file metadata for fileId: ${fileId}`);
		}

		return {
			fileContext,
			selectedFile: {
				fileId,
				fileName: fileContext.filename,
			},
		};
	}

	private async resolveFileFromClassFiles(
		classId: string,
		requestedFileQuery: string,
		progress?: AiProgressReporter,
		prompt?: string,
	): Promise<QuizFileResolution> {
		progress?.({
			stage: 'quiz.file.list',
			message: 'Đang liệt kê các file trong lớp để tìm tài liệu phù hợp...',
			data: { classId },
		});

		const [classFilesEntry] = await this.ragPlanExecuterService.execute([
			{
				capabilityId: 'class-files',
				resolvedParameters: { classId },
			},
		]);

		if (!classFilesEntry || classFilesEntry.error || !classFilesEntry.result) {
			throw new BadRequestException(
				classFilesEntry?.error || `Unable to list files for classId: ${classId}`,
			);
		}

		const classFiles = this.parseClassFilesResult(classFilesEntry.result);
		if (classFiles.length === 0) {
			throw new BadRequestException(`No files found for classId: ${classId}`);
		}

		const matchedFile = this.selectBestMatchingFile(classFiles, requestedFileQuery);
		if (!matchedFile) {
			throw new BadRequestException(
				requestedFileQuery
					? `Unable to match file "${requestedFileQuery}" in class ${classId}`
					: `Unable to infer which file to use in class ${classId}. Please provide metadata.fileId or a more specific file name.`,
			);
		}

		progress?.({
			stage: 'quiz.file.match',
			message: 'Đã tìm thấy file phù hợp trong lớp.',
			data: {
				classId,
				fileId: matchedFile.fileId,
				fileName: matchedFile.fileName,
			},
		});

		const [fileEntry] = await this.ragPlanExecuterService.execute([
			{
				capabilityId: 'get-file',
				resolvedParameters: { fileId: matchedFile.fileId },
			},
		]);

		if (!fileEntry || fileEntry.error || !fileEntry.result) {
			throw new BadRequestException(
				fileEntry?.error || `Unable to resolve file metadata for fileId: ${matchedFile.fileId}`,
			);
		}

		const fileContext = this.parseFileContextResult(fileEntry.result);
		if (!fileContext) {
			throw new BadRequestException(`Unable to parse file metadata for fileId: ${matchedFile.fileId}`);
		}

		return {
			classId,
			requestedFileQuery,
			availableFiles: classFiles,
			selectedFile: matchedFile,
			fileContext,
		};
	}

	private normalizeDirectFileContext(metadata: Record<string, unknown>): QuizFileContext | null {
		const fileContext = metadata['fileContext'];
		if (fileContext && typeof fileContext === 'object' && !Array.isArray(fileContext)) {
			const data = fileContext as Record<string, unknown>;
			const url = typeof data.url === 'string' ? data.url.trim() : '';
			if (!url) {
				return null;
			}

			const mimeType = typeof data.mime_type === 'string' ? data.mime_type.trim() : '';
			const filename = typeof data.filename === 'string' ? data.filename.trim() : '';

			return {
				url,
				mime_type: mimeType || 'application/octet-stream',
				filename: filename || this.deriveFilenameFromUrl(url),
			};
		}

		const fileUrl = typeof metadata.fileUrl === 'string' ? metadata.fileUrl.trim() : '';
		if (!fileUrl) {
			return null;
		}

		const mimeType = typeof metadata.fileMimeType === 'string' ? metadata.fileMimeType.trim() : '';
		const filename = typeof metadata.fileName === 'string' ? metadata.fileName.trim() : '';

		return {
			url: fileUrl,
			mime_type: mimeType || 'application/octet-stream',
			filename: filename || this.deriveFilenameFromUrl(fileUrl),
		};
	}

	private extractFileId(metadata: Record<string, unknown>): string {
		const value = metadata.fileId;
		return typeof value === 'string' ? value.trim() : '';
	}

	private extractClassId(metadata: Record<string, unknown>): string {
		const value = metadata.classId;
		return typeof value === 'string' ? value.trim() : '';
	}

	private extractRequestedFileQuery(
		prompt: string,
		metadata: Record<string, unknown>,
	): string {
		const metadataQuery = typeof metadata.fileName === 'string' ? metadata.fileName.trim() : '';
		if (metadataQuery) {
			return metadataQuery;
		}

		const normalizedPrompt = String(prompt ?? '').trim();
		const directMentionMatch = normalizedPrompt.match(
			/(?:file|tài liệu|tai lieu|document)\s+(?:có tên|ten|named)?\s*["'“”]?([^"'“”\n\r,.;:]+)["'“”]?/i,
		);
		if (directMentionMatch?.[1]) {
			return directMentionMatch[1].trim();
		}

		return '';
	}

	private promptSuggestsFileUsage(prompt: string): boolean {
		return /\b(file|tài liệu|tai lieu|document|pdf|docx|pptx|worksheet|handout)\b/i.test(
			String(prompt ?? ''),
		);
	}

	private parseClassFilesResult(
		result: unknown,
	): Array<{ fileId: string; fileName: string }> {
		const text = String(result ?? '').trim();
		if (!text) {
			return [];
		}

		const lines = text
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);

		const headerIndex = lines.findIndex((line) => /fileid|filename/i.test(line));
		if (headerIndex === -1 || headerIndex + 1 >= lines.length) {
			return [];
		}

		const headers = lines[headerIndex]
			.split('|')
			.map((cell) => cell.trim())
			.filter(Boolean)
			.map((cell) => cell.toLowerCase().replace(/\s+/g, ''));

		const fileIdIndex = headers.findIndex((header) => header === 'fileid' || header === 'fid');
		const fileNameIndex = headers.findIndex((header) => header === 'filename' || header === 'file_name');
		if (fileIdIndex === -1 || fileNameIndex === -1) {
			return [];
		}

		const rows = lines.slice(headerIndex + 1).filter((line) => line.includes('|'));
		return rows
			.map((rowLine) => {
				const cells = rowLine.split('|').map((cell) => cell.trim());
				return {
					fileId: cells[fileIdIndex] ?? '',
					fileName: cells[fileNameIndex] ?? '',
				};
			})
			.filter((row) => row.fileId.length > 0 && row.fileName.length > 0);
	}

	private selectBestMatchingFile(
		files: Array<{ fileId: string; fileName: string }>,
		requestedFileQuery: string,
	): { fileId: string; fileName: string } | null {
		if (files.length === 0) {
			return null;
		}

		if (files.length === 1 && !requestedFileQuery) {
			return files[0];
		}

		const normalizedQuery = this.normalizeComparableText(requestedFileQuery);
		if (!normalizedQuery) {
			return files.length === 1 ? files[0] : null;
		}

		const exactMatch = files.find((file) => {
			const normalizedFileName = this.normalizeComparableText(file.fileName);
			return normalizedFileName === normalizedQuery;
		});
		if (exactMatch) {
			return exactMatch;
		}

		const containsMatch = files.find((file) => {
			const normalizedFileName = this.normalizeComparableText(file.fileName);
			return normalizedFileName.includes(normalizedQuery) || normalizedQuery.includes(normalizedFileName);
		});
		if (containsMatch) {
			return containsMatch;
		}

		const tokenMatch = files.find((file) => {
			const normalizedFileName = this.normalizeComparableText(file.fileName);
			const fileTokens = normalizedFileName.split(' ').filter(Boolean);
			return fileTokens.some((token) => normalizedQuery.includes(token));
		});

		return tokenMatch ?? (files.length === 1 ? files[0] : null);
	}

	private normalizeComparableText(value: string): string {
		return String(value ?? '')
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	private parseFileContextResult(result: unknown): QuizFileContext | null {
		if (result && typeof result === 'object' && !Array.isArray(result)) {
			const data = result as Record<string, unknown>;
			const url = typeof data.url === 'string' ? data.url.trim() : '';
			if (url) {
				const mimeType = typeof data.mime_type === 'string' ? data.mime_type.trim() : '';
				const filename = typeof data.filename === 'string' ? data.filename.trim() : '';

				return {
					url,
					mime_type: mimeType || 'application/octet-stream',
					filename: filename || this.deriveFilenameFromUrl(url),
				};
			}
		}

		const text = String(result ?? '').trim();
		if (!text) {
			return null;
		}

		const lines = text
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);

		const headerIndex = lines.findIndex(
			(line) => line.includes('|') && /(^|\s)url(\s|\|)/i.test(line),
		);

		if (headerIndex !== -1 && headerIndex + 1 < lines.length) {
			const headers = lines[headerIndex]
				.split('|')
				.map((cell) => cell.trim())
				.filter(Boolean);

			const rowLine = lines
				.slice(headerIndex + 1)
				.find((line) => !line.startsWith('[') && line.includes('|'));

			if (rowLine && headers.length > 0) {
				const values = rowLine.split('|').map((cell) => cell.trim());
				const row: Record<string, string> = {};

				headers.forEach((header, index) => {
					row[header.toLowerCase()] = values[index] ?? '';
				});

				const url = row.url?.trim();
				if (url) {
					return {
						url,
						mime_type: row.mime_type?.trim() || 'application/octet-stream',
						filename: row.filename?.trim() || this.deriveFilenameFromUrl(url),
					};
				}
			}
		}

		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			try {
				const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
				const url = typeof parsed.url === 'string' ? parsed.url.trim() : '';
				if (url) {
					const mimeType = typeof parsed.mime_type === 'string' ? parsed.mime_type.trim() : '';
					const filename = typeof parsed.filename === 'string' ? parsed.filename.trim() : '';

					return {
						url,
						mime_type: mimeType || 'application/octet-stream',
						filename: filename || this.deriveFilenameFromUrl(url),
					};
				}
			} catch {
				// ignore and fall through
			}
		}

		const urlMatch = text.match(/https?:\/\/[^\s|'"<>]+/i);
		if (urlMatch) {
			const url = urlMatch[0].replace(/[),.;\]]+$/g, '');
			return {
				url,
				mime_type: 'application/octet-stream',
				filename: this.deriveFilenameFromUrl(url),
			};
		}

		return null;
	}

	private deriveFilenameFromUrl(url: string): string {
		try {
			const normalizedUrl = new URL(url);
			const pathname = normalizedUrl.pathname.split('/').filter(Boolean);
			const lastSegment = pathname[pathname.length - 1] ?? 'file';
			return lastSegment || 'file';
		} catch {
			const fallback = url.split('/').filter(Boolean).pop();
			return fallback || 'file';
		}
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
