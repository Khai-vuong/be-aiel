export type HistoryMessage = {
    role: string;
    content: string;
}

export type AiChatSetting = {
    temperature?: number;
    systemPrompt?: string;
    history?: HistoryMessage[];
}

export interface iProvider {
    chat( prompt: string, setting?: AiChatSetting): Promise<string>;
}