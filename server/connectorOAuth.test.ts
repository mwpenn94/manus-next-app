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

  it("getOAuthUrl returns supported:true for GitHub when platform or CONNECTOR_ credentials are set", async () => {
    const caller = authedCaller();
    const result = await caller.connector.getOAuthUrl({
      connectorId: "github",
      origin: "https://example.com",
    });
    // GitHub OAuth is supported if either CONNECTOR_GITHUB_CLIENT_ID or platform GITHUB_CLIENT_ID is set
    const hasGitHubCreds = !!(process.env.CONNECTOR_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID);
    if (hasGitHubCreds) {
      expect(result.supported).toBe(true);
      expect(result.url).toContain("github.com/login/oauth/authorize");
      expect(result.url).toContain("client_id=");
      expect(result.url).toContain("redirect_uri=");
      expect(result.url).toContain("state=");
    } else {
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

  it("isOAuthSupported returns true for GitHub when platform or CONNECTOR_ credentials are set", async () => {
    const { isOAuthSupported } = await import("./connectorOAuth");
    // GitHub OAuth is supported if either CONNECTOR_GITHUB_CLIENT_ID or platform GITHUB_CLIENT_ID is set
    const hasGitHubCreds = !!(process.env.CONNECTOR_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID);
    if (hasGitHubCreds) {
      expect(isOAuthSupported("github")).toBe(true);
    } else {
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
    // returnPath-based redirect: uses returnPath from state instead of hardcoded /connectors
    expect(indexContent).toContain('returnPath');
    expect(indexContent).toContain('?code=');
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

  it("env.ts uses CONNECTOR_ prefix with platform credential fallback for GitHub and Microsoft", async () => {
    const fs = await import("fs");
    const envContent = fs.readFileSync("server/_core/env.ts", "utf-8");
    // GitHub: CONNECTOR_ preferred, falls back to platform GITHUB_CLIENT_ID
    expect(envContent).toContain("process.env.CONNECTOR_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID");
    expect(envContent).toContain("process.env.CONNECTOR_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET");
    // Microsoft 365: CONNECTOR_ preferred, falls back to platform MICROSOFT_365_CLIENT_ID
    expect(envContent).toContain("process.env.CONNECTOR_MICROSOFT_365_CLIENT_ID || process.env.MICROSOFT_365_CLIENT_ID");
    expect(envContent).toContain("process.env.CONNECTOR_MICROSOFT_365_CLIENT_SECRET || process.env.MICROSOFT_365_CLIENT_SECRET");
    // Google/Notion/Slack: no platform fallback (no platform credentials available)
    const googleLine = envContent.split('\n').find(l => l.trim().startsWith('GOOGLE_OAUTH_CLIENT_ID:'));
    expect(googleLine).toBeTruthy();
    expect(googleLine).toContain("CONNECTOR_GOOGLE_CLIENT_ID");
    expect(googleLine).not.toContain("GOOGLE_CLIENT_ID ||"); // no fallback chain
  });

  it("env.ts documents the platform credential fallback strategy", async () => {
    const fs = await import("fs");
    const envContent = fs.readFileSync("server/_core/env.ts", "utf-8");
    // Should document that platform credentials are used as fallback
    expect(envContent).toContain("Fallback");
    expect(envContent).toContain("redirect_uri");
  });
});

// ── Tiered Auth Connector Dialog Tests (replaces Token-First) ──

describe("Tiered Auth Connector Dialog", () => {
  it("ConnectorsPage uses tiered auth with auto-selection of best tier", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    // The connect dialog should use tiered auth with expandedTier state
    expect(content).toContain('expandedTier');
    expect(content).toContain('setExpandedTier');
    // Should auto-select best tier from tieredAuthStatus
    expect(content).toContain('bestTier');
    // Should NOT use old tab-based approach
    expect(content).not.toContain('setConnectTab(isOAuthCapable');
  });

  it("key connectors have tokenHelp with URL and steps", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    // GitHub should have tokenHelp with link to token generation
    expect(content).toContain("github.com/settings/tokens");
    expect(content).toContain("ghp_");
    // Microsoft 365 should have tokenHelp
    expect(content).toContain("graph-explorer");
    // Notion should have tokenHelp
    expect(content).toContain("notion.so/my-integrations");
    expect(content).toContain("secret_");
    // OpenAI should have tokenHelp
    expect(content).toContain("platform.openai.com/api-keys");
    expect(content).toContain("sk-");
    // Google Drive should have tokenHelp
    expect(content).toContain("console.cloud.google.com");
  });

  it("ConnectorsPage renders tokenHelp section in connect dialog", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    // Should have the "How to get your token" section
    expect(content).toContain("How to get your token");
    // Should render steps as numbered list
    expect(content).toContain("tokenHelp.steps");
    // Should have external link to token generation page
    expect(content).toContain("tokenHelp.url");
    expect(content).toContain("tokenHelp.label");
  });

  it("Tiered auth renders all 4 tier types in the dialog", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    // Should have all 4 tier types referenced
    expect(content).toContain('Direct OAuth');
    expect(content).toContain('Manus Verify');
    expect(content).toContain('Smart PAT');
    expect(content).toContain('Manual Entry');
    // Should have tier indicators
    expect(content).toContain('tier1');
    expect(content).toContain('tier2');
    expect(content).toContain('tier3');
    expect(content).toContain('tier4');
  });

  it("Manus Verify button exists for identity verification", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    // Should have Manus Verify button
    expect(content).toContain('Verify via Manus');
    // Should have Fingerprint icon for Manus verify
    expect(content).toContain('Fingerprint');
    // Should have verified identity banner
    expect(content).toContain('Identity Verified');
    expect(content).toContain('BadgeCheck');
  });
});
