import { describe, it, expect } from "vitest";

/**
 * Verify that the platform credential fallback works correctly:
 * - GitHub and Microsoft 365 should be OAuth-supported via platform credentials
 * - Google, Notion, Slack should NOT be OAuth-supported (no platform credentials available)
 */
describe("Platform Credential Fallback Verification", () => {
  it("GitHub OAuth is supported via platform GITHUB_CLIENT_ID fallback", async () => {
    const { isOAuthSupported } = await import("./connectorOAuth");
    // Platform provides GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
    expect(process.env.GITHUB_CLIENT_ID).toBeTruthy();
    expect(process.env.GITHUB_CLIENT_SECRET).toBeTruthy();
    // So GitHub OAuth should be supported even without CONNECTOR_GITHUB_CLIENT_ID
    expect(isOAuthSupported("github")).toBe(true);
  });

  it("Microsoft 365 OAuth is supported via platform MICROSOFT_365_CLIENT_ID fallback", async () => {
    const { isOAuthSupported } = await import("./connectorOAuth");
    // Platform provides MICROSOFT_365_CLIENT_ID and MICROSOFT_365_CLIENT_SECRET
    expect(process.env.MICROSOFT_365_CLIENT_ID).toBeTruthy();
    expect(process.env.MICROSOFT_365_CLIENT_SECRET).toBeTruthy();
    // So Microsoft 365 OAuth should be supported even without CONNECTOR_MICROSOFT_365_CLIENT_ID
    expect(isOAuthSupported("microsoft-365")).toBe(true);
  });

  it("Google Drive OAuth is NOT supported (no platform credentials)", async () => {
    const { isOAuthSupported } = await import("./connectorOAuth");
    // No platform GOOGLE_CLIENT_ID exists
    expect(process.env.GOOGLE_CLIENT_ID).toBeFalsy();
    // So Google Drive OAuth falls back to api_key
    expect(isOAuthSupported("google-drive")).toBe(false);
  });

  it("Notion OAuth is NOT supported (no platform credentials)", async () => {
    const { isOAuthSupported } = await import("./connectorOAuth");
    expect(process.env.NOTION_CLIENT_ID).toBeFalsy();
    expect(isOAuthSupported("notion")).toBe(false);
  });

  it("Slack OAuth is NOT supported (no platform credentials)", async () => {
    const { isOAuthSupported } = await import("./connectorOAuth");
    expect(process.env.SLACK_CLIENT_ID).toBeFalsy();
    expect(isOAuthSupported("slack")).toBe(false);
  });

  it("GitHub getOAuthUrl returns a valid GitHub authorize URL", async () => {
    const { getOAuthProvider } = await import("./connectorOAuth");
    const github = getOAuthProvider("github")!;
    const url = github.getAuthUrl("https://example.com/callback", "test-state");
    expect(url).toContain("github.com/login/oauth/authorize");
    expect(url).toContain("client_id=Ov23"); // Platform GitHub client ID starts with Ov23
    expect(url).toContain("state=test-state");
    expect(url).toContain("scope=");
  });

  it("Microsoft 365 getOAuthUrl returns a valid Microsoft authorize URL", async () => {
    const { getOAuthProvider } = await import("./connectorOAuth");
    const ms = getOAuthProvider("microsoft-365")!;
    const url = ms.getAuthUrl("https://example.com/callback", "test-state");
    expect(url).toContain("login.microsoftonline.com");
    expect(url).toContain("client_id="); // Should have the platform Microsoft client ID
    expect(url).toContain("state=test-state");
    expect(url).toContain("scope=");
  });
});
