# Vaani fully offline runtime assets

The release builder places the following Linux x86_64 runtimes and models here before packaging:

```text
local_ai/
  bin/llama-server
  bin/whisper-cli
  bin/piper
  models/assistant.gguf
  models/whisper.bin
  models/voice.onnx
  models/voice.onnx.json
```

Recommended release profile for an 8 GB Ubuntu computer:

- a multilingual 3B-class instruct GGUF model quantized to Q4_K_M for text and tool selection;
- a multilingual Whisper Small model for speech recognition;
- a Piper voice model and its matching JSON configuration for offline speech output.

End users do not download these assets. They are embedded into the `.deb` and AppImage at release-build time. `npm run verify:offline` refuses to create an offline package when any required binary/model is absent or obviously a placeholder.

Before redistribution, record every model/runtime version, upstream URL, SHA-256 checksum, and license in `THIRD-PARTY-NOTICES.md`. Do not publish an installer until redistribution rights have been verified.
