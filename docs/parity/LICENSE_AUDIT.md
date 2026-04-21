# LICENSE_AUDIT.md — §L.34 OSS Parity+ Toolkit

**Generated:** 2026-04-21
**Tool:** license-checker (MIT)
**Project:** manus-next-app

## Summary

| License | Count | Status |
|---------|-------|--------|
| MIT | 115 | APPROVED |
| Apache-2.0 | 8 | APPROVED |
| BSD-2-Clause | 1 | APPROVED |
| BSD-3-Clause | 1 | APPROVED |
| ISC | 1 | APPROVED |
| MPL-2.0 | 1 | APPROVED |
| Unlicense | 1 | APPROVED |
| (MIT OR GPL-3.0-or-later) | 1 | APPROVED |
| MIT* | 1 | APPROVED (inferred) |
| **AGPL-3.0** | **1** | **FLAGGED** |
| UNKNOWN | 1 | REVIEW NEEDED |

**Total packages:** 132

## Flagged Packages

### AGPL-3.0: edge-tts-universal@1.4.0

**Risk:** AGPL-3.0 requires source disclosure if the software is offered as a network service. Since manus-next-app is a web application, using AGPL code server-side could trigger copyleft obligations.

**Mitigation options:**
1. **Replace with edge-tts (MIT):** The original `edge-tts` Python package is MIT-licensed. Use server-side Python subprocess or a different TTS library.
2. **Replace with Piper TTS (MIT):** Fully OSS, runs locally, no copyleft risk.
3. **Isolate in separate process:** If AGPL code runs in a separate microservice with no shared address space, copyleft may not propagate (legal review recommended).
4. **Accept AGPL:** If manus-next-app source is already public on GitHub, AGPL compliance is satisfied.

**Recommendation:** Replace `edge-tts-universal` with MIT-licensed alternative (Piper TTS or edge-tts Python wrapper) per §L.34 OSS-first doctrine.

### UNKNOWN: 1 package

Likely a package with non-standard license file placement. Manual review recommended.

## Proprietary Dependencies

Per §L.34, all proprietary choices must be justified:

| Dependency | Why Not OSS | Justification |
|-----------|-------------|---------------|
| Manus OAuth | Platform-provided | Zero-cost, built-in, no OSS equivalent for Manus platform auth |
| Manus LLM API | Platform-provided | Zero-cost via BUILT_IN_FORGE_API_KEY, OSS fallback: Ollama + llama.cpp |
| Manus Image Gen | Platform-provided | Zero-cost, OSS fallback: Stable Diffusion via ComfyUI |
| Stripe | Payment processing | Industry standard, OSS alternative: LemonSqueezy (not truly OSS) |
| TiDB (MySQL) | Platform-provided | Zero-cost, OSS: MySQL/PostgreSQL self-hosted |

## Clean Licenses (no action needed)

MIT (115), Apache-2.0 (8), BSD-2-Clause (1), BSD-3-Clause (1), ISC (1), MPL-2.0 (1), Unlicense (1) — all permissive, no copyleft risk.
