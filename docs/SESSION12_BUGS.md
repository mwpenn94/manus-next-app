# Session 12 User-Reported Bugs

## Bug 7: Duplicate Document Generation
- Agent calls `generate_document` tool 4 times for the same "Sample Markdown Document"
- All 4 produce identical content
- Shows "4 steps completed" with 4x "Writing document: Sample Markdown Document"
- Root cause: Agent tool loop doesn't deduplicate or track what was already generated

## Bug 8: Only Markdown Files Generated (No PDF/DOCX/CSV/XLSX)
- Agent claims it can generate markdown, PDF, DOCX formats
- Agent admits CSV/XLSX not supported by generate_document tool
- In reality, only .md files are produced — no actual PDF or DOCX generation
- Document preview shows raw markdown (not rendered) on CloudFront
- Need: Real PDF generation (via puppeteer/weasyprint), real DOCX (via docx npm), CSV/XLSX (via xlsx npm)

## Bug 9: Chat Message Ordering Broken
- Follow-up messages from user appear ABOVE the response they should be below
- "Why so many markdown doc copies?" shows above the agent's response about document capabilities
- Timestamps suggest correct order but visual rendering is wrong

## Bug 10: Progress Indicators Scattered
- "Task Progress 2/2" card appears as a separate block mid-chat
- Inline step cards ("Writing document: Sample Markdown Document" x4) appear as separate cards
- "Manus is writing" indicator appears separately
- In real Manus: progress always streams at bottom of chat, not scattered throughout

## Bug 11: Agent Ignores Prompt / Over-Researches
- Simple question "What documents can you create?" triggers "Wide research: 4 parallel queries"
- Agent uses recursive optimization prompt to over-analyze simple capability questions
- Should give a direct answer for self-knowledge questions, not web-research them

## Bug 12: Agent Repeats Same Actions
- Same generate_document call made 4 times
- Agent doesn't track what it already did in the current task
- No deduplication of tool calls within a single task execution

## Remaining from Session 11:
- Bug 4: localhost:4200 preview URL (webapp preview proxy) — IN PROGRESS
- Bug 5: App card blank preview / "Not published" state
- Bug 6: App card link vs. card inconsistency
