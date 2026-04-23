# Session 22: Parity Expert Convergence Assessment

## Scope
Three features being optimized as a unified system:
1. **Memory Importance Scoring** — Weight memories by access frequency and recency
2. **Agent Strategy Telemetry** — Track self-correction success/failure across tasks
3. **Image Annotation in Lightbox** — Draw arrows, circles, text on images for agent feedback

---

## Signal Assessment (All Pass Types)

| Pass Type | Signals Present? | Assessment |
|---|---|---|
| **Fundamental Redesign** | Absent | Core architecture (memory table, agent loop, React lightbox) is sound. No structural flaws requiring ground-up rebuild. |
| **Landscape** | **PRESENT** | Features have not been challenged against alternatives. Memory scoring could use exponential decay vs linear. Telemetry has no persistence layer yet. Annotation has no canvas library chosen. |
| **Depth** | Present | Assumptions untested: What scoring formula? What telemetry schema? What annotation UX for touch vs mouse? |
| **Adversarial** | Absent (premature) | Features don't exist yet to stress-test. |
| **Future-State** | Absent (premature) | Need working implementation first. |

**Executing: Landscape Pass** (highest priority with signals present)

---

## LANDSCAPE PASS: Feature 1 — Memory Importance Scoring

### Current State
- `lastAccessedAt` tracks when a memory was last injected
- `archiveStaleMemories()` archives after 30 days of non-access
- No access frequency tracking
- No importance weighting — all memories treated equally within their tier

### Gaps Identified
1. **No access frequency counter** — A memory accessed 50 times in 29 days is treated the same as one accessed once in 29 days
2. **Binary archive threshold** — 30 days is cliff-edge; no gradual decay
3. **No importance signal from user behavior** — User editing a memory = high importance signal
4. **No decay curve** — Linear time-based only; should be exponential (recent access matters more)
5. **No priority ordering** — When memory limit is hit (20), no way to pick the most important ones

### Optimal Design (Landscape)
**Composite importance score** = `accessCount * recencyWeight * sourceBonus`

Where:
- `accessCount`: Number of times memory was injected into agent context
- `recencyWeight`: Exponential decay — `exp(-daysSinceLastAccess / halfLife)` where halfLife = 14 days
- `sourceBonus`: User-created = 2.0x, auto-extracted = 1.0x (user explicitly created = higher value)

**Schema additions:**
- `accessCount` (int, default 0) — incremented each time memory is injected
- Computed score used for ordering, not stored (avoids stale data)

**Archive threshold change:**
- Instead of flat 30 days, archive when `importanceScore < 0.1` (equivalent to ~45 days with 0 access, or ~90 days with 1 access)

---

## LANDSCAPE PASS: Feature 2 — Agent Strategy Telemetry

### Current State
- `stuckStrategiesUsed` array tracks which strategies were tried per-task
- `console.log` records interventions
- No persistence — data lost after task ends
- No analysis of which strategies succeed

### Gaps Identified
1. **No persistence layer** — Telemetry data evaporates after each task
2. **No success/failure signal** — We know a strategy was tried but not if it worked
3. **No aggregate analysis** — Can't answer "which strategy works best for research loops?"
4. **No per-user patterns** — Some users may trigger loops more (vague prompts)
5. **No feedback into strategy selection** — Static rotation regardless of historical success

### Optimal Design (Landscape)
**Schema: `strategy_telemetry` table**
- `id`, `taskExternalId`, `userId`, `stuckCount`, `strategyLabel`, `triggerPattern` (what the agent was doing), `outcome` (resolved | escalated | forced_final), `turnsBefore`, `turnsAfter`, `createdAt`

**Success signal:** If the agent produces a non-stuck response after intervention, mark `outcome = resolved`. If it triggers another stuck detection, mark `outcome = escalated`. If it hits forced final answer, mark `outcome = forced_final`.

**Aggregate query:** `SELECT strategyLabel, triggerPattern, COUNT(*) as uses, SUM(outcome='resolved')/COUNT(*) as successRate FROM strategy_telemetry GROUP BY strategyLabel, triggerPattern`

**Feedback loop (future):** Use success rates to reorder strategy rotation — try highest-success-rate strategy first for each trigger pattern.

---

## LANDSCAPE PASS: Feature 3 — Image Annotation in Lightbox

### Current State
- `ImageLightbox` component: 157 lines, keyboard nav, thumbnail strip, download, open-in-tab
- No drawing/annotation capability
- No canvas layer

### Gaps Identified
1. **No canvas library** — Need HTML5 Canvas or SVG overlay for drawing
2. **No annotation tools** — Arrows, circles, text, freehand
3. **No annotation persistence** — Where to save annotations?
4. **No annotation-to-agent pipeline** — How does annotated image reach the agent?
5. **Touch support** — Mobile users need touch drawing
6. **Undo/redo** — Essential for annotation UX

### Optimal Design (Landscape)
**Approach: Canvas overlay on top of image**
- Use HTML5 Canvas (no external library needed for basic shapes)
- Tool palette: Arrow, Circle/Rectangle, Text label, Freehand, Color picker
- Undo stack (array of canvas states)
- "Send to Agent" button that composites canvas + image into a single PNG, uploads to S3, and attaches to the current task as a new message

**Why Canvas over SVG:**
- Canvas is better for freehand drawing (performance)
- Canvas `toDataURL()` makes it trivial to export composite image
- SVG would require complex path management for freehand

**Annotation persistence:** Don't persist annotations separately — the composite image IS the artifact. This avoids a complex annotation data model and keeps it simple.

---

## Implementation Priority Order
1. **Memory Importance Scoring** — Smallest scope, highest impact on existing memory decay system
2. **Agent Strategy Telemetry** — Medium scope, enables data-driven strategy optimization
3. **Image Annotation** — Largest scope, most UX complexity, but highest user delight
