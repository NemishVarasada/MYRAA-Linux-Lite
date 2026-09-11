export type ProviderType = "gemini" | "huggingface" | "openai-compatible" | "ollama" | "local-speech";

export interface ModelCapabilities {
  chat?: boolean;
  tools?: boolean;
  streaming?: boolean;
  realtimeAudio?: boolean;
  speechToText?: boolean;
  textToSpeech?: boolean;
  vision?: boolean;
}

export interface ModelProfile {
  id: string;
  displayName: string;
  providerType: ProviderType;
  baseUrl?: string;
  modelId: string;
  secretReference?: string;
  engine?: string;
  capabilities: ModelCapabilities;
  enabled: boolean;
}

export type ModelRole =
  | "assistantProfileId"
  | "toolProfileId"
  | "speechToTextProfileId"
  | "textToSpeechProfileId"
  | "memoryProfileId"
  | "fallbackAssistantProfileId";

export interface ProviderSettings {
  profiles: ModelProfile[];
  roles: Partial<Record<ModelRole, string>>;
}

export interface ConnectionResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: unknown[];
  temperature?: number;
}

export interface ChatResponse {
  text: string;
  raw?: unknown;
  toolCalls?: Array<{ id?: string; name: string; arguments: Record<string, unknown> }>;
}

export interface ChatProvider {
  readonly profile: ModelProfile;
  readonly supportsTools: boolean;
  readonly supportsStreaming: boolean;
  testConnection(): Promise<ConnectionResult>;
  listModels?(): Promise<Array<{ id: string; displayName?: string }>>;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

export interface SpeechToTextProvider {
  readonly profile: ModelProfile;
  testConnection(): Promise<ConnectionResult>;
  transcribe(audio: Buffer, mimeType?: string): Promise<string>;
}

export interface AudioResult {
  audio: Buffer;
  mimeType: string;
}

export interface TextToSpeechProvider {
  readonly profile: ModelProfile;
  testConnection(): Promise<ConnectionResult>;
  speak(text: string): Promise<AudioResult>;
}
