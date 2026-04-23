import { describe, it, expect } from "vitest";
import { isUrlSafe, validateTunnelUrl } from "./urlValidator";

describe("isUrlSafe", () => {
  // ── Safe URLs ──
  it("allows normal HTTPS URLs", () => {
    expect(isUrlSafe("https://example.com").safe).toBe(true);
    expect(isUrlSafe("https://my-tunnel.ngrok.io/api").safe).toBe(true);
    expect(isUrlSafe("https://device.cloudflare.com:8080").safe).toBe(true);
  });

  it("allows normal HTTP URLs", () => {
    expect(isUrlSafe("http://example.com").safe).toBe(true);
  });

  // ── Blocked: Private IP ranges ──
  it("blocks localhost (127.x.x.x)", () => {
    expect(isUrlSafe("http://127.0.0.1").safe).toBe(false);
    expect(isUrlSafe("http://127.0.0.1:8080").safe).toBe(false);
    expect(isUrlSafe("https://127.255.255.255").safe).toBe(false);
  });

  it("blocks Class A private (10.x.x.x)", () => {
    expect(isUrlSafe("http://10.0.0.1").safe).toBe(false);
    expect(isUrlSafe("http://10.255.255.255").safe).toBe(false);
  });

  it("blocks Class B private (172.16-31.x.x)", () => {
    expect(isUrlSafe("http://172.16.0.1").safe).toBe(false);
    expect(isUrlSafe("http://172.31.255.255").safe).toBe(false);
    // 172.15.x.x and 172.32.x.x should be allowed
    expect(isUrlSafe("http://172.15.0.1").safe).toBe(true);
    expect(isUrlSafe("http://172.32.0.1").safe).toBe(true);
  });

  it("blocks Class C private (192.168.x.x)", () => {
    expect(isUrlSafe("http://192.168.0.1").safe).toBe(false);
    expect(isUrlSafe("http://192.168.1.1").safe).toBe(false);
  });

  it("blocks link-local (169.254.x.x)", () => {
    expect(isUrlSafe("http://169.254.0.1").safe).toBe(false);
  });

  it("blocks AWS/GCP metadata endpoint", () => {
    expect(isUrlSafe("http://169.254.169.254").safe).toBe(false);
    expect(isUrlSafe("http://169.254.169.254/latest/meta-data/").safe).toBe(false);
  });

  it("blocks CGNAT range (100.64-127.x.x)", () => {
    expect(isUrlSafe("http://100.64.0.1").safe).toBe(false);
    expect(isUrlSafe("http://100.127.255.255").safe).toBe(false);
  });

  // ── Blocked: Dangerous hostnames ──
  it("blocks localhost hostname", () => {
    expect(isUrlSafe("http://localhost").safe).toBe(false);
    expect(isUrlSafe("http://localhost:3000").safe).toBe(false);
  });

  it("blocks metadata.google.internal", () => {
    expect(isUrlSafe("http://metadata.google.internal").safe).toBe(false);
  });

  it("blocks Alibaba metadata", () => {
    expect(isUrlSafe("http://100.100.100.200").safe).toBe(false);
  });

  // ── Blocked: Non-HTTP protocols ──
  it("blocks file:// protocol", () => {
    expect(isUrlSafe("file:///etc/passwd").safe).toBe(false);
  });

  it("blocks ftp:// protocol", () => {
    expect(isUrlSafe("ftp://example.com").safe).toBe(false);
  });

  it("blocks gopher:// protocol", () => {
    expect(isUrlSafe("gopher://evil.com").safe).toBe(false);
  });

  // ── Blocked: Embedded credentials ──
  it("blocks URLs with embedded credentials", () => {
    expect(isUrlSafe("http://admin:password@example.com").safe).toBe(false);
  });

  // ── Edge cases ──
  it("rejects invalid URLs", () => {
    expect(isUrlSafe("not-a-url").safe).toBe(false);
    expect(isUrlSafe("").safe).toBe(false);
  });
});

describe("validateTunnelUrl", () => {
  it("accepts valid HTTPS tunnel URLs", () => {
    expect(validateTunnelUrl("https://my-device.ngrok.io").valid).toBe(true);
    expect(validateTunnelUrl("https://tunnel.cloudflare.com").valid).toBe(true);
  });

  it("accepts HTTP tunnel URLs (for development)", () => {
    expect(validateTunnelUrl("http://my-device.example.com").valid).toBe(true);
  });

  it("rejects private IP tunnel URLs", () => {
    expect(validateTunnelUrl("http://192.168.1.1:8080").valid).toBe(false);
    expect(validateTunnelUrl("http://10.0.0.1:3000").valid).toBe(false);
  });

  it("rejects localhost tunnel URLs", () => {
    expect(validateTunnelUrl("http://localhost:8080").valid).toBe(false);
    expect(validateTunnelUrl("http://127.0.0.1:3000").valid).toBe(false);
  });

  it("rejects metadata endpoint tunnel URLs", () => {
    expect(validateTunnelUrl("http://169.254.169.254").valid).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(validateTunnelUrl("not-a-url").valid).toBe(false);
    expect(validateTunnelUrl("").valid).toBe(false);
  });
});
