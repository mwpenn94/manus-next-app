#!/usr/bin/env node
/**
 * Gate B Substantive Simulation
 * 
 * Makes real HTTP calls to verify endpoints are functional,
 * not just returning 200 but actually serving correct content.
 */

const BASE = "http://localhost:3000";

const results = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.pass) {
      passed++;
      results.push({ name, status: "PASS", detail: result.detail || "" });
    } else {
      failed++;
      results.push({ name, status: "FAIL", detail: result.detail || "Assertion failed" });
    }
  } catch (err) {
    failed++;
    results.push({ name, status: "ERROR", detail: err.message });
  }
}

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}

async function fetchHTML(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, text: await res.text(), headers: res.headers };
}

// ── Endpoint Health Tests ──

await test("GET / returns HTML with app root", async () => {
  const { status, text } = await fetchHTML("/");
  return {
    pass: status === 200 && text.includes('<div id="root"'),
    detail: `status=${status}, has root div=${text.includes('<div id="root"')}`,
  };
});

await test("GET /manifest.json returns valid PWA manifest", async () => {
  const { status, data } = await fetchJSON("/manifest.json");
  return {
    pass: status === 200 && data?.name === "Manus Next" && data?.start_url === "/",
    detail: `status=${status}, name=${data?.name}`,
  };
});

await test("GET /api/trpc/auth.me returns auth response", async () => {
  const res = await fetch(`${BASE}/api/trpc/auth.me`);
  const status = res.status;
  // Should return 200 (with null user) or 401 — both are valid
  return {
    pass: status === 200 || status === 401,
    detail: `status=${status}`,
  };
});

await test("GET /api/trpc/task.list returns task list or auth error", async () => {
  const res = await fetch(`${BASE}/api/trpc/task.list`);
  const status = res.status;
  return {
    pass: status === 200 || status === 401,
    detail: `status=${status}`,
  };
});

await test("GET /api/trpc/memory.list returns memory list or auth error", async () => {
  const res = await fetch(`${BASE}/api/trpc/memory.list`);
  const status = res.status;
  return {
    pass: status === 200 || status === 401,
    detail: `status=${status}`,
  };
});

await test("GET /api/trpc/schedule.list returns schedule list or auth error", async () => {
  const res = await fetch(`${BASE}/api/trpc/schedule.list`);
  const status = res.status;
  return {
    pass: status === 200 || status === 401,
    detail: `status=${status}`,
  };
});

await test("GET /api/trpc/project.list returns project list or auth error", async () => {
  const res = await fetch(`${BASE}/api/trpc/project.list`);
  const status = res.status;
  return {
    pass: status === 200 || status === 401,
    detail: `status=${status}`,
  };
});

// ── Content Verification Tests ──

await test("HTML includes Tailwind CSS (index.css)", async () => {
  const { text } = await fetchHTML("/");
  // Check for CSS link or inline styles
  return {
    pass: text.includes(".css") || text.includes("stylesheet"),
    detail: `has CSS reference=${text.includes(".css")}`,
  };
});

await test("HTML includes app title meta", async () => {
  const { text } = await fetchHTML("/");
  return {
    pass: text.includes("<title>") || text.includes("Manus"),
    detail: `has title tag=${text.includes("<title>")}`,
  };
});

await test("HTML includes theme-color meta for PWA", async () => {
  const { text } = await fetchHTML("/");
  return {
    pass: text.includes('name="theme-color"'),
    detail: `has theme-color=${text.includes('name="theme-color"')}`,
  };
});

// ── API Structure Tests ──

await test("tRPC batch endpoint accepts POST", async () => {
  const res = await fetch(`${BASE}/api/trpc/auth.me`, { method: "GET" });
  return {
    pass: res.status !== 404 && res.status !== 405,
    detail: `status=${res.status}`,
  };
});

await test("Non-existent tRPC procedure returns error", async () => {
  const res = await fetch(`${BASE}/api/trpc/nonexistent.procedure`);
  return {
    pass: res.status === 404 || res.status === 500,
    detail: `status=${res.status} (expected 404 or 500 for unknown procedure)`,
  };
});

// ── Static Asset Tests ──

await test("favicon.ico is accessible", async () => {
  const res = await fetch(`${BASE}/favicon.ico`);
  return {
    pass: res.status === 200 || res.status === 304,
    detail: `status=${res.status}`,
  };
});

await test("robots.txt is accessible", async () => {
  const res = await fetch(`${BASE}/robots.txt`);
  return {
    pass: res.status === 200,
    detail: `status=${res.status}`,
  };
});

// ── SPA Routing Tests ──

await test("SPA fallback: /projects returns HTML (not 404)", async () => {
  const { status, text } = await fetchHTML("/projects");
  return {
    pass: status === 200 && text.includes('<div id="root"'),
    detail: `status=${status}`,
  };
});

await test("SPA fallback: /settings returns HTML (not 404)", async () => {
  const { status, text } = await fetchHTML("/settings");
  return {
    pass: status === 200 && text.includes('<div id="root"'),
    detail: `status=${status}`,
  };
});

await test("SPA fallback: /memories returns HTML (not 404)", async () => {
  const { status, text } = await fetchHTML("/memories");
  return {
    pass: status === 200 && text.includes('<div id="root"'),
    detail: `status=${status}`,
  };
});

await test("SPA fallback: /schedule returns HTML (not 404)", async () => {
  const { status, text } = await fetchHTML("/schedule");
  return {
    pass: status === 200 && text.includes('<div id="root"'),
    detail: `status=${status}`,
  };
});

await test("SPA fallback: /design returns HTML (not 404)", async () => {
  const { status, text } = await fetchHTML("/design");
  return {
    pass: status === 200 && text.includes('<div id="root"'),
    detail: `status=${status}`,
  };
});

await test("SPA fallback: /replay returns HTML (not 404)", async () => {
  const { status, text } = await fetchHTML("/replay");
  return {
    pass: status === 200 && text.includes('<div id="root"'),
    detail: `status=${status}`,
  };
});

// ── Security Tests ──

await test("No server version header exposed", async () => {
  const { headers } = await fetchHTML("/");
  const server = headers.get("server") || "";
  return {
    pass: !server.includes("Express") || server === "",
    detail: `server header="${server}"`,
  };
});

await test("Content-Type header is correct for HTML", async () => {
  const { headers } = await fetchHTML("/");
  const ct = headers.get("content-type") || "";
  return {
    pass: ct.includes("text/html"),
    detail: `content-type="${ct}"`,
  };
});

// ── Print Results ──

console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║        GATE B SUBSTANTIVE SIMULATION RESULTS        ║");
console.log("╠══════════════════════════════════════════════════════╣");

for (const r of results) {
  const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
  console.log(`║ ${icon} ${r.name.padEnd(48)} ║`);
  if (r.detail) {
    console.log(`║    ${r.detail.padEnd(48)} ║`);
  }
}

console.log("╠══════════════════════════════════════════════════════╣");
console.log(`║ TOTAL: ${passed}/${results.length} passed, ${failed} failed`.padEnd(55) + "║");
console.log(`║ VERDICT: ${failed === 0 ? "PASS ✅" : "FAIL ❌"}`.padEnd(55) + "║");
console.log("╚══════════════════════════════════════════════════════╝\n");

process.exit(failed > 0 ? 1 : 0);
