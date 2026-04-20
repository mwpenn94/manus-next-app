# NS5 Exhaustive Assessment Findings

## Signal Assessment (Recursive Optimization)
- **Fundamental Redesign**: Absent — core architecture is sound (React 19 + tRPC 11 + Express 4 + Drizzle)
- **Landscape**: Absent — broad coverage exists across all Manus features
- **Depth**: Present — specific areas may have shallow implementations or untested edge cases
- **Adversarial**: Present — system appears solid but needs stress-testing for hidden failure modes
- **Future-State**: Absent — premature until adversarial pass is clean

Executing: **Depth + Adversarial combined pass** (deepest possible assessment)

## Findings

### FINDING-1: Scheduler Poll Error (Transient DB Connection)
- **Severity**: Low (cosmetic/operational)
- **Details**: Scheduler polls every 60s and occasionally gets DB connection errors
- **Root cause**: Transient TiDB connection timeouts — table exists with correct schema, query works when tested directly
- **Status**: Error suppression already in place (10-minute dedup). This is expected behavior for serverless DB connections.
- **Action**: No fix needed — existing error suppression is appropriate

### FINDING-2: axe-core console.log in main.tsx
- **Severity**: None (dev-only, gated by import.meta.env.DEV)
- **Action**: No fix needed


### FINDING-3: IDOR Vulnerability — task.get lacks userId check (SECURITY)
- **Severity**: HIGH
- **Details**: `task.get` procedure fetches task by externalId without verifying the requesting user owns the task. Any authenticated user can view any other user's task details.
- **Affected procedures**: task.get, task.messages, task.addMessage, task.updateStatus, task.getTaskRating
- **Action**: Add userId ownership check to these procedures, or add userId filter to the DB query

### FINDING-4: IDOR Vulnerability — task.messages lacks userId check (SECURITY)
- **Severity**: HIGH
- **Details**: `task.messages` fetches messages by taskId (integer PK) without verifying ownership. Any authenticated user can read any task's messages.
- **Action**: Join with tasks table to verify userId ownership

### FINDING-5: IDOR Vulnerability — task.addMessage lacks userId check (SECURITY)
- **Severity**: HIGH
- **Details**: `task.addMessage` allows any authenticated user to inject messages into any task by taskId
- **Action**: Verify task ownership before allowing message insertion

### FINDING-6: IDOR Vulnerability — task.updateStatus lacks userId check (SECURITY)
- **Severity**: HIGH
- **Details**: `task.updateStatus` allows any authenticated user to change any task's status
- **Action**: Add userId ownership verification


### FINDING-7: IDOR — workspace.addArtifact, workspace.list, workspace.latest lack userId check
- **Severity**: HIGH
- **Details**: Any authenticated user can add/view workspace artifacts for any task by taskId

### FINDING-8: IDOR — file.list lacks userId check
- **Severity**: MEDIUM
- **Details**: Any authenticated user can list files for any task by externalId

### FINDING-9: IDOR — replay.events, replay.addEvent lack userId check
- **Severity**: HIGH
- **Details**: Any authenticated user can view/inject replay events for any task by taskId

### Summary of IDOR Pattern
The pattern is consistent: procedures that accept taskId (integer) or taskExternalId (string) without joining to verify ctx.user.id owns the task. This affects:
1. task.get
2. task.messages
3. task.addMessage
4. task.updateStatus
5. task.getTaskRating
6. workspace.addArtifact
7. workspace.list
8. workspace.latest
9. file.list
10. replay.events
11. replay.addEvent

**Fix approach**: Create a helper `verifyTaskOwnership(taskExternalId, userId)` or `verifyTaskOwnershipById(taskId, userId)` that throws FORBIDDEN if the user doesn't own the task. Apply to all affected procedures.


### FINDING-10: IDOR — slides.get lacks userId check
- **Severity**: MEDIUM
- **Details**: `slides.get` fetches slide deck by integer id without verifying ownership
- **Action**: Add userId check

### FINDING-11: IDOR — project.knowledge.delete lacks userId check
- **Severity**: MEDIUM
- **Details**: `project.knowledge.delete` deletes by integer id without verifying the knowledge item belongs to a project owned by ctx.user.id
- **Action**: Verify ownership chain (knowledge → project → user)

### FINDING-12: Dead code — registerStripeWebhook in stripe.ts
- **Severity**: LOW (cosmetic)
- **Details**: `registerStripeWebhook` function is defined but never called. The actual webhook handler is in `_core/index.ts` which calls `handleStripeWebhook`. The dead function creates confusion.
- **Action**: Remove the dead `registerStripeWebhook` function

### FINDING-13: Code execution sandbox — GOOD
- **Severity**: None (positive finding)
- **Details**: `executeCode` uses Node.js `vm.createContext` with a restricted sandbox. `setTimeout`, `setInterval`, `fetch`, `require`, and `process` are all explicitly set to `undefined`. 5-second timeout. This is well-implemented.

### FINDING-14: Rate limiting — GOOD
- **Severity**: None (positive finding)
- **Details**: Three tiers of rate limiting: stream (20/min), upload (30/min), API (200/min). Helmet security headers enabled.

### FINDING-15: Project router — GOOD ownership checks
- **Severity**: None (positive finding)
- **Details**: project.get, project.update, project.delete, project.tasks, project.assignTask, project.knowledge.list, project.knowledge.add all properly verify `project.userId !== ctx.user.id`

### FINDING-16: Skill, connector routers — GOOD ownership checks
- **Severity**: None (positive finding)
- **Details**: All skill and connector procedures properly use ctx.user.id

## Summary of Required Fixes

### HIGH Priority (Security)
1. Add ownership verification to: task.get, task.messages, task.addMessage, task.updateStatus, task.getTaskRating
2. Add ownership verification to: workspace.addArtifact, workspace.list, workspace.latest
3. Add ownership verification to: file.list
4. Add ownership verification to: replay.events, replay.addEvent
5. Add ownership verification to: slides.get
6. Add ownership verification to: project.knowledge.delete

### LOW Priority (Cleanup)
7. Remove dead `registerStripeWebhook` function from stripe.ts

