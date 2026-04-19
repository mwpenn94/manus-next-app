# Cap #3: Mode Routing (Speed/Quality/Max)
**Status:** GREEN
**Implementation:** `server/agentStream.ts` AgentMode enum + `client/src/components/ModeToggle.tsx` 3-tier selector.
**Manus Alignment:** Maps to Manus Pro's tier system. Speed=5 turns, Quality=8 turns, Max=12 turns with enhanced system prompt.
**Quality Note:** Mode selection persists per-task. Cost visibility indicator in TaskView header shows estimated cost per mode.
