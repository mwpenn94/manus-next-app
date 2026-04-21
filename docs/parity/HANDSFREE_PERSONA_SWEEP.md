# Handsfree Persona Sweep — §L.35

> §L.28 personas running voice-primary flows.
> Validates that each persona type can complete core tasks entirely through voice interaction.

## Persona Definitions

The voice pipeline supports 6 configurable personas, each with adapted system prompts, voice defaults, and interaction patterns:

| Persona | System Prompt Style | Default Voice | Speech Rate | Target User |
|---------|-------------------|---------------|-------------|-------------|
| **default** | Helpful, concise, natural | en-US-AriaNeural | +0% | General users |
| **formal** | Professional, structured | en-US-AndrewNeural | -5% | Business contexts |
| **casual** | Friendly, conversational | en-US-JennyNeural | +5% | Everyday use |
| **professional** | Efficient, data-driven | en-US-BrianNeural | +0% | Work tasks |
| **friendly** | Enthusiastic, supportive | en-US-EmmaNeural | +5% | New users |
| **accessibility** | Clear, slow, simple | en-US-RogerNeural | -15% | Cognitive/hearing needs |

## Sweep Protocol

For each persona, complete the following 5 core voice-primary tasks:

1. **Simple Q&A**: Ask a factual question and receive a spoken answer
2. **Multi-turn conversation**: 5+ turn dialogue maintaining context
3. **Task execution**: Request a task (e.g., "create a document about X")
4. **Interruption test**: Interrupt the agent mid-response and redirect
5. **Error recovery**: Trigger a failure mode and verify graceful degradation

## Sweep Results

### Persona: default

| Task | Status | Latency (P50) | Naturalness (1-5) | Notes |
|------|--------|---------------|-------------------|-------|
| Simple Q&A | — | — | — | Awaiting first session |
| Multi-turn | — | — | — | |
| Task execution | — | — | — | |
| Interruption | — | — | — | |
| Error recovery | — | — | — | |

### Persona: formal

| Task | Status | Latency (P50) | Naturalness (1-5) | Notes |
|------|--------|---------------|-------------------|-------|
| Simple Q&A | — | — | — | Awaiting first session |
| Multi-turn | — | — | — | |
| Task execution | — | — | — | |
| Interruption | — | — | — | |
| Error recovery | — | — | — | |

### Persona: casual

| Task | Status | Latency (P50) | Naturalness (1-5) | Notes |
|------|--------|---------------|-------------------|-------|
| Simple Q&A | — | — | — | Awaiting first session |
| Multi-turn | — | — | — | |
| Task execution | — | — | — | |
| Interruption | — | — | — | |
| Error recovery | — | — | — | |

### Persona: professional

| Task | Status | Latency (P50) | Naturalness (1-5) | Notes |
|------|--------|---------------|-------------------|-------|
| Simple Q&A | — | — | — | Awaiting first session |
| Multi-turn | — | — | — | |
| Task execution | — | — | — | |
| Interruption | — | — | — | |
| Error recovery | — | — | — | |

### Persona: friendly

| Task | Status | Latency (P50) | Naturalness (1-5) | Notes |
|------|--------|---------------|-------------------|-------|
| Simple Q&A | — | — | — | Awaiting first session |
| Multi-turn | — | — | — | |
| Task execution | — | — | — | |
| Interruption | — | — | — | |
| Error recovery | — | — | — | |

### Persona: accessibility

| Task | Status | Latency (P50) | Naturalness (1-5) | Notes |
|------|--------|---------------|-------------------|-------|
| Simple Q&A | — | — | — | Awaiting first session |
| Multi-turn | — | — | — | |
| Task execution | — | — | — | |
| Interruption | — | — | — | |
| Error recovery | — | — | — | |

## Accessibility Persona Special Considerations

The accessibility persona includes additional adaptations per §L.35 Requirement 7:

| Adaptation | Implementation | Rationale |
|------------|---------------|-----------|
| Slower speech rate | `-15%` rate modifier | Cognitive processing disorder support |
| Clearer enunciation | Roger voice (clear male) | Hearing-impaired support |
| Simple sentences | System prompt: "Use simple sentence structures. Avoid jargon." | Cognitive accessibility |
| Longer VAD timeout | Could extend `VAD_SILENCE_TIMEOUT` per-persona | Allow more time for speech-impaired users |
| Confirmation prompts | System prompt: "Confirm understanding before proceeding" | Reduce miscommunication |

## Persona Configuration Storage

Per §L.28, voice and tone preferences are stored in the `user_preferences` table:

```typescript
// Stored in user_preferences JSON column
{
  voice: {
    voiceId: "en-US-AriaNeural",
    persona: "default",
    rate: "+0%",
    pitch: "+0Hz",
    volume: "+0%",
    language: "en",
    autoListen: false,
    voiceOnly: false
  }
}
```

The `useVoiceSession` hook reads these preferences on session start and applies them via the `config` WebSocket message.
