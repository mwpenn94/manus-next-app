# Manus Parity Features Research

## Browser Operator (Local vs Cloud)
- **Local Browser (Browser Operator)**: Extension that transforms user's browser into AI-controlled agent
  - Uses existing logins/sessions
  - Avoids CAPTCHAs
  - User must grant access per session
  - Works in dedicated tab
  - User can stop by closing tab
- **Cloud Browser**: Isolated sandboxed environment
  - Requires logging in within session
  - Best for general web tasks, broad research
- UI shows toggle/selector between "Use my browser" vs "Cloud browser"
- In our app context: "Crimson-Hawk" = user's local browser mode (the Browser Operator equivalent)

## Task Pause / Guidance Prompts
- Agent can pause execution and prompt user for input
- Shows inline in chat: "I need your guidance on..." with action buttons
- User can respond with text or click suggested actions
- Common scenarios: authentication needed, ambiguous instructions, confirmation before destructive action

## Take Control of Computer
- User can take over the sandbox/computer view
- Button in SandboxViewer header: "Take control" / "Take over"
- Switches from view-only to interactive mode
- User can type, click, navigate in the sandbox
- Agent pauses while user has control
- "Return control" button to hand back to agent

## Task States (from screenshots)
- Running (blue pulse)
- Paused (yellow/amber - waiting for user input)
- Completed (green check)
- Error (red)
- Stopped (gray - user stopped)

## Features from Screenshots (IMG_6903-6913)
- + menu bottom sheet with feature list ✅ (implemented)
- Voice recording with waveform, timer, cancel/confirm ✅ (implemented)
- Model selector in header ✅ (implemented)
- Task rename in More menu
- Task details page (name, created at, credits used)
- Files browser with filter tabs
- Browser mode selector (Cloud vs Local/Crimson-Hawk)
- Task pause state with guidance request UI
- Take control button in sandbox viewer
