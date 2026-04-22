# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authenticated.auth.spec.ts >> Authenticated: Protected API Endpoints >> task list endpoint returns data
- Location: e2e/authenticated.auth.spec.ts:154:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
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
  135 |     const hasSettings = await page.getByText("SETTINGS").first().isVisible().catch(() => false);
  136 | 
  137 |     expect(hasGeneral || hasNotifications || hasSettings).toBe(true);
  138 |   });
  139 | });
  140 | 
  141 | test.describe("Authenticated: Billing Page", () => {
  142 |   test("billing page loads with plan info", async ({ page }) => {
  143 |     await page.goto("/billing");
  144 |     await page.waitForLoadState("networkidle");
  145 |     await page.waitForTimeout(2000);
  146 | 
  147 |     // Billing page should show plan-related content
  148 |     const hasBilling = await page.getByText(/Usage|Billing|Plan|Credits/).first().isVisible({ timeout: 10000 }).catch(() => false);
  149 |     expect(hasBilling).toBe(true);
  150 |   });
  151 | });
  152 | 
  153 | test.describe("Authenticated: Protected API Endpoints", () => {
  154 |   test("task list endpoint returns data", async ({ request }) => {
  155 |     const response = await request.get("/api/trpc/task.list");
> 156 |     expect(response.ok()).toBeTruthy();
      |                           ^ Error: expect(received).toBeTruthy()
  157 |   });
  158 | 
  159 |   test("user preferences endpoint works", async ({ request }) => {
  160 |     const response = await request.get("/api/trpc/user.getPreferences");
  161 |     // Should return 200 (with data or empty preferences)
  162 |     expect(response.ok()).toBeTruthy();
  163 |   });
  164 | });
  165 | 
```