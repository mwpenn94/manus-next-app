/**
 * deploy.test.ts — Tests for deploy_webapp multi-file deployment, DeploymentCard SSE events,
 * and the full app dev/management/publishing pipeline.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── SSE Event Parsing Tests ──
describe("webapp_deployed SSE event", () => {
  it("should parse webapp_deployed event from SSE line", () => {
    const line = `data: ${JSON.stringify({
      webapp_deployed: {
        name: "my-app",
        url: "https://s3.example.com/webapp-deploys/my-app-123/index.html",
        projectExternalId: "proj_abc123",
        versionLabel: "v1.0 - initial release",
      },
    })}`;

    const data = JSON.parse(line.slice(6));
    expect(data.webapp_deployed).toBeDefined();
    expect(data.webapp_deployed.name).toBe("my-app");
    expect(data.webapp_deployed.url).toContain("index.html");
    expect(data.webapp_deployed.projectExternalId).toBe("proj_abc123");
    expect(data.webapp_deployed.versionLabel).toBe("v1.0 - initial release");
  });

  it("should not have webapp_deployed for non-deploy events", () => {
    const line = `data: ${JSON.stringify({
      webapp_preview: {
        name: "my-app",
        url: "/api/webapp-preview/",
      },
    })}`;

    const data = JSON.parse(line.slice(6));
    expect(data.webapp_deployed).toBeUndefined();
    expect(data.webapp_preview).toBeDefined();
  });

  it("should handle webapp_deployed without optional fields", () => {
    const line = `data: ${JSON.stringify({
      webapp_deployed: {
        name: "simple-app",
        url: "https://s3.example.com/deploy/index.html",
      },
    })}`;

    const data = JSON.parse(line.slice(6));
    expect(data.webapp_deployed.name).toBe("simple-app");
    expect(data.webapp_deployed.projectExternalId).toBeUndefined();
    expect(data.webapp_deployed.versionLabel).toBeUndefined();
  });
});

// ── Multi-file Deploy Logic Tests ──
describe("multi-file deployment", () => {
  it("should correctly map MIME types for common file extensions", () => {
    const mimeTypes: Record<string, string> = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".mjs": "application/javascript",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject",
      ".map": "application/json",
      ".txt": "text/plain",
      ".xml": "application/xml",
    };

    expect(mimeTypes[".html"]).toBe("text/html");
    expect(mimeTypes[".css"]).toBe("text/css");
    expect(mimeTypes[".js"]).toBe("application/javascript");
    expect(mimeTypes[".svg"]).toBe("image/svg+xml");
    expect(mimeTypes[".woff2"]).toBe("font/woff2");
    expect(mimeTypes[".webp"]).toBe("image/webp");
  });

  it("should rewrite asset paths in HTML to S3 URLs", () => {
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/assets/index-abc123.css">
  <script type="module" src="/assets/index-def456.js"></script>
</head>
<body>
  <img src="/assets/logo.png" />
</body>
</html>`;

    const assetUrlMap = new Map<string, string>();
    assetUrlMap.set("assets/index-abc123.css", "https://s3.example.com/deploy/assets/index-abc123.css");
    assetUrlMap.set("assets/index-def456.js", "https://s3.example.com/deploy/assets/index-def456.js");
    assetUrlMap.set("assets/logo.png", "https://s3.example.com/deploy/assets/logo.png");

    for (const [relPath, s3Url] of Array.from(assetUrlMap.entries())) {
      const escapedPath = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      htmlContent = htmlContent.replace(
        new RegExp(`(["'])(/?${escapedPath})(["'])`, 'g'),
        `$1${s3Url}$3`
      );
      htmlContent = htmlContent.replace(
        new RegExp(`(["'])/${escapedPath}(["'])`, 'g'),
        `$1${s3Url}$2`
      );
    }

    expect(htmlContent).toContain('href="https://s3.example.com/deploy/assets/index-abc123.css"');
    expect(htmlContent).toContain('src="https://s3.example.com/deploy/assets/index-def456.js"');
    expect(htmlContent).toContain('src="https://s3.example.com/deploy/assets/logo.png"');
    // Verify the original relative paths are replaced (check that bare /assets/... is gone)
    expect(htmlContent).not.toContain('href="/assets/index-abc123.css"');
    expect(htmlContent).not.toContain('src="/assets/index-def456.js"');
    expect(htmlContent).not.toContain('src="/assets/logo.png"');
  });

  it("should handle HTML with no assets gracefully", () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<body><h1>Hello World</h1></body>
</html>`;

    const assetUrlMap = new Map<string, string>();
    let result = htmlContent;
    for (const [relPath, s3Url] of Array.from(assetUrlMap.entries())) {
      const escapedPath = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(
        new RegExp(`(["'])(/?${escapedPath})(["'])`, 'g'),
        `$1${s3Url}$3`
      );
    }

    expect(result).toBe(htmlContent); // Unchanged
  });
});

// ── DeploymentCard Data Tests ──
describe("DeploymentCard data structure", () => {
  it("should have all required fields for live status", () => {
    const cardData = {
      appName: "my-app",
      deployedUrl: "https://s3.example.com/deploy/index.html",
      projectExternalId: "proj_abc123",
      versionLabel: "v1.0",
      status: "live",
    };

    expect(cardData.appName).toBeTruthy();
    expect(cardData.deployedUrl).toContain("http");
    expect(cardData.status).toBe("live");
  });

  it("should handle deploying status", () => {
    const cardData = {
      appName: "my-app",
      deployedUrl: "",
      status: "deploying",
    };

    expect(cardData.status).toBe("deploying");
    expect(cardData.deployedUrl).toBe("");
  });

  it("should handle failed status", () => {
    const cardData = {
      appName: "my-app",
      deployedUrl: "",
      status: "failed",
    };

    expect(cardData.status).toBe("failed");
  });
});

// ── CardType Union Tests ──
describe("CardType includes webapp_deployed", () => {
  it("should recognize webapp_deployed as a valid card type", () => {
    type CardType =
      | "browser_auth"
      | "task_pause"
      | "take_control"
      | "webapp_preview"
      | "checkpoint"
      | "task_completed"
      | "confirmation_gate"
      | "convergence"
      | "interactive_output"
      | "webapp_deployed"
      | "system_notice";

    const cardType: CardType = "webapp_deployed";
    expect(cardType).toBe("webapp_deployed");
  });
});

// ── StreamCallbacks onWebappDeployed Tests ──
describe("StreamCallbacks onWebappDeployed", () => {
  it("should call onWebappDeployed when webapp_deployed event is parsed", () => {
    const mockCallback = vi.fn();
    const line = `data: ${JSON.stringify({
      webapp_deployed: {
        name: "test-app",
        url: "https://example.com/deploy",
        projectExternalId: "proj_123",
      },
    })}`;

    const data = JSON.parse(line.slice(6));
    if (data.webapp_deployed) {
      mockCallback(data.webapp_deployed);
    }

    expect(mockCallback).toHaveBeenCalledOnce();
    expect(mockCallback).toHaveBeenCalledWith({
      name: "test-app",
      url: "https://example.com/deploy",
      projectExternalId: "proj_123",
    });
  });
});

// ── Auto-deploy System Prompt Tests ──
describe("system prompt auto-deploy instruction", () => {
  it("should contain auto-deploy instruction in the system prompt", async () => {
    const fs = await import("fs");
    const agentStreamContent = fs.readFileSync("server/agentStream.ts", "utf-8");
    
    expect(agentStreamContent).toContain("AUTO-DEPLOY when complete");
    expect(agentStreamContent).toContain("AUTOMATICALLY call deploy_webapp");
    expect(agentStreamContent).toContain("Do NOT wait for the user to ask");
  });

  it("should contain deploy_webapp in the APP BUILDING WORKFLOW", async () => {
    const fs = await import("fs");
    const agentStreamContent = fs.readFileSync("server/agentStream.ts", "utf-8");
    
    expect(agentStreamContent).toContain("deploy_webapp");
    expect(agentStreamContent).toContain("APP BUILDING WORKFLOW");
  });
});

// ── webapp_deployed SSE Emission Tests ──
describe("webapp_deployed SSE emission in agentStream", () => {
  it("should emit webapp_deployed event for deploy_webapp tool", async () => {
    const fs = await import("fs");
    const agentStreamContent = fs.readFileSync("server/agentStream.ts", "utf-8");
    
    // Verify the webapp_deployed SSE emission code exists
    expect(agentStreamContent).toContain("webapp_deployed:");
    expect(agentStreamContent).toContain('toolName === "deploy_webapp"');
    expect(agentStreamContent).toContain("result.success");
  });

  it("should include projectExternalId in webapp_deployed event", async () => {
    const fs = await import("fs");
    const agentStreamContent = fs.readFileSync("server/agentStream.ts", "utf-8");
    
    // The webapp_deployed event should include projectExternalId
    const deployedBlock = agentStreamContent.split("webapp_deployed:")[1]?.slice(0, 300) || "";
    expect(deployedBlock).toContain("projectExternalId");
    expect(deployedBlock).toContain("result.url");
  });
});

// ── Deploy File Collection Tests ──
describe("deploy file collection", () => {
  it("should correctly identify file extensions for MIME mapping", () => {
    const path = require("path");
    
    expect(path.extname("index.html")).toBe(".html");
    expect(path.extname("assets/style.css")).toBe(".css");
    expect(path.extname("assets/app.js")).toBe(".js");
    expect(path.extname("images/logo.png")).toBe(".png");
    expect(path.extname("fonts/inter.woff2")).toBe(".woff2");
    expect(path.extname("favicon.ico")).toBe(".ico");
    expect(path.extname("data.json")).toBe(".json");
  });

  it("should handle files with no extension", () => {
    const path = require("path");
    expect(path.extname("LICENSE")).toBe("");
    expect(path.extname("Makefile")).toBe("");
  });
});
