# Pass 62 Bug Analysis

## Bug 1: User messages not persisting in chat
**Root cause**: The `addMessage` in TaskContext.tsx calls `addMessageMutation.mutate()` which is
fire-and-forget. The mutation itself works, BUT the issue is that `task.serverId` may not be set
yet when the first user message is sent (race condition between createTask onSuccess setting
serverId and the first addMessage call).

**Evidence**: In `createTask` (line 270), the serverId is set in `onSuccess` callback. But the
first addMessage for the initial user message is also done in `onSuccess` (line 282). For
SUBSEQUENT user messages sent during streaming, `addMessage` checks `task.serverId` (line 327).
If the createTask mutation hasn't completed yet, serverId is undefined and the message won't persist.

**Fix**: The initial message persistence in createTask looks correct. The issue is likely that
when the user sends a follow-up message during streaming, the addMessage dedup guard (line 319-324)
may be filtering it out if the content matches something already in the last 5 messages.

## Bug 2: Streaming progress lost on navigation
**Root cause**: When user navigates away, `setActiveTask` (line 296-308) resets `messagesLoaded: false`.
When they return, `serverMessagesQuery` refetches from DB. But streaming messages are only persisted
to DB via `addMessage` at stream END (the final accumulated content). Intermediate tool steps and
partial content are only in React state — they're lost on navigation.

**Fix**: Need to persist assistant messages incrementally during streaming, not just at the end.
The `onDone` callback in the stream should trigger persistence, but intermediate tool actions
are never persisted as individual messages.

## Bug 3: Replay "link copied" but no link
**Root cause**: TaskCompletedCard has a share button that calls `onShare` callback. The callback
likely just does `navigator.clipboard.writeText(url)` with a URL that doesn't resolve to anything
useful. The ReplayPage.tsx exists at `/replay/:taskId` but uses numeric task IDs and requires auth.
There's no public share URL generation.

**Fix**: Either (a) generate a real shareable replay URL and copy that, or (b) navigate to the
in-app replay page instead of copying a link.

## Bug 4: Webapp preview is static/broken
**Root cause**: The webapp preview iframe at `/api/webapp-preview/` serves static files. If the
build failed or the files aren't correct, the iframe shows broken HTML. Also, the iframe may have
sandbox restrictions that prevent JavaScript execution.

**Fix**: Check iframe sandbox attributes and ensure the build output is correct.

## Bug 5: Deploy hangs in chat
**Root cause**: The `deploy_webapp` tool in agentTools.ts does the S3 upload with retry logic.
If the upload takes too long or fails silently, the SSE stream may not send a completion event.
Also, the `buildWebappProject()` function runs `npm run build` which can hang if there are
compilation errors.

**Fix**: Add timeout to the build step and ensure errors are properly surfaced.

## Bug 6: Task chat not aligned with Manus
**Root cause**: Manus shows step-by-step progress with collapsible phases, file diffs, knowledge
badges, and a step counter. Our app shows streaming text with action cards but doesn't have the
same structured phase display.

**Fix**: This is a larger UX alignment effort. Focus on the functional bugs first.
