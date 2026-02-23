export type AiChatSetting = {
    temperature?: number;
    systemPrompt?: string;
}

export interface iProvider {
    chat( prompt: string, setting?: AiChatSetting): Promise<string>;
}