# Manus Next — Feature Maturity Matrix

**Date:** 2026-04-22 | **Version:** 2.0

---

## Maturity Scale

| Level | Label | Definition |
|-------|-------|-----------|
| 5 | **Production** | Fully functional, tested, error-handled, accessible |
| 4 | **Functional** | Works end-to-end but missing polish, edge cases, or tests |
| 3 | **Partial** | Core flow works but significant gaps remain |
| 2 | **Placeholder** | UI exists with mock data or coming-soon behavior |
| 1 | **Stub** | Empty directory or minimal skeleton only |

---

## Core Agent System

| Feature | Maturity | Lines | Tests | Notes |
|---------|----------|-------|-------|-------|
| Conversational chat | 5 | 2,896 | 100+ | Full streaming, tool use, multi-turn |
| 14 built-in tools | 5 | 2,543 | 50+ | Search, browse, image gen, docs, code exec |
| Task persistence | 5 | ~500 | 30+ | Full CRUD, search, archive, pin |
| Task sharing | 4 | 144 | 10+ | Token-based public links with expiry |
| Task replay | 4 | 613 | 5+ | Step-by-step playback |
| Task rating | 5 | ~100 | 10+ | 1-5 stars with feedback text |
| File attachments | 5 | ~200 | 10+ | S3 upload with type/size validation |
| Confirmation gate | 5 | 162 | 10+ | User approval for sensitive actions |
| Prompt cache | 4 | 214 | 5+ | LRU cache for repeated prompts |

## Voice System

| Feature | Maturity | Lines | Tests | Notes |
|---------|----------|-------|-------|-------|
| Voice input (STT) | 5 | 452 | 15+ | Whisper API via S3 upload |
| Kokoro TTS (WASM) | 5 | 305 | 10+ | Neural TTS in browser |
| Edge TTS fallback | 4 | 244 | 10+ | Microsoft cloud TTS |
| Browser TTS fallback | 4 | 149 | 5+ | SpeechSynthesis API |
| Hands-free mode | 4 | 417 | 10+ | Continuous listen-speak loop |
| Voice streaming WS | 4 | 626 | 15+ | Real-time bidirectional audio |
| Audio level viz | 4 | 159 | 5+ | Real-time waveform display |

## Webapp Builder

| Feature | Maturity | Lines | Tests | Notes |
|---------|----------|-------|-------|-------|
| AI code generation | 5 | 571 | 20+ | LLM streaming with code extraction |
| Live iframe preview | 5 | ~100 | 10+ | Sandboxed srcDoc rendering |
| S3 publishing | 5 | ~200 | 10+ | storagePut to public bucket |
| Project management | 5 | 1,430 | 20+ | Full CRUD, multi-tab dashboard |
| CloudFront CDN | 4 | 206 | 10+ | Distribution lifecycle + S3 fallback |
| SSL provisioning | 4 | 365 | 10+ | ACM lifecycle + simulation |
| Analytics (views) | 5 | ~300 | 15+ | Pixel + collect + charts |
| Analytics (geo) | 4 | 356 | 10+ | Country + device breakdown |
| Analytics (live) | 4 | 426 | 10+ | WebSocket live visitor count |
| SEO metadata | 3 | ~100 | 10+ | Fields on build, not project |
| GitHub integration | 4 | 1,211 | 15+ | OAuth, repos, files, PRs |

## Platform Features

| Feature | Maturity | Lines | Tests | Notes |
|---------|----------|-------|-------|-------|
| Settings (8 sections) | 5 | 1,179 | 10+ | Full preferences persistence |
| Memory system | 4 | 749 | 10+ | Auto-extraction + manual CRUD |
| Library/documents | 4 | 1,150 | 5+ | Upload, organize, search |
| Scheduling | 4 | 612 | 10+ | Cron + interval with background runner |
| Stripe billing | 4 | 627 | 15+ | Checkout + webhooks |
| Keyboard shortcuts | 5 | 213 | 10+ | Comprehensive shortcut system |
| Theme system | 5 | ~200 | 5+ | Dark/light with CSS variables |

## Collaboration

| Feature | Maturity | Lines | Tests | Notes |
|---------|----------|-------|-------|-------|
| Team management | 3 | 314 | 5+ | Basic CRUD, no permissions |
| Meetings | 3 | 406 | 5+ | Recording + transcription UI |
| Connectors hub | 2 | 606 | 5+ | 7 cards, only GitHub works |
| Device pairing | 2 | 746 | 5+ | UI + WS relay, no companion |
| Messaging agent | 2 | 325 | 0 | Placeholder UI |
| Desktop app | 2 | 341 | 0 | Placeholder UI |
| Figma import | 2 | 287 | 0 | Placeholder UI |

## Creative Tools

| Feature | Maturity | Lines | Tests | Notes |
|---------|----------|-------|-------|-------|
| Design canvas | 3 | 523 | 5+ | Basic editor with templates |
| Slides generation | 3 | 135 | 5+ | Forge API delegation |
| Video generator | 3 | 281 | 10+ | Project management, basic pipeline |
| Client inference | 3 | 704 | 0 | WebGPU model loading UI |

## Infrastructure

| Feature | Maturity | Lines | Tests | Notes |
|---------|----------|-------|-------|-------|
| Monorepo packages | 1 | ~200 | 0 | 14 thin stub packages with type re-exports |

---

## Distribution

| Maturity | Count | Percentage |
|----------|-------|-----------|
| Production (5) | 16 | 35% |
| Functional (4) | 17 | 37% |
| Partial (3) | 7 | 15% |
| Placeholder (2) | 5 | 11% |
| Stub (1) | 1 | 2% |
| **Total** | **46** | **100%** |

---

*End of Feature Maturity Matrix v2.0*
