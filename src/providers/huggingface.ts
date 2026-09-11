import { OpenAICompatibleProvider } from "./openaiCompatible";
import { ModelProfile } from "./types";

export class HuggingFaceProvider extends OpenAICompatibleProvider {
  constructor(profile: ModelProfile, token?: string) {
    super({ baseUrl: "https://router.huggingface.co/v1", ...profile, providerType: "huggingface" }, token);
  }
}
