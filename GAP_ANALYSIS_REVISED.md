# Revised Deep Gap Analysis — Corrected After Full Reference Read

## What Already Exists (Correcting Prior False Claims)

1. **AEGIS pre/post-flight**: EXISTS in `server/services/aegis.ts` — full pipeline with `runPreFlight()`, `runPostFlight()`, semantic cache, quality scoring, fragment extraction, lesson learning. Also integrated into `atlas.ts` (executeTask calls runPreFlight before generation, runPostFlight after).

2. **Embedding-based memory**: EXISTS in `server/services/embedding.ts` — `generateEmbedding(text)` via Forge `/v1/embeddings` + `cosineSimilarity(a,b)`. Schema has `memoryEmbeddings` table. Memory retrieval in `_core/index.ts` applies relevance filtering, recency/access heuristics, stop-word removal.

3. **Sovereign routing with circuit breakers**: EXISTS in `server/services/sovereign.ts` — multi-provider selection, circuit breaker state (DB-persisted), AEGIS cache integration, input/output guardrails, failover, observability spans.

4. **iOS mobile UX**: EXISTS — safe-area-inset handling, 44px touch targets, MobileBottomNav, pb-[calc(3.5rem+env(safe-area-inset-bottom))] on main content.

5. **Strategy telemetry**: EXISTS — `strategyTelemetry` table in schema for stuck-strategy/intervention outcome logging.

## TRUE Remaining Gaps (Cross-Referenced Against All Reference Materials)

### GAP A: System Prompt Does Not Embed the Universal Holistic Optimization Framework

**Reference:** The Universal Holistic Optimization Prompt v4 defines:
- Temperature model (0.0-1.0 explore/exploit balance)
- 7 pass types with signal-based routing
- Branch management (max 3 active, progressive elimination)
- Divergence budget (15%/40%/60% based on starting temp)
- 9 rules for every pass (complete output, anti-regression, rating anchors, etc.)
- Convergence criteria (temp ≤0.2 through natural decay + delta <0.2 for 2 passes + branches resolved + zero regressions)

