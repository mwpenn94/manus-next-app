# Voice Degradation Log — §L.35

> Failure-mode handling for all 4 graceful degradation scenarios.
> Target: All 4 failure modes handled gracefully with documented behavior.

## Failure Modes

### Mode 1: Slow Network

| Aspect | Behavior |
|--------|----------|
| **Detection** | WebSocket latency > 2000ms or connection timeout |
| **Degradation** | Text-first mode: agent text response displayed immediately; voice audio delivered when available |
| **User Experience** | User sees text response instantly; audio plays as a delayed narration |
| **Recovery** | Automatic return to full voice mode when latency normalizes |
| **Implementation** | `voiceStream.ts` sends `{ type: "agent_text" }` before `{ type: "agent_audio" }` — client always has text |

### Mode 2: Microphone Permission Denied

| Aspect | Behavior |
|--------|----------|
| **Detection** | `getUserMedia()` throws `NotAllowedError` or `NotFoundError` |
| **Degradation** | Text input mode with clear messaging |
| **User Experience** | VoiceMode shows "mic_denied" state with explanation; text input field appears |
| **Recovery** | User can grant permission and retry via "Start" button |
| **Implementation** | `useVoiceSession.ts` catches mic error → sets state to `"mic_denied"` → shows error message |

### Mode 3: Speaker/Audio Output Unavailable

| Aspect | Behavior |
|--------|----------|
| **Detection** | `AudioContext.decodeAudioData()` fails or no audio output device |
| **Degradation** | Text-only mode: agent responses shown as text without audio playback |
| **User Experience** | Conversation continues normally; agent text appears in the VoiceMode overlay |
| **Recovery** | Automatic if audio device becomes available |
| **Implementation** | `useVoiceSession.ts` `playNextAudioChunk()` catches decode errors silently; text is always sent |

### Mode 4: STT/TTS Model Unavailable

| Aspect | Behavior |
|--------|----------|
| **Detection** | Whisper API returns error or edge-tts process fails |
| **Degradation** | Cloud API fallback chain: Whisper API → text input; edge-tts → text-only output |
| **User Experience** | Agent sends error message suggesting text input; conversation continues in text mode |
| **Recovery** | Automatic retry on next voice turn |
| **Implementation** | `voiceStream.ts` `processVoiceTurn()` catches STT/TTS errors → sends error message → returns to "listening" state |

## Degradation Event Log

| # | Timestamp | Session ID | Failure Mode | Degradation Applied | Recovery Time | Notes |
|---|-----------|-----------|--------------|---------------------|---------------|-------|
| 1 | — | — | — | — | — | Infrastructure deployed, awaiting first failure event |

## Code References

### Microphone Permission Denied
```typescript
// client/src/hooks/useVoiceSession.ts
try {
  stream = await navigator.mediaDevices.getUserMedia({ audio: { ... } });
} catch (err) {
  setState("mic_denied");
  setError("Microphone access denied. Please allow microphone access to use voice mode.");
  return;
}
```

### STT Failure Graceful Degradation
```typescript
// server/voiceStream.ts
} catch (err) {
  console.error("[VoiceStream] STT failed:", err);
  sendMessage(session.ws, { type: "error", message: "Speech recognition failed. Please try again." });
  setState(session, "listening");
  return;
}
```

### TTS Failure Graceful Degradation
```typescript
// server/voiceStream.ts
} catch (err) {
  console.error("[VoiceStream] TTS failed:", err);
  // Graceful degradation: text was already sent, just note TTS failure
  sendMessage(session.ws, { type: "agent_audio_end" });
}
```

## Design Principle

The voice pipeline follows a **text-first, audio-enhanced** architecture. Every agent response is sent as text (`agent_text`) before audio (`agent_audio`). This means that any audio failure — whether from network, TTS, or speaker issues — always degrades to a fully functional text conversation rather than a silent failure.
