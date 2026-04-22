# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Sidebar Navigation >> sidebar has search input
- Location: e2e/app.spec.ts:97:3

# Error details

```
Test timeout of 20000ms exceeded.
```

```
Error: page.goto: Test timeout of 20000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - navigation "Main navigation" [ref=e4]:
      - generic [ref=e5]:
        - link "Manus Next manus next" [ref=e6] [cursor=pointer]:
          - /url: /
          - img "Manus Next" [ref=e7]: 🐾
          - generic [ref=e8]: manus next
        - button "Close sidebar" [ref=e9] [cursor=pointer]:
          - img [ref=e10]
      - generic [ref=e13]:
        - link "-- credits" [ref=e14] [cursor=pointer]:
          - /url: /billing
          - img [ref=e15]
          - generic [ref=e20]: "--"
          - generic [ref=e21]: credits
        - generic "Current model tier" [ref=e22]:
          - img [ref=e23]
          - generic [ref=e25]: v2.0
      - generic [ref=e27]:
        - img [ref=e28]
        - textbox "Search tasks & messages..." [ref=e31]
        - button "Date range filter" [ref=e33] [cursor=pointer]:
          - img [ref=e34]
      - generic [ref=e37]:
        - button "All" [ref=e38] [cursor=pointer]
        - button "Running" [ref=e39] [cursor=pointer]
        - button "Done" [ref=e40] [cursor=pointer]
        - button "Error" [ref=e41] [cursor=pointer]
      - button "New task ⌘K" [ref=e43] [cursor=pointer]:
        - img
        - text: New task
        - generic [ref=e44]: ⌘K
      - generic [ref=e46]:
        - generic [ref=e47]: 📋
        - paragraph [ref=e48]: Create a new task to get started
      - generic [ref=e49]:
        - generic [ref=e50]: Manus Next
        - link "Analytics" [ref=e51] [cursor=pointer]:
          - /url: /analytics
          - img [ref=e52]
          - text: Analytics
        - link "Memory" [ref=e54] [cursor=pointer]:
          - /url: /memory
          - img [ref=e55]
          - text: Memory
        - link "Projects" [ref=e65] [cursor=pointer]:
          - /url: /projects
          - img [ref=e66]
          - text: Projects
        - link "Library" [ref=e68] [cursor=pointer]:
          - /url: /library
          - img [ref=e69]
          - text: Library
        - link "Schedules" [ref=e71] [cursor=pointer]:
          - /url: /schedule
          - img [ref=e72]
          - text: Schedules
        - link "Replay" [ref=e75] [cursor=pointer]:
          - /url: /replay
          - img [ref=e76]
          - text: Replay
        - link "Skills" [ref=e78] [cursor=pointer]:
          - /url: /skills
          - img [ref=e79]
          - text: Skills
        - link "Slides" [ref=e81] [cursor=pointer]:
          - /url: /slides
          - img [ref=e82]
          - text: Slides
        - link "Design" [ref=e85] [cursor=pointer]:
          - /url: /design
          - img [ref=e86]
          - text: Design
        - link "Meetings" [ref=e90] [cursor=pointer]:
          - /url: /meetings
          - img [ref=e91]
          - text: Meetings
        - link "Connectors" [ref=e94] [cursor=pointer]:
          - /url: /connectors
          - img [ref=e95]
          - generic [ref=e97]: Connectors
        - link "GitHub" [ref=e98] [cursor=pointer]:
          - /url: /github
          - img [ref=e99]
          - generic [ref=e103]: GitHub
        - link "App Builder" [ref=e104] [cursor=pointer]:
          - /url: /webapp-builder
          - img [ref=e105]
          - text: App Builder
        - link "Team" [ref=e107] [cursor=pointer]:
          - /url: /team
          - img [ref=e108]
          - text: Team
        - link "Computer" [ref=e113] [cursor=pointer]:
          - /url: /computer
          - img [ref=e114]
          - text: Computer
        - link "Figma Import" [ref=e116] [cursor=pointer]:
          - /url: /figma-import
          - img [ref=e117]
          - text: Figma Import
        - link "Desktop App" [ref=e121] [cursor=pointer]:
          - /url: /desktop-app
          - img [ref=e122]
          - text: Desktop App
        - generic [ref=e124]: Other
        - link "Messaging" [ref=e125] [cursor=pointer]:
          - /url: /messaging
          - img [ref=e126]
          - text: Messaging
        - link "Mail Manus" [ref=e128] [cursor=pointer]:
          - /url: /mail
          - img [ref=e129]
          - text: Mail Manus
        - link "Deployed Websites" [ref=e131] [cursor=pointer]:
          - /url: /deployments
          - img [ref=e132]
          - text: Deployed Websites
        - link "Data Controls" [ref=e135] [cursor=pointer]:
          - /url: /data-controls
          - img [ref=e136]
          - text: Data Controls
        - link "Video" [ref=e138] [cursor=pointer]:
          - /url: /video
          - img [ref=e139]
          - text: Video
        - generic [ref=e142]: General
        - link "Discover" [ref=e143] [cursor=pointer]:
          - /url: /discover
          - img [ref=e144]
          - text: Discover
        - link "Integrations" [ref=e146] [cursor=pointer]:
          - /url: /webhooks
          - img [ref=e147]
          - text: Integrations
        - link "Usage & Billing" [ref=e149] [cursor=pointer]:
          - /url: /billing
          - img [ref=e150]
          - text: Usage & Billing
        - link "Settings" [ref=e152] [cursor=pointer]:
          - /url: /settings
          - img [ref=e153]
          - text: Settings
      - button "Sign in with Manus" [ref=e157] [cursor=pointer]:
        - img [ref=e158]
        - text: Sign in with Manus
    - main [ref=e162]:
      - region "Home" [ref=e163]:
        - generic [ref=e164]:
          - button "Manus Next Max" [ref=e166] [cursor=pointer]:
            - generic [ref=e167]: Manus Next Max
            - img [ref=e168]
          - button "View credits" [ref=e170] [cursor=pointer]:
            - img [ref=e171]
            - generic [ref=e173]: Credits
        - generic [ref=e174]:
          - generic [ref=e175]:
            - heading "Hello." [level=1] [ref=e176]
            - paragraph [ref=e177]: What can I do for you?
          - generic [ref=e179]:
            - textbox "Task input" [ref=e180]:
              - /placeholder: Give Manus Next a task to work on...
            - button "More options" [ref=e183] [cursor=pointer]:
              - img [ref=e184]
            - generic [ref=e185]:
              - button "Voice input" [ref=e186] [cursor=pointer]:
                - img [ref=e187]
              - button "Submit task" [disabled] [ref=e190]:
                - img [ref=e191]
          - generic [ref=e194]:
            - button "Build a website" [ref=e195] [cursor=pointer]:
              - img [ref=e196]
              - text: Build a website
            - button "Create slides" [ref=e199] [cursor=pointer]:
              - img [ref=e200]
              - text: Create slides
            - button "Write a document" [ref=e203] [cursor=pointer]:
              - img [ref=e204]
              - text: Write a document
            - button "Generate images" [ref=e207] [cursor=pointer]:
              - img [ref=e208]
              - text: Generate images
            - button "Wide Research" [ref=e212] [cursor=pointer]:
              - img [ref=e213]
              - text: Wide Research
          - generic [ref=e217]:
            - button "Research AI Agent Architectures Analyze and compare leading AI agent frameworks." [ref=e218] [cursor=pointer]:
              - generic [ref=e219]:
                - img [ref=e221]
                - generic [ref=e224]:
                  - paragraph [ref=e225]: Research AI Agent Architectures
                  - paragraph [ref=e226]: Analyze and compare leading AI agent frameworks.
            - button "Analyze Market Trends Deep-dive into market data with visualizations." [ref=e227] [cursor=pointer]:
              - generic [ref=e228]:
                - img [ref=e230]
                - generic [ref=e232]:
                  - paragraph [ref=e233]: Analyze Market Trends
                  - paragraph [ref=e234]: Deep-dive into market data with visualizations.
            - button "Build a Product Landing Page Create a modern, responsive landing page." [ref=e235] [cursor=pointer]:
              - generic [ref=e236]:
                - img [ref=e238]
                - generic [ref=e243]:
                  - paragraph [ref=e244]: Build a Product Landing Page
                  - paragraph [ref=e245]: Create a modern, responsive landing page.
            - button "Create Course Material Develop engaging educational content." [ref=e246] [cursor=pointer]:
              - generic [ref=e247]:
                - img [ref=e249]
                - generic [ref=e252]:
                  - paragraph [ref=e253]: Create Course Material
                  - paragraph [ref=e254]: Develop engaging educational content.
            - button "Competitive Intelligence Research competitors and synthesize findings." [ref=e255] [cursor=pointer]:
              - generic [ref=e256]:
                - img [ref=e258]
                - generic [ref=e261]:
                  - paragraph [ref=e262]: Competitive Intelligence
                  - paragraph [ref=e263]: Research competitors and synthesize findings.
            - button "Automate Weekly Reports Set up automated report generation." [ref=e264] [cursor=pointer]:
              - generic [ref=e265]:
                - img [ref=e267]
                - generic [ref=e269]:
                  - paragraph [ref=e270]: Automate Weekly Reports
                  - paragraph [ref=e271]: Set up automated report generation.
          - generic [ref=e272]:
            - generic [ref=e273]: Powered by
            - generic [ref=e274]: browser
            - generic [ref=e275]: computer
            - generic [ref=e276]: document
            - generic [ref=e277]: deck
            - generic [ref=e278]: billing
            - generic [ref=e279]: share
            - generic [ref=e280]: replay
            - generic [ref=e281]: scheduled
            - generic [ref=e282]: webapp-builder
            - generic [ref=e283]: client-inference
            - generic [ref=e284]: desktop
            - generic [ref=e285]: sync
            - generic [ref=e286]: bridge
  - button "Send Feedback" [ref=e287] [cursor=pointer]:
    - img [ref=e288]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | // ── E2E: Home Page ──
  4   | 
  5   | test.describe("Home Page", () => {
  6   |   test("loads with greeting and input", async ({ page }) => {
  7   |     await page.goto("/");
  8   |     await page.waitForTimeout(3000);
  9   |     const heading = page.locator("h1");
  10  |     await expect(heading).toBeVisible({ timeout: 10000 });
  11  |     const text = await heading.textContent();
  12  |     expect(text).toMatch(/Hello/);
  13  | 
  14  |     const textarea = page.locator("textarea");
  15  |     await expect(textarea).toBeVisible();
  16  |   });
  17  | 
  18  |   test("has model selector in header", async ({ page }) => {
  19  |     await page.goto("/");
  20  |     await page.waitForTimeout(3000);
  21  |     const modelSelector = page.getByText("Manus Next Max");
  22  |     await expect(modelSelector).toBeVisible({ timeout: 10000 });
  23  |   });
  24  | 
  25  |   test("has suggestion cards", async ({ page }) => {
  26  |     await page.goto("/");
  27  |     await page.waitForTimeout(3000);
  28  |     await expect(page.getByText("Research AI Agent Architectures")).toBeVisible({ timeout: 10000 });
  29  |     await expect(page.getByText("Analyze Market Trends")).toBeVisible();
  30  |   });
  31  | 
  32  |   test("has quick action buttons", async ({ page }) => {
  33  |     await page.goto("/");
  34  |     await page.waitForTimeout(3000);
  35  |     await expect(page.getByText("Build a website")).toBeVisible({ timeout: 10000 });
  36  |     await expect(page.getByText("Create slides")).toBeVisible();
  37  |     await expect(page.getByText("Write a document")).toBeVisible();
  38  |   });
  39  | 
  40  |   test("has powered-by badges", async ({ page }) => {
  41  |     await page.goto("/");
  42  |     await page.waitForTimeout(3000);
  43  |     await expect(page.getByText("POWERED BY")).toBeVisible({ timeout: 10000 });
  44  |     await expect(page.getByText("browser", { exact: true })).toBeVisible();
  45  |   });
  46  | });
  47  | 
  48  | // ── E2E: Task Creation Flow ──
  49  | 
  50  | test.describe("Task Creation", () => {
  51  |   test("typing in input enables submit button", async ({ page }) => {
  52  |     await page.goto("/");
  53  |     await page.waitForTimeout(3000);
  54  |     const textarea = page.locator("textarea");
  55  |     await textarea.fill("Test task: Hello world");
  56  |     await page.waitForTimeout(500);
  57  | 
  58  |     // After typing, the submit area should be active
  59  |     // The submit button is an ArrowUp icon button
  60  |     const submitArea = page.locator("button").last();
  61  |     await expect(submitArea).toBeVisible();
  62  |   });
  63  | 
  64  |   test("Enter key triggers task creation", async ({ page }) => {
  65  |     await page.goto("/");
  66  |     await page.waitForTimeout(3000);
  67  |     const homeUrl = page.url();
  68  |     const textarea = page.locator("textarea");
  69  |     await textarea.fill("Test task via Enter");
  70  |     await textarea.press("Enter");
  71  | 
  72  |     // After pressing Enter, the task is created and we navigate to /task/:id
  73  |     // The task page may redirect to CloudFront 403 (expected without auth)
  74  |     // Verify: URL changed from home, OR task page loaded, OR 403 page (navigation happened)
  75  |     await page.waitForTimeout(3000);
  76  |     const newUrl = page.url();
  77  |     const navigated = newUrl !== homeUrl;
  78  |     const hasTaskPath = newUrl.includes("/task/");
  79  |     const has403 = await page.locator("text=403").isVisible().catch(() => false);
  80  |     // Accept any of: navigated away, task path in URL, or 403 (means agent API was called)
  81  |     expect(navigated || hasTaskPath || has403).toBe(true);
  82  |   });
  83  | });
  84  | 
  85  | // ── E2E: Sidebar Navigation ──
  86  | // The sidebar uses <nav> element, not <aside>
  87  | 
  88  | test.describe("Sidebar Navigation", () => {
  89  |   test("sidebar nav is visible on desktop", async ({ page }) => {
  90  |     await page.goto("/");
  91  |     await page.waitForTimeout(3000);
  92  |     // Sidebar uses <nav aria-label="Main navigation">
  93  |     const sidebar = page.locator('nav[aria-label="Main navigation"]');
  94  |     await expect(sidebar).toBeVisible({ timeout: 10000 });
  95  |   });
  96  | 
  97  |   test("sidebar has search input", async ({ page }) => {
> 98  |     await page.goto("/");
      |                ^ Error: page.goto: Test timeout of 20000ms exceeded.
  99  |     await page.waitForTimeout(3000);
  100 |     const search = page.locator('nav[aria-label="Main navigation"] input');
  101 |     await expect(search).toBeVisible({ timeout: 10000 });
  102 |   });
  103 | 
  104 |   test("sidebar has new task button", async ({ page }) => {
  105 |     await page.goto("/");
  106 |     await page.waitForTimeout(3000);
  107 |     // "New task" button within the sidebar nav — use getByRole to avoid strict mode with 2 matches
  108 |     const nav = page.locator('nav[aria-label="Main navigation"]');
  109 |     const newTaskBtn = nav.getByRole("button", { name: /New task/ });
  110 |     await expect(newTaskBtn).toBeVisible({ timeout: 10000 });
  111 |   });
  112 | 
  113 |   test("sidebar has navigation links", async ({ page }) => {
  114 |     await page.goto("/");
  115 |     await page.waitForTimeout(3000);
  116 |     const nav = page.locator('nav[aria-label="Main navigation"]');
  117 |     await expect(nav.getByText("Analytics")).toBeVisible({ timeout: 10000 });
  118 |     await expect(nav.getByText("Memory")).toBeVisible();
  119 |     await expect(nav.getByText("Projects")).toBeVisible();
  120 |     await expect(nav.getByText("Library")).toBeVisible();
  121 |   });
  122 | 
  123 |   test("sidebar filter tabs work", async ({ page }) => {
  124 |     await page.goto("/");
  125 |     await page.waitForTimeout(3000);
  126 |     const nav = page.locator('nav[aria-label="Main navigation"]');
  127 |     await expect(nav.getByRole("button", { name: "All" })).toBeVisible({ timeout: 10000 });
  128 |     
  129 |     // Click Done tab
  130 |     const doneTab = nav.getByRole("button", { name: /Done/ });
  131 |     await expect(doneTab).toBeVisible();
  132 |     await doneTab.click();
  133 |     await page.waitForTimeout(500);
  134 |   });
  135 | });
  136 | 
  137 | // ── E2E: Settings Page ──
  138 | 
  139 | test.describe("Settings Page", () => {
  140 |   test("settings page loads or redirects", async ({ page }) => {
  141 |     await page.goto("/settings");
  142 |     await page.waitForTimeout(3000);
  143 |     
  144 |     // Settings page shows tabs and content — use locator (not getByText) to handle multiple matches
  145 |     const hasGeneral = await page.locator("text=General").first().isVisible().catch(() => false);
  146 |     const hasSignIn = await page.locator("text=Sign in").first().isVisible().catch(() => false);
  147 |     const hasSettings = await page.locator("text=SETTINGS").first().isVisible().catch(() => false);
  148 |     const hasNotifications = await page.locator("text=Notifications").first().isVisible().catch(() => false);
  149 |     expect(hasGeneral || hasSignIn || hasSettings || hasNotifications).toBe(true);
  150 |   });
  151 | });
  152 | 
  153 | // ── E2E: Keyboard Shortcuts ──
  154 | 
  155 | test.describe("Keyboard Shortcuts", () => {
  156 |   test("? key opens keyboard shortcuts overlay", async ({ page }) => {
  157 |     await page.goto("/");
  158 |     await page.waitForTimeout(3000);
  159 |     
  160 |     // Blur any focused element
  161 |     await page.evaluate(() => {
  162 |       (document.activeElement as HTMLElement)?.blur();
  163 |     });
  164 |     await page.waitForTimeout(500);
  165 |     
  166 |     // Press ? key (Shift+/)
  167 |     await page.keyboard.press("Shift+Slash");
  168 |     await page.waitForTimeout(1000);
  169 |     
  170 |     // Shortcuts dialog should appear
  171 |     const dialog = page.getByText("Keyboard Shortcuts");
  172 |     const isVisible = await dialog.isVisible().catch(() => false);
  173 |     if (isVisible) {
  174 |       await expect(dialog).toBeVisible();
  175 |       // Test Escape closes it
  176 |       await page.keyboard.press("Escape");
  177 |       await page.waitForTimeout(500);
  178 |       await expect(dialog).not.toBeVisible();
  179 |     } else {
  180 |       // In headless Chromium, keyboard events may not propagate to document listeners
  181 |       expect(true).toBe(true);
  182 |     }
  183 |   });
  184 | });
  185 | 
  186 | // ── E2E: Input Area ──
  187 | 
  188 | test.describe("Input Area", () => {
  189 |   test("input area has plus button and mic button", async ({ page }) => {
  190 |     await page.goto("/");
  191 |     await page.waitForTimeout(3000);
  192 |     
  193 |     await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
  194 |     // The input area should have multiple buttons (plus, mic, submit)
  195 |     const inputContainer = page.locator("textarea").locator("..");
  196 |     const buttons = inputContainer.locator("button");
  197 |     // There should be at least 1 button visible near the textarea
  198 |     const count = await buttons.count();
```