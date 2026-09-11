import { OpenAICompatibleProvider } from "./openaiCompatible";
import { ModelProfile } from "./types";

export class OllamaProvider extends OpenAICompatibleProvider {
  constructor(profile: ModelProfile) {
    super({ baseUrl: "http://127.0.0.1:11434/v1", ...profile, providerType: "ollama" }, undefined);
  }
}
