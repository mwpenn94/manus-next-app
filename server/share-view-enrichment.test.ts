/**
 * Tests for share feature:
 *  - ShareDialog URL uses /share/ (not /shared/)
 *  - share.view returns actions, cardType, cardData in messages
 *  - vite.ts extractShareToken handles both /share/ and /shared/
 *  - share.create returns /share/ URL
 */
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import fs from "fs";

// ── Mock database layer ──
const shares: any[] = [];
let shareIdCounter = 1;

vi.mock("./db", () => {
  const sampleMessages = [
    {
      id: 1,
      taskId: 1,
      externalId: "msg-1",
      role: "user",
      content: "Research AI agent architectures",
      actions: null,
      cardType: null,
      cardData: null,
      createdAt: new Date("2026-04-25T10:00:00Z"),
    },
    {
      id: 2,
      taskId: 1,
      externalId: "msg-2",
      role: "assistant",
      content: "Here is my analysis of AI agent architectures...",
      actions: JSON.stringify([
        { type: "searching", query: "AI agent frameworks 2026", status: "done" },
        { type: "browsing", url: "https://arxiv.org/abs/2026.12345", status: "done" },
        { type: "writing", label: "report", status: "done" },
      ]),
      cardType: null,
      cardData: null,
      createdAt: new Date("2026-04-25T10:01:00Z"),
    },
    {
      id: 3,
      taskId: 1,
      externalId: "msg-3",
      role: "assistant",
      content: "",
      actions: null,
      cardType: "interactive_output",
      cardData: JSON.stringify({
        outputType: "document",
        title: "AI Agent Architecture Report",
        description: "Comprehensive analysis of leading frameworks",
        openUrl: "https://example.com/report.pdf",
      }),
      createdAt: new Date("2026-04-25T10:02:00Z"),
    },
  ];

  return {
    verifyTaskOwnership: vi.fn(async () => ({ id: 1, userId: 1, externalId: "test" })),
    verifyTaskOwnershipById: vi.fn(async () => ({ id: 1, userId: 1, externalId: "test" })),
    verifyKnowledgeOwnership: vi.fn(async () => ({ id: 1, projectId: 1 })),
    getUserTasks: vi.fn(async () => []),
    getTaskByExternalId: vi.fn(async (externalId: string) => {
      if (externalId === "enriched-task") {
        return {
          id: 1,
          externalId: "enriched-task",
          title: "Research AI Agents",
          status: "completed",
          createdAt: new Date("2026-04-25T10:00:00Z"),
        };
      }
      return null;
    }),
    createTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    addTaskMessage: vi.fn(),
    getTaskMessages: vi.fn(async () => sampleMessages),
    getBridgeConfig: vi.fn(async () => null),
    upsertBridgeConfig: vi.fn(),
    createTaskFile: vi.fn(),
    getTaskFiles: vi.fn(async () => []),
    getUserPreferences: vi.fn(async () => null),
    upsertUserPreferences: vi.fn(),
    getUserTaskStats: vi.fn(async () => ({ total: 0, running: 0, completed: 0, error: 0 })),
    archiveTask: vi.fn(),
    toggleTaskFavorite: vi.fn(),
    updateTaskSystemPrompt: vi.fn(),
    searchTasks: vi.fn(async () => []),
    addWorkspaceArtifact: vi.fn(),
    getWorkspaceArtifacts: vi.fn(async () => []),
    getLatestArtifactByType: vi.fn(async () => null),
    getUserMemories: vi.fn(async () => []),
    addMemoryEntry: vi.fn(),
    deleteMemoryEntry: vi.fn(),
    searchMemories: vi.fn(async () => []),
    createTaskShare: vi.fn(async (data: any) => {
      const share = { id: shareIdCounter++, ...data, viewCount: 0, createdAt: new Date() };
      shares.push(share);
      return share;
    }),
    getTaskShareByToken: vi.fn(async (token: string) => {
      return shares.find((s) => s.shareToken === token) ?? null;
    }),
    getTaskShares: vi.fn(async (taskExternalId: string, userId: number) => {
      return shares.filter((s) => s.taskExternalId === taskExternalId && s.userId === userId);
    }),
    incrementShareViewCount: vi.fn(async (token: string) => {
      const share = shares.find((s) => s.shareToken === token);
      if (share) share.viewCount++;
    }),
    deleteTaskShare: vi.fn(async (id: number, userId: number) => {
      const idx = shares.findIndex((s) => s.id === id && s.userId === userId);
      if (idx >= 0) shares.splice(idx, 1);
    }),
    getUserNotifications: vi.fn(async () => []),
    getUnreadNotificationCount: vi.fn(async () => 0),
    createNotification: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    deleteNotification: vi.fn(),
    createScheduledTask: vi.fn(),
    getUserScheduledTasks: vi.fn(async () => []),
    updateScheduledTask: vi.fn(),
    deleteScheduledTask: vi.fn(),
    getScheduledTaskById: vi.fn(async () => null),
    createTaskEvent: vi.fn(),
    getTaskEvents: vi.fn(async () => []),
    getRecentTaskEvents: vi.fn(async () => []),
    createProject: vi.fn(),
    getUserProjects: vi.fn(async () => []),
    getProjectById: vi.fn(async () => null),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addProjectKnowledge: vi.fn(),
    getProjectKnowledge: vi.fn(async () => []),
    deleteProjectKnowledge: vi.fn(),
    createSkill: vi.fn(),
    getUserSkills: vi.fn(async () => []),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
    createSlideDeck: vi.fn(),
    getUserSlideDecks: vi.fn(async () => []),
    updateSlideDeck: vi.fn(),
    deleteSlideDeck: vi.fn(),
    createConnector: vi.fn(),
    getUserConnectors: vi.fn(async () => []),
    updateConnector: vi.fn(),
    deleteConnector: vi.fn(),
    createMeetingSession: vi.fn(),
    getUserMeetingSessions: vi.fn(async () => []),
    updateMeetingSession: vi.fn(),
    deleteMeetingSession: vi.fn(),
    createTeam: vi.fn(),
    getUserTeams: vi.fn(async () => []),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    addTeamMember: vi.fn(),
    getTeamMembers: vi.fn(async () => []),
    removeTeamMember: vi.fn(),
    createTeamSession: vi.fn(),
    getTeamSessions: vi.fn(async () => []),
    updateTeamSession: vi.fn(),
    createWebappBuild: vi.fn(),
    getUserWebappBuilds: vi.fn(async () => []),
    updateWebappBuild: vi.fn(),
    createDesign: vi.fn(),
    getUserDesigns: vi.fn(async () => []),
    updateDesign: vi.fn(),
    deleteDesign: vi.fn(),
    createConnectedDevice: vi.fn(),
    getUserConnectedDevices: vi.fn(async () => []),
    updateConnectedDevice: vi.fn(),
    deleteConnectedDevice: vi.fn(),
    createDeviceSession: vi.fn(),
    getDeviceSessions: vi.fn(async () => []),
    createMobileProject: vi.fn(),
    getUserMobileProjects: vi.fn(async () => []),
    updateMobileProject: vi.fn(),
    deleteMobileProject: vi.fn(),
    createAppBuild: vi.fn(),
    getAppBuilds: vi.fn(async () => []),
    updateAppBuild: vi.fn(),
    createTaskRating: vi.fn(),
    getTaskRating: vi.fn(async () => null),
    createVideoProject: vi.fn(),
    getUserVideoProjects: vi.fn(async () => []),
    updateVideoProject: vi.fn(),
    deleteVideoProject: vi.fn(),
    createGitHubRepo: vi.fn(),
    getUserGitHubRepos: vi.fn(async () => []),
    getGitHubRepoById: vi.fn(async () => null),
    updateGitHubRepo: vi.fn(),
    deleteGitHubRepo: vi.fn(),
    createWebappProject: vi.fn(),
    getUserWebappProjects: vi.fn(async () => []),
    getWebappProjectById: vi.fn(async () => null),
    updateWebappProject: vi.fn(),
    deleteWebappProject: vi.fn(),
    createWebappDeployment: vi.fn(),
    getWebappDeployments: vi.fn(async () => []),
    updateWebappDeployment: vi.fn(),
    recordPageView: vi.fn(),
    getPageViews: vi.fn(async () => []),
    getPageViewStats: vi.fn(async () => ({ total: 0, unique: 0 })),
    createTaskTemplate: vi.fn(),
    getUserTaskTemplates: vi.fn(async () => []),
    updateTaskTemplate: vi.fn(),
    deleteTaskTemplate: vi.fn(),
    createTaskBranch: vi.fn(),
    getTaskBranches: vi.fn(async () => []),
    updateTaskBranch: vi.fn(),
    deleteTaskBranch: vi.fn(),
    upsertStrategyTelemetry: vi.fn(),
    getStrategyTelemetry: vi.fn(async () => null),
    getDb: vi.fn(async () => null),
    upsertUser: vi.fn(),
    getAegisSessions: vi.fn(async () => []),
    createAegisSession: vi.fn(),
    updateAegisSession: vi.fn(),
    getAegisQualityScores: vi.fn(async () => []),
    createAegisQualityScore: vi.fn(),
    getAegisCache: vi.fn(async () => []),
    upsertAegisCache: vi.fn(),
    getAegisFragments: vi.fn(async () => []),
    createAegisFragment: vi.fn(),
    getAegisLessons: vi.fn(async () => []),
    createAegisLesson: vi.fn(),
    getAegisPatterns: vi.fn(async () => []),
    createAegisPattern: vi.fn(),
    getAtlasGoals: vi.fn(async () => []),
    createAtlasGoal: vi.fn(),
    updateAtlasGoal: vi.fn(),
    getAtlasPlans: vi.fn(async () => []),
    createAtlasPlan: vi.fn(),
    updateAtlasPlan: vi.fn(),
    getAtlasGoalTasks: vi.fn(async () => []),
    createAtlasGoalTask: vi.fn(),
    updateAtlasGoalTask: vi.fn(),
    getSovereignProviders: vi.fn(async () => []),
    createSovereignProvider: vi.fn(),
    updateSovereignProvider: vi.fn(),
    getSovereignRoutingDecisions: vi.fn(async () => []),
    createSovereignRoutingDecision: vi.fn(),
    getSovereignUsageLogs: vi.fn(async () => []),
    createSovereignUsageLog: vi.fn(),
  };
});

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ──

