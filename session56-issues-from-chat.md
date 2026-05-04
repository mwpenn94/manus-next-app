# Issues Identified from User Chat Transcript

## Issue 1: Agent Apologizes Despite Anti-Apology Rules
- Line 194: "My apologies! You are absolutely right."
- Line 196: "My apologies again for the outdated information!"
- The system prompt has an explicit "NO APOLOGIES" rule, but the agent still apologizes.
- **Root Cause**: The anti-apology rule may not be strong enough or positioned correctly.

## Issue 2: Agent Uses Outdated Training Data Instead of Fresh Research
- The agent provided Dragonknight skills from before Update 41/49 rework
- When told the info was outdated, it acknowledged but still relied on "training data" (line 66: "based on my training data")
- **Root Cause**: The agent should ALWAYS research first for game/current-event queries, never rely on training data for things that change with patches/updates.

## Issue 3: Agent Hallucinates Update Numbers
- User said "Update 49", agent "corrected" to "Update 41" — neither may be accurate
- **Root Cause**: Agent should not assert correction of facts it's uncertain about. Should research instead.

## Issue 4: Agent Says "I'll get right on researching" Then Immediately Gives Answer
- Line 9: Says "I'll get right on researching" but then immediately provides a full answer in the same message
- This creates a jarring UX where the agent promises research but delivers cached/stale content
- **Root Cause**: The agent should either research first THEN answer, or just answer without the preamble.

## Issue 5: Research Quality - Only 2-3 Steps for Complex Gaming Query
- Only searched once and browsed one page for the initial query
- Should have done deeper research for a build guide (multiple sources, cross-reference)
- **Root Cause**: Agent may be using "speed" mode behavior even in "limitless" mode.

## Fixes Needed in agentStream.ts:
1. Strengthen anti-apology enforcement (maybe add to the conversation injection, not just system prompt)
2. Add rule: For gaming/patch-dependent queries, ALWAYS research fresh — never rely on training data
3. Add rule: Don't correct user's factual claims unless you have verified evidence
4. Add rule: Don't promise research then immediately answer from memory — do the research first
5. Ensure limitless mode does adequate research depth (minimum steps for complex queries)
