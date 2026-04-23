# Session 17 Bug Analysis

## Issues Found in User Chat Log

### BUG 1: Task Confusion / Context Bleed
**Severity:** Critical
**Description:** User asked "Generate me a step by step guide to collect all skyshards in ESO" but the agent responded with a WEREWOLF PVP BUILD instead of a skyshards guide. The agent mixed up two separate requests:
- Request 1: ESO Skyshards collection guide
- Request 2: (from a previous session) ESO one-bar PvP Werewolf build

The agent produced the skyshards document title ("ESO Skyshards: An Efficient Collection Guide") but then immediately output the werewolf build content. This indicates the agent's context/memory is bleeding between tasks or the LLM is confusing multiple prior conversations.

### BUG 2: Unprompted Code Execution
**Severity:** High
**Description:** The agent auto-approved "execute_code" without user confirmation. The chat shows:
- "APPROVED execute_code: The agent wants to execute code on your system. Action approved — agent is proceeding"
This happened automatically. The agent should require explicit user approval for code execution, especially when the user only asked for a text guide.

### BUG 3: Response Interrupted / Partial Content
**Severity:** Medium
**Description:** The response was interrupted with "[Response interrupted — partial content saved]". The agent started executing code (factorial calculation) mid-response which seems completely unrelated to the ESO request.

### BUG 4: Wrong Task Context in Response
**Severity:** High
**Description:** The agent's step log shows it searched for "ESO one bar PvP Werewolf build brawler Aldmeri Dominion Dark Elf Arcanist" — this was from a PREVIOUS task, not the current skyshards request. The agent is carrying over context from prior tasks into new ones.

## Root Causes to Fix
1. **Task isolation** — Each new task should have a clean context, not inherit from previous tasks
2. **Code execution approval** — Agent should not auto-approve code execution; require user confirmation
3. **Response coherence** — Agent should not mix content from different requests in a single response
4. **Tool use relevance** — Agent should not execute unrelated code (factorial) when user asks for a guide
