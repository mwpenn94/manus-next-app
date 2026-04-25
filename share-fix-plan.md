# Share Link Fix Plan

## Current State
1. **Share button in TaskView header** → opens ShareDialog which creates a share token
2. **ShareDialog** → creates a share via tRPC, returns `/shared/{token}` URL
3. **SharedTaskView** at `/shared/:token` → bare-bones read-only view with minimal styling
4. **handleShareUrl()** → copies `window.location.origin/task/{task.id}` (the task URL, not a share link)

## Problems Identified
1. **handleShareUrl copies the task URL, not a share link** — this is what the user reported. When they tap Share, it copies the task prompt text or the direct task URL, not a proper shareable link.
2. **SharedTaskView is extremely bare-bones** — no proper header, no action steps, no tool indicators, no output cards. Just basic message bubbles.
3. **Route is `/shared/:token`** — Manus uses `/share/{id}`, we should match.

## Fix Plan

### Phase 1: Fix the Share Button Flow
The `handleShareUrl()` function copies the task URL directly. The `handleShareDialog()` opens the ShareDialog for authenticated users. The issue is:
- On mobile, the Share button in the More menu calls `handleShareDialog`
- For unauthenticated users, it falls back to `handleShareUrl()` which copies the task URL
- Even for authenticated users, the ShareDialog creates a share link but the flow is clunky

**Fix**: Make the Share button:
1. Auto-create a share link (if none exists) and copy the share URL to clipboard
2. Show a toast with "Link copied!" 
3. The ShareDialog can remain for managing existing shares (delete, password, etc.)

### Phase 2: Upgrade SharedTaskView
Make the shared task view look like the Manus share page:
- Proper header with logo, task title, copy link, action icons
- Message rendering that includes action steps, tool indicators, output cards
- Loading skeleton with pulse animations
- Sticky bottom bar with "Try Manus" CTA
- OG meta tags for social sharing preview
- Route change: `/shared/:token` → `/share/:token`

### Phase 3: Route Change
- Change route from `/shared/:token` to `/share/:token`
- Update all references in ShareDialog, share router, etc.
