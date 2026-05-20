import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions';
import { AiChatSetting, iProvider } from './iProvider.interface';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Thông tin file đính kèm khi gọi chatWithFile().
 *
 * Có 2 trường hợp:
 *  1. File chưa upload lên OpenAI → truyền localPath
 *  2. File đã upload trước đó     → truyền openaiFileId (lấy từ DB)
 *
 * Caller (ReAct agent / service) chịu trách nhiệm quyết định cái nào.
 */
export interface OpenAIFileAttachment {
  /** File ID trên OpenAI — lấy từ DB nếu đã upload trước đó */
  openaiFileId?: string;

  /** Đường dẫn file trên server của bạn — dùng khi chưa có openaiFileId */
  localPath?: string;

  mimeType: string;
  fileName: string;
}

/**
 * Kết quả sau khi upload file lên OpenAI.
 * Caller nên lưu openaiFileId vào DB để tái sử dụng.
 */
export interface UploadResult {
  openaiFileId: string; // "file-abc123" — lưu vào DB
  fileName: string;
  bytes: number;
  purpose: string;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

@Injectable()
export class OpenAIProvider implements OnModuleInit, iProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private openai: OpenAI;

  /**
   * Model dùng cho chat text thông thường.
   * Env: OPENAI_CHAT_MODEL (mặc định: gpt-4o-mini)
   */
  private model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini';

