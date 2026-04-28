# Manus UI/UX Reference — Key Patterns for Parity+

## Core Layout Pattern (from MIT TR, NoCode MBA, multiple reviewers)
- **Three-pane layout**: Chat left, agent activity (browser/terminal/files) middle, live preview/artifact pane right
- Real-time to-do list visible during execution
- Replay button captures entire session
- Left column = previous tasks; center = chat input; minimalist landing

## Canonical User Journey (11 nodes)
1. Sign in → minimalist landing
2. Prompt in plain English
3. Plan presented as to-do list (approve/edit/redirect)
4. Execute in sandbox (visible: terminal, browser, file edits, code)
5. Asynchronous waiting (close tab, keeps working, notifies on complete)
6. Iterate conversationally ("change X", "add Y")
7. Inspect ("View all files in this task")
8. Share or Collaborate (different threat models)
9. Replay (every action playable like screen recording)
10. Deploy (one-click publish to *.manus.space, custom domain, or export)
11. Schedule / extend (recurring tasks, Skills, integrations)

## 16 Capability Surfaces
1. Main task view ("Manus's Computer") — three-pane
2. Web App Builder — conversational → plan → preview → iterate
3. Sandbox / Cloud Computer — persistent sessions
4. Wide Research — parallel sub-agents, sortable matrix output
5. AI Slides — upload PPTX, brand matching, 3-10 min output
6. Browser Operator — visible Chromium, vision-model verification
7. Mail Manus — email → task with attachments
8. Slack integration — context-aware inline
9. Telegram / WhatsApp / LINE — same agent, chat surface
10. My Computer (Desktop) — local CLI control
11. Design View — interactive image canvas, region editing
12. Agent Skills — preset capabilities, combinable, shareable
13. Scheduled Tasks — interval-based recurring
14. Meeting Mode — transcripts → summaries → action items
15. Mobile builder (1.6) — end-to-end mobile dev
16. Sharing vs Collaboration — different access levels

## Key UI/UX Principles (from reviews)
- Minimalist, warm dark theme
- Agent activity visible in real-time (not hidden)
- Asynchronous by default (submit and walk away)
- Conversational iteration (no code edits required, but code exposed)
- Replay for training, debugging, audit trails
- Credit-burn visibility (usage tracking)
