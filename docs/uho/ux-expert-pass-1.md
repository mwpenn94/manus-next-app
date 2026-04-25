# ──── ENTER [UX-EXPERT] ────

I am a senior UX researcher with 15 years of experience in heuristic evaluation, usability testing, and interaction design for complex AI-powered applications. I evaluate the candidate app against the three scoped capabilities using Nielsen's 10 heuristics and additional AI-specific criteria.

## Heuristic Evaluation — Pass 1 (Landscape)

### 1. streaming-chat

| Heuristic | Score (1-5) | Finding | Severity |
|-----------|-------------|---------|----------|
| Visibility of system status | 4 | Streaming shows typing indicator, tool call progress, step count. Good. Missing: estimated time remaining for long operations. | Low |
| Match between system and real world | 4 | Mode names (Standard, Quality, Max, Limitless) are intuitive. Tool call names are technical (web_search, read_webpage) but shown in expandable details. | Low |
| User control and freedom | 3 | Can stop generation, branch conversations, retry. Missing: ability to edit a sent message and regenerate. Missing: undo last action. | Medium |
| Consistency and standards | 4 | Message cards follow consistent pattern. Artifact cards are uniform. Branch indicators are consistent. | Low |
| Error prevention | 3 | Empty input prevented. But no confirmation before deleting a task/conversation. No warning before navigating away from active generation. | Medium |
| Recognition rather than recall | 4 | Suggestion cards on home screen. Category tabs. Mode selector visible. | Low |
| Flexibility and efficiency | 3 | Keyboard shortcut (Cmd+K) for focus. But no keyboard shortcuts for common actions (new task, stop generation, switch mode). | Medium |
| Aesthetic and minimalist design | 4 | Dark theme is clean. Warm void aesthetic is distinctive. Suggestion cards are well-designed. Package badges at bottom are decorative but not distracting. | Low |
| Help users recognize and recover from errors | 3 | Generation incomplete banner exists. But error messages from tool failures are technical (raw error text). No guided recovery suggestions. | Medium |
| Help and documentation | 2 | Onboarding modal exists (7 steps). But no contextual help, tooltips on tools, or "what can I do?" guide accessible from the chat. | High |

**Engineering Parity Score: 4.0/5** — Functional coverage is strong. The streaming pipeline, tool execution, and artifact rendering all work. The gap is in edge-case handling and recovery UX.

**Experience Parity Score: 3.5/5** — The visual design is polished and distinctive. The gaps are in user control (no edit-and-regenerate), error recovery (technical error messages), and help/documentation (no contextual help).

### 2. task-sidebar

| Heuristic | Score (1-5) | Finding | Severity |
|-----------|-------------|---------|----------|
| Visibility of system status | 4 | Task status badges (active, completed, failed) are visible. Step count shown. | Low |
| Match between system and real world | 4 | "Tasks", "New task", "Search" are standard terms. Section names (Manus, Tools, More) are clear. | Low |
| User control and freedom | 3 | Can create, delete, duplicate tasks. But no task renaming from sidebar. No drag-to-reorder. | Medium |
| Consistency and standards | 4 | Sidebar follows standard patterns. Grouped sections are consistent. | Low |
| Error prevention | 3 | No confirmation dialog before task deletion. | Medium |
| Recognition rather than recall | 4 | Active route highlighted. Section auto-expands on active route. | Low |
| Flexibility and efficiency | 3 | Search works. Filter by status works. But no keyboard navigation through task list. | Medium |
| Aesthetic and minimalist design | 4 | Clean, minimal sidebar. Good use of icons. Collapsible sections reduce clutter. | Low |
| Help users recognize and recover from errors | 3 | Empty state shown for no tasks. But no undo after delete. | Medium |
| Help and documentation | 3 | Section labels are self-explanatory. But no tooltips on icons. | Low |

**Engineering Parity Score: 4.0/5** — CRUD operations work. Search and filter work. Role-based visibility works.

**Experience Parity Score: 3.5/5** — Clean design, good IA. Gaps in task management UX (no rename, no reorder, no delete confirmation).

### 3. document-generation

| Heuristic | Score (1-5) | Finding | Severity |
|-----------|-------------|---------|----------|
| Visibility of system status | 3 | During document generation, user sees "Generating document..." but no progress indicator for the multi-step pipeline (research → synthesis → generation → upload). | Medium |
| Match between system and real world | 4 | "Document", "PDF", "Download" are standard terms. Artifact cards show format badges. | Low |
| User control and freedom | 2 | Cannot edit generated documents inline. Cannot request specific sections to be regenerated. Cannot choose template/style. | High |
| Consistency and standards | 4 | Artifact cards are consistent across formats. Download buttons are standard. | Low |
| Error prevention | 3 | Format compliance rules in system prompt. But no preview before download. | Medium |
| Recognition rather than recall | 3 | Artifact card shows title and format. But no preview thumbnail for PDFs. | Medium |
| Flexibility and efficiency | 2 | No template selection. No style customization. No section-level regeneration. | High |
| Aesthetic and minimalist design | 4 | Artifact cards are clean. Download flow is simple. | Low |
| Help users recognize and recover from errors | 3 | Error reported in chat if generation fails. But no retry button on the artifact card itself. | Medium |
| Help and documentation | 2 | No guide on what document types are supported. No examples of output quality. | High |

**Engineering Parity Score: 3.5/5** — Pipeline works end-to-end. Multi-format output works. S3 upload works. Gap is in pipeline visibility and error recovery.

**Experience Parity Score: 3.0/5** — Functional but basic. No inline preview, no template selection, no section-level control.

## Summary of Actionable Findings

### High Priority (implement in this pass)
1. **H1: Delete confirmation dialog** — Add confirmation before task deletion (task-sidebar)
2. **H2: Contextual help/tooltips** — Add tooltips on sidebar icons and tool call names (streaming-chat, task-sidebar)
3. **H3: Document pipeline progress** — Show multi-step progress during document generation (document-generation)

### Medium Priority (implement if time permits)
4. **M1: Edit-and-regenerate** — Allow editing a sent message to regenerate the response (streaming-chat)
5. **M2: Keyboard shortcuts** — Add shortcuts for new task (Cmd+N), stop generation (Esc), switch mode (Cmd+1/2/3/4) (streaming-chat)
6. **M3: Task rename from sidebar** — Double-click or right-click to rename (task-sidebar)
7. **M4: Error message humanization** — Wrap technical errors in user-friendly messages with suggested actions (streaming-chat)
8. **M5: Artifact retry button** — Add retry on artifact cards when generation fails (document-generation)

### Low Priority (future passes)
9. **L1: Estimated time remaining** — Show ETA for long operations (streaming-chat)
10. **L2: Document preview thumbnail** — Generate preview image for PDF artifacts (document-generation)
11. **L3: Template/style selection** — Allow choosing document templates (document-generation)

# ──── EXIT [UX-EXPERT] ────
