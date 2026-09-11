# Vaani Linux

Vaani is a lightweight, local-first voice assistant rebuilt for Ubuntu 22.04 x86_64. It focuses on useful work: microphone input, provider-based reasoning, Linux desktop tools, spoken replies, and durable local memory.

## AI providers

Vaani is not locked to one vendor. Settings supports:

- **Ollama** for local, no-key chat and tool calling
- **Hugging Face Inference Providers** for chat and Whisper speech recognition
- **OpenAI**, **OpenRouter**, and **Groq**
- **Custom OpenAI-compatible endpoints** such as LM Studio or vLLM

Select separate profiles for assistant reasoning, speech-to-text, memory extraction, and fallback. Every profile has a **Test connection** action. API keys are stored only in the local `secrets.json` file with owner-only permissions and are never returned to the interface.

The default local profile uses `qwen2.5:3b` through Ollama. The default Hugging Face speech profile uses `openai/whisper-large-v3`. Model IDs remain editable because provider availability changes.

## Important local-mode note

Ollama provides local chat but not microphone transcription. Fully local microphone use requires a local Whisper-compatible server configured as a custom provider. Without one, configure Hugging Face/OpenAI/Groq for speech-to-text or use the text box. Spoken output uses the operating system's speech service through Chromium.

## Linux session support

- **Wayland:** applications, websites, files, Playwright browser tools, volume, brightness, clipboard, screenshots, OCR and safe system actions. Restricted global input/window actions return a clear message.
- **Xorg:** all of the above plus global copy/paste and window switching/minimize/maximize/close using `xdotool` and `wmctrl`.

## Build on Ubuntu 22.04

```bash
chmod +x build-linux.sh
./build-linux.sh
```

Generated `.deb` and AppImage packages appear in `release/`.

Install the Debian package:

```bash
sudo apt install ./release/*.deb
```

Or run the AppImage:

```bash
chmod +x release/*.AppImage
./release/*.AppImage
```

## First run

1. Open Vaani.
2. Open Settings.
3. Configure or enable a provider.
4. Enter the provider key only when required.
5. Click **Test connection**.
6. Select providers for assistant, speech-to-text, memory, and fallback.
7. Use the microphone or text box.

## Ollama example

Install Ollama separately, then pull the default small model:

```bash
ollama pull qwen2.5:3b
```

Vaani expects its OpenAI-compatible endpoint at `http://127.0.0.1:11434/v1`.

## Privacy and safety

- Node and the Python agent bind only to `127.0.0.1`.
- The desktop bridge uses a random per-launch token.
- The AI can call only allowlisted tools.
- File deletion uses Trash by default.
- Shutdown, restart, suspend, and lock require the existing two-step confirmation flow.
- Keep `.env`, `secrets.json`, provider settings, memories, logs, build outputs, and virtual environments out of Git.
