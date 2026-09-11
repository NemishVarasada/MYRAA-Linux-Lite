import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AudioResult, ConnectionResult, ModelProfile, SpeechToTextProvider, TextToSpeechProvider } from "./types";

const execFileAsync = promisify(execFile);

export class LocalSpeechProvider implements SpeechToTextProvider, TextToSpeechProvider {
  constructor(readonly profile: ModelProfile) {}

  async testConnection(): Promise<ConnectionResult> {
    try {
      await execFileAsync(this.profile.engine === "espeak" ? "espeak-ng" : "spd-say", ["--version"]);
      return { ok: true, message: `${this.profile.engine || "speech"} is available.` };
    } catch {
      return { ok: false, message: `${this.profile.engine || "local speech"} is not installed.` };
    }
  }

  async transcribe(_audio: Buffer): Promise<string> {
    throw new Error("Local STT requires faster-whisper to be installed and configured.");
  }

  async speak(text: string): Promise<AudioResult> {
    const engine = this.profile.engine === "espeak" ? "espeak-ng" : "spd-say";
    await execFileAsync(engine, [text]);
    return { audio: Buffer.alloc(0), mimeType: "audio/wav" };
  }
}
