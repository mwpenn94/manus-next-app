# Voice Cloning Research — P17

## Best Free Options for Browser-Based Voice Cloning

### 1. Kokoro TTS (WebGPU) — BEST FIT
- **npm**: `kokoro-js` (npm package available)
- **Demo**: https://huggingface.co/spaces/webml-community/kokoro-webgpu
- **GitHub**: https://github.com/xenova/kokoro-web
- **How it works**: 82M parameter model, runs 100% in browser via WebGPU + Transformers.js
- **Voice cloning**: Supports voice presets, not true voice cloning from samples
- **Pros**: Real-time, no server needed, npm package ready, WebGPU accelerated
- **Cons**: Not true voice cloning (uses preset voices), requires WebGPU support

### 2. Chatterbox TTS (Transformers.js) — BEST FOR VOICE CLONING
- **GitHub**: https://github.com/resemble-ai/transformersjs-chatterbox-demo
- **How it works**: Resemble AI's Chatterbox TTS running in browser via Transformers.js v4
- **Voice cloning**: TRUE zero-shot voice cloning from audio samples
- **Pros**: Real voice cloning, runs in browser, no API key needed
- **Cons**: Larger model, slower than Kokoro

### 3. F5-TTS (ONNX Runtime) — BROWSER VOICE CLONING
- **GitHub**: https://github.com/nsarang/voice-cloning-f5-tts
- **How it works**: Flow Matching with Diffusion Transformer, ONNX Runtime in browser
- **Voice cloning**: TRUE zero-shot voice cloning
- **Pros**: High quality, runs locally in browser
- **Cons**: Heavier model, needs more RAM

### 4. Microsoft VibeVoice — SERVER-SIDE ONLY
- **GitHub**: https://github.com/microsoft/VibeVoice
- **How it works**: 1.5B parameter model, multi-speaker, podcast-quality
- **Voice cloning**: Supports voice cloning via reference audio
- **Pros**: Highest quality, multi-speaker, 64K context
- **Cons**: Server-side only (Python), too large for browser

## Recommendation
For our Client Inference page, use **Kokoro TTS via kokoro-js** for fast in-browser TTS (WebGPU).
For voice cloning specifically, use **Chatterbox TTS via Transformers.js** — true zero-shot cloning from a short audio sample.

Both run 100% in the browser with no API keys needed.
