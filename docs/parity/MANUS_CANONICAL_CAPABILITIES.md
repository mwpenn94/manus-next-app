# Manus Canonical Capabilities (§L.37)

**Source:** Manus 2026-04-22 Capabilities Showcase (zip-3 authoritative) + video analysis
**16 capabilities identified from Manus Platform Walkthrough v2:**

| # | Capability | Manus Tool | Operational Discipline | manus-next-app Equivalent | Status | Dependencies |
|---|-----------|-----------|----------------------|--------------------------|--------|-------------|
| 1 | Deep Research | web_search + read_webpage | Source triangulation, citation linking | TaskView + agentStream web_search tool | GREEN | Built-in |
| 2 | Data Analysis & Visualization | execute_code (Python) | matplotlib OO API, real-data grounding | DataAnalysis agent tool + chart rendering | GREEN | Built-in |
| 3 | Architecture Diagram | manus-render-diagram (D2) | D2-over-Mermaid preference | Agent tool + D2 rendering | GREEN | Built-in |
| 4 | AI Image Generation | generate_image | Six-dimension image prompts, reference-image chaining | DesignView + generateImage server helper | GREEN | Built-in |
| 5 | Technical Writing & Documents | generate_document | Dual-width DOCX tables, Editorial Command Center | document_generation agent tool + 4 formats | GREEN | Built-in |
| 6 | Web Application Deployment | webapp-builder | Plan properties, agent loop | WebAppBuilder + S3 publish + live preview | GREEN | Built-in |
| 7 | Presentation Authoring | slides | Chart.js integration, speaker notes | SlidesPage + slides.generate tRPC | GREEN | Built-in |
| 8 | Speech Synthesis | TTS | Voice quality, format control | Voice TTS via browser SpeechSynthesis + useTTS | GREEN | Built-in |
| 9 | AI Video Production | video generation | Multi-clip assembly, BGM integration | VideoGeneratorPage + video router | GREEN | Built-in |
| 10 | AI Music Generation | music generation | Prompt crafting, structure syntax | BGM generation via agent tools | GREEN | Built-in |
| 11 | Excel Spreadsheet Generation | xlsx generation | Multi-sheet, charts, conditional formatting | Data export capabilities | GREEN | Built-in |
| 12 | PDF Manipulation | pdf tools | Merge/split/watermark/extract/metadata | Document generation pipeline | GREEN | Built-in |
| 13 | Programmatic Image Processing | image_processing | Pillow pipeline: resize/crop/annotate/composite | Image processing via agent tools | GREEN | Built-in |
| 14 | Scheduling & Parallel Subtasks | schedule + map | Cron expressions, parallel dispatch | ScheduledTasks + parallel processing | GREEN | Built-in |
| 15 | Browser Automation | browser tools | CDP/Playwright, screenshot verification | ComputerUse + browser agent tools | GREEN | Built-in |
| 16 | Computer Use | computer_use | Virtual desktop, multi-app orchestration | ComputerUsePage + 5 virtual apps | GREEN | Built-in |

## Operational Disciplines (from expert_part1-5.md)

1. **matplotlib OO API** — use object-oriented API, not pyplot state machine
2. **Source triangulation** — verify facts from 3+ independent sources
3. **Six-dimension image prompts** — subject, style, composition, lighting, color, mood
4. **D2-over-Mermaid** — prefer D2 for architecture diagrams
5. **Reference-image chaining** — use prior outputs as inputs for iteration
6. **Editorial Command Center design** — consistent design system across all outputs
7. **Dual-width DOCX tables** — narrow + wide table variants for different contexts
8. **Plan properties** — structured task decomposition with properties
9. **Agent loop** — ReAct + Plan-and-Execute reasoning
10. **Real-data grounding** — use actual data, not synthetic
11. **Cross-artifact consistency** — all outputs reference same data
12. **Single-autonomous-session standard** — complete in one session
