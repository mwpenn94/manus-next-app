# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Sidebar Navigation >> sidebar has navigation links
- Location: e2e/app.spec.ts:113:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('nav[aria-label="Main navigation"]').getByText('Analytics')
Expected: visible
Received: hidden

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('nav[aria-label="Main navigation"]').getByText('Analytics')
    7 × locator resolved to <a href="/analytics" data-loc="client/src/components/AppLayout.tsx:611" class="flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50">…</a>
      - unexpected value "hidden"

```

```
Error: write EPIPE
```

# Test source

```ts
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
  98  |     await page.goto("/");
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
> 117 |     await expect(nav.getByText("Analytics")).toBeVisible({ timeout: 10000 });
      |     ^ Error: write EPIPE
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
  199 |     expect(count).toBeGreaterThan(0);
  200 |   });
  201 | });
  202 | 
  203 | // ── E2E: Mobile Responsive ──
  204 | 
  205 | test.describe("Mobile Responsive", () => {
  206 |   test.use({ viewport: { width: 375, height: 812 } });
  207 | 
  208 |   test("page loads on mobile viewport", async ({ page }) => {
  209 |     await page.goto("/");
  210 |     await page.waitForTimeout(3000);
  211 |     await expect(page.locator("textarea")).toBeVisible({ timeout: 10000 });
  212 |   });
  213 | 
  214 |   test("input is accessible on mobile", async ({ page }) => {
  215 |     await page.goto("/");
  216 |     await page.waitForTimeout(3000);
  217 |     const textarea = page.locator("textarea");
```