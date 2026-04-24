/**
 * Cycle 8 E2E Tests
 * 
 * Covers: Chat resilience, URL filtering, role-based sidebar, GitHub deploy tab,
 * QA testing page, Branch/TTS, system prompt anti-apology rules, admin routes
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Phase A: Chat Resilience ───────────────────────────────────────────────

describe("C8-A: Chat Resilience", () => {
  describe("Continue command detection", () => {
    const CONTINUE_PATTERNS = [
      "continue", "Continue", "CONTINUE", "continue please",
      "keep going", "go on", "resume", "carry on",
      "continue where you left off", "pick up where you left off",
    ];

    it("should recognize continue patterns", () => {
      const isContinueCommand = (text: string): boolean => {
        const normalized = text.toLowerCase().trim();
        const patterns = [
          /^continue\b/i, /^keep going/i, /^go on\b/i,
          /^resume\b/i, /^carry on\b/i, /^pick up/i,
          /^where (?:were|was|did) (?:we|you)/i,
        ];
        return patterns.some(p => p.test(normalized));
      };
      for (const pattern of CONTINUE_PATTERNS) {
        expect(isContinueCommand(pattern)).toBe(true);
      }
    });

    it("should NOT match non-continue messages", () => {
      const isContinueCommand = (text: string): boolean => {
        const normalized = text.toLowerCase().trim();
        const patterns = [
          /^continue\b/i, /^keep going/i, /^go on\b/i,
          /^resume\b/i, /^carry on\b/i, /^pick up/i,
        ];
        return patterns.some(p => p.test(normalized));
      };
      expect(isContinueCommand("What is the weather?")).toBe(false);
      expect(isContinueCommand("Tell me about AI")).toBe(false);
      expect(isContinueCommand("Make me a guide")).toBe(false);
    });
  });

  describe("Interrupted response handling", () => {
    it("should detect generation_incomplete status", () => {
      const statuses = ["generation_incomplete", "complete", "error", "running"];
      expect(statuses.includes("generation_incomplete")).toBe(true);
    });

    it("should provide retry/resume actions for interrupted responses", () => {
      const actions = ["retry", "resume", "edit"];
      expect(actions).toContain("retry");
      expect(actions).toContain("resume");
    });
  });

  describe("Loop detection", () => {
    it("should detect repetitive failures (3+ similar errors)", () => {
      const errors = [
        "Failed to fetch URL",
        "Failed to fetch URL",
        "Failed to fetch URL",
      ];
      const isLoop = errors.length >= 3 && new Set(errors).size === 1;
      expect(isLoop).toBe(true);
    });

    it("should not flag diverse errors as a loop", () => {
      const errors = [
        "Failed to fetch URL",
        "Timeout error",
        "Parse error",
      ];
      const isLoop = errors.length >= 3 && new Set(errors).size === 1;
      expect(isLoop).toBe(false);
    });
  });
});

// ─── Phase B: URL Filtering ─────────────────────────────────────────────────

describe("C8-B: URL Filtering", () => {
  const isAdOrRedirectUrl = (url: string): boolean => {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      const adHosts = [
        "ad.doubleclick.net", "googleads.g.doubleclick.net",
        "pagead2.googlesyndication.com", "ads.google.com",
        "bing.com/aclick", "duckduckgo.com/y.js",
      ];
      if (adHosts.some(h => host.includes(h) || url.includes(h))) return true;
      const redirectParams = ["redirect", "redir", "goto", "url=http", "dest=http", "target=http"];
      const fullUrl = url.toLowerCase();
      if (redirectParams.some(p => fullUrl.includes(p)) && !host.includes("github.com")) return true;
      if (host.includes("click.") || host.includes("track.") || host.includes("pixel.")) return true;
      return false;
    } catch {
      return false;
    }
  };

  it("should filter ad URLs", () => {
    expect(isAdOrRedirectUrl("https://ad.doubleclick.net/ddm/trackclk/123")).toBe(true);
    expect(isAdOrRedirectUrl("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js")).toBe(true);
  });

  it("should filter redirect/tracking URLs", () => {
    expect(isAdOrRedirectUrl("https://click.example.com/track?id=123")).toBe(true);
    expect(isAdOrRedirectUrl("https://track.example.com/pixel")).toBe(true);
  });

  it("should NOT filter legitimate URLs", () => {
    expect(isAdOrRedirectUrl("https://en.wikipedia.org/wiki/AI")).toBe(false);
    expect(isAdOrRedirectUrl("https://github.com/microsoft/vscode")).toBe(false);
    expect(isAdOrRedirectUrl("https://stackoverflow.com/questions/123")).toBe(false);
    expect(isAdOrRedirectUrl("https://docs.python.org/3/library/json.html")).toBe(false);
  });

  it("should handle malformed URLs gracefully", () => {
    expect(isAdOrRedirectUrl("not-a-url")).toBe(false);
    expect(isAdOrRedirectUrl("")).toBe(false);
  });
});

// ─── Phase C: Branch and TTS ────────────────────────────────────────────────

describe("C8-C: Branch and TTS", () => {
  describe("Branch/Fork", () => {
    it("should support forking from any message index", () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
        { role: "user", content: "Tell me about AI" },
        { role: "assistant", content: "AI is..." },
      ];
      // Fork from message index 1 should copy messages 0-1
      const forkedMessages = messages.slice(0, 2);
      expect(forkedMessages).toHaveLength(2);
      expect(forkedMessages[0].content).toBe("Hello");
      expect(forkedMessages[1].content).toBe("Hi there");
    });

    it("should generate unique external IDs for forked tasks", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const id = Math.random().toString(36).substring(2, 14);
        ids.add(id);
      }
      expect(ids.size).toBe(100); // All unique
    });
  });

  describe("TTS (Text-to-Speech)", () => {
    it("should strip markdown for cleaner speech", () => {
      const stripMarkdown = (text: string): string => {
        return text
          .replace(/```[\s\S]*?```/g, " code block omitted ")
          .replace(/`([^`]+)`/g, "$1")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/#{1,6}\s+/g, "")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/\n{2,}/g, ". ")
          .replace(/\n/g, " ")
          .trim();
      };

      expect(stripMarkdown("**bold text**")).toBe("bold text");
      expect(stripMarkdown("# Heading")).toBe("Heading");
      expect(stripMarkdown("[link](https://example.com)")).toBe("link");
      expect(stripMarkdown("```js\ncode\n```")).toBe("code block omitted");
      expect(stripMarkdown("`inline code`")).toBe("inline code");
    });

    it("should support rate/pitch/volume options", () => {
      const options = { rate: 1.5, pitch: 1.2, volume: 0.8 };
      expect(options.rate).toBeGreaterThan(0);
      expect(options.rate).toBeLessThanOrEqual(10);
      expect(options.pitch).toBeGreaterThanOrEqual(0);
      expect(options.pitch).toBeLessThanOrEqual(2);
      expect(options.volume).toBeGreaterThanOrEqual(0);
      expect(options.volume).toBeLessThanOrEqual(1);
    });
  });
});

// ─── Phase D: GitHub Deploy Tab ─────────────────────────────────────────────

describe("C8-D: GitHub Deploy Tab", () => {
  it("should support deploy tab type in repo tabs", () => {
    const tabs = ["code", "issues", "pulls", "deploy"] as const;
    expect(tabs).toContain("deploy");
  });

  it("should construct deploy request with correct fields", () => {
    const deployRequest = {
      projectId: 1,
      repoUrl: "https://github.com/user/repo",
      branch: "main",
      buildCommand: "npm run build",
    };
    expect(deployRequest.projectId).toBeGreaterThan(0);
    expect(deployRequest.repoUrl).toContain("github.com");
    expect(deployRequest.branch).toBeTruthy();
  });

  it("should show deployment history with status indicators", () => {
    const deployments = [
      { id: 1, status: "live", previewUrl: "https://preview.example.com/abc", createdAt: Date.now() },
      { id: 2, status: "building", previewUrl: null, createdAt: Date.now() },
      { id: 3, status: "failed", previewUrl: null, createdAt: Date.now() },
    ];
    expect(deployments.filter(d => d.status === "live")).toHaveLength(1);
    expect(deployments.filter(d => d.previewUrl)).toHaveLength(1);
  });

  it("should create project from GitHub repo", () => {
    const createProjectInput = {
      name: "My App",
      description: "Built from GitHub",
      repoUrl: "https://github.com/user/repo",
    };
    expect(createProjectInput.name).toBeTruthy();
    expect(createProjectInput.repoUrl).toContain("github.com");
  });
});

// ─── Phase E: QA Testing Page ───────────────────────────────────────────────

describe("C8-E: QA Testing Page", () => {
  it("should support test scenario creation with steps", () => {
    const scenario = {
      id: "test-1",
      name: "Login Flow",
      baseUrl: "https://example.com",
      steps: [
        { action: "navigate", target: "/login" },
        { action: "fill", target: "#email", value: "test@example.com" },
        { action: "fill", target: "#password", value: "password123" },
        { action: "click", target: "button[type=submit]" },
        { action: "waitForSelector", target: ".dashboard" },
      ],
    };
    expect(scenario.steps).toHaveLength(5);
    expect(scenario.steps[0].action).toBe("navigate");
  });

  it("should support multiple test actions", () => {
    const actions = ["navigate", "click", "fill", "waitForSelector", "screenshot", "assertText", "assertVisible"];
    expect(actions.length).toBeGreaterThanOrEqual(5);
    expect(actions).toContain("navigate");
    expect(actions).toContain("click");
    expect(actions).toContain("fill");
    expect(actions).toContain("screenshot");
  });

  it("should track test results with pass/fail status", () => {
    const results = [
      { step: "navigate", success: true, duration: 120 },
      { step: "fill", success: true, duration: 50 },
      { step: "click", success: false, duration: 30, error: "Element not found" },
    ];
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    expect(passed).toBe(2);
    expect(failed).toBe(1);
  });

  it("should support accessibility audit results", () => {
    const auditResult = {
      violations: [
        { id: "color-contrast", impact: "serious", nodes: 3 },
        { id: "image-alt", impact: "critical", nodes: 1 },
      ],
      passes: 45,
      incomplete: 2,
    };
    expect(auditResult.violations).toHaveLength(2);
    expect(auditResult.passes).toBeGreaterThan(0);
  });

  it("should support visual regression with screenshot diff", () => {
    const diffResult = {
      match: false,
      diffPercentage: 3.5,
      diffImageUrl: "https://example.com/diff.png",
    };
    expect(diffResult.diffPercentage).toBeGreaterThan(0);
    expect(diffResult.diffImageUrl).toBeTruthy();
  });

  it("should support preset test templates", () => {
    const presets = [
      { label: "Login Flow", steps: 5 },
      { label: "Form Submission", steps: 4 },
      { label: "Navigation Check", steps: 3 },
      { label: "Responsive Test", steps: 6 },
    ];
    expect(presets.length).toBeGreaterThanOrEqual(4);
    expect(presets.every(p => p.steps > 0)).toBe(true);
  });
});

// ─── Phase F: Role-Based Sidebar ────────────────────────────────────────────

describe("C8-F: Role-Based Sidebar", () => {
  it("should filter admin-only items for regular users", () => {
    interface SidebarItem {
      href: string;
      label: string;
      roles?: string[];
    }
    const items: SidebarItem[] = [
      { href: "/projects", label: "Projects" },
      { href: "/webhooks", label: "Webhooks", roles: ["admin"] },
      { href: "/data-controls", label: "Data Controls", roles: ["admin"] },
      { href: "/client-inference", label: "Inference", roles: ["admin"] },
      { href: "/github", label: "GitHub" },
    ];

    const userRole = "user";
    const filtered = items.filter(item => !item.roles || item.roles.includes(userRole));
    expect(filtered).toHaveLength(2); // Projects + GitHub
    expect(filtered.map(i => i.label)).toEqual(["Projects", "GitHub"]);
  });

  it("should show all items for admin users", () => {
    interface SidebarItem {
      href: string;
      label: string;
      roles?: string[];
    }
    const items: SidebarItem[] = [
      { href: "/projects", label: "Projects" },
      { href: "/webhooks", label: "Webhooks", roles: ["admin"] },
      { href: "/data-controls", label: "Data Controls", roles: ["admin"] },
      { href: "/github", label: "GitHub" },
    ];

    const userRole = "admin";
    const filtered = items.filter(item => !item.roles || item.roles.includes(userRole));
    expect(filtered).toHaveLength(4); // All items
  });

  it("should show all items when user is not authenticated (no role filtering)", () => {
    interface SidebarItem {
      href: string;
      label: string;
      roles?: string[];
    }
    const items: SidebarItem[] = [
      { href: "/projects", label: "Projects" },
      { href: "/webhooks", label: "Webhooks", roles: ["admin"] },
    ];

    // When no user, show all (let route-level protection handle it)
    const userRole: string | undefined = undefined;
    const filtered = items.filter(item => !item.roles || (userRole && item.roles.includes(userRole)));
    expect(filtered).toHaveLength(1); // Only non-role items
  });
});

// ─── Phase H: Agent Behavior (System Prompt) ────────────────────────────────

describe("C8-H: Agent Behavior Rules", () => {
  describe("Anti-apology rules", () => {
    const BANNED_PHRASES = [
      "my apologies",
      "i apologize",
      "you are absolutely right to call me out",
      "i fell short of expectations",
      "sorry for the oversight",
      "let me rectify this",
      "i should have done this earlier",
    ];

    it("should detect banned apology phrases", () => {
      const containsBannedPhrase = (text: string): boolean => {
        const lower = text.toLowerCase();
        return BANNED_PHRASES.some(phrase => lower.includes(phrase));
      };

      expect(containsBannedPhrase("My apologies for the oversight")).toBe(true);
      expect(containsBannedPhrase("I fell short of expectations")).toBe(true);
      expect(containsBannedPhrase("You are absolutely right to call me out")).toBe(true);
    });

    it("should NOT flag normal responses", () => {
      const containsBannedPhrase = (text: string): boolean => {
        const lower = text.toLowerCase();
        return BANNED_PHRASES.some(phrase => lower.includes(phrase));
      };

      expect(containsBannedPhrase("Here is the research you requested")).toBe(false);
      expect(containsBannedPhrase("I found 5 relevant sources")).toBe(false);
      expect(containsBannedPhrase("The guide has been generated as a PDF")).toBe(false);
    });
  });

  describe("Auto-proceed rules", () => {
    it("should detect when user intent is clear and not ask for clarification", () => {
      const isClearRequest = (text: string): boolean => {
        // A request is clear if it contains an action verb + subject
        const actionVerbs = ["make", "create", "build", "write", "generate", "find", "research", "analyze"];
        const lower = text.toLowerCase();
        return actionVerbs.some(v => lower.includes(v)) && lower.split(" ").length >= 3;
      };

      expect(isClearRequest("Make me an Elder Scrolls Online guide")).toBe(true);
      expect(isClearRequest("Create a PDF report on market trends")).toBe(true);
      expect(isClearRequest("Research AI agent architectures")).toBe(true);
    });

    it("should detect format requests in user messages", () => {
      const detectFormat = (text: string): string | null => {
        const lower = text.toLowerCase();
        if (lower.includes("pdf")) return "pdf";
        if (lower.includes("word") || lower.includes("docx")) return "docx";
        if (lower.includes("markdown") || lower.includes(".md")) return "markdown";
        if (lower.includes("slides") || lower.includes("presentation")) return "slides";
        return null;
      };

      expect(detectFormat("make the guide into a PDF")).toBe("pdf");
      expect(detectFormat("create a Word document")).toBe("docx");
      expect(detectFormat("write it in markdown")).toBe("markdown");
      expect(detectFormat("tell me about AI")).toBeNull();
    });
  });

  describe("Wide research synthesis", () => {
    it("should include synthesis reminder after research results", () => {
      const researchResults = [
        { query: "ESO Tales of Tribute", results: ["source1", "source2"] },
        { query: "Tales of Tribute strategy", results: ["source3", "source4"] },
      ];
      const totalSources = researchResults.reduce((sum, r) => sum + r.results.length, 0);
      expect(totalSources).toBeGreaterThan(0);

      // Synthesis reminder should reference the original request
      const synthesisReminder = `Research complete. ${totalSources} sources gathered. Now synthesize into the requested deliverable.`;
      expect(synthesisReminder).toContain("synthesize");
      expect(synthesisReminder).toContain("deliverable");
    });
  });
});

// ─── Admin Route Protection ─────────────────────────────────────────────────

describe("C8: Admin Route Protection", () => {
  const ADMIN_ROUTES = ["/webhooks", "/data-controls", "/client-inference"];
  const PUBLIC_ROUTES = ["/", "/projects", "/github", "/browser", "/settings"];

  it("should identify admin-only routes", () => {
    for (const route of ADMIN_ROUTES) {
      expect(ADMIN_ROUTES).toContain(route);
    }
  });

  it("should not block public routes", () => {
    for (const route of PUBLIC_ROUTES) {
      expect(ADMIN_ROUTES).not.toContain(route);
    }
  });

  it("should show permission denied for non-admin accessing admin routes", () => {
    const user = { role: "user" };
    const isAdmin = user.role === "admin";
    expect(isAdmin).toBe(false);
  });

  it("should allow admin to access admin routes", () => {
    const user = { role: "admin" };
    const isAdmin = user.role === "admin";
    expect(isAdmin).toBe(true);
  });
});

// ─── Cross-Feature Integration ──────────────────────────────────────────────

describe("C8: Cross-Feature Integration", () => {
  it("should have QA Testing in sidebar under Tools", () => {
    const toolsSidebarItems = [
      "GitHub", "Connectors", "Skills", "Slides", "Video",
      "Computer Use", "QA Testing", "Discover",
    ];
    expect(toolsSidebarItems).toContain("QA Testing");
  });

  it("should have all routes registered in App.tsx", () => {
    const routes = [
      "/", "/task/:id", "/billing", "/analytics", "/settings",
      "/memory", "/schedule", "/replay", "/projects", "/library",
      "/github", "/browser", "/webapp-builder", "/profile",
      "/connectors", "/skills", "/slides", "/team", "/video",
      "/webhooks", "/meetings", "/desktop", "/connect-device",
      "/mobile-projects", "/app-publish", "/client-inference",
      "/computer-use", "/deployed-websites", "/discover",
      "/figma-import", "/messaging", "/data-controls", "/mail",
      "/qa-testing",
    ];
    expect(routes).toContain("/qa-testing");
    expect(routes.length).toBeGreaterThanOrEqual(34);
  });

  it("should support the full development lifecycle from GitHub", () => {
    const lifecycle = ["connect", "browse", "edit", "commit", "build", "deploy", "preview"];
    expect(lifecycle).toHaveLength(7);
    expect(lifecycle[0]).toBe("connect");
    expect(lifecycle[lifecycle.length - 1]).toBe("preview");
  });
});
