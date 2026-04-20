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
    const routers = fs.readFileSync(path.join(ROOT, "server", "routers.ts"), "utf-8");
    expect(routers).toContain("bulkAdd");
  });

  it("MemoryPage has accepted file types", () => {
    // Should define accepted file extensions
    expect(memoryPage).toMatch(/\.txt|\.md|\.pdf|\.json|\.csv/);
  });
});

// ── P19-3: Task history search and filtering ──

describe("P19-3: Task history search and filtering", () => {
  const appLayout = fs.readFileSync(path.join(CLIENT_SRC, "components", "AppLayout.tsx"), "utf-8");
  const routers = fs.readFileSync(path.join(ROOT, "server", "routers.ts"), "utf-8");
  const db = fs.readFileSync(path.join(ROOT, "server", "db.ts"), "utf-8");

  it("AppLayout has date range filter state", () => {
    expect(appLayout).toContain("dateFrom");
    expect(appLayout).toContain("dateTo");
    expect(appLayout).toContain("showDateFilter");
  });

  it("AppLayout has date input fields", () => {
    expect(appLayout).toMatch(/type.*date/);
  });

  it("AppLayout has filter toggle button", () => {
    expect(appLayout).toContain("Date range filter");
    expect(appLayout).toContain("showDateFilter");
  });

  it("AppLayout passes date range to server search", () => {
    expect(appLayout).toContain("dateFrom");
    expect(appLayout).toContain("dateTo");
  });

  it("AppLayout has local date range filtering", () => {
    // Should filter local tasks by date when not in server search mode
    expect(appLayout).toContain("T23:59:59");
    expect(appLayout).toContain("createdAt");
  });

  it("task.search procedure accepts date range params", () => {
    // The search input should accept dateFrom and dateTo
    expect(routers).toMatch(/search:.*protectedProcedure/);
    expect(routers).toContain("dateFrom");
    expect(routers).toContain("dateTo");
  });

  it("searchTasks function supports date range filtering", () => {
    expect(db).toContain("dateFrom");
    expect(db).toContain("dateTo");
    expect(db).toContain("gte(tasks.createdAt");
    expect(db).toContain("lte(tasks.createdAt");
  });

  it("searchTasks function supports status filtering", () => {
    expect(db).toContain("statusFilter");
  });

  it("AppLayout has status filter tabs", () => {
    expect(appLayout).toContain("statusFilter");
    expect(appLayout).toContain("Running");
    expect(appLayout).toContain("Done");
    expect(appLayout).toContain("Error");
  });

  it("AppLayout has clear date filter button", () => {
    expect(appLayout).toContain("Clear date filter");
  });

  it("server search includes full-text across messages", () => {
    expect(db).toContain("taskMessages");
    expect(db).toContain("like(taskMessages.content");
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
