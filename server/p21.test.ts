import { readRouterSource } from "./test-utils/readRouterSource";
/**
 * P21 Tests — Task Export + Notification Center + Dashboard Analytics
 *
 * Covers: Markdown/PDF export in TaskView, NotificationCenter component,
 * analytics backend (getTaskTrends, getTaskPerformance), AnalyticsPage UI,
 * route registration, sidebar nav entry, recharts integration.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), "utf-8");
}

describe("P21-1 — Task Export (Markdown + PDF Print)", () => {
  const taskView = readFile("client/src/pages/TaskView.tsx");

  it("has Export as Markdown button/option", () => {
    expect(taskView).toContain("Export as Markdown");
  });

  it("has Export as PDF (Print) button/option", () => {
    expect(taskView).toMatch(/Export as PDF|Print/);
  });

  it("generates .md file content for Markdown export", () => {
    // Should create a Blob or download with .md extension
    expect(taskView).toMatch(/\.md|text\/markdown|markdown/i);
  });

  it("uses window.print or styled HTML for PDF export", () => {
    expect(taskView).toMatch(/window\.print|print-dialog|print\(\)/);
  });
});

describe("P21-2 — Notification Center", () => {
  const nc = readFile("client/src/components/NotificationCenter.tsx");
  const layout = readFile("client/src/components/AppLayout.tsx");

  it("exports NotificationCenter component", () => {
    expect(nc).toContain("export default function NotificationCenter");
  });

  it("has bell icon for notifications", () => {
    expect(nc).toMatch(/Bell|bell/);
  });

  it("displays unread count badge", () => {
    expect(nc).toMatch(/unread|badge/i);
  });

  it("has mark-read functionality", () => {
    expect(nc).toMatch(/markRead|mark.*read/i);
  });

  it("has mark-all-read functionality", () => {
    expect(nc).toMatch(/markAllRead|mark.*all.*read/i);
  });

  it("polls for notifications (30s interval)", () => {
    expect(nc).toMatch(/refetchInterval|30000|30_000/);
  });

  it("is rendered in AppLayout header", () => {
    expect(layout).toContain("NotificationCenter");
  });
});

describe("P21-3 — Dashboard Analytics Backend", () => {
  const db = readFile("server/db.ts");
  const routers = readRouterSource();

  describe("getTaskTrends function", () => {
    it("is exported from db.ts", () => {
      expect(db).toContain("export async function getTaskTrends");
    });

    it("accepts userId and days parameters", () => {
      expect(db).toMatch(/getTaskTrends\(userId:\s*number,\s*days/);
    });

    it("returns array with date, count, completed, errors fields", () => {
      expect(db).toMatch(/\{\s*date.*count.*completed.*errors/s);
    });

    it("pre-fills all dates in range for continuous chart data", () => {
      expect(db).toMatch(/Pre-fill|pre-fill|byDate\.set/);
    });
  });

  describe("getTaskPerformance function", () => {
    it("is exported from db.ts", () => {
      expect(db).toContain("export async function getTaskPerformance");
    });

    it("returns avgDurationMs, avgMessagesPerTask, completionRate, totalMessages", () => {
      expect(db).toContain("avgDurationMs");
      expect(db).toContain("avgMessagesPerTask");
      expect(db).toContain("completionRate");
      expect(db).toContain("totalMessages");
    });
  });

  describe("tRPC usage router", () => {
    it("imports getTaskTrends from ./db", () => {
      expect(routers).toMatch(/getTaskTrends.*from\s+["']\.\.?\/db["']/s);
    });

    it("imports getTaskPerformance from ./db", () => {
      expect(routers).toMatch(/getTaskPerformance.*from\s+["']\.\.?\/db["']/s);
    });

    it("has usage.taskTrends procedure", () => {
      expect(routers).toContain("taskTrends:");
    });

    it("has usage.performance procedure", () => {
      expect(routers).toContain("performance:");
    });

    it("taskTrends accepts optional days input (7-90)", () => {
      expect(routers).toMatch(/days.*z\.number\(\)\.min\(7\)\.max\(90\)/);
    });
  });
});

describe("P21-3 — Dashboard Analytics Frontend", () => {
  const analytics = readFile("client/src/pages/AnalyticsPage.tsx");
  const appTsx = readFile("client/src/App.tsx");
  const layout = readFile("client/src/components/AppLayout.tsx");

  it("AnalyticsPage.tsx exists", () => {
    expect(existsSync(resolve(root, "client/src/pages/AnalyticsPage.tsx"))).toBe(true);
  });

  it("imports recharts components", () => {
    expect(analytics).toContain("from \"recharts\"");
    expect(analytics).toMatch(/AreaChart|LineChart/);
    expect(analytics).toMatch(/PieChart/);
    expect(analytics).toMatch(/BarChart/);
  });

  it("uses trpc.usage.stats.useQuery()", () => {
    expect(analytics).toContain("trpc.usage.stats.useQuery");
  });

  it("uses trpc.usage.taskTrends.useQuery()", () => {
    expect(analytics).toContain("trpc.usage.taskTrends.useQuery");
  });

  it("uses trpc.usage.performance.useQuery()", () => {
    expect(analytics).toContain("trpc.usage.performance.useQuery");
  });

  it("has day range selector (7, 14, 30, 60, 90)", () => {
    expect(analytics).toContain("[7, 14, 30, 60, 90]");
  });

  it("displays metric cards (Total Tasks, Completion Rate, Avg Duration, Avg Messages)", () => {
    expect(analytics).toContain("Total Tasks");
    expect(analytics).toContain("Completion Rate");
    expect(analytics).toContain("Avg Duration");
    expect(analytics).toContain("Avg Messages");
  });

  it("has Task Activity area chart", () => {
    expect(analytics).toContain("Task Activity");
  });

  it("has Status Breakdown pie chart", () => {
    expect(analytics).toContain("Status Breakdown");
  });

  it("has Daily Breakdown bar chart", () => {
    expect(analytics).toContain("Daily Breakdown");
  });

  it("has loading state with spinner", () => {
    expect(analytics).toContain("Loader2");
    expect(analytics).toContain("animate-spin");
  });

  it("/analytics route is registered in App.tsx", () => {
    expect(appTsx).toContain('path="/analytics"');
    expect(appTsx).toContain("AnalyticsPage");
  });

  it("lazy-loads AnalyticsPage", () => {
    expect(appTsx).toMatch(/lazy\(\(\)\s*=>\s*import\(.*AnalyticsPage/);
  });

  it("Analytics nav entry exists in sidebar", () => {
    const layoutSrc = readFileSync(resolve(root, "client/src/components/AppLayout.tsx"), "utf8");
    // Analytics is now in the AppsGridMenu dropdown
    expect(layoutSrc).toContain("/analytics");
    expect(layoutSrc).toContain("Analytics");
  });
});

describe("P21 — Recharts package installed", () => {
  const pkg = readFile("package.json");

  it("recharts is in dependencies", () => {
    const parsed = JSON.parse(pkg);
    expect(parsed.dependencies).toHaveProperty("recharts");
  });
});