  /**
   * Model dùng khi có đính kèm ảnh — cần model hỗ trợ vision.
   * gpt-4o và gpt-4o-mini đều hỗ trợ vision.
   * Env: OPENAI_VISION_MODEL (mặc định: gpt-4o)
   */
  private visionModel = process.env.OPENAI_VISION_MODEL ?? 'gpt-4o';

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  onModuleInit() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY is missing. Calls will fail.');
    }
  }

  // ─── iProvider: chat text thuần (giữ nguyên logic cũ) ──────────────────────

  /**
   * Chat text không có file đính kèm.
   * Giữ nguyên 100% logic cũ, không thay đổi gì.
   */
  async chat(prompt: string, setting?: AiChatSetting): Promise<string> {
    try {
      const { temperature = 0.8, systemPrompt, history = [] } = setting ?? {};

      const messages: ChatCompletionMessageParam[] = [
        ...(systemPrompt
          ? [{ role: 'system' as const, content: systemPrompt }]
          : []),
        ...history.map((msg) => ({
          role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        { role: 'user' as const, content: prompt },
      ];

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('OpenAI returned empty content');

      return content;
    } catch (error: any) {
      throw new Error(`OpenAI Error: ${error?.message ?? String(error)}`);
    }
  }

  // ─── File Management ────────────────────────────────────────────────────────

  /**
   * Upload file lên OpenAI Files API.
   *
   * ĐẶC ĐIỂM QUAN TRỌNG của OpenAI Files:
   *  - File KHÔNG TỰ HẾT HẠN (khác Gemini 48h)
   *  - File được lưu trữ vĩnh viễn cho đến khi bạn gọi deleteFile()
   *  - OpenAI TÍNH PHÍ lưu trữ theo dung lượng
   *  - Nên gọi hàm này 1 lần rồi lưu openaiFileId vào DB của bạn
   *
   * @param localPath Đường dẫn file trên server của bạn
   * @param purpose   Mục đích upload:
   *                  - "assistants": dùng với Assistants API hoặc để retrieve content
   *                  - "fine-tune":  dùng để fine-tune model (JSONL format)
   *                  - "vision":     ảnh dùng cho vision (thường dùng base64 thay thế)
   * @returns UploadResult chứa openaiFileId — lưu vào DB ngay
   */
  async uploadFile(
    localPath: string,
    purpose: 'assistants' | 'fine-tune' | 'vision' = 'assistants',
  ): Promise<UploadResult> {
    const fileName = path.basename(localPath);

    this.logger.log(`Uploading to OpenAI: ${fileName}`);

    // openai SDK chấp nhận ReadStream trực tiếp
    const fileStream = fs.createReadStream(localPath);

    const uploaded = await this.openai.files.create({
      file: fileStream,
      purpose,
    });

    this.logger.log(`Upload success: ${fileName} → ${uploaded.id}`);

    return {
      openaiFileId: uploaded.id, // "file-abc123" — PHẢI lưu vào DB
      fileName: uploaded.filename,
      bytes: uploaded.bytes,
      purpose: uploaded.purpose,
    };
  }

  /**
   * Xóa file khỏi OpenAI server.
   *
   * KHI NÀO CẦN XÓA:
   *  - Giáo viên/admin xóa tài liệu khỏi hệ thống
   *  - Dọn dẹp định kỳ để giảm chi phí lưu trữ
   *  - Khi content cũ không còn phù hợp
   *
   * SAU KHI XÓA: nhớ cập nhật DB của bạn (set openaiFileId = null)
   *
   * @param openaiFileId File ID nhận được từ uploadFile() — lấy từ DB
   */
  async deleteFile(openaiFileId: string): Promise<void> {
    await this.openai.files.delete(openaiFileId);
    this.logger.log(`File deleted from OpenAI: ${openaiFileId}`);
    // Caller có trách nhiệm cập nhật DB sau khi hàm này thành công
  }

  /**
   * Lấy danh sách tất cả file đang lưu trên OpenAI.
   *
   * Dùng để:
   *  - Audit chi phí lưu trữ
   *  - Phát hiện file "mồ côi" (trong OpenAI nhưng không còn trong DB của bạn)
   *  - Cleanup định kỳ
   */
  async listRemoteFiles() {
    const files = await this.openai.files.list();
    return files.data.map((f) => ({
      id: f.id,
      name: f.filename,
      bytes: f.bytes,
      purpose: f.purpose,
      // convert unix timestamp → Date
      createdAt: new Date(f.created_at * 1000),
    }));
  }

  // ─── Chat với file đính kèm ─────────────────────────────────────────────────

  /**
   * Chat có đính kèm file (ảnh hoặc tài liệu văn bản).
   *
   * FLOW XỬ LÝ:
   *
   * Nếu là HÌNH ẢNH (image/*):
   *   → Đọc bytes → encode base64 → gửi inline trong message
   *   → Dùng visionModel (gpt-4o) để xử lý
   *   → OpenAI nhận ảnh dưới dạng data URL, không cần file_id
   *
   * Nếu là TÀI LIỆU (pdf, txt, md, ...):
   *   → Lấy nội dung text từ OpenAI Files API (nếu có openaiFileId)
   *     HOẶC đọc trực tiếp từ disk (nếu có localPath)
   *   → Inject nội dung vào system message
   *   → Model đọc tài liệu từ context, không phải từ file_id
   *   (Đây là giới hạn của Chat Completions API —
   *    nếu muốn dùng file_id trực tiếp, cần chuyển sang Assistants API)
   *
   * @param prompt     Câu hỏi của user
   * @param attachment Thông tin file (xem OpenAIFileAttachment)
   * @param setting    Cấu hình chat thông thường
   */
  async chatWithFile(
    prompt: string,
    attachment: OpenAIFileAttachment,
    setting?: AiChatSetting,
  ): Promise<string> {
    const isImage = attachment.mimeType.startsWith('image/');

    if (isImage) {
      return this._chatWithImage(prompt, attachment, setting);
    } else {
      return this._chatWithDocument(prompt, attachment, setting);
    }
  }

  // ─── Private: xử lý ảnh ─────────────────────────────────────────────────────

  /**
   * Gửi ảnh kèm câu hỏi đến model vision.
   *
   * OpenAI Chat Completions nhận ảnh qua:
   *   { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }
   *
   * Không có cơ chế "image file_id" cho Chat Completions
   * → luôn phải đọc bytes và encode base64
   */
  private async _chatWithImage(
    prompt: string,
    attachment: OpenAIFileAttachment,
    setting?: AiChatSetting,
  ): Promise<string> {
    const { temperature = 0.8, systemPrompt, history = [] } = setting ?? {};

    // Đọc bytes của ảnh
    let imageBase64: string;

    if (attachment.localPath) {
      // Đọc trực tiếp từ disk
      const buffer = fs.readFileSync(attachment.localPath);
      imageBase64 = buffer.toString('base64');
    } else if (attachment.openaiFileId) {
      // Lấy bytes từ OpenAI Files API
      // Lưu ý: openai.files.content() trả về Response object
      const response = await this.openai.files.content(attachment.openaiFileId);
      const arrayBuffer = await response.arrayBuffer();
      imageBase64 = Buffer.from(arrayBuffer).toString('base64');
    } else {
      throw new Error(
        'OpenAI chatWithFile: phải cung cấp localPath hoặc openaiFileId',
      );
    }

    // Tạo data URL: "data:image/jpeg;base64,/9j/4AAQ..."
    const dataUrl = `data:${attachment.mimeType};base64,${imageBase64}`;

    const messages: ChatCompletionMessageParam[] = [
      ...(systemPrompt
        ? [{ role: 'system' as const, content: systemPrompt }]
        : []),
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        // Content dạng array: ảnh + text
        content: [
          {
            type: 'image_url' as const,
            image_url: { url: dataUrl },
          },
          {
            type: 'text' as const,
            text: prompt,
          },
        ] as ChatCompletionContentPart[],
      },
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.visionModel, // PHẢI dùng model hỗ trợ vision
        messages,
        temperature,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('OpenAI Vision returned empty content');
      return content;
    } catch (error: any) {
      throw new Error(`OpenAI Vision Error: ${error?.message ?? String(error)}`);
    }
  }

  // ─── Private: xử lý tài liệu văn bản ───────────────────────────────────────

  /**
   * Inject nội dung tài liệu vào system message rồi hỏi model.
   *
   * TẠI SAO KHÔNG DÙNG file_id TRỰC TIẾP?
   *   Chat Completions API không hỗ trợ "document file_id" như Gemini.
   *   file_id của OpenAI chỉ dùng được với:
   *     - Assistants API (phức tạp hơn, có thread/run lifecycle)
   *     - Batch API
   *     - Fine-tuning
   *   → Giải pháp thực tế nhất cho Chat Completions: lấy text về, inject vào prompt.
   *
   * GIỚI HẠN:
   *   - File lớn (>100 trang) sẽ ngốn nhiều token
   *   - Context window của gpt-4o: 128k tokens
   *   - Nếu file quá lớn → cân nhắc RAG (vector DB) về sau
   *
   * GHI CHÚ VỀ openai.files.content():
   *   - Chỉ hoạt động với file text (txt, csv, md, json)
   *   - PDF trả về binary → cần thư viện parse PDF riêng (pdf-parse, pdfjs)
   *   - Hiện tại implement xử lý txt trước, PDF để TODO
   */
  private async _chatWithDocument(
    prompt: string,
    attachment: OpenAIFileAttachment,
    setting?: AiChatSetting,
  ): Promise<string> {
    const { temperature = 0.8, systemPrompt, history = [] } = setting ?? {};

    // Lấy nội dung text của tài liệu
    let documentText: string;

    if (attachment.localPath) {
      // Đọc trực tiếp từ disk (txt, md, csv — file text)
      // TODO: nếu là PDF, dùng pdf-parse để extract text
      documentText = fs.readFileSync(attachment.localPath, 'utf-8');
    } else if (attachment.openaiFileId) {
      // Lấy content từ OpenAI Files API
      // Lưu ý: chỉ hoạt động tốt với file text
      const response = await this.openai.files.content(attachment.openaiFileId);
      documentText = await response.text();
    } else {
      throw new Error(
        'OpenAI chatWithFile: phải cung cấp localPath hoặc openaiFileId',
      );
    }

    /**
     * Inject tài liệu vào system message với delimiter rõ ràng.
     * Delimiter "--- BEGIN/END DOCUMENT ---" giúp model hiểu ranh giới tài liệu
     * và không nhầm lẫn với instruction của bạn.
     */
    const documentContext = [
      systemPrompt ?? '',
      '',
      `--- BEGIN DOCUMENT: ${attachment.fileName} ---`,
      documentText,
      `--- END DOCUMENT: ${attachment.fileName} ---`,
      '',
      'Hãy trả lời câu hỏi của người dùng dựa trên tài liệu trên.',
    ]
      .join('\n')
      .trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system' as const, content: documentContext },
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      { role: 'user' as const, content: prompt },
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('OpenAI returned empty content');
      return content;
    } catch (error: any) {
      throw new Error(`OpenAI Document Error: ${error?.message ?? String(error)}`);
    }
  }
}