# Kokoro-js API Research

## Installation
```
npm install kokoro-js
```

## Basic Usage
```js
import { KokoroTTS } from "kokoro-js";

const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
const tts = await KokoroTTS.from_pretrained(model_id, {
  dtype: "q8", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
  device: "wasm", // Options: "wasm", "webgpu" (web) or "cpu" (node)
});

const text = "Hello world";
const audio = await tts.generate(text, { voice: "af_heart" });
audio.save("audio.wav"); // Node.js only
```

## Streaming Usage (for LLM integration)
```js
import { KokoroTTS, TextSplitterStream } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained(model_id, {
  dtype: "fp32",
  device: "webgpu",
});

const splitter = new TextSplitterStream();
const stream = tts.stream(splitter);

// Consume stream
(async () => {
  for await (const { text, phonemes, audio } of stream) {
    // audio is a RawAudio object
  }
})();

// Feed text
splitter.push("Hello ");
splitter.push("world!");
splitter.close();
```

## Available Voices
- American English: af_heart (best), af_bella (A-), af_nicole, af_alloy, af_aoede, af_jessica, af_kore, af_nova, af_river, af_sarah, af_sky
- American English Male: am_adam, am_echo, am_eric, am_fenrir, am_liam, am_michael, am_onyx, am_puck, am_santa
- British English: bf_alice, bf_emma, bf_isabella, bf_lily, bm_daniel, bm_fable, bm_george, bm_lewis
- Other languages: Chinese, French, Hindi, Italian, Japanese, Korean, Portuguese, Spanish

## Key Notes
- Model size: ~330MB for q8 quantization
- WebGPU recommended for real-time performance (fp32)
- WASM fallback works everywhere but slower
- `tts.list_voices()` returns all available voices
- Audio output is RawAudio object with .save() for Node, needs conversion for browser playback
- For browser: need to convert RawAudio to AudioBuffer or Blob for playback
