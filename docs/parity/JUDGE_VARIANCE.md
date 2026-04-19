# JUDGE_VARIANCE — manus-next-app

> Per §L.2: LLM-judge scoring must account for cross-model variance. This document defines the scoring protocol, rubric, and variance mitigation strategy.

---

## Scoring Protocol

### Seven-Dimension Rubric

Each capability is scored on seven dimensions, each rated 0.0–1.0:

| Dimension | Weight | Definition | Scoring Anchors |
|-----------|--------|------------|------------------|
| Correctness | 0.20 | Output matches expected behavior for the capability's primary use case | 0.0 = wrong output, 0.5 = partially correct, 1.0 = fully correct |
| Completeness | 0.15 | All sub-features of the capability are implemented and functional | 0.0 = stub only, 0.5 = core feature works, 1.0 = all edge cases handled |
| Efficiency | 0.10 | Response time, token usage, and resource consumption are reasonable | 0.0 = >30s or excessive tokens, 0.5 = acceptable, 1.0 = optimized |
| Robustness | 0.15 | Handles errors, edge cases, and adversarial inputs gracefully | 0.0 = crashes on bad input, 0.5 = basic error handling, 1.0 = comprehensive |
| User Experience | 0.15 | UI feedback, loading states, and interaction quality | 0.0 = no feedback, 0.5 = basic states, 1.0 = polished with animations |
| Maintainability | 0.10 | Code quality, test coverage, and documentation | 0.0 = no tests/docs, 0.5 = basic tests, 1.0 = full coverage + docs |
| Innovation | 0.15 | Goes beyond basic implementation with creative solutions | 0.0 = minimal viable, 0.5 = standard approach, 1.0 = novel/superior approach |

**Composite score** = weighted sum of all dimensions. Minimum threshold: **0.80** for GREEN status.

### Scoring Procedure

1. For each capability, prepare a **task prompt** that exercises the capability's primary use case.
2. Execute the task prompt against the live system and capture the full interaction (input, tool calls, output).
3. Submit the interaction transcript to **three LLM judges** (see Cross-Model Strategy below).
4. Each judge scores all seven dimensions independently.
5. Final score = median of the three judges' composite scores.
6. If any single dimension scores below 0.50 from any judge, flag for manual review.

---

## Cross-Model Strategy

To mitigate single-model bias, scoring uses three judges from different model families:

| Judge | Model | Rationale |
|-------|-------|-----------|
| Judge A | GPT-4o (via invokeLLM) | Strong instruction following, well-calibrated scoring |
| Judge B | Claude 3.5 Sonnet (via invokeLLM) | Different training distribution, catches different failure modes |
| Judge C | Gemini 1.5 Pro (via invokeLLM) | Third perspective, strong at structured evaluation |

**Variance mitigation:**

- If the spread (max - min) of composite scores exceeds 0.15, flag the capability for manual review.
- If two judges agree within 0.05 and the third diverges by >0.15, discard the outlier and average the two.
- Log all individual judge scores in `packages/eval/results/` for transparency.

---

## Judge Prompt Template

```
You are evaluating an AI agent capability. Score each dimension 0.0-1.0.

Capability: {capability_name}
Description: {capability_description}
Task prompt: {task_prompt}
Interaction transcript:
{transcript}

Score each dimension with a brief justification:
1. Correctness (0.0-1.0): 
2. Completeness (0.0-1.0): 
3. Efficiency (0.0-1.0): 
4. Robustness (0.0-1.0): 
5. User Experience (0.0-1.0): 
6. Maintainability (0.0-1.0): 
7. Innovation (0.0-1.0): 

Composite score (weighted): 
Overall assessment (1-2 sentences): 
```

---

## Known Variance Patterns

| Pattern | Affected Dimensions | Mitigation |
|---------|--------------------|-----------|
| GPT-4o tends to score Innovation higher | Innovation | Weight median, not mean |
| Claude tends to be stricter on Robustness | Robustness | Accept if 2/3 judges pass |
| Gemini tends to score Efficiency lower | Efficiency | Verify with actual timing data |
| All models inflate scores for polished UI | User Experience | Include adversarial UI test cases |
| Models disagree on "completeness" for stub features | Completeness | Define explicit sub-feature checklist per capability |

---

## Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Judge prompt template | DONE | This document |
| Seven-dimension rubric | DONE | This document |
| Cross-model strategy | DONE | This document |
| Scoring infrastructure (judge.mjs) | TODO | `packages/eval/judge.mjs` |
| Task shells (65 capability + 5 orchestration) | TODO | `packages/eval/capabilities/` |
| Results storage | TODO | `packages/eval/results/` |
| Variance analysis script | TODO | `packages/eval/analyze-variance.mjs` |
