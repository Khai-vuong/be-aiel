import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { AiChatSetting, iProvider } from './iProvider.interface';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from 'src/common/utils/s3.client';
import axios from 'axios';
import * as officeParser from 'officeparser';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class GeminiProvider implements iProvider, OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);
  private apiKey = '';
  private ai: GoogleGenerativeAI;
  private fileManager: GoogleAIFileManager;
  private model = process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash';
  private maxOutputTokens = Number(
    process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 1024,
  );

  /** Kích thước tối đa để dùng inline base64 (4 MB). Lớn hơn sẽ dùng Files API */
  private readonly INLINE_PDF_SIZE_LIMIT = 4 * 1024 * 1024;

  onModuleInit() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is missing. Gemini chat calls will fail.',
      );
      return;
    }

    this.ai = new GoogleGenerativeAI(this.apiKey);
    this.fileManager = new GoogleAIFileManager(this.apiKey);
  }

  /**
   * Encode URL an toàn: giữ nguyên cấu trúc URL (scheme, host, query params),
   * chỉ encode từng path segment (xử lý khoảng trắng, ký tự đặc biệt trong tên file).
   * Hoạt động với cả S3 pre-signed URL và S3 public URL.
   *
   * Ví dụ:
   *   "https://bucket.s3.amazonaws.com/files/midterm practice.pdf"
   *   → "https://bucket.s3.amazonaws.com/files/midterm%20practice.pdf"
   */
  private encodeS3Url(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      parsed.pathname = parsed.pathname
        .split('/')
        .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
        .join('/');
      return parsed.toString();
    } catch {
      // URL không hợp lệ → trả về nguyên bản, để axios tự báo lỗi
      return rawUrl;
    }
  }

  private isS3Url(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname.includes('.s3.') || parsed.hostname.startsWith('s3.');
    } catch {
      return false;
    }
  }

  private parseS3BucketAndKey(rawUrl: string): { bucket: string; key: string } | null {
    try {
      const parsed = new URL(rawUrl);

      if (parsed.hostname.startsWith('s3.')) {
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        const bucket = pathSegments.shift();
        const key = pathSegments.join('/');

        if (bucket && key) {
          return { bucket, key: decodeURIComponent(key) };
        }

        return null;
      }

      const hostnameParts = parsed.hostname.split('.');
      const bucket = hostnameParts[0];
      const key = parsed.pathname.replace(/^\//, '');

      if (bucket && key) {
        return { bucket, key: decodeURIComponent(key) };
      }

      return null;
    } catch {
      return null;
    }
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

  private async signS3Url(rawUrl: string, filename: string): Promise<string> {
    if (!this.isS3Url(rawUrl)) {
      return rawUrl;
    }

    const bucketAndKey = this.parseS3BucketAndKey(rawUrl);
    if (!bucketAndKey) {
      return rawUrl;
    }

    const command = new GetObjectCommand({
      Bucket: bucketAndKey.bucket,
      Key: bucketAndKey.key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 60 });
  }

  /**
   * Tải file từ S3 URL (pre-signed hoặc public) về dưới dạng Buffer.
   * Tự động encode tên file có khoảng trắng hoặc ký tự đặc biệt.
   */
  private async downloadFile(url: string): Promise<Buffer> {
    const signedUrl = await this.signS3Url(url, this.deriveFilenameFromUrl(url));
    const encodedUrl = this.encodeS3Url(signedUrl);

    if (encodedUrl !== url) {
      this.logger.log(`S3 URL sau khi xử lý: ${encodedUrl}`);
    }

    try {
      const response = await axios.get<ArrayBuffer>(encodedUrl, {
        responseType: 'arraybuffer',
        // Timeout 30s — tránh treo khi file lớn hoặc S3 chậm
        timeout: 30_000,
      });
      return Buffer.from(response.data as ArrayBuffer);
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (status === 403) {
        this.logger.error(`S3 trả về 403 Forbidden cho URL: ${encodedUrl}`);
        throw new Error(
          `Không có quyền truy cập file trên S3 (403). ` +
          `Hãy kiểm tra bucket policy hoặc đảm bảo URL đã được pre-signed.`,
        );
      }

      if (status === 404) {
        throw new Error(`File không tồn tại trên S3 (404): ${encodedUrl}`);
      }

      this.logger.error(`Không thể tải file từ URL: ${encodedUrl}`, errorMessage);
      throw new Error(`Lỗi tải file tài liệu: ${errorMessage}`);
    }
  }

  /**
   * Upload PDF lên Gemini Files API và chờ đến khi file sẵn sàng.
   * File sẽ tự động bị xoá sau 48 giờ bởi Google.
   *
   * @returns URI của file trên Gemini để dùng trong fileData part
   */
  private async uploadPdfToFileApi(
    buffer: Buffer,
    filename: string,
  ): Promise<string> {
    this.logger.log(`Đang upload PDF qua Files API: ${filename}`);

    const ext = path.extname(filename) || '.pdf';
    const tmpPath = path.join(os.tmpdir(), `gemini_pdf_${Date.now()}${ext}`);

    try {
      fs.writeFileSync(tmpPath, buffer);

      const uploadResponse = await this.fileManager.uploadFile(tmpPath, {
        mimeType: 'application/pdf',
        displayName: filename,
      });

      let file = uploadResponse.file;

      // Polling cho đến khi file chuyển sang trạng thái ACTIVE
      while (file.state === FileState.PROCESSING) {
        this.logger.log(`File đang xử lý, chờ 2 giây... (${filename})`);
        await new Promise((r) => setTimeout(r, 2000));
        file = await this.fileManager.getFile(file.name);
      }

      if (file.state === FileState.FAILED) {
        throw new Error(
          `Gemini Files API xử lý thất bại cho file: ${filename}`,
        );
      }

      this.logger.log(
        `Upload thành công qua Files API: ${filename} → ${file.uri}`,
      );
      return file.uri;
    } finally {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Bỏ qua lỗi xoá file tạm
      }
    }
  }

  /**
   * Xây dựng part cho file PDF:
   * - File nhỏ (< 4 MB): dùng inline base64 để tránh overhead upload
   * - File lớn (≥ 4 MB): upload qua Gemini Files API, dùng fileData URI
   */
  private async buildPdfPart(
    buffer: Buffer,
    filename: string,
  ): Promise<any> {
    if (buffer.byteLength < this.INLINE_PDF_SIZE_LIMIT) {
      this.logger.log(
        `PDF nhỏ (${(buffer.byteLength / 1024).toFixed(1)} KB), dùng inline base64: ${filename}`,
      );
      return {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      };
    }

    // File lớn → dùng Files API
    const fileUri = await this.uploadPdfToFileApi(buffer, filename);
    return {
      fileData: {
        mimeType: 'application/pdf',
        fileUri,
      },
    };
  }

  /**
   * Trích xuất text từ file DOCX/PPTX bằng cách ghi ra temp file.
   * officeParser hoạt động ổn định hơn với file path so với Buffer trực tiếp.
   */
  private async extractOfficeText(buffer: Buffer, filename: string): Promise<string> {
    const ext = path.extname(filename) || '.tmp';
    const tmpPath = path.join(os.tmpdir(), `gemini_office_${Date.now()}${ext}`);

    try {
      fs.writeFileSync(tmpPath, buffer);
      this.logger.log(`Đã ghi temp file: ${tmpPath}`);

      const text = await officeParser.parseOffice(tmpPath);
      return typeof text === 'string' ? text : JSON.stringify(text ?? '');
    } finally {
      // Luôn xoá temp file dù thành công hay lỗi
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Bỏ qua lỗi xoá file
      }
    }
  }

  private isTextLikeMimeType(mimeType: string): boolean {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType === 'text/xml' ||
      mimeType === 'text/csv'
    );
  }

  private extractPlainText(buffer: Buffer, filename: string): string {
    const content = buffer.toString('utf8');
    if (!content.trim()) {
      this.logger.warn(`Text file appears empty: ${filename}`);
    }

    return content;
  }

  /**
   * @param prompt Content to send
   * @param setting Temperature?, conversation history?, system prompt?, file context?
   * @description
   * Nội dung gửi lên sẽ có dạng:
   * [
   *   { role: 'user',  parts: [{ text: '...' }] },           // Lịch sử hội thoại
   *   { role: 'model', parts: [{ text: '...' }] },
   *   { role: 'user',  parts: [<pdfPart>, { text: prompt }] } // Tin nhắn hiện tại + file
   * ]
   */
  async chat(prompt: string, setting?: AiChatSetting): Promise<string> {
    if (!this.apiKey || !this.ai) {
      throw new Error('Gemini Error: GEMINI_API_KEY is not configured.');
    }

    const {
      temperature = 0.8,
      systemPrompt,
      history = [],
      fileContext,
    } = setting ?? {};

    try {
      const model = this.ai.getGenerativeModel({ model: this.model });

      // Build contents array từ lịch sử hội thoại
      const contents: any[] = history.map((msg) => ({
        role:
          msg.role === 'assistant' || msg.role === 'system' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Tạo parts cho tin nhắn hiện tại của user
      const currentUserParts: any[] = [];

      // Xử lý file đính kèm nếu có
      if (fileContext) {
        const { url, mime_type, filename } = fileContext;
        const fileBuffer = await this.downloadFile(url);

        if (mime_type === 'application/pdf') {
          // PDF: inline base64 (file nhỏ) hoặc Files API (file lớn)
          const pdfPart = await this.buildPdfPart(fileBuffer, filename);
          currentUserParts.push(pdfPart);
        } else if (
          mime_type ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // docx
          mime_type ===
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' // pptx
        ) {
          // DOCX / PPTX: officeParser hoạt động ổn định hơn với file path
          // nên ghi buffer ra temp file, trích xuất, rồi xoá ngay sau đó
          const extractedText = await this.extractOfficeText(fileBuffer, filename);
          if (!extractedText.trim()) {
            this.logger.warn(`officeParser trả về nội dung rỗng cho file: ${filename}`);
          }
          currentUserParts.push({
            text: `[Nội dung từ file tài liệu bài học: ${filename}]\n${extractedText}\n[Hết nội dung file]\n\n`,
          });
          this.logger.log(`Đã rút trích text từ file Office: ${filename} (${extractedText.length} ký tự)`);
        } else if (this.isTextLikeMimeType(mime_type)) {
          const extractedText = this.extractPlainText(fileBuffer, filename);
          currentUserParts.push({
            text: `[Nội dung từ file tài liệu bài học: ${filename}]\n${extractedText}\n[Hết nội dung file]\n\n`,
          });
          this.logger.log(`Đã rút trích text từ file dạng plain text: ${filename} (${extractedText.length} ký tự)`);
        }
      }

      // Thêm prompt của user vào cuối
      currentUserParts.push({ text: prompt });

      contents.push({
        role: 'user',
        parts: currentUserParts,
      });

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature,
          // maxOutputTokens: this.maxOutputTokens,
        },
        systemInstruction: systemPrompt,
      });

      const response = await result.response;
      const content = response.text().trim();
      if (!content) {
        throw new Error('Gemini returned empty content');
      }

      return content;
    } catch (error: any) {
      const message = error?.message ?? String(error);
      throw new Error(`Gemini Error: ${message}`);
    }
  }
}