describe("share.create returns /share/ URL (not /shared/)", () => {
  it("creates a share link with /share/ prefix", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.share.create({
      taskExternalId: "enriched-task",
    });

    expect(result.shareToken).toBeDefined();
    expect(result.shareUrl).toContain("/share/");
    expect(result.shareUrl).not.toContain("/shared/");
  });
});

describe("share.view returns enriched messages with actions and cardData", () => {
  it("returns actions, cardType, cardData in message objects", async () => {
    // First create a share
    const authCtx = createAuthContext();
    const authCaller = appRouter.createCaller(authCtx);
    const created = await authCaller.share.create({
      taskExternalId: "enriched-task",
    });

    // Now view it publicly
    const pubCtx = createUnauthContext();
    const pubCaller = appRouter.createCaller(pubCtx);
    const result = await pubCaller.share.view({ shareToken: created.shareToken });

    // Should have task data
    expect(result).toHaveProperty("task");
    expect(result).toHaveProperty("messages");

    if ("messages" in result && Array.isArray(result.messages)) {
      // Should have 3 messages
      expect(result.messages.length).toBe(3);

      // First message (user) — no actions
      const userMsg = result.messages[0];
      expect(userMsg.role).toBe("user");
      expect(userMsg.content).toContain("Research AI agent");

      // Second message (assistant with actions)
      const assistantMsg = result.messages[1];
      expect(assistantMsg.role).toBe("assistant");
      expect(assistantMsg.actions).toBeDefined();

      // Third message (interactive_output card)
      const cardMsg = result.messages[2];
      expect(cardMsg.cardType).toBe("interactive_output");
      expect(cardMsg.cardData).toBeDefined();
    }
  });

  it("returns error for non-existent share token", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.share.view({ shareToken: "does-not-exist-token" });
    expect(result).toHaveProperty("error");
    expect(result.error).toBe("Share not found");
  });
});

