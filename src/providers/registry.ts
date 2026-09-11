import { getProviderSecret, getProviderSettings } from "../../server_paths";
import { GeminiProvider } from "./gemini";
import { HuggingFaceProvider } from "./huggingface";
import { LocalSpeechProvider } from "./localSpeech";
import { OllamaProvider } from "./ollama";
import { OpenAICompatibleProvider } from "./openaiCompatible";
import { ChatProvider, ModelProfile, ProviderSettings, SpeechToTextProvider, TextToSpeechProvider } from "./types";

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  profiles: [
    { id: "hf-assistant", displayName: "Hugging Face Assistant", providerType: "huggingface", modelId: "deepseek-ai/DeepSeek-R1-0528", secretReference: "huggingface", capabilities: { chat: true, tools: false, streaming: true }, enabled: true },
    { id: "hf-stt", displayName: "Hugging Face Whisper", providerType: "huggingface", modelId: "openai/whisper-large-v3", secretReference: "huggingface", capabilities: { speechToText: true }, enabled: true },
    { id: "local-piper", displayName: "Local Piper", providerType: "local-speech", modelId: "piper", engine: "piper", capabilities: { textToSpeech: true }, enabled: true },
    { id: "ollama-fallback", displayName: "Ollama Fallback", providerType: "ollama", modelId: "llama3.2:3b", capabilities: { chat: true, tools: false, streaming: true }, enabled: false },
    { id: "gemini-default", displayName: "Gemini", providerType: "gemini", modelId: "gemini-3.1-flash-live-preview", capabilities: { chat: true, tools: true, streaming: true, realtimeAudio: true }, enabled: true },
  ],
  roles: { assistantProfileId: "gemini-default", toolProfileId: "gemini-default", speechToTextProfileId: "hf-stt", textToSpeechProfileId: "local-piper", memoryProfileId: "hf-assistant", fallbackAssistantProfileId: "ollama-fallback" },
};

export function mergedProviderSettings(): ProviderSettings {
  const saved = getProviderSettings();
  const profiles = Array.isArray(saved.profiles) ? saved.profiles as ModelProfile[] : DEFAULT_PROVIDER_SETTINGS.profiles;
  return { profiles: profiles.length ? profiles : DEFAULT_PROVIDER_SETTINGS.profiles, roles: { ...DEFAULT_PROVIDER_SETTINGS.roles, ...(saved.roles || {}) } };
}

export function createChatProvider(profile: ModelProfile): ChatProvider {
  if (profile.providerType === "gemini") return new GeminiProvider(profile, getProviderSecret(profile.secretReference || "gemini") || "");
  if (profile.providerType === "huggingface") return new HuggingFaceProvider(profile, getProviderSecret(profile.secretReference || "huggingface"));
  if (profile.providerType === "ollama") return new OllamaProvider(profile);
  return new OpenAICompatibleProvider(profile, getProviderSecret(profile.secretReference || profile.id));
}

export function createSpeechProvider(profile: ModelProfile): SpeechToTextProvider & TextToSpeechProvider {
  return new LocalSpeechProvider(profile);
}
