# MANUS_SPEC_WATCH — Feature Change Tracking

> Monitors Manus Pro feature changes to maintain parity awareness.

---

## Watch Sources

| Source | URL | Check Frequency |
|--------|-----|-----------------|
| Manus Blog | https://manus.im/blog | Weekly |
| Manus Changelog | https://manus.im/changelog | Weekly |
| Manus Twitter/X | https://x.com/manaboroshi | Weekly |
| Tech Press | Hacker News, TechCrunch | Weekly |

## Recent Changes (as of April 2026)

| Date | Change | Impact | Action Required |
|------|--------|--------|-----------------|
| 2026-04 | Context engineering blog post | Informational | Incorporated into QUALITY_PRINCIPLES.md |
| 2026-03 | Manus v1.5 release (improved tool use) | Medium | Monitor for new tool types |
| 2026-02 | Desktop app launch | Low | Desktop app is out of scope for web parity |
| 2026-01 | Enhanced memory system | Medium | Our memory system already covers core features |

## Parity Impact Assessment

When a new Manus feature is detected:

1. **Classify impact:** HIGH (core capability), MEDIUM (quality improvement), LOW (cosmetic/platform-specific)
2. **Check scope:** Is it in our 67-capability scope? If not, add to DEFERRED_CAPABILITIES.md
3. **Estimate effort:** Hours to implement equivalent
4. **Prioritize:** Add to HRQ_QUEUE.md if blocked, or implement directly if unblocked

## Feature Watchlist

| Feature | Manus Status | Our Status | Gap |
|---------|-------------|------------|-----|
| Multi-agent collaboration | Not yet | Not planned | N/A |
| Plugin/extension system | Not yet | Not planned | N/A |
| Mobile native app | Not yet | PWA only | ACCEPTABLE |
| Enterprise SSO | Not yet | Manus OAuth | ACCEPTABLE |
| API access | Limited | tRPC internal | EQUIVALENT |
| Custom model routing | Internal | 3-tier mode | EQUIVALENT |
| File format support | Broad | MD + S3 upload | GAP |
| Real-time collaboration | Not yet | Not planned | N/A |

## Process

1. Check watch sources weekly
2. Log new features in "Recent Changes" table
3. Assess parity impact
4. Update PARITY_BACKLOG.md if new capability needed
5. Update PER_CAP_NOTES.md for affected capabilities
