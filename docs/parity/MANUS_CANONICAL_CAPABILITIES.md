# Manus Canonical Capabilities (§L.37)

**Created:** 2026-04-22T10:30:00Z
**Purpose:** Canonical 16-capability table mapping Manus tools to manus-next-app equivalents.

## 16-Capability Table

| # | Capability | Manus Tool | Operational Discipline | manus-next-app Equivalent | Status | Dependencies |
|---|-----------|------------|----------------------|--------------------------|--------|-------------|
| 1 | Deep Research | `search` (info/research/news) + `browser` + `map` (parallel) | Source triangulation: ≥3 independent sources, cross-validate claims, cite with inline refs | `web_search` tool + `read_webpage` tool + `wide_research` parallel dispatch | GREEN | Built-in agent tools |
| 2 | Data Analysis & Visualization | `shell` (python3) + matplotlib/seaborn/plotly | Matplotlib OO API (never pyplot global state), real-data grounding, publication-ready figures | `execute_code` tool + Data Analysis page + chart rendering | GREEN | pandas, matplotlib, plotly (installed) |
| 3 | D2/Mermaid Diagrams | `manus-render-diagram` | D2 for architecture/complex diagrams, Mermaid for simple flows; never mix in same doc | Agent `generate_document` tool with diagram support | GREEN | manus-render-diagram utility |
| 4 | AI Image Generation | `generate` mode | Six-dimension prompts (subject, style, composition, lighting, color, mood), reference-image chaining | `generate_image` tool via Forge imageGeneration API | GREEN | Forge API |
| 5 | Technical Writing | `file` (write/edit) + `manus-md-to-pdf` | Complete paragraphs over bullets, tables for comparison, bold for emphasis, inline citations | `generate_document` tool (4 formats: markdown/report/analysis/plan) | GREEN | Built-in |
| 6 | Web App Development | `webdev_*` tools | Plan-first (todo.md), schema-first (drizzle), test-first (vitest), checkpoint-driven | Full tRPC + React + Express stack with 57 GREEN capabilities | GREEN | Full stack |
| 7 | Presentation Authoring | `slides` mode (html/image) | Content outline before slides, data-heavy → html mode, artistic → image mode | `slides.generate` tRPC procedure + generate_slides agent tool | GREEN | Built-in |
| 8 | Speech Synthesis | `generate` mode (speech) | Natural pacing, appropriate voice selection, SSML for emphasis | Browser SpeechSynthesis API + useTTS hook | GREEN | Browser API |
| 9 | DOCX Generation | `file` (write) + python-docx or template | Dual-width tables, proper heading hierarchy, page numbers, TOC | `generate_document` tool (report format) | GREEN | Built-in |
| 10 | Video Production | `generate` mode (video) | Storyboard first, scene-by-scene, consistent style across clips | Agent tool integration (YELLOW — limited by sandbox video processing) | YELLOW | Video pipeline |
| 11 | Music Generation | `generate` mode (music) | Prompt crafting framework, structure syntax, multi-clip strategy | Agent tool integration (YELLOW — limited by sandbox audio processing) | YELLOW | Audio pipeline |
| 12 | Scheduling | `schedule` tool | Cron for precise timing, interval for simple recurring, min 5min interval | Scheduled Tasks with DB + polling loop in scheduler.ts | GREEN | Built-in |
| 13 | Parallel Processing | `map` tool | Homogeneous subtasks, shared output schema, up to 2000 parallel | `wide_research` parallel dispatch in agent | GREEN | Built-in |
| 14 | Excel/Spreadsheet | `shell` (python3) + openpyxl | Professional formatting, named ranges, conditional formatting, charts | `execute_code` tool + openpyxl | GREEN | openpyxl (installed) |
| 15 | PDF Manipulation | `shell` (python3) + various PDF libs | Merge, split, watermark, form fill, OCR | `execute_code` tool + PDF libraries | GREEN | fpdf2, reportlab (installed) |
| 16 | Image Processing | `shell` (python3) + Pillow | Crop, resize, rotate, format convert, multi-image stitch | `execute_code` tool + Pillow | GREEN | Pillow (installed) |

## Status Summary

| Status | Count | Capabilities |
|--------|-------|-------------|
| GREEN | 14 | #1-9, #12-16 |
| YELLOW | 2 | #10 Video Production, #11 Music Generation |
| RED | 0 | — |

## Notes

The 2 YELLOW capabilities (#10 Video, #11 Music) are limited by the sandbox environment's lack of native video/audio rendering pipelines. The agent tools exist and can dispatch to the Forge API, but end-to-end production workflows require media processing infrastructure that is platform-dependent. These are not implementation gaps — they are infrastructure constraints.
