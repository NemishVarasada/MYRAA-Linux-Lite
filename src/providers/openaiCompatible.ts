import { ChatProvider, ChatRequest, ChatResponse, ConnectionResult, ModelProfile } from "./types";

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

export class OpenAICompatibleProvider implements ChatProvider {
  readonly supportsTools: boolean;
  readonly supportsStreaming: boolean;

  constructor(readonly profile: ModelProfile, private readonly apiKey?: string) {
    this.supportsTools = profile.capabilities.tools === true;
    this.supportsStreaming = profile.capabilities.streaming === true;
  }

  async testConnection(): Promise<ConnectionResult> {
    const started = Date.now();
    try {
      const response = await fetch(endpoint(this.profile.baseUrl || "http://127.0.0.1:11434/v1", "/models"), {
        headers: this.headers(),
      });
      return { ok: response.ok, message: response.ok ? "Connection succeeded." : `Provider returned HTTP ${response.status}.`, latencyMs: Date.now() - started };
    } catch (error) {
      return { ok: false, message: String(error), latencyMs: Date.now() - started };
    }
  }

  async listModels(): Promise<Array<{ id: string; displayName?: string }>> {
    const response = await fetch(endpoint(this.profile.baseUrl || "http://127.0.0.1:11434/v1", "/models"), { headers: this.headers() });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
    const data = await response.json() as { data?: Array<{ id: string }> };
    return (data.data || []).map(model => ({ id: model.id, displayName: model.id }));
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(endpoint(this.profile.baseUrl || "http://127.0.0.1:11434/v1", "/chat/completions"), {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.profile.modelId, messages: request.messages, tools: request.tools, temperature: request.temperature }),
    });
    const data = await response.json() as any;
    if (!response.ok) throw new Error(data?.error?.message || `Provider returned HTTP ${response.status}.`);
    const choice = data.choices?.[0];
    return {
      text: choice?.message?.content || "",
      raw: data,
      toolCalls: (choice?.message?.tool_calls || []).map((call: any) => ({ id: call.id, name: call.function.name, arguments: JSON.parse(call.function.arguments || "{}") })),
    };
  }

  private headers(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }
}
