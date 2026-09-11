import { GoogleGenAI } from "@google/genai";
import { ChatProvider, ChatRequest, ChatResponse, ConnectionResult, ModelProfile } from "./types";

export class GeminiProvider implements ChatProvider {
  readonly supportsTools: boolean;
  readonly supportsStreaming = false;

  constructor(readonly profile: ModelProfile, private readonly apiKey: string) {
    this.supportsTools = profile.capabilities.tools === true;
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const pager = await ai.models.list();
      await pager[Symbol.asyncIterator]().next();
      return { ok: true, message: "Connection succeeded." };
    } catch (error) {
      return { ok: false, message: String(error) };
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const response = await ai.models.generateContent({
      model: this.profile.modelId,
      contents: request.messages.filter(message => message.role !== "system").map(message => `${message.role}: ${message.content}`).join("\n"),
      config: { systemInstruction: request.messages.find(message => message.role === "system")?.content },
    });
    return { text: response.text || "", raw: response };
  }
}
