# Optimization DAG — Prioritized by Expected Value

Based on 9 parallel worker assessments. Average parity score: 3.2/10.
Total gaps identified: 62. Prioritized by expected value (impact × feasibility).

## TIER 1: CRITICAL — Design System Foundation (Blocks everything else)

### 1.1 Fix Light Theme Color Palette
- **File:** `client/src/index.css`
- **Gap:** Using generic oklch values instead of Manus warm editorial palette
- **Fix:** Replace background/foreground with Manus tokens (#f8f8f7, #34322d)
- **Impact:** 10/10 — Every surface renders wrong without this

### 1.2 Fix Heading Font Stack
- **File:** `client/src/index.css`
- **Gap:** Missing Manus serif heading font (Instrument Serif / Georgia fallback)
- **Fix:** Add `--font-heading: 'Instrument Serif', Georgia, 'Noto Serif SC', serif;`
- **Impact:** 9/10 — Brand identity depends on this

### 1.3 Fix Thinking Shimmer Speed
- **File:** `client/src/index.css`
- **Gap:** 3s animation vs Manus standard 2s
- **Fix:** Change `animation: thinking-shimmer 3s` → `2s`
- **Impact:** 8/10 — Core streaming experience

## TIER 2: HIGH — Core Interaction Patterns

### 2.1 Home Screen Hero Copy
- **File:** `client/src/pages/Home.tsx`
- **Gap:** Missing the canonical "What can I do for you?" serif headline
- **Fix:** Replace current greeting with single serif H1
- **Impact:** 9/10 — First impression, brand voice

### 2.2 Suggested Follow-ups After Task Completion
- **File:** `client/src/pages/TaskView.tsx`
- **Gap:** No follow-up prompts after task completes
- **Fix:** Add SuggestedFollowups component with 2-3 contextual prompts
- **Impact:** 8/10 — Engagement mechanism, reduces friction

### 2.3 Agent Persona ("Trusted Colleague")
- **File:** `server/agentStream.ts`
- **Gap:** Generic assistant persona vs Manus's peer-level colleague
- **Fix:** Add persona section to system prompt
- **Impact:** 8/10 — Tone of every response

### 2.4 Interactive Error Handling (User Choice)
- **File:** `client/src/pages/TaskView.tsx`
- **Gap:** Generic retry button vs Manus's "surface blocker + offer options + ask"
- **Fix:** Add UserChoiceErrorHandler component
- **Impact:** 7/10 — Error recovery UX

### 2.5 Action Badges (Collapsible Tool Calls)
- **File:** `client/src/pages/TaskView.tsx`
- **Gap:** Tool calls not rendered as compact collapsible badges
- **Fix:** Refactor tool display to use ActionBadge component
- **Impact:** 8/10 — Core thread readability

## TIER 3: HIGH — Voice & Motion

### 3.1 Voice Input: Press-and-Hold
- **File:** `client/src/pages/Home.tsx`
- **Gap:** Tap-to-toggle vs Manus press-and-hold pattern
- **Fix:** Replace onClick with onMouseDown/onMouseUp + onTouchStart/onTouchEnd
- **Impact:** 6/10 — Mobile UX safety

### 3.2 Correct Motion Timing
- **File:** `client/src/index.css` + components
- **Gap:** Various animation durations don't match Manus spec
- **Fix:** Standardize to 200ms micro, 350ms page, 600ms emphasis
- **Impact:** 5/10 — Polish

### 3.3 Task Complete State (Feedback + Follow-ups)
- **File:** `client/src/pages/TaskView.tsx`
- **Gap:** No "How was this result?" feedback row + star rating
- **Fix:** Add TaskCompleteRow component
- **Impact:** 7/10 — Quality signal collection

## TIER 4: MEDIUM — Structural Alignment

### 4.1 Sidebar Quick-Action Icons
- **Gap:** Missing settings gear, grid view, connector icon cluster at sidebar bottom
- **Fix:** Add icon cluster to AppLayout sidebar

### 4.2 Knowledge Recall Badges
- **Gap:** No "Knowledge recalled (N)" rollup badges in thread
- **Fix:** Add KnowledgeRecallBadge component

### 4.3 Plan Rollups with Step Counter
- **Gap:** No compact plan badge with "3/3" progress
- **Fix:** Add PlanRollup component

### 4.4 Model Badge Per-Turn
- **Gap:** No "Max" badge next to agent turns
- **Fix:** Add model badge to message header

### 4.5 Dark Theme Background Tokens
- **Gap:** Missing login/mask/overlay dark tokens
- **Fix:** Add to .dark {} block in index.css

## EXECUTION ORDER (Dependencies)
1. 1.1 → 1.2 → 1.3 (foundation)
2. 2.1 (independent)
3. 2.3 → 2.5 → 2.2 → 2.4 (agent → display → interaction)
4. 3.1, 3.2, 3.3 (independent)
5. 4.x (all independent, lower priority)
