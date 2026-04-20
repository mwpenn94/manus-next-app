# NS7 Diagnosis: Chat Persistence & Continuous Execution

## Issue 1: Chat messages not persisting after leaving and reopening

**Root Cause**: The message hydration flow in TaskContext.tsx works correctly for loading
messages from the DB when a task is reopened. The issue is that `serverMessagesQuery` uses
`taskId: activeServerId!` (the numeric DB id), and the query is only enabled when
`needsMessageLoad` is true (i.e., `messagesLoaded === false`).

When a task is loaded from the server task list, it starts with `messagesLoaded: false` and
`messages: []`. The `serverMessagesQuery` fires and loads messages. This SHOULD work.

**Potential Issues**:
1. The `serverMessagesQuery` might not re-fire when switching between tasks because the
   `enabled` flag depends on `needsMessageLoad` which depends on `activeTask` which changes.
2. The merge logic at line 156 uses content-based dedup (`serverMsgIds = new Set(serverMsgs.map(m => m.content))`)
   which could cause issues if two messages have the same content.
3. The query key might be stale — when `activeServerId` changes, the old query result
   might be returned from cache.

**Fix**: Add `refetchOnMount: true` and ensure the query key properly invalidates when
switching tasks. Also, the `messagesLoaded` flag should be reset when navigating away.

## Issue 2: Cannot submit follow-up prompts during execution

**Root Cause in TaskView.tsx**:
- Line 1099: `if (!input.trim() || !task || streaming) return;` — handleSend early-returns when `streaming` is true
- Line 1805: Enter key handler checks `!streaming`
- Line 1810: `disabled={streaming}` — textarea is completely disabled during streaming
- Line 1886: Send button is replaced by Stop button during streaming

In Manus, users CAN type and submit new messages while the agent is working. The new message
gets queued and the agent processes it after the current step.

**Fix**: Allow typing and sending during streaming. When a follow-up is sent during streaming:
1. Keep the textarea enabled (remove `disabled={streaming}`)
2. Allow handleSend to work during streaming — add the user message to the conversation
3. The SSE stream continues; the follow-up gets picked up in the next agent turn
4. Show both the stop button AND the send button

## Issue 3: Artificial execution step limit (MAX_TOOL_TURNS = 20)

**Root Cause in agentStream.ts**:
- Line 25: `const MAX_TOOL_TURNS = 20`
- Line 287: `const maxTurns = mode === "speed" ? 8 : mode === "max" ? 25 : MAX_TOOL_TURNS;`
- Line 552-558: Shows "[Reached maximum number of tool execution steps]" when limit hit

Manus has no visible step limit — it continues until the task is complete.

**Fix**: Increase MAX_TOOL_TURNS significantly (e.g., 100) and remove the user-visible
"reached maximum" message. Instead, if the agent truly needs to stop, it should produce
a natural conclusion. Also update the mode limits accordingly.
