# Interrupt Latency Log — §L.35

> Per-interrupt timing measurements for barge-in handling.
> Target: Interrupt latency < 100ms from user speech detection to agent audio stop.

## Measurement Protocol

Interrupt latency is measured as the time between:
- **Start**: Client sends `{ type: "interrupt" }` message over WebSocket
- **End**: Server aborts current pipeline via `AbortController.abort()` and sends `{ type: "agent_audio_end" }`

The client-side `useVoiceSession` hook also immediately stops local audio playback (`stopAudioPlayback()`) upon sending the interrupt, providing perceived-instant interruption regardless of server round-trip.

## Architecture

```
User speaks during agent TTS output
  → Browser VAD detects energy > threshold
  → Client sends { type: "interrupt" } via WebSocket
  → Server: handleInterrupt()
    → AbortController.abort() (cancels in-flight TTS/LLM)
    → State → "interrupted"
    → Sends { type: "agent_audio_end" }
    → 50ms delay → State → "listening"
  → Client: stopAudioPlayback() (clears audio queue)
```

| Component | Expected Latency | Notes |
|-----------|-----------------|-------|
| Client VAD detection | < 10ms | `requestAnimationFrame` loop with RMS energy check |
| WebSocket message send | < 5ms | Binary frame over persistent connection |
| Server abort + state change | < 5ms | `AbortController.abort()` is synchronous |
| Client audio queue clear | < 1ms | Array reset |
| **Total perceived** | **< 25ms** | User hears silence within one animation frame |

## Baseline Measurements

| Sample | Client→Server (ms) | Server Abort (ms) | Total (ms) | Notes |
|--------|--------------------|--------------------|------------|-------|
| 1 | — | — | — | Infrastructure deployed, awaiting first live session |

## Aggregated Statistics

| Metric | Client→Server | Server Abort | Total |
|--------|--------------|--------------|-------|
| P50 | — | — | — |
| P95 | — | — | — |
| Mean | — | — | — |

> Statistics will be populated after the first 10+ interrupt events. The `voiceStream.ts` module tracks `metrics.interruptions` count per session.

## Code Reference

```typescript
// server/voiceStream.ts
function handleInterrupt(session: VoiceSession): void {
  if (session.state === "speaking" || session.state === "thinking") {
    session.metrics.interruptions++;
    if (session.abortController) {
      session.abortController.abort();
      session.abortController = null;
    }
    setState(session, "interrupted");
    sendMessage(session.ws, { type: "agent_audio_end" });
    setTimeout(() => {
      if (session.state === "interrupted") {
        setState(session, "listening");
      }
    }, 50);
  }
}
```
