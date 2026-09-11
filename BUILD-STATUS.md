# Vaani build status

Validated in the build sandbox:

- Python desktop-agent source compiles.
- Linux registry and Wayland/Xorg overrides remain included.
- Node backend bundles to `dist/server.cjs`.
- Electron main process and generated backend pass syntax checks.
- Provider settings redact secrets and store them in a separate owner-only file.
- The interface includes microphone and text input, provider CRUD, independent role selection, fallback selection, and per-provider connection testing.

Requires testing on the real Ubuntu computer:

- Microphone and system speech
- Physical brightness/audio hardware
- Wayland screenshot portals
- Ollama/provider connectivity
- Final `.deb` and AppImage packaging
