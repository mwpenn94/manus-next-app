# PARITY Schema Migration Log

## Migration: PARITY_BACKLOG.md → canonical PARITY.md

**Date:** 2026-04-20  
**Trigger:** v9 §L.26 requires canonical PARITY.md structure  
**Per:** §L.26 schema conflict handling (Layer 3 alternative algorithm failover)

### Before

- `docs/parity/PARITY_BACKLOG.md` — flat capability status table (67 rows × 5 columns: #, Capability, Status, Evidence, Gap)
- No Open Recommendations, Protected Improvements, Known-Bad, Gap Matrix, Reconciliation Log, or Build Loop Pass Log sections

### After

- `docs/PARITY.md` — canonical v9 §L.26 structure with 7 sections
- `docs/parity/PARITY_BACKLOG.md` — preserved as-is (not archived, still useful as capability-level status reference)

### Field Mapping

| PARITY_BACKLOG field | PARITY.md section | Mapping |
|---|---|---|
| Capability rows with Status=GREEN | (no direct mapping) | Referenced via PI- entries in Protected Improvements |
| Capability rows with Status=YELLOW | Gap Matrix | G1, G2 entries |
| Capability rows with Status=RED | (none — 0 RED) | N/A |
| Gap column text | Open Recommendations | R5, R6 entries |

### Data Preserved

- All 67 capability rows remain in PARITY_BACKLOG.md (unchanged)
- Summary counts (60G/2Y/0R/5NA) carried forward to PARITY.md Protected Improvements
- RED audit findings migrated to Known-Bad section
- NS13 fixes migrated to Open Recommendations (done) and Protected Improvements
