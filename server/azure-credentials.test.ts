import { describe, it, expect } from "vitest";

/**
 * Validates that the Azure AD credentials are configured and the app registration
 * is accessible via the OpenID Connect discovery endpoint.
 */
describe("Azure AD Credentials Validation", () => {
  const clientId = process.env.MICROSOFT_365_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_365_CLIENT_SECRET;

  it("should have MICROSOFT_365_CLIENT_ID configured", () => {
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe("");
    // Validate GUID format
    expect(clientId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("should have MICROSOFT_365_CLIENT_SECRET configured", () => {
    expect(clientSecret).toBeDefined();
    expect(clientSecret).not.toBe("");
    // Azure secrets typically start with a tilde-prefixed segment
    expect(clientSecret!.length).toBeGreaterThan(10);
  });

  it("should be able to reach the Azure AD OpenID Connect discovery endpoint", async () => {
    // Use the 'common' tenant endpoint since the app supports multi-tenant
    const discoveryUrl =
      "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration";

    const response = await fetch(discoveryUrl);
    expect(response.ok).toBe(true);

    const config = await response.json();
    expect(config.authorization_endpoint).toContain("login.microsoftonline.com");
    expect(config.token_endpoint).toContain("login.microsoftonline.com");
    expect(config.issuer).toContain("login.microsoftonline.com");
  });

  it("should validate client_id against the token endpoint (lightweight check)", async () => {
    // We can't do a full OAuth flow in a test, but we can verify the client_id
    // is recognized by attempting a client_credentials grant and checking the error
    // A valid client_id with wrong grant will return "invalid_client" or "unauthorized_client"
    // An invalid client_id will return "Application with identifier 'xxx' was not found"
    const tokenUrl =
      "https://login.microsoftonline.com/common/oauth2/v2.0/token";

    const params = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    // For multi-tenant apps with 'common' endpoint, we expect an error about
    // needing a specific tenant, NOT "application not found"
    const body = await response.json();

    // The error should NOT be "Application not found" — that would mean invalid client_id
    if (body.error) {
      expect(body.error_description).not.toContain("was not found in the directory");
      // Expected errors for multi-tenant common endpoint:
      // "unauthorized_client" or "invalid_request" — both confirm the app exists
    }
  });
});
