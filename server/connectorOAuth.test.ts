import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";

const mockUser = { id: 1, openId: "test-user", role: "admin" as const, name: "Test" };

function authedCaller() {
  return appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any, setCookie: vi.fn() });
}

describe("Connector OAuth Procedures", () => {
  // ── getOAuthUrl ──
  it("getOAuthUrl returns supported:false for non-OAuth connectors", async () => {
    const caller = authedCaller();
    const result = await caller.connector.getOAuthUrl({
      connectorId: "zapier",
      origin: "https://example.com",
    });
    expect(result.supported).toBe(false);
    expect(result.fallback).toBe("api_key");
  });

  it("getOAuthUrl returns supported:true for GitHub when CONNECTOR_GITHUB_CLIENT_ID is set", async () => {
    const caller = authedCaller();
    const result = await caller.connector.getOAuthUrl({
      connectorId: "github",
      origin: "https://example.com",
    });
    // Connector OAuth uses CONNECTOR_GITHUB_CLIENT_ID (separate from platform's GITHUB_CLIENT_ID)
    if (process.env.CONNECTOR_GITHUB_CLIENT_ID && process.env.CONNECTOR_GITHUB_CLIENT_SECRET) {
      expect(result.supported).toBe(true);
      expect(result.url).toContain("github.com/login/oauth/authorize");
      expect(result.url).toContain("client_id=");
      expect(result.url).toContain("redirect_uri=");
      expect(result.url).toContain("state=");
    } else {
      // Without connector-specific env vars, falls back to api_key
      expect(result.supported).toBe(false);
      expect(result.fallback).toBe("api_key");
    }
  });

  it("getOAuthUrl handles Slack connector", async () => {
    const caller = authedCaller();
    const result = await caller.connector.getOAuthUrl({
      connectorId: "slack",
      origin: "https://example.com",
    });
    expect(result).toHaveProperty("supported");
  });

  it("getOAuthUrl handles Google Drive connector", async () => {
    const caller = authedCaller();
    const result = await caller.connector.getOAuthUrl({
      connectorId: "google-drive",
      origin: "https://example.com",
    });
    expect(result).toHaveProperty("supported");
  });

  it("getOAuthUrl handles Notion connector", async () => {
    const caller = authedCaller();
    const result = await caller.connector.getOAuthUrl({
      connectorId: "notion",
      origin: "https://example.com",
    });
    expect(result).toHaveProperty("supported");
  });

  it("getOAuthUrl handles Google Calendar connector", async () => {
    const caller = authedCaller();
    const result = await caller.connector.getOAuthUrl({
      connectorId: "calendar",
      origin: "https://example.com",
    });
    expect(result).toHaveProperty("supported");
  });

  it("getOAuthUrl returns supported:false for MCP", async () => {
    const caller = authedCaller();
    const result = await caller.connector.getOAuthUrl({
      connectorId: "mcp",
      origin: "https://example.com",
    });
    expect(result.supported).toBe(false);
    expect(result.fallback).toBe("api_key");
  });

  it("getOAuthUrl returns supported:false for email", async () => {
    const caller = authedCaller();
    const result = await caller.connector.getOAuthUrl({
      connectorId: "email",
      origin: "https://example.com",
    });
    expect(result.supported).toBe(false);
    expect(result.fallback).toBe("api_key");
  });

  // ── checkOAuthSupport ──
  it("checkOAuthSupport returns supported boolean for OAuth-capable connectors", async () => {
    const caller = authedCaller();
    // These have providers defined — isOAuthSupported checks env vars
    for (const id of ["github", "slack", "google-drive", "notion", "calendar"]) {
      const result = await caller.connector.checkOAuthSupport({ connectorId: id });
      expect(result).toHaveProperty("supported");
      expect(typeof result.supported).toBe("boolean");
    }
  });

  it("checkOAuthSupport returns false for non-OAuth connectors", async () => {
    const caller = authedCaller();
    for (const id of ["zapier", "email", "mcp"]) {
      const result = await caller.connector.checkOAuthSupport({ connectorId: id });
      expect(result.supported).toBe(false);
    }
  });

  // ── completeOAuth error cases ──
  it("completeOAuth throws for unsupported connector", async () => {
    const caller = authedCaller();
    await expect(
      caller.connector.completeOAuth({
        connectorId: "zapier",
        code: "test-code",
        origin: "https://example.com",
      })
    ).rejects.toThrow();
  });

  // ── refreshOAuth error cases ──
  it("refreshOAuth throws when connector not found", async () => {
    const caller = authedCaller();
    await expect(
      caller.connector.refreshOAuth({ connectorId: "nonexistent" })
    ).rejects.toThrow();
  });
});

