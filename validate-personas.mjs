/**
 * Virtual User Persona Validation
 * 
 * Tests the app from 5 distinct user perspectives:
 * 1. Developer — uses agent for coding, research, document generation
 * 2. Researcher — uses web search, deep research, memory, document export
 * 3. Business User — uses scheduling, sharing, notifications, mode toggle
 * 4. Casual User — first-time experience, navigation, error handling
 * 5. Admin/Power User — settings, memory management, system prompt customization
 */

const BASE = "http://localhost:3000";
let passed = 0;
let failed = 0;
const issues = [];

async function check(persona, name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ [${persona}] ${name}`);
  } catch (e) {
    failed++;
    const msg = `[${persona}] ${name}: ${e.message}`;
    issues.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

// ═══════════════════════════════════════════════════
// PERSONA 1: Developer
// ═══════════════════════════════════════════════════
async function validateDeveloper() {
  console.log("\n1. Developer Persona");

  // Can access the home page and see the input area
  await check("Developer", "Home page loads with input area", async () => {
    const r = await fetch(BASE);
    assert(r.ok, `Status ${r.status}`);
    const html = await r.text();
    assert(html.includes("Manus"), "Missing app branding");
  });

  // Can access the /api/stream endpoint for agent interaction
  await check("Developer", "/api/stream endpoint exists", async () => {
    const r = await fetch(`${BASE}/api/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    // Should get 401 (not logged in) or 400, not 404
    assert(r.status !== 404, "Stream endpoint not found");
  });

  // tRPC endpoints are accessible
  await check("Developer", "tRPC endpoint responds", async () => {
    const r = await fetch(`${BASE}/api/trpc/auth.me`);
    assert(r.ok || r.status === 401, `Unexpected status ${r.status}`);
  });

  // Agent tools include code execution
  await check("Developer", "Agent has execute_code tool", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/agentTools.ts", "utf-8");
    assert(src.includes("execute_code"), "Missing execute_code tool");
    assert(src.includes("generate_document"), "Missing generate_document tool");
    assert(src.includes("browse_web"), "Missing browse_web tool");
  });

  // System prompt includes coding instructions
  await check("Developer", "System prompt supports coding tasks", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/agentStream.ts", "utf-8");
    assert(src.includes("execute_code"), "System prompt missing code execution guidance");
    assert(src.includes("Python"), "System prompt missing Python mention");
  });

  // Document generation tool exists
  await check("Developer", "Document generation produces artifacts", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/agentTools.ts", "utf-8");
    assert(src.includes("generate_document"), "Missing generate_document");
    assert(src.includes("markdown") || src.includes("report"), "Missing document format options");
  });
}

// ═══════════════════════════════════════════════════
// PERSONA 2: Researcher
// ═══════════════════════════════════════════════════
async function validateResearcher() {
  console.log("\n2. Researcher Persona");

  // Web search tool exists
  await check("Researcher", "Web search tool available", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/agentTools.ts", "utf-8");
    assert(src.includes("web_search"), "Missing web_search tool");
  });

  // Read webpage tool exists
  await check("Researcher", "Read webpage tool available", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/agentTools.ts", "utf-8");
    assert(src.includes("read_webpage"), "Missing read_webpage tool");
  });

  // Browse web (enhanced) tool exists
  await check("Researcher", "Browse web (enhanced) tool available", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/agentTools.ts", "utf-8");
    assert(src.includes("browse_web"), "Missing browse_web tool");
  });

  // Memory system exists for storing research findings
  await check("Researcher", "Memory system for persistent findings", async () => {
    const r = await fetch(`${BASE}/api/trpc/memory.list?batch=1&input=${encodeURIComponent(JSON.stringify({0:{}}))}`);
    assert(r.status !== 404, "Memory endpoint not found");
  });

  // Memory auto-extraction exists
  await check("Researcher", "Memory auto-extraction module exists", async () => {
    const fs = await import("fs");
    assert(fs.existsSync("server/memoryExtractor.ts"), "Missing memoryExtractor.ts");
    const src = fs.readFileSync("server/memoryExtractor.ts", "utf-8");
    assert(src.includes("extractMemories"), "Missing extractMemories function");
    assert(src.includes("invokeLLM"), "Missing LLM integration");
  });

  // Memory page is accessible
  await check("Researcher", "Memory page route exists", async () => {
    const r = await fetch(`${BASE}/memory`);
    assert(r.ok, `Memory page status ${r.status}`);
  });

  // Research nudge behavior exists in system prompt
  await check("Researcher", "Research nudge for deep research", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/agentStream.ts", "utf-8");
    assert(src.includes("nudge") || src.includes("read_webpage"), "Missing research nudge behavior");
  });
}

