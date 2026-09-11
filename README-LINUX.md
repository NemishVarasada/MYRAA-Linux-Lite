# Vaani for Linux

Vaani is an offline-first desktop voice assistant for Ubuntu 22.04 x86_64. It uses a simple white/dark interface, a one-time setup flow, an animated voice state circle, local memory, and a protected bridge to Linux desktop tools.

## Two ways to use AI

### Vaani Local — no account or API key

The fully offline release contains:

- a small multilingual local language model through `llama-server`;
- Whisper speech recognition through `whisper-cli`;
- Piper speech output;
- no runtime model download and no cloud requirement.

Offline assets are embedded by the release builder. Source checkouts do not contain multi-gigabyte model binaries. See `local_ai/README.md`.

### Your own provider key

The setup catalog includes OpenAI, Anthropic Claude, Google Gemini, Groq, OpenRouter, Hugging Face, Mistral AI, DeepSeek, xAI Grok, Together AI, Perplexity, Ollama, LM Studio, and custom OpenAI-compatible endpoints.

Provider rules are automatic. The selected service decides whether chat, computer tools, microphone transcription, and speech output are available. Advanced users can change role assignments later.

## First launch

1. Choose Vaani Local or a cloud provider.
2. Choose a model and enter a key only when required.
3. Vaani requests a real model response.
4. Successful providers are assigned automatically.
5. The setup screen is hidden after completion and can be reopened from Providers.

A provider is never labelled connected only because `/models` answered.

## Run from source

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-linux.txt
npm install
npm run build
npm run app
```

The source build can use Ollama, LM Studio, or cloud providers. `Vaani Local` works only when the required offline assets are present under `local_ai/`.

## Product checks

```bash
npm run build
npm run lint
npm run test:product
```

## Build the fully offline installer

Place the licensed runtime binaries and model files listed in `local_ai/README.md`, then run:

```bash
chmod +x build-linux.sh
./build-linux.sh
```

The build refuses to create a misleading offline package when required assets are missing. Generated `.deb` and AppImage files appear in `release/`.

## Linux sessions

- **Wayland:** safer default. Applications, files, browser actions, audio, brightness, screenshots, OCR, clipboard, and confirmed system actions are supported where the desktop permits them.
- **Xorg:** also enables fuller global keyboard and window control through `xdotool` and `wmctrl`.

## Privacy and safety

- Node and Python listen only on `127.0.0.1`.
- The desktop bridge uses a random per-launch token.
- Provider secrets are stored in a local owner-only file and never returned to the interface.
- The AI can call only allowlisted tools.
- Normal deletion uses Trash.
- Shutdown, restart, suspend, and lock require a two-step confirmation.
- Microphone audio is used for transcription and then discarded.
