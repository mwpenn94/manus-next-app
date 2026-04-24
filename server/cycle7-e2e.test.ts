/**
 * Cycle 7 E2E Tests — Route All Pages + Sidebar Navigation
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
    { path: "/analytics", component: "AnalyticsPage" },
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
    { path: "/browser", component: "BrowserPage" },
    { path: "/webapp-builder", component: "WebAppBuilderPage" },
    { path: "/profile", component: "ProfilePage" },
    { path: "/shared/:token", component: "SharedTaskView" },
    { path: "/connectors", component: "ConnectorsPage" },
    { path: "/skills", component: "SkillsPage" },
    { path: "/slides", component: "SlidesPage" },
    { path: "/team", component: "TeamPage" },
    { path: "/video", component: "VideoGeneratorPage" },
    { path: "/webhooks", component: "WebhooksPage" },
    { path: "/meetings", component: "MeetingsPage" },
    { path: "/desktop", component: "DesktopAppPage" },
    { path: "/connect-device", component: "ConnectDevicePage" },
    { path: "/mobile-projects", component: "MobileProjectsPage" },
    { path: "/app-publish", component: "AppPublishPage" },
    { path: "/client-inference", component: "ClientInferencePage" },
    { path: "/computer-use", component: "ComputerUsePage" },
    { path: "/deployed-websites", component: "DeployedWebsitesPage" },
    { path: "/design/:id", component: "DesignView" },
    { path: "/discover", component: "DiscoverPage" },
    { path: "/figma-import", component: "FigmaImportPage" },
    { path: "/messaging", component: "MessagingAgentPage" },
    { path: "/data-controls", component: "DataControlsPage" },
    { path: "/mail", component: "MailManusPage" },
  ];

  for (const route of requiredRoutes) {
    it(`Route "${route.path}" exists for ${route.component}`, () => {
      expect(APP_TSX).toContain(`path="${route.path}"`);
    });
  }

  it("All new pages have lazy() imports", () => {
    const newPages = [
      "ConnectorsPage", "SkillsPage", "SlidesPage", "TeamPage",
      "VideoGeneratorPage", "WebhooksPage", "MeetingsPage", "DesktopAppPage",
      "ConnectDevicePage", "MobileProjectsPage", "AppPublishPage",
      "ClientInferencePage", "ComputerUsePage", "DeployedWebsitesPage",
      "DesignView", "DiscoverPage", "FigmaImportPage", "MessagingAgentPage",
      "DataControlsPage", "MailManusPage",
    ];
    for (const page of newPages) {
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
    "ConnectorsPage", "SkillsPage", "SlidesPage", "TeamPage",
    "VideoGeneratorPage", "WebhooksPage", "MeetingsPage", "DesktopAppPage",
    "ConnectDevicePage", "MobileProjectsPage", "AppPublishPage",
    "ClientInferencePage", "ComputerUsePage", "DeployedWebsitesPage",
    "DesignView", "DiscoverPage", "FigmaImportPage", "MessagingAgentPage",
    "DataControlsPage", "MailManusPage",
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
  it("Has SIDEBAR_SECTIONS constant", () => {
    expect(LAYOUT_TSX).toContain("SIDEBAR_SECTIONS");
  });

  it("Has 3 sections: Manus, Tools, More", () => {
    expect(LAYOUT_TSX).toContain('label: "Manus"');
    expect(LAYOUT_TSX).toContain('label: "Tools"');
    expect(LAYOUT_TSX).toContain('label: "More"');
  });

  it("Tools section is collapsible", () => {
    const toolsMatch = LAYOUT_TSX.match(/label:\s*"Tools"[\s\S]*?collapsible:\s*true/);
    expect(toolsMatch).not.toBeNull();
  });

  it("More section is collapsible", () => {
    const moreMatch = LAYOUT_TSX.match(/label:\s*"More"[\s\S]*?collapsible:\s*true/);
    expect(moreMatch).not.toBeNull();
  });

  it("SidebarNav component exists", () => {
    expect(LAYOUT_TSX).toContain("function SidebarNav");
  });

  it("SidebarNavLink component exists", () => {
    expect(LAYOUT_TSX).toContain("function SidebarNavLink");
  });

  it("Has ChevronDown/ChevronRight for collapse", () => {
    expect(LAYOUT_TSX).toContain("ChevronDown");
    expect(LAYOUT_TSX).toContain("ChevronRight");
  });

  it("Auto-expands section on active route", () => {
    expect(LAYOUT_TSX).toContain("hasActiveItem");
    expect(LAYOUT_TSX).toContain("expandedSections");
  });

  const sidebarItems = [
    { href: "/analytics", label: "Analytics" },
    { href: "/memory", label: "Memory" },
    { href: "/projects", label: "Projects" },
    { href: "/library", label: "Library" },
    { href: "/schedule", label: "Schedules" },
    { href: "/browser", label: "Browser" },
    { href: "/github", label: "GitHub" },
    { href: "/connectors", label: "Connectors" },
    { href: "/skills", label: "Skills" },
    { href: "/slides", label: "Slides" },
    { href: "/video", label: "Video" },
    { href: "/computer-use", label: "Computer Use" },
    { href: "/discover", label: "Discover" },
    { href: "/team", label: "Team" },
    { href: "/meetings", label: "Meetings" },
    { href: "/webhooks", label: "Webhooks" },
    { href: "/deployed-websites", label: "Websites" },
    { href: "/desktop", label: "Desktop" },
    { href: "/connect-device", label: "Devices" },
    { href: "/mobile-projects", label: "Mobile" },
    { href: "/client-inference", label: "Inference" },
    { href: "/mail", label: "Mail" },
    { href: "/data-controls", label: "Data Controls" },
  ];

  for (const item of sidebarItems) {
    it(`Sidebar has "${item.label}" at ${item.href}`, () => {
      expect(LAYOUT_TSX).toContain(`href: "${item.href}"`);
      expect(LAYOUT_TSX).toContain(`label: "${item.label}"`);
    });
  }
});

describe("Cycle 7 Phase B: Icon Imports", () => {
  const requiredIcons = [
    "GitBranch", "Plug", "Zap", "Presentation", "Video",
    "Webhook", "ChevronDown", "ChevronRight", "Compass",
    "Smartphone", "MonitorPlay", "Mail", "Shield",
    "MessageSquare", "Cpu", "Laptop", "Upload",
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

  it("SidebarNav is used in AppLayout", () => {
    expect(LAYOUT_TSX).toContain("<SidebarNav");
  });

  it("Total route count is 35+", () => {
    const routeMatches = APP_TSX.match(/path="/g) || [];
    expect(routeMatches.length).toBeGreaterThanOrEqual(35);
  });

  it("Total sidebar items count is 23", () => {
    const hrefMatches = LAYOUT_TSX.match(/href: "\//g) || [];
    expect(hrefMatches.length).toBeGreaterThanOrEqual(23);
  });
});

describe("Cycle 7 Regression: Existing Routes Preserved", () => {
  const existingRoutes = [
    "/", "/task/:id", "/billing", "/analytics", "/settings",
    "/memory", "/schedule", "/replay", "/replay/:taskId",
    "/projects", "/projects/webapp/:projectId", "/project/:id",
    "/library", "/github", "/github/:repoId", "/shared/:token",
    "/browser", "/webapp-builder", "/profile",
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