**Current State:** The system prompt in agentStream.ts (limitless mode) mentions "recursive optimization" and "100 consecutive clean passes" but does NOT embed:
- The temperature model for adaptive explore/exploit
- Signal-based pass type selection (Landscape, Depth, Adversarial, Future-State, Synthesis, Exploration, Fundamental Redesign)
- Branch management or divergence budgets
- The 4/δ convergence estimator
- Failure logging (what was tried and didn't work)
- The scoring bias warning (models overrate own outputs by 0.5-1.0 points)

**Impact:** The agent's recursive optimization is a simplified version of what the framework demands. It just counts "clean passes" without the temperature-driven adaptive behavior, without tracking which pass types have been executed, and without the anti-stagnation escape hatch.

**Fix:** Embed the full Universal Holistic Optimization framework into the limitless mode system prompt, including temperature tracking, pass type routing, and the convergence criteria.

### GAP B: Convergence Tool Lacks Dimensional Tracking and Temperature State

**Reference:** The Convergence Pass Log shows each pass must:
- State which pass type is being executed
- State current temperature
- Show signal assessment (one sentence per pass type)
- Rate work 1-10 with anchored justification
- Track score movement to adjust temperature
- Log what was tried but didn't work

**Current State:** The `report_convergence` tool (agentTools.ts) accepts `pass_number`, `status`, `changes_made`, and `rating` but:
- No temperature field
- No pass_type field (which of the 7 types was executed)
- No signal_assessment field
- No score_delta tracking (for temperature adjustment)
- No failure_log field (what was tried and didn't work)
- No branch tracking
- The tool just returns a string — no state persistence between passes

**Fix:** Enhance the convergence tool schema to include temperature, pass_type, signal_assessment, score_delta, failure_log, and persist convergence state in the database for cross-session continuity.

### GAP C: ATLAS Parallel Execution Gap (Same-Order Tasks Run Sequentially)

**Reference:** Vol 3 (Orchestration) mandates parallel execution of independent tasks. The system_reminder confirms: "comments and plan structure allow same-order tasks to run in parallel, but `executeGoal()` currently executes each task in a batch sequentially via `for (const task of batch) { await executeTask(...) }`"

**Current State:** ATLAS `executeGoal()` groups tasks by `executionOrder` (correct), but within each batch, tasks are awaited one-at-a-time instead of using `Promise.allSettled()`.

**Fix:** Change the sequential `for...await` to `Promise.allSettled()` for same-order tasks within a batch.

### GAP D: Main Agent Loop Does Not Route Through AEGIS/Sovereign

**Reference:** The system_reminder confirms AEGIS exists and is integrated into ATLAS, but the main `agentStream.ts` agent loop (the core chat experience) calls `invokeLLM()` directly without routing through Sovereign or applying AEGIS pre/post-flight.

**Current State:** The main agent loop at lines 900-1200 builds messages and calls `invokeLLM()` directly. It does NOT:
- Route through `routeRequest()` (Sovereign) for provider selection/failover
- Apply `runPreFlight()` for prompt optimization
- Apply `runPostFlight()` for quality scoring
- Use AEGIS cache for repeated similar queries

**Impact:** The most-used path (chat streaming) gets none of the quality/routing/caching benefits that ATLAS tasks get.

**Fix:** Integrate Sovereign routing into the main agent stream's LLM call path, with AEGIS pre-flight for prompt optimization and post-flight for quality tracking.

### GAP E: ConvergenceIndicator UI Missing Temperature and Pass Type Visualization

**Reference:** The Universal Holistic Optimization Prompt v4 requires temperature to be visible and tracked. The Convergence Pass Log shows each pass has a type, temperature, and rating.

**Current State:** ConvergenceIndicator shows a simple progress bar (0-100 consecutive passes) but doesn't show:
- Current temperature (0.0-1.0)
- Which pass type was last executed
- Score trajectory (improving, stagnating, regressing)
- Temperature history (has it been declining naturally?)
- Divergence budget usage

**Fix:** Enhance ConvergenceIndicator to show temperature gauge, pass type history, and score trajectory.

### GAP F: Context Compression Doesn't Preserve High-Value Tool Results

**Reference:** Vol 1 describes context compression that "preserves semantic meaning while reducing token count." The Universal Holistic Optimization Prompt v4 Rule 3 requires failure logging — what was tried and didn't work must be preserved.

**Current State:** `compressConversationContext()` uses LLM summarization but treats all messages equally. It doesn't:
- Preserve tool results that produced artifacts (images, documents, code)
- Maintain a "what was tried and failed" log that survives compression
- Weight recent tool results higher than old conversation

**Fix:** Add selective preservation of high-value tool results and a persistent failure log that survives context compression.

### GAP G: iOS Composer Choreography Not Replicated

**Reference:** iOS Video Reference Observations document: "Tapping an action (like `Build website` or `Create slides`) replaces the attachment sheet with a specialized inline input bar above the keyboard, allowing context-specific prompting without leaving the chat view."

**Current State:** The web app has a PlusMenu with actions but they navigate to separate pages or insert text into the composer. There's no specialized inline input bar that replaces the attachment sheet with context-specific prompting.

**Impact:** The iOS app's composer choreography (attachment sheet → inline specialized input) is a superior UX pattern that the web app doesn't replicate.

**Fix:** Implement inline specialized input bars for key actions (Build website, Create slides, Create image, Wide Research) that appear above the composer when triggered from the PlusMenu.

## Priority Order (by impact × feasibility)

1. **GAP A** (System Prompt Framework) — foundational, affects all recursive optimization behavior
2. **GAP B** (Convergence Tool) — enables proper tracking of the framework's state
3. **GAP D** (AEGIS/Sovereign in main loop) — quality multiplier on the most-used path
4. **GAP C** (ATLAS parallel) — performance improvement, small code change
5. **GAP F** (Context compression) — reliability for long tasks
6. **GAP E** (ConvergenceIndicator UI) — user visibility of optimization state
7. **GAP G** (iOS composer choreography) — UX polish, larger scope
