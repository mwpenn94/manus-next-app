# Convergence Pass 2 — Server-Side Audit Findings

## Summary
5/10 workers succeeded. Key findings across agent stream, tools, SSE delivery, and auth.

## CRITICAL FIXES TO APPLY (Prioritized by Impact)

### 1. Agent Stream — JSON.parse safety for tool arguments
- File: server/agentStream.ts (tool call argument parsing)
- Problem: Malformed tool_call arguments from LLM can crash the stream
- Fix: Wrap JSON.parse of tool arguments in try/catch, return error to LLM

### 2. Agent Stream — userStreamCounts cleanup in finally block
- File: server/agentStream.ts (stream count tracking)
- Problem: If stream errors, the count is never decremented → user gets locked out
- Fix: Move decrement to finally block

### 3. Agent Tools — Shell command output truncation
- File: server/agentTools.ts (execute_code/shell tool)
- Problem: Large stdout can crash the service or exceed LLM context
- Fix: Truncate output to 100KB with "(truncated)" suffix

### 4. Agent Tools — Shell command timeout
- File: server/agentTools.ts (execute_code/shell tool)
- Problem: Long-running commands hang indefinitely
- Fix: Add 30s timeout to exec calls

### 5. SSE Delivery — Heartbeat cleanup on res close
- File: server/_core/index.ts (stream endpoint)
- Problem: Heartbeat timer not cleared when response stream closes
- Fix: Add res.on("close") cleanup alongside req.on("close")

## MEDIUM FIXES TO APPLY

### 6. Agent Stream — finish_reason 'stop' handling
- Verify shouldContinue is set to false on 'stop'

### 7. SSE Delivery — Request body validation
- Add basic validation for messages array and taskExternalId

### 8. Agent Tools — More descriptive error messages
- Propagate actual error.message instead of generic "failed"

## ALREADY HANDLED (from Pass 1)
- onArtifact try/catch ✓
- SSE buffer accumulation ✓
- JSON.parse safety in TaskContext ✓
- Stream abort handling ✓

## NOTE: Auth/Security findings are mostly framework-level
The auth concerns (CSRF, rate limiting, session duration) are handled by the 
Manus OAuth framework (_core). These are platform-level concerns, not app bugs.
Cookie security is managed by the template. No action needed for app-level code.
