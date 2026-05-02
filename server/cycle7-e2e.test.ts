/**
 * Cycle 7 E2E Tests — Route All Pages + Sidebar Navigation
 * Updated Pass 50: Aligned with current architecture (28 routes, 12 grid items)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const APP_TSX = fs.readFileSync(
  path.join(__dirname, "../client/src/App.tsx"),
  "utf-8"
);

const LAYOUT_TSX = fs.readFileSync(
  path.join(__dirname, "../client/src/components/AppLayout.tsx"),
  "utf-8"
);

describe("Cycle 7 Phase A: All Pages Routed", () => {
  const requiredRoutes = [
    { path: "/", component: "Home" },
    { path: "/task/:id", component: "TaskView" },
    { path: "/billing", component: "BillingPage" },
    { path: "/settings", component: "SettingsPage" },
    { path: "/memory", component: "MemoryPage" },
    { path: "/schedule", component: "SchedulePage" },
    { path: "/replay", component: "ReplayPage" },
    { path: "/replay/:taskId", component: "ReplayPage" },
    { path: "/projects", component: "ProjectsPage" },
    { path: "/projects/webapp/:projectId", component: "WebAppProjectPage" },
    { path: "/project/:id", component: "ProjectsPage" },
    { path: "/library", component: "Library" },
    { path: "/github", component: "GitHubPage" },
    { path: "/github/:repoId", component: "GitHubPage" },
    { path: "/profile", component: "ProfilePage" },
    { path: "/share/:token", component: "SharedTaskView" },
    { path: "/shared/:token", component: "SharedTaskView" },
    { path: "/connectors", component: "ConnectorsPage" },
    { path: "/connector/:id", component: "ConnectorDetailPage" },
    { path: "/skills", component: "SkillsPage" },
    { path: "/team", component: "TeamPage" },
    { path: "/webhooks", component: "WebhooksPage" },
    { path: "/discover", component: "DiscoverPage" },
    { path: "/help", component: "HelpPage" },
    { path: "/deployed-websites", component: "DeployedWebsitesPage" },
    { path: "/design/:id", component: "DesignView" },
    { path: "/data-controls", component: "DataControlsPage" },
  ];

  for (const route of requiredRoutes) {
    it(`Route "${route.path}" exists for ${route.component}`, () => {
      expect(APP_TSX).toContain(`path="${route.path}"`);
    });
  }

  it("All lazy-loaded pages have lazy() imports", () => {
    const lazyPages = [
      "BillingPage", "SettingsPage", "MemoryPage", "SchedulePage",
      "ReplayPage", "ProjectsPage", "WebAppProjectPage", "Library",
      "GitHubPage", "ProfilePage", "SharedTaskView", "ConnectorsPage",
      "ConnectorDetailPage", "SkillsPage", "TeamPage", "WebhooksPage",
      "DiscoverPage", "HelpPage", "DeployedWebsitesPage", "DesignView",
      "DataControlsPage",
    ];
    for (const page of lazyPages) {
      expect(APP_TSX).toContain(`lazy(() => import("./pages/${page}"))`);
    }
  });

  it("SuspenseRoute wrapper is used", () => {
    expect(APP_TSX).toContain("SuspenseRoute");
    expect(APP_TSX).toContain("function SuspenseRoute");
  });

  it("NotFound route is catch-all", () => {
    const lines = APP_TSX.split("\n");
    const switchEnd = lines.findIndex(l => l.includes("</Switch>"));
    const notFoundLine = lines.findIndex(l => l.includes("component={NotFound}") && !l.includes('path="/404"'));
    expect(notFoundLine).toBeLessThan(switchEnd);
    expect(notFoundLine).toBeGreaterThan(0);
  });
});

describe("Cycle 7 Phase A: Page Components Exist", () => {
  const pageFiles = [
    "ConnectorsPage", "SkillsPage", "TeamPage",
    "WebhooksPage", "DeployedWebsitesPage",
    "DesignView", "DiscoverPage", "DataControlsPage",
    "ConnectorDetailPage", "HelpPage",
  ];

  for (const page of pageFiles) {
    it(`${page}.tsx exists and has default export`, () => {
      const filePath = path.join(__dirname, `../client/src/pages/${page}.tsx`);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toMatch(/export\s+default\s+function/);
    });
  }
});

describe("Cycle 7 Phase B: Sidebar Navigation", () => {
  it("Has SidebarProjectTree component", () => {
    expect(LAYOUT_TSX).toContain("function SidebarProjectTree");
  });

  it("Has AllTasksSection component", () => {
    expect(LAYOUT_TSX).toContain("function AllTasksSection");
  });

  it("Has AppsGridMenu for tools", () => {
    expect(LAYOUT_TSX).toContain("function AppsGridMenu");
  });

  it("Has ChevronDown/ChevronRight for collapse", () => {
    expect(LAYOUT_TSX).toContain("ChevronDown");
    expect(LAYOUT_TSX).toContain("ChevronRight");
  });

  it("Auto-expands section on active route", () => {
    expect(LAYOUT_TSX).toContain("hasActiveChild");
    expect(LAYOUT_TSX).toContain("expanded");
  });

  const appsGridItems = [
    { href: "/projects", label: "Projects" },
    { href: "/library", label: "Library" },
    { href: "/skills", label: "Skills" },
    { href: "/schedule", label: "Schedule" },
    { href: "/connectors", label: "Connectors" },
    { href: "/memory", label: "Memory" },
    { href: "/billing", label: "Billing" },
    { href: "/help", label: "Help" },
  ];

  for (const item of appsGridItems) {
    it(`Sidebar has "${item.label}" at ${item.href}`, () => {
      expect(LAYOUT_TSX).toContain(`href: "${item.href}"`);
      expect(LAYOUT_TSX).toContain(`label: "${item.label}"`);
    });
  }
});

describe("Cycle 7 Phase B: Icon Imports", () => {
  const requiredIcons = [
    "LayoutGrid", "FolderOpen", "ChevronDown", "ChevronRight",
    "MoreHorizontal", "Share2", "Pencil", "ExternalLink",
    "BookOpen", "Filter", "Star", "Trash2",
  ];

  for (const icon of requiredIcons) {
    it(`Icon "${icon}" is imported`, () => {
      expect(LAYOUT_TSX).toContain(icon);
    });
  }
});

describe("Cycle 7 Phase C: Integration Checks", () => {
  it("No duplicate route paths", () => {
    const routeMatches = APP_TSX.match(/path="([^"]+)"/g) || [];
    const paths = routeMatches.map(m => m.replace('path="', '').replace('"', ''));
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const p of paths) {
      if (seen.has(p)) duplicates.push(p);
      seen.add(p);
    }
    expect(duplicates).toEqual([]);
  });

  it("All lazy imports reference existing files", () => {
    const lazyMatches = APP_TSX.match(/lazy\(\(\) => import\("\.\/pages\/([^"]+)"\)\)/g) || [];
    for (const match of lazyMatches) {
      const pageName = match.match(/pages\/([^"]+)/)?.[1];
      if (pageName) {
        const filePath = path.join(__dirname, `../client/src/pages/${pageName}.tsx`);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    }
  });

  it("SidebarProjectTree is used in AppLayout", () => {
    expect(LAYOUT_TSX).toContain("<SidebarProjectTree");
  });

  it("Total route count is 25+", () => {
    const routeMatches = APP_TSX.match(/path="/g) || [];
    expect(routeMatches.length).toBeGreaterThanOrEqual(25);
  });

  it("Total AppsGridMenu items count is 10+", () => {
    const hrefMatches = LAYOUT_TSX.match(/href: "\/[^"]*"/g) || [];
    expect(hrefMatches.length).toBeGreaterThanOrEqual(10);
  });
});

describe("Cycle 7 Regression: Existing Routes Preserved", () => {
  const existingRoutes = [
    "/", "/task/:id", "/billing", "/settings",
    "/memory", "/schedule", "/replay", "/replay/:taskId",
    "/projects", "/projects/webapp/:projectId", "/project/:id",
    "/library", "/github", "/github/:repoId", "/share/:token",
    "/profile",
  ];

  for (const route of existingRoutes) {
    it(`Existing route "${route}" is preserved`, () => {
      expect(APP_TSX).toContain(`path="${route}"`);
    });
  }

  it("Home page is eagerly loaded", () => {
    expect(APP_TSX).toContain('import Home from "./pages/Home"');
  });

  it("ErrorBoundary wraps the app", () => {
    expect(APP_TSX).toContain("<ErrorBoundary>");
  });

  it("ThemeProvider wraps the app", () => {
    expect(APP_TSX).toContain("<ThemeProvider");
  });

  it("BridgeProvider wraps the app", () => {
    expect(APP_TSX).toContain("<BridgeProvider>");
  });

  it("TaskProvider wraps the app", () => {
    expect(APP_TSX).toContain("<TaskProvider>");
  });
});
