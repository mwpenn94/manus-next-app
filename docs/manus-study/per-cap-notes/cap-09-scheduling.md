# Cap #9: Scheduling (Server-Side Polling + UI)
**Status:** GREEN
**Implementation:** `server/scheduler.ts` (60s polling loop) + `client/src/pages/SchedulePage.tsx` + cron-parser.
**Manus Alignment:** Full scheduling with cron expressions, one-time and recurring tasks, auto-execution via agent stream.
**Quality Note:** Race condition protection via isRunning guard. Error suppression for repeated DB connection failures.
