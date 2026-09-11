# MYRAA Linux Lite

A microphone-first MYRAA build for Ubuntu 22.04 x86_64. It keeps Gemini Live voice, local memory and desktop tools while removing the heavy visual interface.

## Session support

- **Wayland:** voice, memory, applications, websites, files, browser automation, volume, brightness, clipboard read/write and screenshots. Global input/window actions return a clear restriction message.
- **Xorg:** all above plus global copy/paste keystrokes and window switching/minimize/maximize/close through `xdotool` and `wmctrl`.

## Build on Ubuntu 22.04

```bash
chmod +x build-linux.sh
./build-linux.sh
```

Install the generated `.deb` from `release/`, or run the AppImage after `chmod +x`.

## First run

Open Settings to configure independent AI roles for assistant reasoning, desktop tools, speech-to-text, text-to-speech, memory extraction and fallback. Gemini Live remains available for realtime microphone sessions, while Hugging Face, OpenAI-compatible endpoints, Ollama and local speech engines can be configured as separate profiles. The key, tokens, memories, settings and logs remain under the current user's application-data directory.

The provider settings API is local-only. Use `/api/providers` to inspect redacted profiles, `/api/providers/settings` to save role selections, `/api/providers/secret` to save a token or API key, `/api/providers/test` to test a profile, and `/api/providers/validate-tools` before enabling computer control. Models without advertised tool support are rejected for tool use.

## Privacy and safety

The backend binds only to `127.0.0.1`. Desktop execution uses a per-launch token. Shutdown, restart, suspend and lock retain the two-step confirmation flow. Permanent file deletion should not be requested; normal deletion uses the desktop Trash.