describe("Connector OAuth Provider Module", () => {
  it("exports isOAuthSupported function", async () => {
    const mod = await import("./connectorOAuth");
    expect(typeof mod.isOAuthSupported).toBe("function");
  });

  it("exports getOAuthProvider function", async () => {
    const mod = await import("./connectorOAuth");
    expect(typeof mod.getOAuthProvider).toBe("function");
  });

  it("exports oauthProviders registry", async () => {
    const mod = await import("./connectorOAuth");
    expect(mod.oauthProviders).toBeDefined();
    expect(typeof mod.oauthProviders).toBe("object");
  });

  it("oauthProviders has entries for github, google-drive, calendar, notion, slack", async () => {
    const { oauthProviders } = await import("./connectorOAuth");
    expect(oauthProviders["github"]).toBeDefined();
    expect(oauthProviders["google-drive"]).toBeDefined();
    expect(oauthProviders["calendar"]).toBeDefined();
    expect(oauthProviders["notion"]).toBeDefined();
    expect(oauthProviders["slack"]).toBeDefined();
  });

  it("oauthProviders does not have entries for zapier, email, mcp", async () => {
    const { oauthProviders } = await import("./connectorOAuth");
    expect(oauthProviders["zapier"]).toBeUndefined();
    expect(oauthProviders["email"]).toBeUndefined();
    expect(oauthProviders["mcp"]).toBeUndefined();
  });

  it("isOAuthSupported returns false for non-OAuth connectors", async () => {
    const { isOAuthSupported } = await import("./connectorOAuth");
    for (const id of ["zapier", "email", "mcp"]) {
      expect(isOAuthSupported(id)).toBe(false);
    }
  });

  it("isOAuthSupported returns true for GitHub when CONNECTOR_GITHUB_CLIENT_ID env var is set", async () => {
    const { isOAuthSupported } = await import("./connectorOAuth");
    // Connector OAuth uses CONNECTOR_ prefixed env vars (separate from platform credentials)
    if (process.env.CONNECTOR_GITHUB_CLIENT_ID && process.env.CONNECTOR_GITHUB_CLIENT_SECRET) {
      expect(isOAuthSupported("github")).toBe(true);
    } else {
      // Without connector-specific env vars, OAuth is not supported
      expect(isOAuthSupported("github")).toBe(false);
    }
  });

  it("getOAuthProvider returns provider object for registered connectors", async () => {
    const { getOAuthProvider } = await import("./connectorOAuth");
    const github = getOAuthProvider("github");
    expect(github).toBeDefined();
    expect(github!.id).toBe("github");
    expect(github!.name).toBe("GitHub");
    expect(typeof github!.getAuthUrl).toBe("function");
    expect(typeof github!.exchangeCode).toBe("function");
  });

  it("getOAuthProvider returns undefined for unregistered connectors", async () => {
    const { getOAuthProvider } = await import("./connectorOAuth");
    expect(getOAuthProvider("zapier")).toBeUndefined();
    expect(getOAuthProvider("email")).toBeUndefined();
    expect(getOAuthProvider("nonexistent")).toBeUndefined();
  });

  it("GitHub provider generates correct auth URL structure", async () => {
    const { getOAuthProvider } = await import("./connectorOAuth");
    const github = getOAuthProvider("github")!;
    const url = github.getAuthUrl("https://example.com/callback", "test-state");
    expect(url).toContain("github.com/login/oauth/authorize");
    expect(url).toContain("redirect_uri=");
    expect(url).toContain("state=test-state");
    expect(url).toContain("scope=");
  });

  it("Slack provider generates correct auth URL structure", async () => {
    const { getOAuthProvider } = await import("./connectorOAuth");
    const slack = getOAuthProvider("slack")!;
    const url = slack.getAuthUrl("https://example.com/callback", "test-state");
    expect(url).toContain("slack.com/oauth/v2/authorize");
    expect(url).toContain("state=test-state");
  });

  it("Google provider generates correct auth URL structure", async () => {
    const { getOAuthProvider } = await import("./connectorOAuth");
    const gdrive = getOAuthProvider("google-drive")!;
    const url = gdrive.getAuthUrl("https://example.com/callback", "test-state");
    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("state=test-state");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
  });

  it("Notion provider generates correct auth URL structure", async () => {
    const { getOAuthProvider } = await import("./connectorOAuth");
    const notion = getOAuthProvider("notion")!;
    const url = notion.getAuthUrl("https://example.com/callback", "test-state");
    expect(url).toContain("api.notion.com/v1/oauth/authorize");
    expect(url).toContain("state=test-state");
    expect(url).toContain("owner=user");
  });

  it("Google Calendar uses same provider as Google Drive", async () => {
    const { getOAuthProvider } = await import("./connectorOAuth");
    const drive = getOAuthProvider("google-drive");
    const cal = getOAuthProvider("calendar");
    expect(drive).toBe(cal); // Same object reference
  });

  it("All providers have required interface methods", async () => {
    const { oauthProviders } = await import("./connectorOAuth");
    for (const [key, provider] of Object.entries(oauthProviders)) {
      expect(provider.id, `${key} missing id`).toBeTruthy();
      expect(provider.name, `${key} missing name`).toBeTruthy();
      expect(provider.authorizeUrl, `${key} missing authorizeUrl`).toBeTruthy();
      expect(provider.tokenUrl, `${key} missing tokenUrl`).toBeTruthy();
      expect(typeof provider.getAuthUrl, `${key} missing getAuthUrl`).toBe("function");
      expect(typeof provider.exchangeCode, `${key} missing exchangeCode`).toBe("function");
    }
  });
});