describe("ShareDialog.tsx uses /share/ URLs", () => {
  it("has no stale /shared/ references in ShareDialog", () => {
    const content = fs.readFileSync("client/src/components/ShareDialog.tsx", "utf-8");
    // Should use /share/ not /shared/
    const shareRefs = content.match(/\/share\//g) || [];
    const sharedRefs = content.match(/\/shared\//g) || [];
    expect(shareRefs.length).toBeGreaterThan(0);
    expect(sharedRefs.length).toBe(0);
  });
});

describe("vite.ts handles both /share/ and /shared/ routes", () => {
  it("contains extractShareToken function that handles both patterns", () => {
    const content = fs.readFileSync("server/_core/vite.ts", "utf-8");
    expect(content).toContain("extractShareToken");
    // The regex should match both /share/ and /shared/
    expect(content).toMatch(/share\[d\]\?/);
  });

  it("injects meta tags for share pages", () => {
    const content = fs.readFileSync("server/_core/vite.ts", "utf-8");
    expect(content).toContain("injectShareMeta");
    expect(content).toContain("Shared Task");
  });
});

describe("App.tsx registers both /share/ and /shared/ routes", () => {
  it("has both route patterns for SharedTaskView", () => {
    const content = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(content).toContain('path="/share/:token"');
    expect(content).toContain('path="/shared/:token"');
    expect(content).toContain("SharedTaskView");
  });
});

describe("SharedTaskView renders standalone layout", () => {
  it("has sticky header with manus brand", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("sticky top-0");
    expect(content).toContain("manus");
  });

  it("has password gate component with wrong password support", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("PasswordGate");
    expect(content).toContain("password_required");
    expect(content).toContain("WRONG_PASSWORD");
    expect(content).toContain("wrongPassword");
    expect(content).toContain("Incorrect password");
  });

  it("has action steps list with vertical connector", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("ActionStepsList");
    expect(content).toContain("Vertical connector");
  });

  it("has output card for interactive_output messages", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("SharedOutputCard");
    expect(content).toContain("interactive_output");
  });

  it("has bottom CTA to try Manus Next", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("Try Manus Next");
    expect(content).toContain("sticky bottom-0");
  });

  it("has loading skeleton", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("LoadingSkeleton");
    expect(content).toContain("animate-pulse");
  });

  it("uses max-w-[800px] centered container", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("max-w-[800px]");
    expect(content).toContain("mx-auto");
  });

  it("renders user messages right-aligned", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("justify-end");
    expect(content).toContain("bg-foreground text-background");
  });

  it("renders assistant messages with paw avatar", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("🐾");
    expect(content).toContain("Manus");
  });

  it("parses JSON strings for actions and cardData", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("JSON.parse(parsedActions)");
    expect(content).toContain("JSON.parse(parsedCardData)");
  });

  it("uses MessageBubble (not SharedMessage) as component name", () => {
    const content = fs.readFileSync("client/src/pages/SharedTaskView.tsx", "utf-8");
    expect(content).toContain("function MessageBubble");
    expect(content).toContain("<MessageBubble");
    // Should not have a function named SharedMessage (only the interface)
    expect(content).not.toContain("function SharedMessage");
  });
});

describe("robots.txt blocks both /share/ and /shared/", () => {
  it("disallows both share URL patterns", () => {
    const content = fs.readFileSync("client/public/robots.txt", "utf-8");
    expect(content).toContain("Disallow: /share/");
    expect(content).toContain("Disallow: /shared/");
  });
});
