# DOM Selector Map — Session 33 (Complete)

## Home Page (Authenticated)
- Greeting: `h1` text "Hello, Michael."
- Subheading: `p` text "What can I do for you?"
- Task input: `textarea[aria-label="Task input"]` placeholder "What would you like to do?"
- Voice button: `button[aria-label="Voice input"]`
- Submit button: `button[aria-label="Submit task"]`
- Category tabs: `button` with class `flex items-center gap-1.5 px-3.5 py-2 rounded-full`
- Suggestion cards: `button` with class `text-left p-4 bg-card border border-border rounded`
- Powered by badges: `span` with class `text-[9px]` text "browser", "computer", etc.
- New task button: text "New task⌘K"

## Task Page
- URL pattern: `/task/:id`
- User message: text matches the prompt
- Status: text "Running" or "Completed"
- Model selector: text "Manus 1.0" (or other model name)
- Chat input: `input[placeholder="Type a follow-up message..."]` aria "Chat message input"
- Workspace toggle: `button[aria-label="Show workspace"]` / `button[aria-label="Hide workspace"]`
- Share: `button[aria-label="Share task"]`
- Bookmark: `button[aria-label="Bookmark"]`
- More options: `button[aria-label="More options"]`
- Branch: text "Branch" aria "Branch conversation from this message"
- Action menu: `button[aria-label="Open action menu"]`
- Mode toggle: `button[aria-label*="Agent mode"]` text "quality"
- Voice: `button[aria-label="Voice input"]`
- Hands-free: `button[aria-label="Hands-free voice mode"]`
- Stop: `button[aria-label="Stop generation"]`
- Expand workspace: `button[aria-label="Expand workspace"]`
- Browser tab: text "Browser"
- Thinking indicator: text "Manus is thinking"
- Knowledge recalled: text "Knowledge recalled"
- Disclaimer: text "Manus may make mistakes"

## Settings Page
- Title: text "Settings"
- Tabs: "Account", "General", "Notifications", "Secrets", "Capabilities", "Cloud Browser", "Data Controls", "Bridge", "Feedback"
- Toggle switches: aria-labels "Notifications", "Sound effects", "Auto-expand actions", "Compact mode", "Self-discovery mode", "Hands-free audio", "Offline mode", "Auto-tune recovery"
- Memory decay slider: `input[aria-label="Memory decay half-life in days"]` type="range"
- Memory threshold slider: `input[aria-label="Memory archive threshold"]` type="range"
- TTS language: `select[aria-label="Text-to-speech language"]`
- TTS speed: `input[aria-label="Text-to-speech speed"]` type="range"
- System prompt: `input[placeholder="You are a helpful AI assistant..."]`

## Analytics Page
- Title: text "Analytics"
- Subtitle: text "Task activity and performance insights"
- Metrics: "Total Tasks" "71", "Completion Rate" "83.1%", "Avg Duration" "14h 32m"
- Date range buttons: "7d", "14d", "30d", "60d", "90d"

## Browser Page
- URL input: `input[placeholder="Enter URL or search..."]`
- Mode buttons: "Navigate", "Click", "Type", "Scroll", "Evaluate"
- Example button: text "Try example.com"
- QA button: text "Open QA Mode"
- Panel tabs: "console", "network", "elements", "QA Tests"
- Empty state: text "No page loaded"

## GitHub Page
- Title: text "GitHub"
- Subtitle: text "Manage repositories, code, and deployments"
- Search: `input[placeholder="Search repositories..."]`
- Buttons: "Import Repo", "New Repo", "Create New"
- Empty state: text "No repositories connected"

## Projects Page
- Title: text "Projects"
- Empty state: text "No projects yet"
- Buttons: "New Project", "Create your first project"

## Memory Page
- Title: text "Memory"
- Search: `input[placeholder="Search memories..."]`
- Tabs: "Active24", "Archived"
- Buttons: "Add Entry", "Import Files"
- File input: `input[type="file"]`

## Billing Page
- Title: text "Usage & Billing"
- Subscription: text "$39.00/month"
- Metrics: "71", "59", "2", "0"
- Completion rate: text "59 of 71 tasks completed successfully"
- Buttons: "Subscribe" (x3), "Buy"
- Test card info: text "4242 4242 4242 4242"

## Library Page
- Title: text "Library"
- Subtitle: text "Browse artifacts and files across all your tasks"
- Search: `input[placeholder="Search artifacts..."]` type="text"
- Tabs: "Artifacts", "Files", "All Types"
- Button: "Select"

## Schedule Page
- Title: text "Scheduled Tasks"
- Subtitle: text "Automate recurring tasks with cron or interval schedules"
- Empty state: text "No scheduled tasks yet"
- Button: "New Schedule"
- Info: text "How scheduling works"