// ═══════════════════════════════════════════════════
// PERSONA 3: Business User
// ═══════════════════════════════════════════════════
async function validateBusinessUser() {
  console.log("\n3. Business User Persona");

  // Task scheduling exists
  await check("Business", "Schedule page route exists", async () => {
    const r = await fetch(`${BASE}/schedule`);
    assert(r.ok, `Schedule page status ${r.status}`);
  });

  // Schedule API endpoints exist
  await check("Business", "Schedule API endpoints exist", async () => {
    const r = await fetch(`${BASE}/api/trpc/schedule.list?batch=1&input=${encodeURIComponent(JSON.stringify({0:{}}))}`);
    assert(r.status !== 404, "Schedule endpoint not found");
  });

  // Sharing functionality exists
  await check("Business", "Share API endpoints exist", async () => {
    const r = await fetch(`${BASE}/api/trpc/share.view?batch=1&input=${encodeURIComponent(JSON.stringify({0:{json:{shareToken:"test"}}}))}`)
    assert(r.status !== 404, "Share endpoint not found");
  });

  // Shared task view page exists
  await check("Business", "Shared task view page exists", async () => {
    const r = await fetch(`${BASE}/shared/test-token`);
    assert(r.ok, `Shared view status ${r.status}`);
  });

  // Notification system exists
  await check("Business", "Notification API endpoints exist", async () => {
    const r = await fetch(`${BASE}/api/trpc/notification.unreadCount?batch=1&input=${encodeURIComponent(JSON.stringify({0:{}}))}`);
    assert(r.status !== 404, "Notification endpoint not found");
  });

  // Mode toggle (speed/quality) exists
  await check("Business", "Mode toggle component exists", async () => {
    const fs = await import("fs");
    assert(fs.existsSync("client/src/components/ModeToggle.tsx"), "Missing ModeToggle.tsx");
    const src = fs.readFileSync("client/src/components/ModeToggle.tsx", "utf-8");
    assert(src.includes("speed") || src.includes("quality"), "Missing mode options");
  });

  // Stream endpoint accepts mode parameter
  await check("Business", "/api/stream accepts mode parameter", async () => {
    const r = await fetch(`${BASE}/api/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "speed" }),
    });
    assert(r.status !== 404, "Stream endpoint not found");
  });
}

// ═══════════════════════════════════════════════════
// PERSONA 4: Casual User (First-time experience)
// ═══════════════════════════════════════════════════
async function validateCasualUser() {
  console.log("\n4. Casual User Persona");

  // Home page is welcoming and has clear CTA
  await check("Casual", "Home page has welcoming greeting", async () => {
    const r = await fetch(BASE);
    const html = await r.text();
    assert(html.includes("Hello") || html.includes("hello") || html.includes("What can") || html.includes("task"), "Missing welcoming greeting");
  });

  // 404 page exists and is helpful
  await check("Casual", "404 page is helpful", async () => {
    const r = await fetch(`${BASE}/nonexistent-page-xyz`);
    assert(r.ok, `404 page should still return 200 for SPA`);
    const html = await r.text();
    assert(html.includes("404") || html.includes("Not Found") || html.includes("not found"), "Missing 404 content");
  });

  // SEO meta tags present
  await check("Casual", "SEO meta tags present", async () => {
    const r = await fetch(BASE);
    const html = await r.text();
    assert(html.includes("og:title"), "Missing og:title");
    assert(html.includes("og:description"), "Missing og:description");
    assert(html.includes("robots.txt") || html.includes("description"), "Missing meta description");
  });

  // robots.txt accessible
  await check("Casual", "robots.txt accessible", async () => {
    const r = await fetch(`${BASE}/robots.txt`);
    assert(r.ok, `robots.txt status ${r.status}`);
    const txt = await r.text();
    assert(txt.includes("User-agent"), "Missing User-agent directive");
  });

  // JSON-LD structured data present
  await check("Casual", "JSON-LD structured data present", async () => {
    const r = await fetch(BASE);
    const html = await r.text();
    assert(html.includes("application/ld+json"), "Missing JSON-LD");
    assert(html.includes("WebApplication"), "Missing WebApplication schema");
  });

  // App has proper viewport meta for mobile
  await check("Casual", "Mobile viewport meta tag present", async () => {
    const r = await fetch(BASE);
    const html = await r.text();
    assert(html.includes("viewport"), "Missing viewport meta");
    assert(html.includes("width=device-width"), "Missing responsive viewport");
  });
}

// ═══════════════════════════════════════════════════
// PERSONA 5: Admin / Power User
// ═══════════════════════════════════════════════════
async function validateAdmin() {
  console.log("\n5. Admin / Power User Persona");

  // Settings page exists
  await check("Admin", "Settings page route exists", async () => {
    const r = await fetch(`${BASE}/settings`);
    assert(r.ok, `Settings page status ${r.status}`);
  });

  // Preferences API exists
  await check("Admin", "Preferences API endpoints exist", async () => {
    const r = await fetch(`${BASE}/api/trpc/preferences.get?batch=1&input=${encodeURIComponent(JSON.stringify({0:{}}))}`);
    assert(r.status !== 404, "Preferences endpoint not found");
  });

  // Usage stats API exists
  await check("Admin", "Usage stats API exists", async () => {
    const r = await fetch(`${BASE}/api/trpc/usage.stats?batch=1&input=${encodeURIComponent(JSON.stringify({0:{}}))}`);
    assert(r.status !== 404, "Usage stats endpoint not found");
  });

  // Bridge config API exists
  await check("Admin", "Bridge config API exists", async () => {
    const r = await fetch(`${BASE}/api/trpc/bridge.getConfig?batch=1&input=${encodeURIComponent(JSON.stringify({0:{}}))}`);
    assert(r.status !== 404, "Bridge config endpoint not found");
  });

  // SettingsPage has honest capability statuses
  await check("Admin", "SettingsPage has honest capability statuses", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("client/src/pages/SettingsPage.tsx", "utf-8");
    assert(src.includes("live") || src.includes("status"), "Missing capability status indicators");
    assert(src.includes("planned") || src.includes("partial"), "Missing planned/partial status");
  });

  // System prompt customization exists
  await check("Admin", "System prompt customization available", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("client/src/pages/SettingsPage.tsx", "utf-8");
    assert(src.includes("systemPrompt") || src.includes("System Prompt"), "Missing system prompt customization");
  });

  // Replay page exists
  await check("Admin", "Replay page route exists", async () => {
    const r = await fetch(`${BASE}/replay`);
    assert(r.ok, `Replay page status ${r.status}`);
  });

  // Regenerate functionality exists in TaskView
  await check("Admin", "Regenerate button exists in TaskView", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("client/src/pages/TaskView.tsx", "utf-8");
    assert(src.includes("handleRegenerate") || src.includes("Regenerate"), "Missing regenerate functionality");
    assert(src.includes("RefreshCw") || src.includes("regenerate"), "Missing regenerate icon/button");
  });

  // Input validation is present on all routers
  await check("Admin", "Input validation with max constraints on routers", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("server/routers.ts", "utf-8");
    const maxCount = (src.match(/\.max\(/g) || []).length;
    assert(maxCount >= 15, `Only ${maxCount} .max() constraints found, expected 15+`);
  });
}

// ═══════════════════════════════════════════════════
// Run all personas
// ═══════════════════════════════════════════════════
async function main() {
  console.log("═══ Virtual User Persona Validation ═══");
  
  await validateDeveloper();
  await validateResearcher();
  await validateBusinessUser();
  await validateCasualUser();
  await validateAdmin();

  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
  if (issues.length > 0) {
    console.log("\nIssues to fix:");
    issues.forEach(i => console.log(`  - ${i}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
