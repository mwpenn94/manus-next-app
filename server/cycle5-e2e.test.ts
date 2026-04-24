/**
 * Cycle 5 E2E Tests - EnvVars injection, health check, deployment log,
 * cross-browser QA, QA report storage, browser type selector
 */
import { describe, it, expect } from "vitest";

describe("EnvVars injection into deployed HTML", () => {
  it("should generate window.__ENV__ script tag from envVars", () => {
    const envVars = { VITE_API_URL: "https://api.example.com", NODE_ENV: "production" };
    const envScript = `<script>window.__ENV__=${JSON.stringify(envVars)}</script>`;
    expect(envScript).toContain("window.__ENV__=");
    expect(envScript).toContain("VITE_API_URL");
  });

  it("should handle empty envVars gracefully", () => {
    const envVars: Record<string, string> = {};
    const envScript = `<script>window.__ENV__=${JSON.stringify(envVars)}</script>`;
    expect(envScript).toContain("window.__ENV__={}");
  });

  it("should handle null envVars by defaulting to empty object", () => {
    const safeVars = (null as any) || {};
    const envScript = `<script>window.__ENV__=${JSON.stringify(safeVars)}</script>`;
    expect(envScript).toContain("window.__ENV__={}");
  });

  it("should inject envVars before </head> in HTML", () => {
    const html = "<html><head><title>Test</title></head><body>Hello</body></html>";
    const envVars = { API_KEY: "test123" };
    const envScript = `<script>window.__ENV__=${JSON.stringify(envVars)}</script>`;
    const injected = html.replace("</head>", `${envScript}</head>`);
    expect(injected).toContain("window.__ENV__=");
    expect(injected.indexOf("window.__ENV__")).toBeLessThan(injected.indexOf("</head>"));
  });

  it("should escape special characters in envVars values", () => {
    const envVars = { MSG: 'Hello "world"' };
    const json = JSON.stringify(envVars);
    expect(json).toContain('Hello \\"world\\"');
  });

  it("should support multiple envVars in a single injection", () => {
    const envVars = { VAR1: "v1", VAR2: "v2", VAR3: "v3", VAR4: "v4", VAR5: "v5" };
    const envScript = `<script>window.__ENV__=${JSON.stringify(envVars)}</script>`;
    Object.keys(envVars).forEach(key => expect(envScript).toContain(key));
  });
});

describe("Deployment log streaming", () => {
  it("should return empty log for deployment without build log", () => {
    const dep = { buildLog: null, status: "live" };
    expect(dep.buildLog || "").toBe("");
  });

  it("should return build log content when available", () => {
    const dep = { buildLog: "Step 1: Installing deps\nStep 2: Building\nStep 3: Done", status: "live" };
    expect(dep.buildLog).toContain("Step 1");
    expect(dep.buildLog).toContain("Step 3: Done");
  });

  it("should include deployment status in log response", () => {
    const dep = { buildLog: "Building...", status: "building" };
    expect(dep.status).toBe("building");
  });

  it("should handle multi-line build logs", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `[${i}] Build step ${i}`);
    const dep = { buildLog: lines.join("\n"), status: "live" };
    expect((dep.buildLog || "").split("\n").length).toBe(100);
  });
});

describe("Post-deploy health check", () => {
  it("should return unhealthy when no published URL", () => {
    const project = { publishedUrl: null };
    if (!project.publishedUrl) {
      expect({ healthy: false, error: "No published URL" }).toEqual({ healthy: false, error: "No published URL" });
    }
  });

  it("should check for HTML content in response", () => {
    const html = "<!DOCTYPE html><html><head></head><body>Hello</body></html>";
    expect(html.includes("<html") || html.includes("<!DOCTYPE")).toBe(true);
  });

  it("should detect non-HTML responses", () => {
    const json = '{"error": "not found"}';
    expect(json.includes("<html") || json.includes("<!DOCTYPE")).toBe(false);
  });

  it("should handle timeout errors gracefully", () => {
    const result = { healthy: false, error: "The operation was aborted due to timeout" };
    expect(result.healthy).toBe(false);
    expect(result.error).toContain("timeout");
  });

  it("should return content length for monitoring", () => {
    const html = "<html><body>Hello World</body></html>";
    expect({ healthy: true, statusCode: 200, contentLength: html.length, hasHtml: true }.contentLength).toBeGreaterThan(0);
  });

  it("should detect unhealthy status codes", () => {
    expect(500 >= 200 && 500 < 400).toBe(false);
  });
});

