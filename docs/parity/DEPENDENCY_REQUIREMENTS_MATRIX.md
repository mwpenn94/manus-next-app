# Dependency Requirements Matrix

Per §L.29 Category J: canonical mapping of capability-area to required runtime and dev dependencies. Extended every time a new capability is claimed. Cross-referenced with MANUS_TOOL_SIGNATURES.md per §L.37.

## Core Platform Dependencies

| Capability Area | Required Runtime Deps | Required Dev Deps | In package.json | Status |
|----------------|----------------------|-------------------|-----------------|--------|
| Chat/Agent Core | react, @trpc/client, @trpc/server, express | vitest, typescript | Yes | GREEN |
| Database/ORM | drizzle-orm, mysql2 | drizzle-kit | Yes | GREEN |
| Authentication | jose, cookie | vitest | Yes | GREEN |
| File Storage | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner | vitest | Yes | GREEN |
| Stripe Payments | stripe | vitest | Yes | GREEN |
| UI Framework | react, tailwindcss, @radix-ui/* | vite, postcss | Yes | GREEN |
| Animation | framer-motion | - | Yes | GREEN |
| State Management | @tanstack/react-query | - | Yes | GREEN |
| Routing | wouter | - | Yes | GREEN |
| Markdown Rendering | streamdown | - | Yes | GREEN |

## Manus Canonical Capability Dependencies (§L.37 cross-ref)

| Canonical Capability | Manus Tool | Required Package | In package.json | Gap |
|---------------------|-----------|-----------------|-----------------|-----|
| Deep Research | browser, search | Built-in (Forge API) | N/A (server-side) | None |
| Data Analysis & Viz | matplotlib, pandas | Built-in (Forge API) | N/A (server-side) | None |
| D2 Diagrams | manus-render-diagram | d2 CLI (sandbox only) | N/A (utility) | Honest gap: D2 is sandbox utility, not deployable |
| AI Image Gen | generate_image | Built-in (Forge API) | N/A (server-side) | None |
| Technical Writing | file write | Built-in | N/A | None |
| Web App Dev | webdev_init_project | vite, react, express | Yes | None |
| Presentation Authoring | slide_initialize | Built-in (slides mode) | N/A | None |
| Speech Synthesis | generate_speech | Built-in (Forge API) | N/A | None |
| DOCX Generation | docx library | docx (Python) | Honest gap: Python-only | Logged |
| Video Production | video generation | Built-in (Forge API) | N/A | None |
| Music Generation | generate_music | Built-in (Forge API) | N/A | None |
| Scheduling | scheduler | node-cron (or built-in) | Yes (server scheduler) | None |
| Parallel Processing | map tool | Built-in | N/A | None |
| Excel | openpyxl (Python) | exceljs (JS alternative) | Honest gap: not in deps | Logged |
| PDF Manipulation | manus-md-to-pdf | Built-in (sandbox utility) | N/A (utility) | None |
| Image Processing | Pillow (Python) | sharp (JS alternative) | Honest gap: not in deps | Logged |

## Honest Gaps Logged

1. **D2 diagrams:** `manus-render-diagram` is a sandbox CLI utility, not available in deployed runtime. Mermaid.js is available as a browser-side alternative.
2. **DOCX generation:** Manus uses Python `docx` library. JS equivalent `docx` npm package not yet added. Forge API can generate documents server-side.
3. **Excel generation:** Manus uses Python `openpyxl`. JS equivalent `exceljs` not yet in package.json. Could be added if needed.
4. **Image processing:** Manus uses Python `Pillow`. JS equivalent `sharp` not yet in package.json. Forge API handles image generation.

**Last updated:** 2026-04-22 Session 4
