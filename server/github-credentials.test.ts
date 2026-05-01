import { describe, it, expect } from "vitest";

/**
 * Validate GitHub OAuth credentials by attempting a token exchange
 * with a dummy code. A valid client_id + client_secret will return
 * "bad_verification_code" (meaning credentials are correct but code is fake).
 * Invalid credentials return "incorrect_client_credentials".
 */
describe("GitHub OAuth Credentials Validation", () => {
  it("should have GITHUB_CLIENT_ID set", () => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    expect(clientId).toBeTruthy();
    expect(clientId!.length).toBeGreaterThan(10);
  });

  it("should have GITHUB_CLIENT_SECRET set", () => {
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    expect(clientSecret).toBeTruthy();
    expect(clientSecret!.length).toBeGreaterThan(20);
  });

  it("should have valid credentials (not rejected by GitHub)", async () => {
    const clientId = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_OAUTH_CLIENT_SECRET;

    // Send a token exchange with a fake code — valid credentials
    // will return "bad_verification_code", invalid ones return
    // "incorrect_client_credentials"
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let resp: Response;
    try {
      resp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: "fake_test_code_12345",
          redirect_uri: "https://manusnext-mlromfub.manus.space/api/connector/oauth/callback",
        }),
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(timeout);
      if (e.name === "AbortError" || e.code === "UND_ERR_CONNECT_TIMEOUT") {
        console.warn("GitHub OAuth endpoint unreachable (timeout) — skipping");
        return;
      }
      throw e;
    }
    clearTimeout(timeout);

    const data = await resp.json();
    // If credentials are valid, GitHub returns "bad_verification_code"
    // If credentials are invalid, GitHub returns "incorrect_client_credentials"
    console.log("[GitHub Credentials Test] Response:", JSON.stringify(data));

    // We expect an error (since the code is fake), but NOT "incorrect_client_credentials"
    if (data.error) {
      expect(data.error).not.toBe("incorrect_client_credentials");
      // "bad_verification_code" means credentials are valid but code is fake — that's what we want
      expect(data.error).toBe("bad_verification_code");
    } else {
      // If somehow we got a token (impossible with fake code), that's also fine
      expect(data.access_token).toBeTruthy();
    }
  });
});
