export type ProviderKind =
  | "vaani-local"
  | "ollama"
  | "lmstudio"
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "openrouter"
  | "huggingface"
  | "mistral"
  | "deepseek"
  | "xai"
  | "together"
  | "perplexity"
  | "custom";

export type ProviderRole = "assistant" | "speechToText" | "textToSpeech" | "memory" | "fallback";
export type ProviderCapabilities = {
  chat?: boolean;
  tools?: boolean;
  speechToText?: boolean;
  textToSpeech?: boolean;
  streaming?: boolean;
};
export type ProviderApiStyle = "openai" | "anthropic";
export type ProviderGroup = "local" | "cloud" | "custom";

export type ProviderPreset = {
  id: string;
  name: string;
  kind: ProviderKind;
  group: ProviderGroup;
  description: string;
  baseUrl: string;
  requiresKey: boolean;
  keyLabel: string;
  apiStyle: ProviderApiStyle;
  capabilities: ProviderCapabilities;
  chatModels: string[];
  speechModels: string[];
  ttsModels: string[];
};

export type ProviderProfile = {
  id: string;
  presetId?: string;
  name: string;
  kind: ProviderKind;
  apiStyle?: ProviderApiStyle;
  baseUrl: string;
  chatModel?: string;
  speechModel?: string;
  ttsModel?: string;
  enabled: boolean;
  requiresKey?: boolean;
  capabilities: ProviderCapabilities;
  hasSecret?: boolean;
};
export type ProviderSettings = { profiles: ProviderProfile[]; roles: Partial<Record<ProviderRole,string>> };
export type ChatMessage = { role: "system"|"user"|"assistant"|"tool"; content: string; tool_call_id?: string; name?: string; tool_calls?: unknown[] };
export type ToolCall = { id: string; name: string; arguments: Record<string,unknown>; raw: unknown };
export type ChatResult = { text: string; toolCalls: ToolCall[]; assistantMessage: ChatMessage; raw?: unknown };
