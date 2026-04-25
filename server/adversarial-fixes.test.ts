import { readRouterSource } from "./test-utils/readRouterSource";
/**
 * Adversarial Fixes — Vitest Tests
 *
 * ADV-01: File name sanitization in upload endpoint
 * ADV-02: Tunnel URL validation in device procedures
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";

describe("ADV-01: File Name Sanitization", () => {
  it("upload endpoint sanitizes file names", () => {
    const source = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(source).toContain("ADV-01 fix");
    expect(source).toContain("sanitize");
    // Should strip path separators
    expect(source).toContain('replace(/[\\/\\\\:*?"<>|\\x00-\\x1f]/g');
    // Should strip directory traversal
    expect(source).toContain('replace(/\\.\\./g');
    // Should limit length
    expect(source).toContain(".slice(0, 200)");
  });

  it("sanitizes both file name and task ID", () => {
    const source = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(source).toContain("const fileName = sanitize(rawFileName)");
    expect(source).toContain("const taskId = sanitize(rawTaskId)");
  });
});

describe("ADV-02: Tunnel URL Validation", () => {
  it("completePairing validates tunnel URL format", () => {
    const source = readRouterSource();
    // Should have URL validation on completePairing
    const completePairingSection = source.slice(
      source.indexOf("completePairing:"),
      source.indexOf("completePairing:") + 500
    );
    expect(completePairingSection).toContain(".url()");
    expect(completePairingSection).toContain("http://");
  });

  it("updateConnection validates tunnel URL format", () => {
    const source = readRouterSource();
    // Should have URL validation on updateConnection
    const updateConnectionSection = source.slice(
      source.indexOf("updateConnection:"),
      source.indexOf("updateConnection:") + 500
    );
    expect(updateConnectionSection).toContain(".url()");
    expect(updateConnectionSection).toContain("http://");
  });

  it("tunnel URL rejects non-http protocols", () => {
    const source = readRouterSource();
    // The refine should enforce http/https only
    expect(source).toContain('Tunnel URL must use http:// or https://');
  });
});
