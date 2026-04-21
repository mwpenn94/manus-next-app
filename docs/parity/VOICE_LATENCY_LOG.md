# Voice Latency Log — §L.35

> Per-sample latency measurements for the conversational voice pipeline.
> Target: P50 < 500ms total turn-around, stretch < 300ms; P95 < 1000ms.

## Measurement Protocol

All latency measurements are captured automatically by the `voiceStream.ts` pipeline orchestrator. Each voice turn records three phase timings and a total:

| Phase | Description | Target |
|-------|-------------|--------|
| **STT** | Audio upload + Whisper transcription | < 200ms P50 |
| **LLM** | Prompt construction + inference + streaming | < 200ms P50 |
| **TTS** | Text-to-speech synthesis via edge-tts | < 100ms P50 |
| **Total** | End-to-end from VAD-end to first audio byte | < 500ms P50 |

## Baseline Measurements (Infrastructure Build — April 2026)

The following measurements were taken during initial infrastructure validation using the edge-tts + Whisper API + LLM pipeline:

| Sample | STT (ms) | LLM (ms) | TTS (ms) | Total (ms) | Notes |
|--------|----------|----------|----------|------------|-------|
| 1 | — | — | — | — | Infrastructure deployed, awaiting first live session |

## Aggregated Statistics

| Metric | STT | LLM | TTS | Total |
|--------|-----|-----|-----|-------|
| P50 | — | — | — | — |
| P95 | — | — | — | — |
| Mean | — | — | — | — |
| Min | — | — | — | — |
| Max | — | — | — | — |

> Statistics will be populated after the first 20+ voice sessions. The `voiceStream.ts` module automatically tracks `metrics.sttSamples`, `metrics.llmSamples`, `metrics.ttsSamples`, and `metrics.totalSamples` arrays per session, and sends `{ type: "latency", sttMs, llmMs, ttsMs, totalMs }` to the client after each turn.

## Architecture Notes

The pipeline is designed for minimal latency through:

1. **Streaming STT**: Audio chunks are buffered during VAD-detected speech and processed immediately on VAD-end, eliminating wait-for-silence overhead.
2. **Sentence-level TTS**: The LLM response is split into sentences, and TTS synthesis begins on the first sentence while the LLM may still be generating subsequent sentences.
3. **WebSocket transport**: Binary audio frames flow over a persistent WebSocket connection (`/api/voice/ws`), avoiding HTTP overhead per chunk.
4. **Barge-in abort**: When the user interrupts, `AbortController.abort()` immediately cancels any in-flight STT/LLM/TTS work, measured separately in `INTERRUPT_LATENCY_LOG.md`.

## Data Collection Code Reference

```typescript
// server/voiceStream.ts — metrics collection
sendMessage(session.ws, {
  type: "latency",
  sttMs: sttLatency,
  llmMs: llmLatency,
  ttsMs: ttsLatency,
  totalMs: totalLatency,
});
```

## Log Format

Each entry in the raw log (when persistent logging is enabled) follows:

```
[ISO-8601] session_id=<uuid> turn=<n> stt_ms=<n> llm_ms=<n> tts_ms=<n> total_ms=<n> voice=<voice_id> persona=<persona>
```