describe("Express OAuth Callback Route", () => {
  it("callback route is registered at /api/connector/oauth/callback", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(indexContent).toContain('/api/connector/oauth/callback');
    expect(indexContent).toContain('buildOAuthCallbackHtml');
  });

  it("callback HTML posts message to opener for popup flow", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(indexContent).toContain('connector-oauth-callback');
    expect(indexContent).toContain('window.opener.postMessage');
  });

  it("callback HTML falls back to redirect for same-window flow", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(indexContent).toContain('/connectors?code=');
  });

  it("callback handles error parameter", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(indexContent).toContain('OAuth error');
    expect(indexContent).toContain('Missing code or state parameter');
    expect(indexContent).toContain('Invalid state parameter');
  });
});

describe("ENV OAuth Declarations", () => {
  it("env.ts declares all OAuth client ID/secret vars", async () => {
    const fs = await import("fs");
    const envContent = fs.readFileSync("server/_core/env.ts", "utf-8");
    const requiredVars = [
      "GITHUB_OAUTH_CLIENT_ID",
      "GITHUB_OAUTH_CLIENT_SECRET",
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "NOTION_OAUTH_CLIENT_ID",
      "NOTION_OAUTH_CLIENT_SECRET",
      "SLACK_OAUTH_CLIENT_ID",
      "SLACK_OAUTH_CLIENT_SECRET",
    ];
    for (const v of requiredVars) {
      expect(envContent, `Missing ${v} in env.ts`).toContain(v);
    }
  });

  it("env.ts reads CONNECTOR_GITHUB_CLIENT_ID with fallback to GITHUB_OAUTH_CLIENT_ID", async () => {
    const fs = await import("fs");
    const envContent = fs.readFileSync("server/_core/env.ts", "utf-8");
    // Connector OAuth uses CONNECTOR_ prefixed env vars (separate from platform credentials)
    expect(envContent).toContain("process.env.CONNECTOR_GITHUB_CLIENT_ID");
    expect(envContent).toContain("process.env.CONNECTOR_GITHUB_CLIENT_SECRET");
    expect(envContent).toContain("process.env.CONNECTOR_GOOGLE_CLIENT_ID");
    expect(envContent).toContain("process.env.CONNECTOR_GOOGLE_CLIENT_SECRET");
    expect(envContent).toContain("process.env.CONNECTOR_NOTION_CLIENT_ID");
    expect(envContent).toContain("process.env.CONNECTOR_NOTION_CLIENT_SECRET");
    expect(envContent).toContain("process.env.CONNECTOR_SLACK_CLIENT_ID");
    expect(envContent).toContain("process.env.CONNECTOR_SLACK_CLIENT_SECRET");
  });

  it("env.ts fallback chain: CONNECTOR_ prefix ?? legacy name ?? empty string", async () => {
    const fs = await import("fs");
    const envContent = fs.readFileSync("server/_core/env.ts", "utf-8");
    // Verify the specific fallback pattern: CONNECTOR_GITHUB_CLIENT_ID ?? GITHUB_OAUTH_CLIENT_ID ?? ""
    expect(envContent).toMatch(/CONNECTOR_GITHUB_CLIENT_ID.*\?\?.*GITHUB_OAUTH_CLIENT_ID.*\?\?.*""/s);
    expect(envContent).toMatch(/CONNECTOR_GITHUB_CLIENT_SECRET.*\?\?.*GITHUB_OAUTH_CLIENT_SECRET.*\?\?.*""/s);
  });

  it("env.ts does NOT map platform GITHUB_CLIENT_ID to connector OAuth", async () => {
    const fs = await import("fs");
    const envContent = fs.readFileSync("server/_core/env.ts", "utf-8");
    // Platform's GITHUB_CLIENT_ID should NOT be used for connector OAuth
    // (it's for git sync, not user-facing OAuth)
    expect(envContent).not.toMatch(/process\.env\.GITHUB_CLIENT_ID\s*\?\?\s*process\.env\.GITHUB_OAUTH_CLIENT_ID/);
  });
});
