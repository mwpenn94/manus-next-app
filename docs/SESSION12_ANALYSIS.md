# Session 12 Bug Analysis

## Bug 1: Duplicate document generation
- FIXED: Added dedup guard Map in agentStream.ts tool execution loop
- Prevents same generate_document call from executing more than once per session

## Bug 2: Only markdown files generated (PDF/DOCX claimed but not produced)
- FIXED: CSV and XLSX support added to documentGeneration.ts and agentTools.ts
- PDF and DOCX generation code already existed in documentGeneration.ts (pdfkit, docx package)
- The issue was the LLM always defaulting to output_format: "markdown"
- System prompt needs to be updated to tell agent to use the correct output format

## Bug 3: Messages going out of order
- ROOT CAUSE: In TaskContext.tsx line 225, server messages merge puts server msgs first, 
  then local msgs. But server messages may have been persisted out of order (e.g., card messages
  from onWebappPreview, onConfirmationGate, onConvergence are added via addMessage which 
  persists immediately, while the streaming text is persisted on completion).
- Also: The merge at line 225 does `[...dedupedServerMsgs, ...uniqueLocalMsgs]` which puts
  server-loaded messages before any local-only messages regardless of timestamp.
- FIX: Sort merged messages by timestamp after merging.

## Bug 4: Progress indicators scattered
- ROOT CAUSE: In TaskView.tsx lines 2509-2590, the streaming section renders:
  1. TaskProgressCard (line 2524) - shows phase progress
  2. ActionStep list (line 2530-2535) - shows individual tool steps  
  3. ActiveToolIndicator (line 2538) - shows current tool status
  4. streamContent (line 2583) - shows streaming text
  
  These are all in the streaming block which only shows when `streaming` is true.
  BUT: card messages (convergence, webapp_preview, etc.) are added via addMessage 
  during streaming, which inserts them into the message list ABOVE the streaming block.
  This creates the scattered appearance.
  
- FIX: Card messages that arrive during streaming should not be immediately added to 
  the message list. Instead, queue them and add them when streaming completes.
  OR: Move the streaming block to always be at the very bottom, and ensure card messages
  during streaming are rendered within the streaming block.

## Bug 5: Agent ignores prompt / over-researches
- The system prompt tells the agent to use recursive optimization for quality
- Simple questions like "what documents can you create" trigger full research cycles
- FIX: Update system prompt to differentiate between simple queries and complex tasks
