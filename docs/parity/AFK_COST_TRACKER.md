# AFK Cost Tracker

Per §L.24: per-cycle API spend estimation.

## Session 4 Cost Estimates

| Cycle | LLM Calls | Est. Tokens | Est. Cost | Notes |
|-------|-----------|-------------|-----------|-------|
| Judge run v1 (S4) | 216 (72×3) | ~432K | ~$2.16 | 72 shells × 3 judge runs each |
| Judge run v2 (S4) | 216 (72×3) | ~432K | ~$2.16 | Re-run after YAML enhancements |
| Enhancement scripts | 0 | 0 | $0.00 | Local file manipulation only |
| Artifact creation | 0 | 0 | $0.00 | Local file writes only |
| Convergence passes | 0 | 0 | $0.00 | Local verification only |

## Cumulative Costs (All Sessions)

| Session | Est. LLM Calls | Est. Cost | Duration |
|---------|---------------|-----------|----------|
| Session 1 | ~100 | ~$0.50 | ~2h |
| Session 2 | ~500 | ~$2.50 | ~4h |
| Session 3 | ~800 | ~$4.00 | ~6h |
| Session 4 | ~450 | ~$4.32 | ~4h (ongoing) |
| **Total** | **~1,850** | **~$11.32** | **~16h** |

## Cost Policy

1. LLM judge runs are the primary cost driver (~$2 per full sweep)
2. Local file operations (artifact creation, convergence checks) are zero-cost
3. Forge API calls for agent features are covered by built-in API keys
4. No external paid API calls made without Mike's approval

**Last updated:** 2026-04-22 Session 4
