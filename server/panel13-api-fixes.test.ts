import { readRouterSource } from "./test-utils/readRouterSource";
import { describe, expect, it } from "vitest";
import * as fs from "fs";

/**
 * Panel 13: API Contract Audit Fix Verification
 * Validates input constraints, ownership checks, and origin validation
 */

describe("Panel 13: Input length constraints", () => {
  const routerCode = readRouterSource();

  it("skill.install has max length on all string inputs", () => {
    const installStart = routerCode.indexOf("install: protectedProcedure");
    const installBlock = routerCode.slice(installStart, installStart + 500);
    expect(installBlock).toContain("skillId: z.string().min(1).max(128)");
    expect(installBlock).toContain("name: z.string().min(1).max(256)");
    expect(installBlock).toContain("description: z.string().max(2000)");
    expect(installBlock).toContain("category: z.string().max(128)");
  });

  it("connector.connect has max length on all string inputs", () => {
    const connectStart = routerCode.indexOf("connect: protectedProcedure");
    const connectBlock = routerCode.slice(connectStart, connectStart + 500);
    expect(connectBlock).toContain("connectorId: z.string().min(1).max(128)");
    expect(connectBlock).toContain("name: z.string().min(1).max(256)");
  });

  it("connector.disconnect has max length on connectorId", () => {
    const disconnectStart = routerCode.indexOf("disconnect: protectedProcedure");
    const disconnectBlock = routerCode.slice(disconnectStart, disconnectStart + 300);
    expect(disconnectBlock).toContain("connectorId: z.string().min(1).max(128)");
  });

  it("connector.execute has max length on string inputs", () => {
    // Find the execute after connector.disconnect
    const disconnectStart = routerCode.indexOf("disconnect: protectedProcedure");
    const executeStart = routerCode.indexOf("execute: protectedProcedure", disconnectStart);
    const executeBlock = routerCode.slice(executeStart, executeStart + 500);
    expect(executeBlock).toContain("connectorId: z.string().min(1).max(128)");
    expect(executeBlock).toContain("action: z.string().min(1).max(256)");
  });

  it("library.artifacts has max length on search and type", () => {
    const artifactsStart = routerCode.indexOf("library: router");
    const artifactsBlock = routerCode.slice(artifactsStart, artifactsStart + 500);
    expect(artifactsBlock).toContain("type: z.string().max(64)");
    expect(artifactsBlock).toContain("search: z.string().max(256)");
  });

  it("library.extractPdfFromUpload has base64 size limit", () => {
    const pdfStart = routerCode.indexOf("extractPdfFromUpload: protectedProcedure");
    const pdfBlock = routerCode.slice(pdfStart, pdfStart + 300);
    expect(pdfBlock).toContain("base64: z.string().max(41_943_040)");
    expect(pdfBlock).toContain("fileName: z.string().max(512)");
  });
});

describe("Panel 13: Ownership checks (IDOR prevention)", () => {
  const routerCode = readRouterSource();

  it("design.get checks userId ownership", () => {
    const getStart = routerCode.indexOf("design: router");
    const getBlock = routerCode.slice(getStart, getStart + 500);
    expect(getBlock).toContain("design.userId !== ctx.user.id");
  });

  it("design.update checks userId ownership before updating", () => {
    const updateStart = routerCode.indexOf("design: router");
    const routerBlock = routerCode.slice(updateStart, updateStart + 2000);
    // Find the update mutation
    const updatePos = routerBlock.indexOf("update: protectedProcedure");
    const updateBlock = routerBlock.slice(updatePos, updatePos + 500);
    expect(updateBlock).toContain("design.userId !== ctx.user.id");
    expect(updateBlock).toContain("FORBIDDEN");
  });

  it("design.export checks userId ownership before exporting", () => {
    const designStart = routerCode.indexOf("design: router");
    const routerBlock = routerCode.slice(designStart, designStart + 3000);
    const exportPos = routerBlock.indexOf("export: protectedProcedure");
    const exportBlock = routerBlock.slice(exportPos, exportPos + 500);
    expect(exportBlock).toContain("design.userId !== ctx.user.id");
    expect(exportBlock).toContain("FORBIDDEN");
  });

  it("device.endSession verifies session belongs to user", () => {
    const endSessionStart = routerCode.indexOf("endSession: protectedProcedure");
    const endSessionBlock = routerCode.slice(endSessionStart, endSessionStart + 500);
    expect(endSessionBlock).toContain("getUserDeviceSessions(ctx.user.id)");
    expect(endSessionBlock).toContain("FORBIDDEN");
  });
});

describe("Panel 13: Procedure existence verification", () => {
  it("all key procedures exist on appRouter", async () => {
    const { appRouter } = await import("./routers");
    const procedures = appRouter._def.procedures;

    // Verify key procedures exist
    const requiredProcedures = [
      "skill.install", "skill.uninstall", "skill.toggle", "skill.execute",
      "connector.connect", "connector.disconnect", "connector.execute", "connector.test",
      "design.get", "design.create", "design.update", "design.delete", "design.export",
      "device.endSession",
      "library.artifacts", "library.files", "library.extractPdfText", "library.extractPdfFromUpload",
      "gdpr.exportData", "gdpr.deleteAllData",
    ];

    for (const proc of requiredProcedures) {
      expect(procedures).toHaveProperty(proc);
    }
  });
});
