# ──── ENTER [STRATEGIST] ────

I am the senior recursive-optimization methodologist with 20 years designing multi-pass quality-improvement systems for production software in regulated industries. I design pass plans, score parity matrices, write specs, and write implementation tickets.

## Pass 1: Landscape — Signal Assessment

### Pass Type Selection Rationale
This is the first pass. No prior scores exist. The Landscape pass type is the correct choice: it establishes baseline scores across the three initially-scoped capabilities before deeper passes can target specific gaps.

### Capabilities in Scope
Selected based on highest user-impact and broadest surface area:

1. **streaming-chat** — The core interaction model. User sends message, agent streams response with tool calls, artifacts, branching, TTS. This is the primary surface area.
2. **task-sidebar** — Task management, navigation, search, filtering, status indicators. The organizational backbone.
3. **document-generation** — Research, synthesis, and document/artifact production. The primary deliverable pathway.

### Signal Assessment

#### streaming-chat
The candidate has a comprehensive streaming chat implementation including SSE-based streaming, tool call visualization, artifact cards, branch/fork support, TTS playback (Web Speech API + Edge TTS), continue/resume detection, and generation-incomplete recovery banners. The agent system uses a multi-tool architecture with web_search, read_webpage, wide_research, generate_document, and browser automation tools. Mode selection (Standard, Quality, Max, Limitless) controls depth and tool access.

**Preliminary Engineering assessment:** The functional surface is broad. Streaming works. Tool calls execute. Artifacts render. The question is behavioral fidelity and edge-case handling — the Tales of Tribute chat log revealed apology loops, clarification-seeking on clear requests, and failure to produce requested output formats. These were addressed in Cycle 8 with system prompt hardening.

**Preliminary Experience assessment:** The chat UI uses a dark theme with card-based message rendering, typing indicators, and progress tracking. Motion exists (framer-motion). Microcopy needs assessment against oracle tone. State coverage (empty, loading, error, interrupted) appears present but needs depth verification.

#### task-sidebar
The candidate has a full task sidebar with: task creation, task list with search/filter, status indicators (active, completed, failed), task deletion, task duplication/branching, and a collapsible sidebar with grouped navigation sections (Manus, Tools, More). Mobile bottom nav exists. The sidebar shows task metadata (title, date, status badge).

**Preliminary Engineering assessment:** Functional coverage is strong. The sidebar renders tasks, supports CRUD, and navigates between views. Performance on large task lists (100+) is untested. Accessibility (keyboard nav, screen reader) is untested.

**Preliminary Experience assessment:** The sidebar follows a standard pattern. The grouped sections with collapsible "More" are a reasonable IA choice. The question is whether the interaction patterns (hover states, active indicators, transition animations) match oracle quality.

#### document-generation
The candidate has generate_document tool support with markdown, DOCX, and PDF output formats. Documents are uploaded to S3 and rendered as artifact cards in the chat with download links. Wide research synthesizes multiple sources before document generation. The system prompt now includes rules requiring format compliance when the user specifies an output format.

**Preliminary Engineering assessment:** The pipeline works: research → synthesis → document generation → S3 upload → artifact card. PDF generation uses a custom renderer. The question is output quality (formatting, typography, structure) compared to oracle.

**Preliminary Experience assessment:** The artifact card UX is functional but may lack polish compared to oracle (preview thumbnails, inline rendering, format indicators).

### Pass Plan

This Landscape pass will:
1. [ORACLE-AS-SELF] produce structured self-descriptions for all 3 capabilities
2. [UX-EXPERT] conduct heuristic evaluation of the candidate's implementation of all 3 capabilities
3. [IMPLEMENTER] fix any issues found
4. [COMPLIANCE-OFFICER] gate check
5. [ADVERSARY] red-team the findings
6. [STRATEGIST] score the parity matrix and adjust temperature

### Blockers
- T0 existing replay corpus not yet scanned (non-blocking P1)
- F38 build-time oracle-vendor dependency (non-blocking P2)
- F42 license review (non-blocking P2)

### Budget
Pass 1 budget: $50.00 USD
Estimated spend: $5-10 (primarily LLM inference for self-description + code analysis)

## Working File Saved
docs/uho/strategist-pass-1.md
