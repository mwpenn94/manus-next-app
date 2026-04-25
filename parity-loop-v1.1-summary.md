# MANUS_PARITY_LOOP_v1.1 — Key Findings

## What This Is
A continuous parity-loop optimization methodology for the manus-next-app repository.
Not a single deliverable — a multi-pass methodology running until convergence.

## Six Expert-Persona Hats
1. **STRATEGIST** — designs pass plan, scores parity matrices, writes specs/tickets
2. **ORACLE-AS-SELF** — Chief Architect of Manus, structured self-descriptions
3. **UX-EXPERT** — product designer, heuristic evaluation, microcopy, IA, accessibility
4. **IMPLEMENTER** — full-stack engineer (React 19, TS 5.9, tRPC v11, Drizzle, Tailwind 4)
5. **COMPLIANCE-OFFICER** — legal/compliance, veto power
6. **ADVERSARY** — red-team, pre-mortems, false-positive hunting

## Ten Tiers of Input
- T0: Existing Operator Replay Corpus (cheapest, run first)
- T1: Landscape (13 capabilities)
- T2: Depth (per capability)
- T3: Orchestration (12 flows including browser/device automation, app dev E2E, deployment)
- T4: Adversarial/failure-mode
- T5: Future-state
- T6: Synthesis/cross-capability
- T7: Repo context
- T8: Design system documentation
- T9: Probe-Task Queue (depth, combinations, benchmarks, UI/UX/layout)

## Two Parity Axes
- **ENGINEERING**: Visual | Behavioral | Functional | Performance | A11y
- **EXPERIENCE**: Interaction | Motion | State-coverage | Microcopy | Flow

## Ten Pass Types
1. Fundamental Redesign
2. Exploration (divergent; temp >0.6)
3. Landscape
4. Depth
5. Adversarial
6. Oracle-Delta (Engineering axis)
7. Experience-Delta (Experience axis)
8. Capture (sub-protocols)
9. Future-State
10. Synthesis

## Key Constraints
- NEVER browse manus.im interactive surfaces
- Oracle data from: inputs/ corpus, ORACLE-AS-SELF self-description, public docs only
- Candidate presumed WORSE until positive evidence shows equivalence
- Temperature: initial 0.5, floor 0.10, ceiling 1.00
- Budget: 25 passes per capability, $50/pass, 100 total passes

## State Files Required
- STATE_MANIFEST.md
- NOTIFICATIONS.json
- CURRENT_BEST.md
- OPERATORS.md
- COMPLIANCE_LOG.md
- CAPABILITY_SPEC/<n>.md
- PARITY_MATRIX.md
- docs/uho/UHO_MANUS_FIELD_KIT.md

## Execution Loop
1. STRATEGIST reads state + inputs, determines pass type
2. Check repo privacy (halt if unresolved)
3. Check T0 scan status
4. Run capture if needed
5. Run pass per type
6. COMPLIANCE-OFFICER gates (Rules 10/11/12)
7. IMPLEMENTER writes code if pass touched code
8. STRATEGIST updates state files
9. Convergence check
10. Budget check
11. Loop or halt
