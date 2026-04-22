# Universal Optimization V4 — Reference Copy (§L.38)

**Created:** 2026-04-22T11:05:00Z
**Source:** Project shared file `recursive-optimization-converged-final (2).md`
**Purpose:** Reference copy of v4 universal prompt committed to git per §L.38/§L.39.

## Key Concepts (Summary)

### Temperature Model
- T ∈ [0.0, 1.0], two-axis: Breadth (Tb) + Depth (Td)
- Composite: T = 0.6·Td + 0.4·Tb
- Initial T derived from task complexity
- Cooling schedule: T decreases as passes converge

### 7 Pass Types (Priority Order)
1. **Fundamental Redesign** (T > 0.8) — structural changes
2. **Exploration** (T > 0.6) — new approaches
3. **Landscape** (any T) — broad survey
4. **Depth** (T < 0.6) — deep analysis of specific areas
5. **Adversarial** (any T) — hostile-critic perspective
6. **Future-State** (T < 0.4) — forward-looking assessment
7. **Synthesis** (T < 0.3) — consolidation and integration

### Branch Management
- Max 3 active branches
- Named with status tracking
- Merge when converged, prune when abandoned

### Divergence Budget
- Budget = floor(T_initial × 10)
- Each divergent pass (exploration/redesign) consumes 1
- When exhausted, only convergent passes allowed

### 6-Criterion Convergence Gate
1. Consecutive zero-finding passes ≥ 3
2. Temperature < 0.25
3. Score delta < 0.1 between passes
4. Active branches ≤ 1
5. Regressions = 0 in last 3 passes
6. Novel findings = 0 in last 3 passes

### Score Anchors
- 5 = competent (baseline)
- 7 = expert (professional quality)
- 9 = best-in-class (industry-leading)
- 10 = impossible (never assign)
- Bias warning: models overrate by 0.5-1.0

### Safety-Sensitive Cap
- For safety-critical content: max score 8.0 without external validation
- Human review required for scores > 8.0

---

*Full document available at: `/home/ubuntu/projects/sovereign-ai-46da4f13/recursive-optimization-converged-final (2).md`*
*This summary is committed to git for portability. The full document is in the project shared files.*
