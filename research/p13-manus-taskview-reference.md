# Manus Task View Reference (Side-by-Side Comparison)

## Layout Structure
The Manus task view has a two-panel layout: left panel is the chat/conversation thread, right panel is the artifact/preview panel.

## Left Panel (Chat Thread)
The left panel contains the conversation between user and agent. Key elements observed:

**Header bar** includes the task title ("Manus 1.6 Max" dropdown for model selection), user/share/copy/more icons in the top right, and a close (X) button.

**Suggested follow-ups** appear at the top of the completed task view, with icons for each type (pencil for edit, speech bubble for chat, etc.). Each follow-up is a clickable card with an arrow icon on the right.

**Terminal/code blocks** are shown inline with a dark background, showing the actual command output. A step counter ("4 / 4") with up/down arrows allows navigating between steps.

**Input area** at the bottom has "Send message to Manus" placeholder, with attachment icons (plus, GitHub, shield, monitor), voice input, and send button. The "Connect your tools to Manus" row with integration icons appears below.

## Right Panel (Artifact Preview)
The right panel shows the generated artifacts (in this case, map images from a DnD campaign). Key elements:

**Toolbar** at the top has a gear icon, zoom controls (minus, percentage, plus), and a close (X) button.

**Image viewer** shows the generated content with pan/zoom capability.

**Bottom toolbar** has play/download/share/emoji buttons.

## Key Differences from Manus Next

| Feature | Manus | Manus Next | Status |
|---------|-------|------------|--------|
| Two-panel layout | Yes | Yes | MATCH |
| Suggested follow-ups | Clickable cards with arrows | Similar implementation | MATCH |
| Step counter (4/4) | Yes, with up/down nav | Yes, tool step cards | MATCH |
| Terminal output blocks | Inline dark blocks | Code/terminal tool cards | MATCH |
| Artifact preview panel | Right panel with zoom | Right panel with zoom | MATCH |
| Model selector in header | "Manus 1.6 Max" dropdown | Mode toggle (Speed/Quality/Max) | EXCEED |
| Connect tools row | Below input | Below input (just added) | MATCH |
| Share/copy icons | Top right of header | More menu | MATCH |
| Close (X) button | Top right | Back button | MATCH |
