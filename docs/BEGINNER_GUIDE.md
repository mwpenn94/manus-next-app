# Manus Next — Beginner's Guide

**Author:** Manus AI  
**Last Updated:** April 2026

---

## Introduction

Manus Next is your autonomous AI agent platform. It can research, build, design, code, analyze data, and automate workflows — all from a single natural language prompt. This guide walks you through every feature so you can get productive immediately.

---

## Getting Started

### Signing In

When you first visit Manus Next, you will be prompted to sign in with your Manus account. Authentication is handled automatically through Manus OAuth. Once signed in, your session persists across browser tabs and visits — no need to log in repeatedly.

### The Home Screen

After signing in, you land on the home screen which greets you by name and presents a clean input area. The home screen is organized around a single principle: **give Manus a task and watch it work**. You will see:

| Element | Purpose |
|---------|---------|
| Greeting | Personalized welcome message |
| Input bar | Where you type or paste your task description |
| Quick action chips | One-tap shortcuts for common task types (Build a website, Create slides, etc.) |
| Suggestion cards | Pre-written task ideas you can click to auto-fill the input |
| Connector card | Shows how many services are connected to your agent |

---

## Creating and Running Tasks

### Step 1: Describe Your Task

Type a clear description of what you want accomplished into the input bar. Be as specific or as general as you like — Manus will ask clarifying questions if needed. Examples of effective prompts:

> "Research the top 5 competitors in the AI coding assistant market and create a comparison table with pricing, features, and user ratings."

> "Build a responsive landing page for my SaaS product called DataFlow. Use a modern dark theme with blue accents."

> "Analyze this CSV file and create visualizations showing monthly revenue trends."

### Step 2: Submit

Press **Enter** or click the arrow button to submit. You can also attach files using the paperclip icon or use voice input with the microphone button.

### Step 3: Watch the Agent Work

Once submitted, you are taken to the **Task View** where you can observe the agent in real time. The agent will:

1. **Plan** — The AEGIS system classifies your task and generates an execution plan (shown as numbered steps with progress indicators).
2. **Execute** — The agent performs actions such as browsing the web, writing code, generating documents, or calling APIs. Each action appears as a collapsible step in the conversation.
3. **Deliver** — The final result is presented as a message with any generated artifacts (files, images, websites, etc.).

### Step 4: Iterate

You can send follow-up messages at any time to refine the result, ask questions, or request changes. The agent maintains full context of the conversation.

---

## Understanding the Task View

The Task View is a two-panel layout:

| Panel | Content |
|-------|---------|
| **Left (Chat)** | Conversation messages, agent actions (collapsible), execution plan steps |
| **Right (Workspace)** | Live previews of websites, documents, images, browser activity, and code |

On mobile, the workspace appears below the chat in a tabbed layout. Tap the workspace tabs to switch between views.

### Message Types

Messages in the chat panel come in several forms. Your messages appear on the right side with a subtle background. Agent messages appear on the left with the "Manus" label and timestamp. Action steps are collapsible accordions showing what the agent did (browsed a page, wrote code, generated an image, etc.). Error cards appear with a warning icon if something went wrong, along with a friendly explanation.

### The Recovery Banner

If a task gets stuck or encounters an error, an amber banner appears above the input area with a **Retry** button. Click it to have the agent attempt recovery, or simply type a new message to continue.

---

## Connecting Services (Connectors)

Connectors supercharge your agent by linking external services. Navigate to the **Connectors** page from the sidebar or settings.

### Available Connectors

| Connector | What It Enables |
|-----------|----------------|
| GitHub | Repository management, code commits, PR creation |
| Google Drive | File access, document creation, spreadsheet manipulation |
| Slack | Message sending, channel management, notifications |
| Notion | Page creation, database queries, content management |
| Linear | Issue tracking, project management |
| Microsoft 365 | Email, calendar, document editing |
| Google Calendar | Event creation, scheduling, availability checks |
| Gmail | Email sending, reading, draft management |

### Connecting a Service

1. Navigate to **Settings > Connectors** or click the connector card on the home page.
2. Find the service you want to connect.
3. Click **Connect** and follow the OAuth authorization flow.
4. Once connected, the connector shows a green "Connected" badge.

### Testing Connector Actions

Each connector detail page includes an **Actions** section where you can view all available operations (e.g., "Create Issue", "Send Message", "Upload File"), expand any action to see its parameters, and use the inline **Action Tester** to try operations directly from the UI.

---

## Using the Library

The **Library** (accessible from the sidebar) stores your saved artifacts, documents, and reference materials. Items saved here are available to the agent across all tasks, giving it persistent memory of your preferences and resources.

---

## Agent Tools

The agent has 14+ built-in tools it can use autonomously:

| Category | Tools |
|----------|-------|
| **Research** | Web search, wide research (parallel queries), webpage reading, enhanced browsing |
| **Creation** | Image generation, document generation, slide creation, design composition, webapp building |
| **Analysis** | Data analysis, code execution (sandboxed) |
| **Communication** | Notifications, email, connector actions |
| **Media** | Audio transcription, file management |

