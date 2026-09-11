# Vaani 2.1 product rebuild status

Validated in the build sandbox:

- Node backend bundles successfully to `dist/server.cjs`.
- Python desktop-agent source compiles.
- Electron main process and generated backend pass syntax checks.
- The interface offers an explicit white/dark toggle, a one-time setup wizard, and an animated voice circle for listening, transcribing, thinking, working, and speaking states.
- Setup, dark assistant, and full provider catalog layouts render cleanly at 1440×900.
- The catalog includes Vaani Local, Ollama, LM Studio, OpenAI, Anthropic Claude, Google Gemini, Groq, OpenRouter, Hugging Face, Mistral, DeepSeek, xAI, Together AI, Perplexity, and a custom provider.
- Anthropic and OpenAI-compatible adapters pass mocked real-response tests.
- Provider capability rules and automatic role assignment are enforced by the backend.
- Provider testing sends a real chat request; `/models` alone no longer produces a connected status.
- Electron disables GPU and VAAPI paths for older Ubuntu graphics stacks.
- Offline package verification correctly blocks releases when required local binaries or models are absent.

Required before publishing the fully offline installer:

- Add licensed Linux x86_64 llama.cpp, whisper.cpp, and Piper runtime binaries.
- Add the chosen assistant GGUF, multilingual Whisper, and Piper voice models.
- Record exact versions, source URLs, checksums, and redistribution licences in `THIRD-PARTY-NOTICES.md`.
- Test the complete package on an 8 GB Ubuntu 22.04 computer.
- Test microphone capture, transcription, speech output, physical audio/brightness controls, Wayland screenshot portals, Xorg automation, and `.deb`/AppImage installation.

The source build can already be tested with Ollama, LM Studio, or a user-owned cloud provider. `Vaani Local` intentionally reports missing offline assets until a release builder supplies them.
