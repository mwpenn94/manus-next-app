# Operational Disciplines (§L.37)

**Created:** 2026-04-22T10:35:00Z
**Purpose:** 12 operational disciplines distilled from Manus expert behavior patterns, mapped to manus-next-app implementation.

## 12 Disciplines

### OD-1: Matplotlib OO API (Never pyplot Global State)

**Discipline:** Always use the object-oriented matplotlib API (`fig, ax = plt.subplots()`) instead of the pyplot state machine (`plt.plot()`). This prevents figure leakage in long-running processes and enables multi-panel layouts.

**Implementation:** The `execute_code` agent tool runs Python in isolated subprocesses. Code generation prompts include OO API examples. The scientific-visualization skill enforces this pattern.

### OD-2: Source Triangulation

**Discipline:** Every factual claim must be verified against ≥3 independent sources. Cross-validate before presenting. Cite with inline numeric references.

**Implementation:** The `web_search` tool dispatches multiple queries. The `wide_research` parallel tool fans out to 5+ sources simultaneously. Agent system prompt requires citation for factual claims.

### OD-3: Six-Dimension Image Prompts

**Discipline:** Image generation prompts must specify 6 dimensions: subject, style, composition, lighting, color palette, and mood. This produces consistent, high-quality results vs vague single-sentence prompts.

**Implementation:** The `generate_image` tool wrapper in `server/_core/imageGeneration.ts` accepts structured prompts. The agent's image generation tool includes prompt engineering guidance.

### OD-4: D2-over-Mermaid for Complex Diagrams

**Discipline:** Use D2 for architecture diagrams, system designs, and complex multi-layer diagrams. Use Mermaid only for simple flowcharts and sequence diagrams. Never mix syntaxes in the same document.

**Implementation:** The `generate_document` tool selects diagram syntax based on complexity. The `manus-render-diagram` utility supports both D2 and Mermaid.

### OD-5: Reference-Image Chaining

**Discipline:** When generating a series of related images, pass previous outputs as reference images to maintain visual consistency (style, color palette, character design).

**Implementation:** The `generateImage` function in `server/_core/imageGeneration.ts` supports `originalImages` parameter for edit/chain workflows.

### OD-6: Editorial Command Center Design

**Discipline:** Design systems should define a complete visual language before implementation: color palette (with OKLCH values), typography scale, spacing system, shadow hierarchy, animation curves, and interaction patterns.

**Implementation:** `client/src/index.css` defines the full design token system with OKLCH colors, CSS custom properties, and Tailwind theme extensions. See EDITORIAL_COMMAND_CENTER.md for the canonical spec.

### OD-7: Dual-Width DOCX Tables

**Discipline:** Word documents should use two table widths: full-width for data tables and 80%-width for callout/summary tables. This creates visual hierarchy and prevents monotonous layouts.

**Implementation:** The `generate_document` tool's report format includes table width specifications. The DOCX generation pipeline applies appropriate widths based on table type.

### OD-8: Plan Properties (todo.md-First)

**Discipline:** Every task begins with a plan. Create todo.md before writing code. Mark items complete as they're done. Never delete items — keep as history. Review before every checkpoint.

**Implementation:** The webdev workflow enforces todo.md creation as the first action after project init. Every feature implementation starts with adding items to todo.md.

### OD-9: Agent Loop (Analyze → Think → Select → Execute → Observe → Iterate)

**Discipline:** The agent operates in a structured loop: analyze context, reason about next action, select tool, execute, observe result, iterate. Never skip the reasoning step. Never execute without a plan.

**Implementation:** The agent system prompt defines the 7-step agent loop. The task plan tool enforces phase-based execution with explicit advancement.

### OD-10: Real-Data Grounding

**Discipline:** Never generate synthetic data when real data is available. Always attempt to fetch real data first. If real data is unavailable, clearly label synthetic data as such.

**Implementation:** Agent tools prioritize real API calls (web_search, read_webpage) over fabrication. The Data Analysis capability uses real uploaded datasets. Benchmark scoring uses real LLM judge calls (not simulated) when API is available.

### OD-11: Cross-Artifact Consistency

**Discipline:** When multiple artifacts reference the same data (e.g., test counts, capability statuses, scores), they must be updated atomically. Stale cross-references are treated as bugs.

**Implementation:** The STATUS_FRESHNESS audit checks all GREEN capabilities for staleness. The V9_PARITY_REPORT cross-references all audit artifacts. The convergence loop catches drift.

### OD-12: Single-Autonomous-Session Standard

**Discipline:** Every capability should be demonstrable in a single autonomous session — from zero state to working result — without manual intervention. This is the bar for GREEN status.

**Implementation:** The OWNER_DOGFOOD pass verifies each endpoint can be exercised programmatically. The E2E test suite demonstrates full user journeys autonomously. The benchmark judge runs capabilities end-to-end.
