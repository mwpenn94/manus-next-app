# Progress Indicator Fix Analysis

## Current State
The streaming section (lines ~2509-2590 in TaskView.tsx) already renders:
1. TaskProgressCard (step progress)
2. Agent action steps (collapsible list)
3. ActiveToolIndicator (presence indicator)
4. Streaming text content

This is CORRECTLY positioned at the bottom of the messages list, inside the scroll container.

## Problem
The issue is that during streaming, card-type messages (convergence, document, etc.) are added 
via `addMessage()` which inserts them into `task.messages`. These then render as MessageBubble 
entries ABOVE the streaming section, creating the scattered appearance.

Additionally, the TaskProgressCard is rendered BOTH:
- In the streaming section (bottom, correct)
- AND as part of completed messages with `hasActions` (in MessageBubble, scattered)

## Root Cause
When the stream completes, the final message is added with `actions` array attached.
This creates a MessageBubble with an expandable action steps list.
But during streaming, the same actions are shown in the streaming section.
This is actually correct behavior (live vs. historical).

The REAL problem is:
1. Document card messages being added mid-stream via onDocument callback
2. Convergence cards being added mid-stream via onConvergence callback
3. These appear as separate MessageBubble entries scattered through the chat

## Fix Strategy
Instead of adding document/convergence events as separate messages during streaming,
accumulate them and only add them as part of the final message when streaming completes.
Or: filter card-type messages from the message list during active streaming and show them
only in the streaming section.
