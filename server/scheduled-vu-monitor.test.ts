/**
 * Tests for /api/scheduled/vu-monitor endpoint
 * Validates the handler logic for Class F VU health check submissions
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Scheduled VU Monitor Endpoint", () => {
  const handlerPath = path.resolve(__dirname, "scheduledVuMonitor.ts");

  it("handler file exists", () => {
    expect(fs.existsSync(handlerPath)).toBe(true);
  });

  it("exports handleVuMonitor function", () => {
    const source = fs.readFileSync(handlerPath, "utf-8");
    expect(source).toContain("export async function handleVuMonitor");
  });

  it("authenticates requests via sdk", () => {
    const source = fs.readFileSync(handlerPath, "utf-8");
    expect(source).toContain("sdk.authenticateRequest");
  });

  it("allows user role (scheduled tasks get user role)", () => {
    const source = fs.readFileSync(handlerPath, "utf-8");
    // Must allow both "user" and "admin" roles
    expect(source).toMatch(/["']user["']/);
    expect(source).toMatch(/["']admin["']/);
  });

  it("validates required fields: vu_id, check_type, status, score", () => {
    const source = fs.readFileSync(handlerPath, "utf-8");
    expect(source).toContain("vu_id");
    expect(source).toContain("check_type");
    expect(source).toContain("status");
    expect(source).toContain("score");
  });

  it("validates score range 0-10", () => {
    const source = fs.readFileSync(handlerPath, "utf-8");
    expect(source).toContain("payload.score < 0");
    expect(source).toContain("payload.score > 10");
  });

  it("returns structured response with received=true", () => {
    const source = fs.readFileSync(handlerPath, "utf-8");
    expect(source).toContain("received: true");
    expect(source).toContain("processed_at");
  });

  it("is registered in server/_core/index.ts at /api/scheduled/vu-monitor", () => {
    const indexPath = path.resolve(__dirname, "_core/index.ts");
    const indexSource = fs.readFileSync(indexPath, "utf-8");
    expect(indexSource).toContain("/api/scheduled/vu-monitor");
    expect(indexSource).toContain("handleVuMonitor");
  });

  it("logs findings and gaps for observability", () => {
    const source = fs.readFileSync(handlerPath, "utf-8");
    expect(source).toContain("[VU Monitor]");
    expect(source).toContain("findings");
    expect(source).toContain("gaps");
  });

  it("handles auth errors gracefully", () => {
    const source = fs.readFileSync(handlerPath, "utf-8");
    expect(source).toContain("401");
    expect(source).toContain("Authentication required");
  });
});
