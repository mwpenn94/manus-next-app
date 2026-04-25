# UHO Manus Field Kit v1.4

## Purpose
This field kit provides templates and schemas for the MANUS_PARITY_LOOP_v1.1 methodology execution.

## State File Templates

### STATE_MANIFEST.md
See root STATE_MANIFEST.md — contains all v1.1 required fields including 10-tier corpus coverage tracking.

### NOTIFICATIONS.json
Array of notification objects with: id, severity (P0-P3), class, summary, operator_question, operator_options, blocking, created, status.

### CURRENT_BEST.md
Two-axis parity scores (Engineering: Visual/Behavioral/Functional/Performance/A11y; Experience: Interaction/Motion/State-coverage/Microcopy/Flow) with weighted totals.

### OPERATORS.md
Operator identity, authority scope, escalation history.

### COMPLIANCE_LOG.md
Append-only. Rules 10/11/12 gate results per pass.

### CAPABILITY_SPEC/<n>.md
Per-capability specification with: Status, Provenance, Differentiation rationale, Input/State/Tool/Output contracts, Performance profile, Calibration baseline, Edge cases, Compliance annotations, Known divergences, Known improvements, UX heuristic evaluation, Cross-device matrix, Self-description diff, Parity matrix row.

### PARITY_MATRIX.md
10-dimension scoring grid across both axes for all in-scope capabilities.

## Pass Type Definitions

| Type | Primary Hat | Mandatory Hats | Trigger |
|---|---|---|---|
| Fundamental Redesign | STRATEGIST | All | Score < 2.0 on any dimension |
| Exploration | STRATEGIST | ADVERSARY | Temp > 0.6 |
| Landscape | STRATEGIST | ORACLE-AS-SELF, UX-EXPERT | First pass or new capability |
| Depth | IMPLEMENTER | STRATEGIST | After Landscape |
| Adversarial | ADVERSARY | COMPLIANCE-OFFICER | Every 4th pass per capability |
| Oracle-Delta | ORACLE-AS-SELF | STRATEGIST | Engineering axis stale |
| Experience-Delta | UX-EXPERT | STRATEGIST | Experience axis stale |
| Capture | Per sub-protocol | COMPLIANCE-OFFICER | Data needed |
| Future-State | STRATEGIST | ORACLE-AS-SELF | Roadmap alignment check |
| Synthesis | STRATEGIST | All | Cross-capability integration |

## Temperature Protocol
- Initial: 0.50
- Score improvement > 0.5: temp -= 0.15
- Score improvement 0.2-0.5: temp -= 0.05
- Score improvement < 0.2: temp += 0.20 (stagnation)
- Regression: temp += 0.40
- Floor: 0.10, Ceiling: 1.00
- Temp > 0.6 triggers Exploration pass

## Convergence Criteria (Rule 8)
All 8 must be true:
1. All in-scope capabilities scored
2. No dimension below 6.0
3. No regression in last 3 passes
4. ADVERSARY found nothing in last pass
5. COMPLIANCE-OFFICER approved last 3 passes
6. Temperature below 0.30
7. All P0/P1 notifications resolved
8. Operator sign-off obtained

## Hat Switch Protocol
1. Emit "──── EXIT [old hat] ────"
2. Save old hat's working file
3. Emit "──── ENTER [new hat] ────"
4. State new hat's persona (1-2 sentences)
5. Load new hat's working file
6. Continue
