# v1.2 Prompt Comparison: Attached vs Previously Applied

## Key Differences Where Attached Prompt is BETTER

### 1. Continuous-Run Discipline (CRITICAL)
The attached v1.2 is explicit: **only 3 stop conditions** (user signal, platform limit, >50% baseline drift). Everything else is log-and-continue. Our previous implementation was still halting for convergence proposals and checkpoint saves — violating the core v1.2 principle.

**Action**: Stop treating convergence passes as "done" states. Write proposal, keep running.

### 2. Self-Instrumentation Cleanup Protocol (NEW)
After every pass touching the candidate's deployed instance, run cleanup:
- Delete harness-created tasks, scheduled tasks, memories, S3 objects, notifications
- Track `Cleanup last run` timestamp in STATE_MANIFEST
- If cleanup fails: log INCIDENT-CLEANUP-FAILED, mark `pollutionUnresolved: true`

**Action**: Implement cleanupTestArtifacts to actually run after each capture/test pass.

### 3. Hat Switch Protocol (MISSING)
We were blending hats. The prompt requires explicit:
1. Emit "EXIT [old hat]"
2. Save working file
3. Emit "ENTER [new hat]"
4. State persona in 1-2 sentences
5. Load working file
6. Continue

**Action**: Follow hat switch protocol in all future passes.

### 4. Scoring as RANGE Not Single Number
We were scoring 7.82/10. Should be a range like 7.5-8.1/10 with explicit uncertainty.

**Action**: Update all scoring to ranges.

### 5. Temperature & Divergence Operator
- Initial 0.5, not our 0.38
- Score range upper bound +>0.5: temp -0.15
- +0.2-0.5: temp -0.05
- +<0.2: temp +0.20 (stagnation)
- Regression: temp +0.40
- Floor 0.10, Ceiling 1.00

**Action**: Recalculate temperature properly.

### 6. STATE_MANIFEST Required Fields (Much More Comprehensive)
The attached prompt requires 20+ fields including:
- Pass budget USD, spend USD
- Repo privacy status
- AI-vendor output terms status
- Cross-device target profiles (5 minimum)
- Heuristic evaluation framework
- Inputs corpus tier coverage (T0-T9)

**Action**: Update STATE_MANIFEST.md to full schema.

### 7. Failover Protocol Table (Comprehensive)
Every blocker has either fix-now, fix-later with tag, or stop. No "wait for human" path.

**Action**: Apply failover tags to all pending items.

### 8. Two Parity Axes (5 Dimensions Each)
- ENGINEERING: Visual | Behavioral | Functional | Performance | A11y
- EXPERIENCE: Interaction | Motion | State-coverage | Microcopy | Flow

**Action**: Score all 10 dimensions per capability, not just aggregate.

### 9. [ADVERSARY] Required Findings
MUST surface ≥1 finding per pass OR explicitly state "tried strategies X, Y, Z, found nothing" with detail per strategy.

**Action**: Enforce in all future adversary passes.

### 10. Oracle-Judges-Itself Bias Hardening
- Candidate presumed WORSE until positive evidence
- If score upper bound >8.5, [ADVERSARY] IMMEDIATELY hunts evidence candidate is weaker
- Every sign-off proposal includes bias check

**Action**: Apply to all scoring going forward.

## What We Were Already Doing Right
- Six expert persona hats (STRATEGIST, ORACLE-AS-SELF, UX-EXPERT, IMPLEMENTER, COMPLIANCE-OFFICER, ADVERSARY)
- State files (STATE_MANIFEST, NOTIFICATIONS.json, CURRENT_BEST, OPERATORS, COMPLIANCE_LOG)
- Test-before-commit discipline
- Compliance gates after artifact-producing passes

## Immediate Integration Plan
1. Update STATE_MANIFEST.md to full v1.2 schema
2. Recalculate temperature using proper formula
3. Convert all scores to ranges
4. Apply hat switch protocol going forward
5. Implement cleanup after test passes
6. Stop halting — write proposals and keep running
7. Update PARITY_MATRIX with 10-dimension scoring per capability