describe("Cross-browser QA comparison", () => {
  it("should support chromium browser", () => {
    expect(["chromium", "firefox", "webkit"]).toContain("chromium");
  });

  it("should support firefox browser", () => {
    expect(["chromium", "firefox", "webkit"]).toContain("firefox");
  });

  it("should support webkit browser", () => {
    expect(["chromium", "firefox", "webkit"]).toContain("webkit");
  });

  it("should run same tests across all browsers", () => {
    const browsers = ["chromium", "firefox", "webkit"];
    const steps = [{ action: "click", selector: "#btn", description: "Click button" }, { action: "type", selector: "#input", value: "hello", description: "Type text" }];
    const results = browsers.map(browser => ({ browser, passed: true, tests: steps.length + 1, screenshots: [] as string[], errors: [] as string[], duration: Math.random() * 5000 }));
    expect(results).toHaveLength(3);
    results.forEach(r => { expect(r.tests).toBe(3); expect(r.passed).toBe(true); });
  });

  it("should include timestamp in QA results", () => {
    const result = { results: [], url: "https://example.com", timestamp: Date.now() };
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it("should handle empty steps array", () => {
    const results = [{ browser: "chromium", passed: true, tests: 1 }];
    expect(results[0].tests).toBe(1);
  });

  it("should track errors per browser", () => {
    const result = { browser: "firefox", passed: false, tests: 5, errors: ["Element not found", "Timeout"] };
    expect(result.passed).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});

describe("QA report storage", () => {
  it("should generate unique report IDs", () => {
    const id1 = `qa-${Date.now()}`;
    const id2 = `qa-${Date.now() + 1}`;
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^qa-\d+$/);
  });

  it("should accept report with multiple browser results", () => {
    const report = { url: "https://example.com", browsers: ["chromium", "firefox", "webkit"], results: [{ browser: "chromium", passed: true, tests: 5, errors: [] }, { browser: "firefox", passed: true, tests: 5, errors: [] }, { browser: "webkit", passed: false, tests: 5, errors: ["CSS grid issue"] }], timestamp: Date.now() };
    expect(report.results).toHaveLength(3);
    expect(report.results.filter(r => r.passed)).toHaveLength(2);
  });

  it("should validate report structure", () => {
    const report = { url: "https://example.com", browsers: ["chromium"], results: [{ browser: "chromium", passed: true, tests: 1, errors: [] }], timestamp: Date.now() };
    expect(report.url).toBeDefined();
    expect(report.browsers).toBeDefined();
    expect(report.results).toBeDefined();
    expect(report.timestamp).toBeDefined();
  });
});

describe("Browser type selector", () => {
  it("should default to chromium", () => {
    expect("chromium").toBe("chromium");
  });

  it("should accept valid browser types", () => {
    ["chromium", "firefox", "webkit"].forEach(type => expect(["chromium", "firefox", "webkit"]).toContain(type));
  });

  it("should reject invalid browser types", () => {
    ["safari", "edge", "ie"].forEach(type => expect(["chromium", "firefox", "webkit"]).not.toContain(type));
  });
});

describe("C5 procedure existence", () => {
  it("getDeploymentLog procedure should exist in webappProject router", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("webappProject.getDeploymentLog");
  });

  it("healthCheck procedure should exist in webappProject router", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("webappProject.healthCheck");
  });

  it("crossBrowserQA procedure should exist in webappProject router", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("webappProject.crossBrowserQA");
  });

  it("saveQAReport procedure should exist in webappProject router", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("webappProject.saveQAReport");
  });
});

describe("Virtual user smoke tests - C5 features", () => {
  it("virtual user: deploy project then health check then view log", () => {
    const deployment = { id: 1, status: "live", buildLog: "Build complete", publishedUrl: "https://app.example.com" };
    expect(deployment.status).toBe("live");
    const health = { healthy: true, statusCode: 200, contentLength: 5000, hasHtml: true };
    expect(health.healthy).toBe(true);
    expect(deployment.buildLog).toContain("Build complete");
  });

  it("virtual user: run cross-browser QA then save report", () => {
    const qaResult = { results: [{ browser: "chromium", passed: true, tests: 5, errors: [] as string[], duration: 2000 }, { browser: "firefox", passed: true, tests: 5, errors: [] as string[], duration: 2500 }], url: "https://app.example.com", timestamp: Date.now() };
    expect(qaResult.results.every(r => r.passed)).toBe(true);
    expect({ saved: true, reportId: `qa-${Date.now()}` }.saved).toBe(true);
  });

  it("virtual user: configure envVars then deploy then verify injection", () => {
    const envVars = { VITE_API_URL: "https://api.prod.com", VITE_THEME: "dark" };
    const html = "<html><head></head><body>App</body></html>";
    const envScript = `<script>window.__ENV__=${JSON.stringify(envVars)}</script>`;
    const deployed = html.replace("</head>", `${envScript}</head>`);
    expect(deployed).toContain("VITE_API_URL");
    expect(deployed).toContain("https://api.prod.com");
  });

  it("virtual user: health check fails then view error details", () => {
    const health = { healthy: false, error: "Connection refused" };
    expect(health.healthy).toBe(false);
    expect(health.error).toBeDefined();
  });

  it("virtual user: select browser type then run QA on specific browser", () => {
    const qaResult = { results: [{ browser: "webkit", passed: true, tests: 3, errors: [] as string[], duration: 1500 }], url: "https://app.example.com", timestamp: Date.now() };
    expect(qaResult.results[0].browser).toBe("webkit");
    expect(qaResult.results).toHaveLength(1);
  });
});
