/**
 * Parity v8.0 End-to-End Validation Script
 * Tests all new features against the live server
 */

const BASE = "http://localhost:3000";

// Helper: call tRPC batch endpoint
async function trpcQuery(procedure, input = {}) {
  const url = `${BASE}/api/trpc/${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: input } }))}`;
  const res = await fetch(url);
  const data = await res.json();
  return { status: res.status, data: data[0] };
}

async function trpcMutation(procedure, input = {}) {
  const url = `${BASE}/api/trpc/${procedure}?batch=1`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: input } }),
  });
  const data = await res.json();
  return { status: res.status, data: data[0] };
}

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} ${detail}`);
    failed++;
    failures.push({ name, detail });
  }
}

async function run() {
  console.log("═══ Parity v8.0 E2E Validation ═══\n");

  // 1. Frontend routes
  console.log("1. Frontend Routes");
  for (const route of ["/", "/memory", "/settings", "/shared/test-token"]) {
    const res = await fetch(`${BASE}${route}`);
    assert(`GET ${route} → 200`, res.status === 200, `got ${res.status}`);
  }

  // 2. Share view (public, no auth)
  console.log("\n2. Share Router (public)");
  const shareView = await trpcQuery("share.view", { shareToken: "nonexistent" });
  assert("share.view returns 'Share not found' for invalid token", 
    shareView.data?.result?.data?.json?.error === "Share not found",
    JSON.stringify(shareView.data));

  // 3. Protected endpoints reject unauthenticated
  console.log("\n3. Auth Protection");
  for (const proc of ["memory.list", "notification.list", "notification.unreadCount"]) {
    const result = await trpcQuery(proc);
    assert(`${proc} rejects unauthenticated`, 
      result.data?.error?.json?.message?.includes("login") || result.status === 401,
      JSON.stringify(result.data?.error?.json?.message || result.status));
  }

  // 4. Share create rejects unauthenticated
  const shareCreate = await trpcMutation("share.create", { taskExternalId: "test" });
  assert("share.create rejects unauthenticated",
    shareCreate.data?.error?.json?.message?.includes("login") || shareCreate.status === 401,
    JSON.stringify(shareCreate.data?.error?.json?.message || shareCreate.status));

  // 5. Memory add rejects unauthenticated
  const memAdd = await trpcMutation("memory.add", { key: "test", value: "test" });
  assert("memory.add rejects unauthenticated",
    memAdd.data?.error?.json?.message?.includes("login") || memAdd.status === 401,
    JSON.stringify(memAdd.data?.error?.json?.message || memAdd.status));

  // 6. SEO: check meta tags
  console.log("\n4. SEO Meta Tags");
  const homeHtml = await (await fetch(`${BASE}/`)).text();
  assert("HTML has <title> tag", homeHtml.includes("<title>"), "no <title> found");
  assert("HTML has og:title meta", homeHtml.includes('og:title') || homeHtml.includes('property="og:title"'), "no og:title");
  assert("HTML has og:description meta", homeHtml.includes('og:description') || homeHtml.includes('property="og:description"'), "no og:description");
  assert("HTML has viewport meta", homeHtml.includes('viewport'), "no viewport meta");

  // 7. Check robots.txt
  console.log("\n5. robots.txt");
  const robotsRes = await fetch(`${BASE}/robots.txt`);
  assert("robots.txt returns 200", robotsRes.status === 200, `got ${robotsRes.status}`);
  if (robotsRes.status === 200) {
    const robotsTxt = await robotsRes.text();
    assert("robots.txt has User-agent", robotsTxt.includes("User-agent"), "no User-agent directive");
  }

  // 8. API stream endpoint exists
  console.log("\n6. Agent Stream Endpoint");
  const streamRes = await fetch(`${BASE}/api/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  // Should return 4xx (missing auth/params), not 404
  assert("/api/stream endpoint exists (not 404)", streamRes.status !== 404, `got ${streamRes.status}`);

  // 9. Check agent tools include generate_document
  console.log("\n7. Agent Tools Validation");
  // This is validated by unit tests, but we verify the stream endpoint accepts mode param
  const streamWithMode = await fetch(`${BASE}/api/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId: "test", message: "hello", mode: "speed" }),
  });
  assert("/api/stream accepts mode parameter (not 404)", streamWithMode.status !== 404, `got ${streamWithMode.status}`);

  // Summary
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach(f => console.log(`  - ${f.name}: ${f.detail}`));
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error("Validation error:", err);
  process.exit(1);
});
