# Cap #12: Voice Input (STT)
**Status:** GREEN
**Implementation:** `client/src/hooks/useVoiceInput.ts` — Browser SpeechRecognition API with interim results.
**Manus Alignment:** Matches Manus Pro's voice input capability using browser-native APIs.
**Quality Note:** Falls back gracefully if SpeechRecognition is not supported. Interim results shown in real-time.
