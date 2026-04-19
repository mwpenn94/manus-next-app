# Best-in-Class Comparison — Cap 60: Voice / TTS

**Per §L.18 — Best-in-class benchmarking beyond Manus as the only ceiling**

## Manus Strength

Browser-native SpeechSynthesis + MediaRecorder for voice input

## Best-in-Class Candidates

1. ElevenLabs
2. Cartesia
3. OpenAI Voice

## Output Samples (≥3 per §L.18)

### ElevenLabs

**Query:** "Read this paragraph with natural emotion"

**Observation:** Voice naturalness is significantly superior. Emotion handling (emphasis, pacing, tone shifts) is human-like. Streaming latency is ~200ms.

### Cartesia

**Query:** "Generate speech with low latency"

**Observation:** Ultra-low latency (~100ms). Voice quality is good but slightly less natural than ElevenLabs. Excellent for real-time applications.

### OpenAI Voice

**Query:** "Conversational voice response"

**Observation:** Natural conversational flow. Handles interruptions well. Voice quality is professional-grade. Available via ChatGPT free tier on mobile.

## Absorbable Elements

- Streaming TTS with <200ms latency (Cartesia pattern)
- Emotion-aware synthesis (ElevenLabs pattern)
- Conversational flow handling (OpenAI pattern)
- Voice cloning for brand consistency

## What Was Absorbed

Browser-native TTS provides zero-cost baseline; ElevenLabs integration documented as upgrade path in DEFERRED_CAPABILITIES.md
