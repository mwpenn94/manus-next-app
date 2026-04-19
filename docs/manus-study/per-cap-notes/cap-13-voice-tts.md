# Cap #13: Voice TTS (Text-to-Speech)
**Status:** GREEN
**Implementation:** `client/src/hooks/useTTS.ts` — Browser SpeechSynthesis API with play/pause/stop controls on every assistant message.
**Manus Alignment:** Completes the voice loop (STT + TTS). Listen button on each MessageBubble.
**Quality Note:** Strips markdown before speaking. Supports pause/resume. Voice selection uses system default.
