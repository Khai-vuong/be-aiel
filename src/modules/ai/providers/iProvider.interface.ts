export type HistoryMessage = {
  role: string;
  content: string;
};

export type AiChatSetting = {
  temperature?: number;
  systemPrompt?: string;
  history?: HistoryMessage[];
  // Thêm thông tin file truyền từ Database qua
  fileContext?: {
    url: string;
    mime_type: string;
    filename: string;
  };
};

export interface iProvider {
  chat(prompt: string, setting?: AiChatSetting): Promise<string>;
}