You do not need to tell the agent which tool to use — it decides automatically based on your request.

---

## Interpreting Execution Steps

During task execution, the agent shows its work through action steps. Each step has an icon and label indicating what type of action was performed:

| Icon | Action Type | Description |
|------|-------------|-------------|
| Globe | Browsing | Agent visited a webpage |
| Code | Coding | Agent wrote or modified code |
| Terminal | Command | Agent ran a shell command |
| File | Document | Agent created or read a document |
| Image | Generation | Agent generated an image |
| Search | Research | Agent searched for information |
| Database | Data | Agent queried or stored data |
| Rocket | Deploy | Agent deployed a website or app |

Steps are collapsed by default to keep the view clean. Click any step to expand and see the full details of what was done.

---

## Handling Errors and Retrying

### Automatic Error Recovery

Manus Next is designed to handle errors gracefully. Stream interruptions are automatically retried with exponential backoff. Network errors are suppressed from noisy display and retried silently. Agent crashes are caught and displayed as friendly error cards rather than raw stack traces.

### Manual Recovery

If the agent stops responding or shows an error:

1. **Check the recovery banner** — If visible, click **Retry** to restart from the last successful point.
2. **Send a message** — Simply typing "Try again" or describing what you want differently will resume the agent.
3. **Create a new task** — For persistent issues, start fresh with a new task from the home screen.

### What Error Messages Mean

| Message | Meaning | Action |
|---------|---------|--------|
| "This task encountered an error" | The agent hit an unexpected problem | Click Retry or send a follow-up message |
| "This task appears to be stalled" | The agent stopped without completing | Send a message to resume |
| "Connection was interrupted" | Network issue between you and the server | Usually auto-recovers; refresh if persistent |
| "Something went wrong on our end" | Server-side processing error | Wait a moment and retry |

---

## Settings

Access Settings from the sidebar (gear icon). Key sections:

| Section | Purpose |
|---------|---------|
| **General** | Default system prompt, display name, response preferences |
| **Capabilities** | View and toggle platform features |
| **Connectors** | Connect external services |
| **Privacy** | Manage saved cookies and data |
| **Convergence** | Configure AI reasoning mode (Convergent/Divergent/Adaptive) |

---

## Billing

Access the Billing page from the sidebar. Here you can view your current subscription plan, see task usage statistics, subscribe to Manus Next Pro for higher limits, and view payment history. Test payments use the card number `4242 4242 4242 4242` with any future expiry date and any CVC.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus the search/input bar |
| `Ctrl/Cmd + N` | Create a new task |
| `Ctrl/Cmd + Shift + S` | Toggle the sidebar |
| `Enter` | Submit message |
| `Shift + Enter` | New line in input |
| `Esc` | Close modals and overlays |

---

## Mobile Usage

Manus Next is fully responsive. On mobile devices:

- The sidebar becomes a slide-out drawer (tap the hamburger menu icon).
- Suggestion cards scroll horizontally with swipe gestures and pagination dots.
- The input bar is optimized for touch with larger tap targets.
- The workspace panel is accessible via tabs below the chat.
- Voice input works via the microphone button for hands-free operation.

---

## Tips for Best Results

1. **Be specific** — "Create a React dashboard with a sidebar, dark theme, and chart showing monthly sales" works better than "make me an app."
2. **Provide context** — Attach files, paste URLs, or describe your existing setup so the agent understands your environment.
3. **Iterate** — The agent improves with feedback. If the first result is not quite right, describe what to change.
4. **Use connectors** — Connected services let the agent take real actions (commit code, send emails, create issues) rather than just generating text.
5. **Check the execution plan** — The numbered steps at the top of the task view show you what the agent plans to do before it does it.
6. **Use system prompts** — Set a global system prompt in Settings to customize the agent's behavior for your workflow.
7. **Try voice** — Voice input is often faster for complex requests.

---

## Frequently Asked Questions

**Q: Can I use Manus Next on my phone?**  
A: Yes. The interface is fully responsive and works on all modern mobile browsers.

**Q: How do I stop a running task?**  
A: Click the stop button that appears in the input area during streaming, or simply close the tab — the agent will stop processing.

**Q: Are my conversations private?**  
A: Yes. Your tasks and data are associated with your authenticated account and are not shared with other users.

**Q: What models does Manus use?**  
A: Manus Next uses premium AI models by default. You can select different models from the model selector in the top bar.

**Q: How do I share a task with someone?**  
A: Use the share button in the task view header. You can generate a public link or share with specific collaborators.

**Q: What if the agent loses context after an error?**  
A: The system automatically filters error messages from context reconstruction, so the agent picks up where it left off. If it seems confused, send a brief summary of what you need.

---

*For additional help, visit the Settings page or contact support through the platform.*
