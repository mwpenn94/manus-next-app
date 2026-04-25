import { readRouterSource } from "./test-utils/readRouterSource";
/**
 * P19 Tests — Platform Hardening + UX Enhancements
 *
 * Covers:
 * - P19-1: Scheduler table migration (DB schema)
 * - P19-2: Knowledge base file upload improvements (drag-drop, bulk import, auto-categorize)
 * - P19-3: Task history search and filtering (date range, status, full-text)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const CLIENT_SRC = path.join(ROOT, "client", "src");

// ── P19-1: Scheduler table ──

describe("P19-1: Scheduler table", () => {
  it("scheduledTasks table exists in schema", () => {
    const schema = fs.readFileSync(path.join(ROOT, "drizzle", "schema.ts"), "utf-8");
    expect(schema).toContain("scheduledTasks");
    expect(schema).toContain("mysqlTable");
  });

  it("getDueScheduledTasks function exists in db.ts", () => {
    const db = fs.readFileSync(path.join(ROOT, "server", "db.ts"), "utf-8");
    expect(db).toContain("getDueScheduledTasks");
  });

  it("scheduler.ts has poll loop with error suppression", () => {
    const scheduler = fs.readFileSync(path.join(ROOT, "server", "scheduler.ts"), "utf-8");
    expect(scheduler).toContain("Poll error");
    expect(scheduler).toContain("suppressing repeats");
  });
});

// ── P19-2: Knowledge base file upload improvements ──

describe("P19-2: Knowledge base file upload", () => {
  const memoryPage = fs.readFileSync(path.join(CLIENT_SRC, "pages", "MemoryPage.tsx"), "utf-8");

  it("MemoryPage has drag-and-drop zone", () => {
    expect(memoryPage).toContain("onDragOver");
    expect(memoryPage).toContain("onDrop");
    expect(memoryPage).toContain("onDragLeave");
  });

  it("MemoryPage supports multi-file upload", () => {
    // Should accept multiple files
    expect(memoryPage).toContain("multiple");
    // Should have file input
    expect(memoryPage).toContain('type="file"');
  });

  it("MemoryPage shows upload progress", () => {
    // Should track uploading state
    expect(memoryPage).toMatch(/uploading|isUploading|uploadProgress/i);
  });

  it("MemoryPage has auto-categorization logic", () => {
    // Should detect file types and assign categories
    expect(memoryPage).toMatch(/categoriz|category|fileType|mime/i);
  });

  it("memory.bulkAdd procedure exists in routers", () => {
    const routers = readRouterSource();
    expect(routers).toContain("bulkAdd");
  });

  it("MemoryPage has accepted file types", () => {
    // Should define accepted file extensions
    expect(memoryPage).toMatch(/\.txt|\.md|\.pdf|\.json|\.csv/);
  });
});

// ── P19-3: Task history search and filtering ──

describe("P19-3: Task history search and filtering", () => {
  const layoutSrc = fs.readFileSync(path.join(__dirname, "../client/src/components/AppLayout.tsx"), "utf8");

  it("AppLayout has status filter state", () => {
    expect(layoutSrc).toContain("statusFilter");
  });

  it("AppLayout has filter toggle button", () => {
    expect(layoutSrc).toContain("Filter");
    expect(layoutSrc).toContain("onStatusFilterChange");
  });

  it("AppLayout has AllTasksSection with filtering", () => {
    expect(layoutSrc).toContain("AllTasksSection");
    expect(layoutSrc).toContain("statusFilter");
  });

  it("AppLayout has filter options", () => {
    expect(layoutSrc).toContain('"running"');
    expect(layoutSrc).toContain('"completed"');
    expect(layoutSrc).toContain('"error"');
    expect(layoutSrc).toContain('"favorites"');
  });

  it("AppLayout has clear filter mechanism", () => {
    expect(layoutSrc).toContain('"all"');
  });

  it("AppLayout passes status filter to AllTasksSection", () => {
    expect(layoutSrc).toContain("statusFilter={statusFilter}");
    expect(layoutSrc).toContain("onStatusFilterChange={setStatusFilter}");
  });
});

// ── P19 Integration: Settings crash fix still works ──

describe("P19: Settings crash fix regression check", () => {
  it("SettingsPage merges server data with defaults", () => {
    const settings = fs.readFileSync(path.join(CLIENT_SRC, "pages", "SettingsPage.tsx"), "utf-8");
    expect(settings).toContain("DEFAULT_GENERAL");
    expect(settings).toContain("...DEFAULT_GENERAL");
  });

  it("ttsRate has defensive fallback", () => {
    const settings = fs.readFileSync(path.join(CLIENT_SRC, "pages", "SettingsPage.tsx"), "utf-8");
    // Should have a fallback for ttsRate.toFixed
    expect(settings).toMatch(/ttsRate.*\?\?|ttsRate.*\|\||DEFAULT_GENERAL.*ttsRate/);
  });
});

// ── P19: Offline mode still works ──

describe("P19: Offline mode regression check", () => {
  it("SettingsPage has offlineMode toggle", () => {
    const settings = fs.readFileSync(path.join(CLIENT_SRC, "pages", "SettingsPage.tsx"), "utf-8");
    expect(settings).toContain("offlineMode");
  });

  it("NetworkBanner handles offline mode", () => {
    const banner = fs.readFileSync(path.join(CLIENT_SRC, "components", "NetworkBanner.tsx"), "utf-8");
    expect(banner).toContain("offlineMode");
  });
});
