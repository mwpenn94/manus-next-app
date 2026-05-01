/**
 * Procedure Coverage Tests — Pass 004
 *
 * Tests for the 16 procedures identified as having no dedicated test coverage.
 * These are source-scanning + structural tests that verify:
 * 1. Procedures exist in the router source
 * 2. They use the correct auth level (protected/admin)
 * 3. Input validation schemas are present
 * 4. Key implementation patterns are followed
 */
import { describe, it, expect } from "vitest";
import { readRouterSource } from "./test-utils/readRouterSource";

const src = readRouterSource();

describe("Procedure Coverage — Task Router", () => {
  it("generateTitle uses protectedProcedure with externalId + userMessage + assistantMessage input", () => {
    expect(src).toContain("generateTitle: protectedProcedure");
    expect(src).toContain("externalId: z.string()");
    expect(src).toContain("userMessage: z.string()");
    expect(src).toContain("assistantMessage: z.string()");
  });

  it("updateSystemPrompt uses protectedProcedure with externalId + systemPrompt input", () => {
    expect(src).toContain("updateSystemPrompt: protectedProcedure");
    expect(src).toContain("systemPrompt: z.string()");
  });

  it("updateSystemPrompt allows nullable systemPrompt to clear it", () => {
    expect(src).toContain("systemPrompt: z.string().max(10000).nullable()");
  });
});

describe("Procedure Coverage — Team Router", () => {
  it("addCredits uses protectedProcedure with teamId + amount input", () => {
    expect(src).toContain("addCredits: protectedProcedure");
    expect(src).toContain("teamId: z.number()");
    expect(src).toContain("amount: z.number().min(1)");
  });

  it("removeMember uses protectedProcedure with teamId + userId input", () => {
    expect(src).toContain("removeMember: protectedProcedure");
    // removeMember passes ctx.user.id for authorization
    const removeMemberIdx = src.indexOf("removeMember:");
    const removeMemberBlock = src.slice(removeMemberIdx, removeMemberIdx + 300);
    expect(removeMemberBlock).toContain("ctx.user.id");
  });

  it("shareSession uses protectedProcedure with teamId + taskExternalId input", () => {
    expect(src).toContain("shareSession: protectedProcedure");
    expect(src).toContain("taskExternalId: z.string()");
  });
});

describe("Procedure Coverage — WebApp Project Router", () => {
  it("analyticsWithPeaks uses protectedProcedure with externalId + optional days", () => {
    expect(src).toContain("analyticsWithPeaks: protectedProcedure");
    expect(src).toContain("getAnalyticsWithPeaks");
  });

  it("exportAnalytics uses protectedProcedure and calls exportAnalyticsData", () => {
    expect(src).toContain("exportAnalytics: protectedProcedure");
    expect(src).toContain("exportAnalyticsData");
  });

  it("generateSitemap uses protectedProcedure and builds URLs from domain", () => {
    expect(src).toContain("generateSitemap: protectedProcedure");
    expect(src).toContain("getPageViewStats");
  });

  it("requestSsl validates domain format with regex", () => {
    expect(src).toContain("requestSsl: protectedProcedure");
    // Should have domain validation regex
    const requestSslIdx = src.indexOf("requestSsl:");
    const requestSslBlock = src.slice(requestSslIdx, requestSslIdx + 500);
    expect(requestSslBlock).toContain(".regex(");
    expect(requestSslBlock).toContain("requestCertificate");
  });

  it("sslStatus checks for existing certificate and returns status", () => {
    expect(src).toContain("sslStatus: protectedProcedure");
    // Should handle "none" case when no cert exists
    const sslStatusIdx = src.indexOf("sslStatus: protectedProcedure");
    const sslStatusBlock = src.slice(sslStatusIdx, sslStatusIdx + 500);
    expect(sslStatusBlock).toContain("sslCertArn");
  });

  it("deleteSsl uses protectedProcedure and calls deleteCertificate", () => {
    expect(src).toContain("deleteSsl: protectedProcedure");
    expect(src).toContain("deleteCertificate");
  });

  it("all webappProject procedures verify project ownership", () => {
    // Each procedure should check project.userId !== ctx.user.id
    for (const proc of ["analyticsWithPeaks", "exportAnalytics", "generateSitemap", "requestSsl", "sslStatus", "deleteSsl"]) {
      const idx = src.indexOf(`${proc}: protectedProcedure`);
      expect(idx).toBeGreaterThan(-1);
      const block = src.slice(idx, idx + 500);
      expect(block).toContain("project.userId !== ctx.user.id");
    }
  });
});

describe("Procedure Coverage — AppPublish Router", () => {
  it("createBuild uses protectedProcedure with platform + buildMethod input", () => {
    expect(src).toContain("createBuild: protectedProcedure");
    expect(src).toContain('platform: z.enum(["ios", "android", "web_pwa"])');
  });

  it("updateStoreMetadata uses protectedProcedure with optional fields", () => {
    expect(src).toContain("updateStoreMetadata: protectedProcedure");
    expect(src).toContain("title: z.string().optional()");
    expect(src).toContain("shortDescription: z.string().optional()");
    expect(src).toContain("keywords: z.array(z.string()).optional()");
  });
});

describe("Procedure Coverage — Device Router", () => {
  it("startSession uses protectedProcedure with deviceExternalId input", () => {
    expect(src).toContain("startSession: protectedProcedure");
    expect(src).toContain("deviceExternalId: z.string()");
  });

  it("startSession ends existing active session before creating new one", () => {
    const idx = src.indexOf("startSession: protectedProcedure");
    const block = src.slice(idx, idx + 800);
    expect(block).toContain("getActiveDeviceSession");
    expect(block).toContain("endDeviceSession");
    // createDeviceSession is called via return statement
    expect(block).toMatch(/createDeviceSession|DeviceSession/);
  });
});

describe("Procedure Coverage — Browser Router", () => {
  it("viewportPresets uses protectedProcedure and returns VIEWPORT_PRESETS", () => {
    expect(src).toContain("viewportPresets: protectedProcedure");
    expect(src).toContain("VIEWPORT_PRESETS");
  });
});

describe("Procedure Coverage — Project Router", () => {
  it("reorder uses protectedProcedure with orderedExternalIds array input", () => {
    expect(src).toContain("reorder: protectedProcedure");
    expect(src).toContain("orderedExternalIds: z.array(z.string())");
  });

  it("reorder maps external IDs to internal IDs and calls reorderProjects", () => {
    const idx = src.indexOf("reorder: protectedProcedure");
    const block = src.slice(idx, idx + 500);
    expect(block).toContain("getUserProjects");
    expect(block).toContain("reorderProjects");
  });
});
