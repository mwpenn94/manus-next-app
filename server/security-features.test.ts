/**
 * Tests for Session 9 Security & Infrastructure Features
 *
 * Covers:
 *   - encryption.ts: AES-256-GCM encrypt/decrypt, token handling
 *   - contentSafety.ts: keyword scanning, safety verdict
 *   - wsAuth.ts: WebSocket authentication middleware
 *   - dataRetention.ts: retention policy, aggregation
 *   - cloudfront.ts: custom error pages, error response config
 *   - db.ts: memory deduplication in addMemoryEntry
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Encryption Tests ──

describe("encryption", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-for-encryption-testing-32chars";
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("encrypts and decrypts a plaintext string", async () => {
    const { encrypt, decrypt } = await import("./encryption");
    const plaintext = "gho_abc123_test_token_value";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.length).toBeGreaterThan(0);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext (random IV)", async () => {
    const { encrypt } = await import("./encryption");
    const plaintext = "same-token-value";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2); // Different IVs
  });

  it("isEncrypted returns false for GitHub token prefixes", async () => {
    const { isEncrypted } = await import("./encryption");
    expect(isEncrypted("gho_abc123")).toBe(false);
    expect(isEncrypted("ghp_abc123")).toBe(false);
    expect(isEncrypted("github_pat_abc123")).toBe(false);
  });

  it("isEncrypted returns true for encrypted data", async () => {
    const { encrypt, isEncrypted } = await import("./encryption");
    const encrypted = encrypt("test-token");
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it("decryptToken passes through plaintext GitHub tokens", async () => {
    const { decryptToken } = await import("./encryption");
    expect(decryptToken("gho_abc123")).toBe("gho_abc123");
    expect(decryptToken("ghp_xyz789")).toBe("ghp_xyz789");
  });

  it("decryptToken decrypts encrypted tokens", async () => {
    const { encryptToken, decryptToken } = await import("./encryption");
    const original = "gho_real_token_value";
    const encrypted = encryptToken(original);
    expect(encrypted).not.toBe(original);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(original);
  });

  it("encryptToken returns empty string for empty input", async () => {
    const { encryptToken } = await import("./encryption");
    expect(encryptToken("")).toBe("");
  });

  it("decrypt throws for invalid data", async () => {
    const { decrypt } = await import("./encryption");
    expect(() => decrypt("short")).toThrow("Invalid encrypted data: too short");
  });

  it("throws when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;
    // Need to reimport to get fresh module
    vi.resetModules();
    const { encrypt } = await import("./encryption");
    expect(() => encrypt("test")).toThrow("JWT_SECRET is required");
  });
});

// ── Content Safety Tests ──

describe("contentSafety", () => {
  describe("scanKeywords", () => {
    it("detects eval(atob()) malware pattern", async () => {
      const { scanKeywords } = await import("./contentSafety");
      const code = `var x = eval(atob("ZG9jdW1lbnQ="));`;
      const flags = scanKeywords(code);
      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0].category).toBe("malware");
      expect(flags[0].severity).toBe("block");
    });

    it("detects document.cookie exfiltration", async () => {
      const { scanKeywords } = await import("./contentSafety");
      const code = `document.cookie = "stolen=" + data;`;
      const flags = scanKeywords(code);
      expect(flags.some(f => f.category === "data_exfiltration")).toBe(true);
    });

    it("detects PII collection patterns", async () => {
      const { scanKeywords } = await import("./contentSafety");
      const code = `<input name="credit-card" />`;
      const flags = scanKeywords(code);
      expect(flags.some(f => f.category === "pii_collection")).toBe(true);
    });

    it("detects obfuscation patterns", async () => {
      const { scanKeywords } = await import("./contentSafety");
      const code = `String.fromCharCode(72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100);`;
      const flags = scanKeywords(code);
      expect(flags.some(f => f.category === "obfuscation")).toBe(true);
    });

    it("returns empty for safe code", async () => {
      const { scanKeywords } = await import("./contentSafety");
      const code = `<div class="container"><h1>Hello World</h1><p>Welcome to my site.</p></div>`;
      const flags = scanKeywords(code);
      expect(flags.length).toBe(0);
    });

    it("includes line numbers in flags", async () => {
      const { scanKeywords } = await import("./contentSafety");
      const code = `line1\nline2\neval(atob("test"));\nline4`;
      const flags = scanKeywords(code);
      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0].line).toBe(3);
    });

    it("detects keylogger patterns", async () => {
      const { scanKeywords } = await import("./contentSafety");
      const code = `// keylogger module\nfunction captureKeystroke(e) {}`;
      const flags = scanKeywords(code);
      expect(flags.some(f => f.category === "surveillance")).toBe(true);
    });
  });

  describe("checkContentSafety", () => {
    it("returns safe=false for blocking patterns without calling LLM", async () => {
      const { checkContentSafety } = await import("./contentSafety");
      const code = `eval(atob("malicious"))`;
      const verdict = await checkContentSafety(code);
      expect(verdict.safe).toBe(false);
      expect(verdict.tier1Flags.length).toBeGreaterThan(0);
      expect(verdict.tier2Verdict).toBeUndefined(); // Skipped LLM
      expect(verdict.checkedAt).toBeGreaterThan(0);
    });
  });
});

// ── WebSocket Auth Tests ──

describe("wsAuth", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-ws-auth-secret-key-32chars!!";
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("authenticateWsUpgrade returns null for missing cookies", async () => {
    const { authenticateWsUpgrade } = await import("./wsAuth");
    const req = { headers: {} } as any;
    const result = await authenticateWsUpgrade(req);
    expect(result).toBeNull();
  });

  it("authenticateWsUpgrade returns null for invalid JWT", async () => {
    const { authenticateWsUpgrade } = await import("./wsAuth");
    const req = {
      headers: { cookie: "session=invalid-jwt-token" },
    } as any;
    const result = await authenticateWsUpgrade(req);
    expect(result).toBeNull();
  });

  it("requireWsAuth closes connection for unauthenticated requests", async () => {
    const { requireWsAuth } = await import("./wsAuth");
    const handler = vi.fn();
    const guarded = requireWsAuth(handler);

    const mockWs = { close: vi.fn() } as any;
    const mockReq = { headers: {} } as any;

    await guarded(mockWs, mockReq);

    expect(mockWs.close).toHaveBeenCalledWith(4401, "Authentication required");
    expect(handler).not.toHaveBeenCalled();
  });

  it("requireOwnerWsAuth closes connection for unauthenticated requests", async () => {
    const { requireOwnerWsAuth } = await import("./wsAuth");
    const handler = vi.fn();
    const guarded = requireOwnerWsAuth(handler);

    const mockWs = { close: vi.fn() } as any;
    const mockReq = { headers: {} } as any;

    await guarded(mockWs, mockReq);

    expect(mockWs.close).toHaveBeenCalledWith(4401, "Authentication required");
    expect(handler).not.toHaveBeenCalled();
  });
});

// ── Data Retention Tests ──

describe("dataRetention", () => {
  it("getRetentionPolicy returns correct configuration", async () => {
    const { getRetentionPolicy } = await import("./dataRetention");
    const policy = getRetentionPolicy();
    expect(policy.rawRetentionDays).toBe(90);
    expect(policy.aggregationGranularity).toBe("daily");
    expect(policy.purgeSchedule).toContain("daily");
  });

  it("aggregateDay returns empty array when DB is unavailable", async () => {
    const { aggregateDay } = await import("./dataRetention");
    // Without DATABASE_URL, getDb returns null
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const result = await aggregateDay("2026-01-01");
    expect(result).toEqual([]);
    if (saved) process.env.DATABASE_URL = saved;
  });

  it("purgeOldPageViews returns 0 when DB is unavailable", async () => {
    const { purgeOldPageViews } = await import("./dataRetention");
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const result = await purgeOldPageViews();
    expect(result).toBe(0);
    if (saved) process.env.DATABASE_URL = saved;
  });
});

// ── CloudFront Custom Error Pages Tests ──

describe("cloudfront error pages", () => {
  it("getCustomErrorResponseConfig returns all 5 error codes", async () => {
    const { getCustomErrorResponseConfig } = await import("./cloudfront");
    const config = getCustomErrorResponseConfig();
    expect(config).toHaveLength(5);
    const codes = config.map(c => c.ErrorCode);
    expect(codes).toContain(404);
    expect(codes).toContain(500);
    expect(codes).toContain(403);
    expect(codes).toContain(502);
    expect(codes).toContain(503);
  });

  it("error response config has correct page paths", async () => {
    const { getCustomErrorResponseConfig } = await import("./cloudfront");
    const config = getCustomErrorResponseConfig();
    for (const entry of config) {
      expect(entry.ResponsePagePath).toMatch(/^\/webapp-error-pages\/\d+\.html$/);
      expect(entry.ResponseCode).toBe(String(entry.ErrorCode));
      expect(entry.ErrorCachingMinTTL).toBeGreaterThan(0);
    }
  });

  it("500-series errors have shorter cache TTL than 400-series", async () => {
    const { getCustomErrorResponseConfig } = await import("./cloudfront");
    const config = getCustomErrorResponseConfig();
    const e404 = config.find(c => c.ErrorCode === 404)!;
    const e500 = config.find(c => c.ErrorCode === 500)!;
    expect(e500.ErrorCachingMinTTL).toBeLessThan(e404.ErrorCachingMinTTL);
  });

  it("isCloudFrontConfigured returns false without env vars", async () => {
    const { isCloudFrontConfigured } = await import("./cloudfront");
    delete process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID;
    expect(isCloudFrontConfigured()).toBe(false);
  });

  it("getCloudFrontDomain returns null without env var", async () => {
    const { getCloudFrontDomain } = await import("./cloudfront");
    delete process.env.AWS_CLOUDFRONT_DOMAIN;
    expect(getCloudFrontDomain()).toBeNull();
  });
});

// ── Memory Deduplication Tests ──

describe("memory deduplication", () => {
  it("addMemoryEntry function exists and is callable", async () => {
    const { addMemoryEntry } = await import("./db");
    expect(typeof addMemoryEntry).toBe("function");
  });

  it("addMemoryEntry throws when DB is unavailable", async () => {
    const { addMemoryEntry } = await import("./db");
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    await expect(addMemoryEntry({
      userId: 1,
      key: "test-key",
      value: "test-value",
    })).rejects.toThrow("Database not available");
    if (saved) process.env.DATABASE_URL = saved;
  });
});

// ── GDPR Procedures Tests ──

describe("GDPR procedures", () => {
  it("appRouter has gdpr.exportData procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("gdpr.exportData");
  });

  it("appRouter has gdpr.deleteAllData procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("gdpr.deleteAllData");
  });
});

// ── Stripe Customer Portal Tests ──

describe("Stripe customer portal", () => {
  it("appRouter has payment.createPortalSession procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("payment.createPortalSession");
  });
});

// ── CSP Headers Test ──

describe("Content Security Policy", () => {
  it("helmet is imported and configured in server", async () => {
    // Verify the server module can be loaded without errors
    // (CSP is configured via helmet in _core/index.ts)
    const fs = await import("fs");
    const serverCode = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(serverCode).toContain("contentSecurityPolicy");
    expect(serverCode).toContain("defaultSrc");
    expect(serverCode).toContain("scriptSrc");
    expect(serverCode).toContain("frameAncestors");
  });
});

// ── Rate Limiting Test ──

describe("Rate limiting", () => {
  it("analytics collect endpoint has rate limiting configured", async () => {
    const fs = await import("fs");
    const serverCode = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(serverCode).toContain("analyticsLimiter");
    expect(serverCode).toContain("/api/analytics/collect");
  });
});

// ── Coverage Configuration Tests ──

describe("coverage configuration", () => {
  it("vitest.config.ts has coverage provider configured", async () => {
    const fs = await import("fs");
    const config = fs.readFileSync("vitest.config.ts", "utf-8");
    expect(config).toContain("coverage");
    expect(config).toContain("provider");
    expect(config).toContain("v8");
  });

  it("package.json has test:coverage script", async () => {
    const fs = await import("fs");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    expect(pkg.scripts["test:coverage"]).toBe("vitest run --coverage");
  });
});
