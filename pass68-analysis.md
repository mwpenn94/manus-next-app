# Pass 68 Analysis — Three Next Steps

## Step 1: Live E2E Test — Verify Compact Card in Real Pipeline

**Current State:** The compact WebappPreviewCard was rewritten in Pass 67. Tests pass but we haven't verified it renders correctly in the actual browser during a real build/deploy pipeline run.

**What to verify:**
- Card renders with status badge, URL bar, Visit/Manage buttons
- No iframe, no device toggles
- No vertical text overflow
- No duplicate cards (webapp_preview + webapp_deployed)
- No raw URLs in text content

**Approach:** Open the app in browser, trigger a task that builds a webapp, observe the chat rendering.

## Step 2: Step Indicator Polish — Manus Parity

**Current State (Good):**
- `ActiveToolIndicator.tsx` — Real-time presence with "Manus is using [Tool]" header, live pulse, elapsed timer
- 17 tool types with icons, colors, descriptions
- `ActionStep` — Individual step rendering with status icons (active=spinner, done=check, error=alert)
- `ActionGroupHeader` — Groups 3+ consecutive similar actions into collapsible groups
- `GroupedActionsList` — Renders grouped + single actions
- Collapsible "N steps completed" accordion in MessageBubble

**Manus Reference Patterns (from manus-taskview-reference.md):**
- "8 steps completed" collapsible section
- Individual steps: "Creating file: src/App.tsx" [show]
- "Reasoning about next steps..." [show]
- "File operations App.tsx, index.css, App.tsx" [3/3 ∨]
- "Deploying webapp: v1.0-counter-app" [show]

**Gaps to Fix:**
1. **Icon alignment** — Manus uses specific icons per action type. Our `ActionIcon` component needs to be verified against the Manus icon set.
2. **Step label format** — Manus uses "Creating file: src/App.tsx" format. Our `ActionLabel` uses "Creating `src/App.tsx`" with code formatting. The difference is subtle but the Manus format is cleaner.
3. **Group label format** — Manus shows "File operations App.tsx, index.css, App.tsx" with file names inline. Our `ActionGroupHeader` already does this for file_ops groups.
4. **"show" toggle** — Manus has a "show" button on each step to expand preview. Our ActionStep already has this.
5. **Animation timing** — Need to verify transitions are smooth and not jarring.

**Assessment: Step indicators are already at ~90% parity.** Minor polish needed:
- Ensure the step label format matches exactly
- Verify icon consistency
- Check that the "steps completed" text matches Manus

## Step 3: Chat Message Ordering Audit

**Current State:**
- Messages are stored in `task.messages` array in TaskContext
- During streaming: messages are filtered to hide mid-stream card types
- Streaming content renders BELOW the action steps in the streaming bubble
- When stream completes, `addMessage` is called with the accumulated content

**Manus Reference Ordering:**
1. User message (right-aligned)
2. Agent clarification/response text
3. Action steps (collapsible "N steps completed")
4. Agent summary text (below steps)
5. Webapp card (if applicable)
6. Task completed badge
7. Rating + follow-ups

**Current Ordering in Our App:**
1. User message ✓
2. Agent response text ✓
3. Action steps (collapsible) ✓
4. Webapp card ✓ (now compact)
5. Task completed badge ✓
6. Rating + follow-ups ✓

**Key Question:** During a multi-tool run, does the final summary text appear AFTER all action steps?

**Analysis from TaskReplayOverlay:** The replay system uses `offsetMs + actions.length * 500` for assistant messages, ensuring action steps come BEFORE the summary text. This is correct.

**Analysis from streaming bubble:** In the streaming bubble (lines 3762-3810):
1. ActiveToolIndicator (current tool)
2. GroupedActionsList (all actions so far)
3. Step progress counter
4. Stream content (text)

This ordering is CORRECT — actions appear above the streaming text.

**Analysis from completed messages:** In MessageBubble:
1. Text content (Streamdown)
2. Actions accordion ("N steps completed")
3. Action buttons (TTS, etc.)

Wait — this is WRONG. In the completed message, the text content renders BEFORE the actions accordion. But in Manus, the actions appear BEFORE the summary text.

**FIX NEEDED:** In MessageBubble, swap the order so actions render BEFORE text content for assistant messages.
