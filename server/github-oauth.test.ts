import { describe, it, expect } from "vitest";

describe("GitHub OAuth Credentials", () => {
  it("should have GITHUB_CLIENT_ID set", () => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId!.length).toBeGreaterThan(10);
    expect(clientId).toMatch(/^Ov23/);
  });

  it("should have GITHUB_CLIENT_SECRET set", () => {
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    expect(clientSecret).toBeDefined();
    expect(clientSecret!.length).toBe(40);
    expect(clientSecret).toMatch(/^[a-f0-9]{40}$/);
  });

  it("should be able to construct a valid GitHub OAuth URL", () => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = "https://manusnext-mlromfub.manus.space/api/connector/oauth/callback";
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email,read:user`;
    expect(url).toContain("client_id=Ov23");
    expect(url).toContain("redirect_uri=");
    expect(url).toContain("scope=");
  });
});
