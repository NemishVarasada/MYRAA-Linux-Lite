export type ProviderKind = "ollama" | "huggingface" | "openai" | "openrouter" | "groq" | "custom";
export type ProviderRole = "assistant" | "speechToText" | "memory" | "fallback";
export type ProviderCapabilities = { chat?: boolean; tools?: boolean; speechToText?: boolean; streaming?: boolean };
export type ProviderProfile = {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  chatModel?: string;
  speechModel?: string;
  enabled: boolean;
  capabilities: ProviderCapabilities;
  hasSecret?: boolean;
};
export type ProviderSettings = { profiles: ProviderProfile[]; roles: Partial<Record<ProviderRole,string>> };
export type ChatMessage = { role: "system"|"user"|"assistant"|"tool"; content: string; tool_call_id?: string; name?: string; tool_calls?: unknown[] };
export type ToolCall = { id: string; name: string; arguments: Record<string,unknown>; raw: unknown };
export type ChatResult = { text: string; toolCalls: ToolCall[]; assistantMessage: ChatMessage; raw?: unknown };
