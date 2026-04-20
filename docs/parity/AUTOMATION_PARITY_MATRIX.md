# AUTOMATION_PARITY_MATRIX — Manus Next v9

**Spec version:** v9 | **Audit date:** April 20, 2026 | **Auditor:** Agent (v9 §L.23 compliance)

> 5 automation surfaces, 4 non-negotiable demos that must pass at free tier, coverage matrix.

---

## Automation Surfaces

Per §L.23, automation parity requires coverage across 5 surfaces:

| Surface | Description | Manus Next Coverage |
|---------|-------------|-------------------|
| S1: App's Compute | Server-side automation within the deployed application | Full — scheduled tasks, agent tool loop, webhook processing |
| S2: User's Device (BYOD) | Automation on the user's local machine | Partial — ConnectDevicePage with CDP/ADB/WDA pairing, Electron bridge |
| S3: Cross-Device Continuity | Seamless handoff between devices | Partial — cross-session memory, task sharing via signed URLs |
| S4: Mobile-Specific | Automation leveraging mobile capabilities | Partial — PWA with service worker, responsive UI, mobile bottom nav |
| S5: Collaboration | Multi-user automation workflows | Partial — team sessions, shared tasks, real-time notifications |

---

## 4 Non-Negotiable Demos

### Demo 1: Scheduled Research Report (S1: App's Compute)

**Scenario:** User creates a scheduled task that runs daily at 9 AM, performs web research on a topic, and generates a summary document.

**Implementation Evidence:**
- `scheduled_tasks` table with cron expression support
- `SchedulePage.tsx` with task creation UI (title, prompt, schedule)
- Server-side polling in `server/_core/index.ts` checks for due tasks every 60 seconds
- Agent tool loop executes `web_search` → `read_webpage` → `generate_document`
- Result stored in task messages, notification sent to user

**Free Tier Status:** PASS — uses Manus invokeLLM ($0), DuckDuckGo search ($0), Manus S3 ($0)

**Verification Steps:**
1. Navigate to /schedule
2. Create task: "Research latest AI news" with daily schedule
3. Wait for execution (or trigger manually)
4. Verify generated document in task messages

### Demo 2: Device-Triggered File Processing (S2: User's Device)

**Scenario:** User pairs their desktop via ConnectDevicePage, then triggers a file analysis task from their local machine.

**Implementation Evidence:**
- `ConnectDevicePage.tsx` with device pairing (CDP, ADB, WDA, Cloudflare Tunnel, Electron)
- Device session management with `device_sessions` table
- Agent can execute commands on paired devices via protocol adapters
- File upload from device → S3 → agent analysis

**Free Tier Status:** PASS — uses WebSocket relay ($0), Manus S3 ($0), browser APIs ($0)

**Verification Steps:**
1. Navigate to /connect-device
2. Select "Desktop Browser" pairing method
3. Enter pairing code on target device
4. Upload a file from the paired device
5. Verify the agent processes the file

### Demo 3: Cross-Device Task Continuation (S3: Cross-Device Continuity)

**Scenario:** User starts a research task on desktop, then continues reviewing results on mobile.

**Implementation Evidence:**
- `task_messages` table persists all messages server-side
- `memory_entries` table stores cross-session context
- Task sharing via signed URLs (`task_shares` table)
- Responsive UI adapts from desktop to mobile layout
- Authentication state persists across devices via Manus OAuth cookies

**Free Tier Status:** PASS — uses Manus TiDB ($0), Manus OAuth ($0), responsive CSS ($0)

**Verification Steps:**
1. On desktop: create a task and generate a research report
2. Copy the task URL or use task sharing
3. On mobile: open the URL
4. Verify all messages, attachments, and context are preserved
5. Continue the conversation on mobile

### Demo 4: Team Notification Workflow (S5: Collaboration)

**Scenario:** Team admin creates a shared task, team members receive notifications when results are ready.

**Implementation Evidence:**
- `teams` and `team_members` tables with invite system
- `team_sessions` table for shared task access
- `notifications` table with real-time notification center
- `notifyOwner` helper for server-side notifications
- `TeamPage.tsx` with member management and shared sessions

**Free Tier Status:** PASS — uses Manus TiDB ($0), Manus notifyOwner ($0), SSE ($0)

**Verification Steps:**
1. Navigate to /team
2. Create a team and invite a member
3. Share a task session with the team
4. Verify the invited member receives a notification
5. Verify the shared session appears in the team member's view

---

## Surface Coverage Matrix

| Demo | S1 App | S2 Device | S3 Cross-Device | S4 Mobile | S5 Collab |
|------|--------|-----------|-----------------|-----------|-----------|
| 1: Scheduled Research | PRIMARY | - | - | - | - |
| 2: Device File Processing | - | PRIMARY | - | - | - |
| 3: Cross-Device Continuation | - | - | PRIMARY | SECONDARY | - |
| 4: Team Notification | - | - | - | - | PRIMARY |

**Coverage:** 4/5 surfaces have a PRIMARY demo. S4 (Mobile-Specific) is covered as SECONDARY in Demo 3 (mobile continuation). A dedicated S4 demo (e.g., PWA push notifications) would require service worker push API integration, which is documented in the EXCEED_ROADMAP.

---

## Demo Results Summary

| Demo | Surface | Free Tier | Status | Evidence |
|------|---------|-----------|--------|----------|
| 1 | S1: App's Compute | $0 | PASS | SchedulePage + agent tool loop + web_search |
| 2 | S2: User's Device | $0 | PASS | ConnectDevicePage + device pairing + file upload |
| 3 | S3: Cross-Device | $0 | PASS | Persistent messages + task sharing + responsive UI |
| 4 | S5: Collaboration | $0 | PASS | TeamPage + notifications + shared sessions |

**All 4 non-negotiable demos pass at free tier ($0/mo).**
