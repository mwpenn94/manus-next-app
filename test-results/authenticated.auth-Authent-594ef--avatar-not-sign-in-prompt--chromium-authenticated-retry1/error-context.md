# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authenticated.auth.spec.ts >> Authenticated: User Profile >> sidebar shows user name or avatar (not sign-in prompt)
- Location: e2e/authenticated.auth.spec.ts:19:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
  1   | /**
  2   |  * Authenticated E2E Tests
  3   |  *
  4   |  * These tests run with a pre-authenticated session (stored cookies from auth.setup.ts).
  5   |  * They verify features that require a logged-in user, such as:
  6   |  * - User profile display in sidebar
  7   |  * - Task creation with server persistence
  8   |  * - Settings page access
  9   |  * - Model selector with all 4 tiers
  10  |  * - Billing page access
  11  |  * - Logout flow
  12  |  *
  13  |  * File naming convention: *.auth.spec.ts (matched by playwright.config.ts)
  14  |  */
  15  | 
  16  | import { test, expect } from "@playwright/test";
  17  | 
  18  | test.describe("Authenticated: User Profile", () => {
  19  |   test("sidebar shows user name or avatar (not sign-in prompt)", async ({ page }) => {
  20  |     await page.goto("/");
  21  |     await page.waitForLoadState("networkidle");
  22  |     await page.waitForTimeout(2000);
  23  | 
  24  |     // When authenticated, the sidebar should NOT show "Sign in" button
  25  |     const signInBtn = page.getByText("Sign in", { exact: false }).first();
  26  |     const signInVisible = await signInBtn.isVisible().catch(() => false);
  27  | 
  28  |     // Instead, it should show the referral banner or user info
  29  |     const referral = page.getByText("Share with a friend").first();
  30  |     const referralVisible = await referral.isVisible().catch(() => false);
  31  | 
  32  |     // At least one authenticated indicator should be present
  33  |     // (referral banner, user avatar, or absence of sign-in)
> 34  |     expect(!signInVisible || referralVisible).toBe(true);
      |                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  35  |   });
  36  | 
  37  |   test("auth.me returns user data", async ({ request }) => {
  38  |     const response = await request.get("/api/trpc/auth.me");
  39  |     expect(response.ok()).toBeTruthy();
  40  |     const body = await response.json();
  41  |     expect(body.result?.data?.json?.openId).toBeTruthy();
  42  |     expect(body.result?.data?.json?.name).toBeTruthy();
  43  |   });
  44  | });
  45  | 
  46  | test.describe("Authenticated: Model Selector", () => {
  47  |   test("header model selector is visible and clickable", async ({ page }) => {
  48  |     await page.goto("/");
  49  |     await page.waitForLoadState("networkidle");
  50  |     await page.waitForTimeout(2000);
  51  | 
  52  |     // The model selector shows "Manus Next Max" by default
  53  |     const selector = page.getByText("Manus Next Max").first();
  54  |     await expect(selector).toBeVisible({ timeout: 10000 });
  55  |   });
  56  | 
  57  |   test("model selector dropdown shows all 4 tiers", async ({ page }) => {
  58  |     await page.goto("/");
  59  |     await page.waitForLoadState("networkidle");
  60  |     await page.waitForTimeout(2000);
  61  | 
  62  |     // Click the model selector to open dropdown
  63  |     const selector = page.getByText("Manus Next Max").first();
  64  |     await selector.click();
  65  |     await page.waitForTimeout(500);
  66  | 
  67  |     // All 4 tiers should be visible in the dropdown
  68  |     await expect(page.getByText("Manus Next Limitless").first()).toBeVisible({ timeout: 5000 });
  69  |     await expect(page.getByText("Manus Next Max").first()).toBeVisible();
  70  |     await expect(page.getByText("Manus Next 1.0").first()).toBeVisible();
  71  |     await expect(page.getByText("Manus Next Lite").first()).toBeVisible();
  72  |   });
  73  | 
  74  |   test("selecting Limitless tier updates the header", async ({ page }) => {
  75  |     await page.goto("/");
  76  |     await page.waitForLoadState("networkidle");
  77  |     await page.waitForTimeout(2000);
  78  | 
  79  |     // Open model selector
  80  |     const selector = page.getByText("Manus Next Max").first();
  81  |     await selector.click();
  82  |     await page.waitForTimeout(500);
  83  | 
  84  |     // Click Limitless
  85  |     const limitlessOption = page.getByText("Manus Next Limitless").first();
  86  |     await limitlessOption.click();
  87  |     await page.waitForTimeout(500);
  88  | 
  89  |     // Header should now show Limitless
  90  |     await expect(page.getByText("Manus Next Limitless").first()).toBeVisible({ timeout: 5000 });
  91  |   });
  92  | });
  93  | 
  94  | test.describe("Authenticated: Task Creation & Persistence", () => {
  95  |   test("creating a task navigates to task page", async ({ page }) => {
  96  |     await page.goto("/");
  97  |     await page.waitForLoadState("networkidle");
  98  |     await page.waitForTimeout(2000);
  99  | 
  100 |     const textarea = page.locator("textarea");
  101 |     await textarea.fill("E2E authenticated test task");
  102 |     await textarea.press("Enter");
  103 | 
  104 |     // Should navigate to /task/:id
  105 |     await page.waitForTimeout(3000);
  106 |     const url = page.url();
  107 |     expect(url).toContain("/task/");
  108 |   });
  109 | 
  110 |   test("task page shows mode toggle and model selector", async ({ page }) => {
  111 |     await page.goto("/");
  112 |     await page.waitForLoadState("networkidle");
  113 |     await page.waitForTimeout(2000);
  114 | 
  115 |     const textarea = page.locator("textarea");
  116 |     await textarea.fill("E2E test: verify task page UI");
  117 |     await textarea.press("Enter");
  118 |     await page.waitForTimeout(3000);
  119 | 
  120 |     // Task page should have the model selector in header
  121 |     const modelSelector = page.getByText(/Manus Next/).first();
  122 |     await expect(modelSelector).toBeVisible({ timeout: 10000 });
  123 |   });
  124 | });
  125 | 
  126 | test.describe("Authenticated: Settings Page", () => {
  127 |   test("settings page loads with user-specific content", async ({ page }) => {
  128 |     await page.goto("/settings");
  129 |     await page.waitForLoadState("networkidle");
  130 |     await page.waitForTimeout(2000);
  131 | 
  132 |     // Settings should show tabs (General, Notifications, etc.)
  133 |     const hasGeneral = await page.getByText("General").first().isVisible().catch(() => false);
  134 |     const hasNotifications = await page.getByText("Notifications").first().isVisible().catch(() => false);
```