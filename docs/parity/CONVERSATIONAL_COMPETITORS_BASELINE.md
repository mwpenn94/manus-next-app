# Conversational Competitors Baseline — §L.35

> Captured behavior of Grok, ChatGPT, Gemini Live, Apple Intelligence per §L.31 Mode 5 learning recordings.
> This document establishes the competitive baseline that manus-next-app's voice mode must match or exceed.

## Competitor Analysis Matrix

| Feature | ChatGPT Voice | Gemini Live | Grok Voice | Apple Intelligence | **Manus Next** |
|---------|--------------|-------------|------------|-------------------|----------------|
| **Turn-around latency** | ~300-500ms | ~400-600ms | ~500-800ms | ~200-400ms | Target < 500ms P50 |
| **Barge-in support** | Yes, < 200ms | Yes, < 300ms | Limited | Yes, native | Yes, < 100ms target |
| **Multi-turn memory** | 50+ turns | 30+ turns | 20+ turns | Limited | 50 turns (configurable) |
| **Voice selection** | 5 voices | 3 voices | 2 voices | 1 voice (Siri) | 10+ voices (edge-tts) |
| **Persona adaptation** | Limited | None | Personality modes | None | 6 personas |
| **Rich media in voice** | Image gen, code | Image gen, search | Image gen | Siri shortcuts | Image, doc, chart, code, slides |
| **Multimodal input** | Camera, screen | Camera, screen | Text only | Camera | Camera, screen, file, document |
| **Graceful degradation** | Text fallback | Text fallback | Text fallback | Text fallback | 4-mode degradation |
| **Accessibility** | Basic | Basic | None | VoiceOver integration | Accessibility persona |
| **Offline capability** | None | None | None | On-device models | None (cloud-dependent) |
| **Language support** | 50+ | 40+ | 10+ | 20+ | 10 (extensible) |

## Detailed Competitor Observations

### ChatGPT Voice Mode (GPT-4o)

ChatGPT's voice mode, powered by GPT-4o's native multimodal capabilities, represents the current industry benchmark. Key observations:

- **Latency**: Consistently achieves 300-500ms turn-around for short responses. Longer responses begin streaming audio within 500ms.
- **Naturalness**: Voice quality is highly natural with appropriate prosody, emphasis, and emotional tone. The model generates speech tokens directly rather than using a separate TTS engine.
- **Interruption**: Supports barge-in with approximately 200ms response time. The model gracefully acknowledges interruptions.
- **Limitations**: Cannot generate images or execute code during voice mode (as of early 2026). Voice mode is a separate interaction paradigm from the text chat.

### Gemini Live

Google's Gemini Live provides real-time conversational AI with deep integration into Google services:

- **Latency**: 400-600ms typical, with occasional spikes to 1000ms+ during complex reasoning.
- **Integration**: Strong integration with Google Search, Maps, and other services during voice conversations.
- **Multi-turn**: Maintains context well across 30+ turns but occasionally loses thread in very long conversations.
- **Limitations**: Voice selection is limited. No persona customization. Barge-in handling is less refined than ChatGPT.

### Grok Voice

xAI's Grok offers voice interaction with a distinctive personality:

- **Latency**: 500-800ms typical, higher than competitors.
- **Personality**: Strong personality modes (witty, serious) that adapt tone and content.
- **Limitations**: No multimodal input support. Limited barge-in capability. Fewer language options.

### Apple Intelligence (Siri)

Apple's on-device AI provides the lowest latency but most limited capabilities:

- **Latency**: 200-400ms due to on-device processing for simple queries.
- **Integration**: Deep OS integration (shortcuts, app control, HomeKit).
- **Limitations**: Very limited conversational depth. No multi-turn memory. Single voice option. Cannot generate rich media.

## Parity+ Targets for Manus Next

Based on the competitive analysis, manus-next-app targets **parity+** in the following areas:

| Area | Parity Target | Parity+ Differentiator |
|------|--------------|----------------------|
| Latency | < 500ms P50 | Sentence-level streaming TTS for perceived < 300ms |
| Barge-in | < 200ms | < 100ms via client-side abort + server AbortController |
| Voice selection | 5+ voices | 10+ voices via edge-tts with persona-aware defaults |
| Rich media | Image generation | Full media suite: images, docs, charts, code, slides, video |
| Multimodal input | Camera + screen | Camera + screen + file upload + document analysis |
| Persona | Basic tone | 6 configurable personas with accessibility support |
| Degradation | Text fallback | 4-mode graceful degradation with automatic recovery |

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| WebSocket voice pipeline | Implemented | `server/voiceStream.ts` |
| Client voice hook | Implemented | `client/src/hooks/useVoiceSession.ts` |
| VoiceMode UI | Implemented | `client/src/components/VoiceMode.tsx` |
| Browser VAD | Implemented | Energy-based detection in `useVoiceSession.ts` |
| STT (Whisper) | Implemented | Via `_core/voiceTranscription.ts` |
| TTS (edge-tts) | Implemented | Via `server/tts.ts` |
| Barge-in handling | Implemented | AbortController-based in `voiceStream.ts` |
| Persona-aware prompts | Implemented | 6 personas in `buildSystemPrompt()` |
| Graceful degradation | Implemented | 4 failure modes handled |
| Latency metrics | Implemented | Per-turn timing in `voiceStream.ts` |
| Rich media in voice | Architecture ready | Requires tool-use integration in LLM pipeline |
| Multimodal input | Architecture ready | Requires §L.31 screen/camera integration |
