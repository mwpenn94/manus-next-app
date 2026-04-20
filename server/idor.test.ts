/**
 * IDOR (Insecure Direct Object Reference) regression tests.
 *
 * These tests verify that ownership checks are enforced on every
 * procedure that accesses resources by ID/externalId. A second user
 * (the "attacker") must NOT be able to read or mutate resources
 * belonging to the first user (the "owner").
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock database layer with real ownership semantics ──

const tasks: any[] = [];
const messages: any[] = [];
const taskFiles: any[] = [];
const artifacts: any[] = [];
const events: any[] = [];
let idCounter = 1;

vi.mock("./db", () => {
  return {
    // ── Ownership verification (real logic) ──
    verifyTaskOwnership: vi.fn(async (externalId: string, userId: number) => {
      const task = tasks.find((t) => t.externalId === externalId);
      if (!task || task.userId !== userId) throw new Error("Task not found or unauthorized");
      return task;
    }),
    verifyTaskOwnershipById: vi.fn(async (taskId: number, userId: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.userId !== userId) throw new Error("Task not found or unauthorized");
      return task;
    }),
    verifyKnowledgeOwnership: vi.fn(async (_id: number, userId: number) => {
      if (userId !== 100) throw new Error("Knowledge item not found or unauthorized");
      return { id: 1, projectId: 1 };
    }),

    // ── Task CRUD ──
    createTask: vi.fn(async (data: any) => {
      const task = {
        id: idCounter++,
        ...data,
        status: "idle",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tasks.push(task);
      return task;
    }),
    getUserTasks: vi.fn(async (userId: number) => tasks.filter((t) => t.userId === userId)),
    getTaskByExternalId: vi.fn(async (externalId: string) => tasks.find((t) => t.externalId === externalId) ?? null),
    updateTaskStatus: vi.fn(async (externalId: string, status: string) => {
      const task = tasks.find((t) => t.externalId === externalId);
      if (task) task.status = status;
    }),
    archiveTask: vi.fn(),
    toggleTaskFavorite: vi.fn(),
    updateTaskSystemPrompt: vi.fn(),
    searchTasks: vi.fn(async () => []),

    // ── Messages ──
    addTaskMessage: vi.fn(async (data: any) => {
      const msg = { id: idCounter++, ...data };
      messages.push(msg);
      return msg;
    }),
    getTaskMessages: vi.fn(async (taskId: number) => messages.filter((m) => m.taskId === taskId)),

    // ── Files ──
    createTaskFile: vi.fn(async (data: any) => {
      const f = { id: idCounter++, ...data, createdAt: new Date() };
      taskFiles.push(f);
      return f;
    }),
    getTaskFiles: vi.fn(async (externalId: string) => taskFiles.filter((f) => f.taskExternalId === externalId)),

    // ── Workspace artifacts ──
    addWorkspaceArtifact: vi.fn(async (data: any) => {
      const a = { id: idCounter++, ...data, createdAt: Date.now() };
      artifacts.push(a);
      return a;
    }),
    getWorkspaceArtifacts: vi.fn(async (taskId: number, type?: string) =>
      artifacts.filter((a) => a.taskId === taskId && (!type || a.artifactType === type))
    ),
    getLatestArtifactByType: vi.fn(async (taskId: number, type: string) => {
      const matching = artifacts.filter((a) => a.taskId === taskId && a.artifactType === type);
      return matching.length > 0 ? matching[matching.length - 1] : null;
    }),

    // ── Replay events ──
    addTaskEvent: vi.fn(async (data: any) => {
      const e = { id: idCounter++, ...data };
      events.push(e);
      return e;
    }),
    getTaskEvents: vi.fn(async (taskId: number) => events.filter((e) => e.taskId === taskId)),

    // ── Task ratings ──
    upsertTaskRating: vi.fn(async () => ({ id: 1, rating: 5 })),
    getTaskRating: vi.fn(async () => null),

    // ── Stubs for other routers (not under test) ──
    getBridgeConfig: vi.fn(async () => null),
    upsertBridgeConfig: vi.fn(),
    getUserPreferences: vi.fn(async () => undefined),
    upsertUserPreferences: vi.fn(),
    getUserTaskStats: vi.fn(async () => ({ totalTasks: 0, completedTasks: 0, totalMessages: 0 })),
    getUserMemories: vi.fn(async () => []),
    addMemoryEntry: vi.fn(),
    deleteMemoryEntry: vi.fn(),
    searchMemories: vi.fn(async () => []),
    createTaskShare: vi.fn(),
    getTaskShareByToken: vi.fn(async () => null),
    getTaskShares: vi.fn(async () => []),
    incrementShareViewCount: vi.fn(),
    deleteTaskShare: vi.fn(),
    getUserNotifications: vi.fn(async () => []),
    getUnreadNotificationCount: vi.fn(async () => 0),
    createNotification: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    createScheduledTask: vi.fn(),
    getUserScheduledTasks: vi.fn(async () => []),
    updateScheduledTask: vi.fn(),
    deleteScheduledTask: vi.fn(),
    toggleScheduledTask: vi.fn(),
    createProject: vi.fn(),
    getUserProjects: vi.fn(async () => []),
    getProjectByExternalId: vi.fn(async () => null),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    getProjectTasks: vi.fn(async () => []),
    assignTaskToProject: vi.fn(),
    addProjectKnowledge: vi.fn(),
    getProjectKnowledgeItems: vi.fn(async () => []),
    deleteProjectKnowledge: vi.fn(),
    getUserSkills: vi.fn(async () => []),
    installSkill: vi.fn(),
    uninstallSkill: vi.fn(),
    toggleSkill: vi.fn(),
    getUserSlideDecks: vi.fn(async () => []),
    createSlideDeck: vi.fn(),
    updateSlideDeck: vi.fn(),
    getSlideDeck: vi.fn(async () => null),
    getUserConnectors: vi.fn(async () => []),
    upsertConnector: vi.fn(),
    disconnectConnector: vi.fn(),
    getUserMeetingSessions: vi.fn(async () => []),
    createMeetingSession: vi.fn(),
    updateMeetingSession: vi.fn(),
    getMeetingSession: vi.fn(async () => null),
    createTeam: vi.fn(),
    getUserTeams: vi.fn(async () => []),
    getTeamById: vi.fn(async () => null),
    getTeamByInviteCode: vi.fn(async () => null),
    getTeamMembers: vi.fn(async () => []),
    joinTeam: vi.fn(),
    removeTeamMember: vi.fn(),
    updateTeamCredits: vi.fn(),
    createTeamSession: vi.fn(),
    getTeamSessions: vi.fn(async () => []),
    createWebappBuild: vi.fn(),
    updateWebappBuild: vi.fn(),
    getUserWebappBuilds: vi.fn(async () => []),
    getWebappBuild: vi.fn(async () => null),
    createDesign: vi.fn(),
    updateDesign: vi.fn(),
    getUserDesigns: vi.fn(async () => []),
    getDesign: vi.fn(async () => null),
    deleteDesign: vi.fn(),
    createConnectedDevice: vi.fn(),
    getUserDevices: vi.fn(async () => []),
    getDeviceByExternalId: vi.fn(async () => null),
    getDeviceByPairingCode: vi.fn(async () => null),
    updateDeviceStatus: vi.fn(),
    completeDevicePairing: vi.fn(),
    updateDeviceConnection: vi.fn(),
    deleteConnectedDevice: vi.fn(),
    createDeviceSession: vi.fn(),
    getActiveDeviceSession: vi.fn(async () => null),
    getUserDeviceSessions: vi.fn(async () => []),
    updateDeviceSession: vi.fn(),
    endDeviceSession: vi.fn(),
    createMobileProject: vi.fn(),
    getUserMobileProjects: vi.fn(async () => []),
    getMobileProjectByExternalId: vi.fn(async () => null),
    updateMobileProject: vi.fn(),
    deleteMobileProject: vi.fn(),
    createAppBuild: vi.fn(),
    getProjectBuilds: vi.fn(async () => []),
    getUserBuilds: vi.fn(async () => []),
    getBuildByExternalId: vi.fn(async () => null),
    updateBuildStatus: vi.fn(),
    updateBuildStoreMetadata: vi.fn(),
    updateConnectorOAuthTokens: vi.fn(),
    getConnectorById: vi.fn(async () => null),
  };
});

// ── Mock other modules ──
vi.mock("./agentStream", () => ({ streamAgentResponse: vi.fn() }));
vi.mock("./stripe", () => ({
  createCheckoutSession: vi.fn(),
  handleStripeWebhook: vi.fn(),
  fulfillStripeEvent: vi.fn(),
  getStripe: vi.fn(),
}));
vi.mock("./products", () => ({
  PRODUCTS: [],
  getProductById: vi.fn(),
}));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/imageGeneration", () => ({ generateImage: vi.fn() }));
vi.mock("./_core/voiceTranscription", () => ({ transcribeAudio: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn(async () => true) }));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@test.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const OWNER_ID = 100;
const ATTACKER_ID = 999;

describe("IDOR protection — cross-user access denied", () => {
  let ownerTaskExternalId: string;
  let ownerTaskId: number;

  beforeEach(() => {
    // Reset state
    tasks.length = 0;
    messages.length = 0;
    taskFiles.length = 0;
    artifacts.length = 0;
    events.length = 0;
    idCounter = 1;
  });

  /** Helper: create a task as the owner */
  async function createOwnerTask() {
    const caller = appRouter.createCaller(makeCtx(OWNER_ID));
    const task = await caller.task.create({ title: "Owner's private task" });
    ownerTaskExternalId = task.externalId;
    ownerTaskId = task.id;
    return task;
  }

  // ── task.get ──
  it("task.get returns null for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    const result = await attacker.task.get({ externalId: ownerTaskExternalId });
    expect(result).toBeNull();
  });

  // ── task.updateStatus ──
  it("task.updateStatus throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.task.updateStatus({ externalId: ownerTaskExternalId, status: "completed" })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── task.messages ──
  it("task.messages throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.task.messages({ taskId: ownerTaskId })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── task.addMessage ──
  it("task.addMessage throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.task.addMessage({ taskId: ownerTaskId, role: "user", content: "injected" })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── task.getTaskRating ──
  it("task.getTaskRating throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.task.getTaskRating({ taskExternalId: ownerTaskExternalId })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── file.list ──
  it("file.list throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.file.list({ taskExternalId: ownerTaskExternalId })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── workspace.addArtifact ──
  it("workspace.addArtifact throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.workspace.addArtifact({
        taskId: ownerTaskId,
        artifactType: "code",
        content: "malicious",
      })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── workspace.list ──
  it("workspace.list throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.workspace.list({ taskId: ownerTaskId })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── workspace.latest ──
  it("workspace.latest throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.workspace.latest({ taskId: ownerTaskId, type: "code" })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── replay.events ──
  it("replay.events throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.replay.events({ taskId: ownerTaskId })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── replay.addEvent ──
  it("replay.addEvent throws for another user's task", async () => {
    await createOwnerTask();
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.replay.addEvent({
        taskId: ownerTaskId,
        eventType: "click",
        payload: "{}",
        offsetMs: 0,
      })
    ).rejects.toThrow(/unauthorized/i);
  });

  // ── project.knowledge.delete ──
  it("project.knowledge.delete throws for another user's knowledge item", async () => {
    const attacker = appRouter.createCaller(makeCtx(ATTACKER_ID));
    await expect(
      attacker.project.knowledge.delete({ id: 1 })
    ).rejects.toThrow(/unauthorized/i);
  });
});

describe("IDOR protection — owner access succeeds", () => {
  beforeEach(() => {
    tasks.length = 0;
    messages.length = 0;
    taskFiles.length = 0;
    artifacts.length = 0;
    events.length = 0;
    idCounter = 1;
  });

  it("owner can access their own task.get", async () => {
    const owner = appRouter.createCaller(makeCtx(OWNER_ID));
    const task = await owner.task.create({ title: "My task" });
    const result = await owner.task.get({ externalId: task.externalId });
    expect(result).toBeDefined();
    expect(result?.title).toBe("My task");
  });

  it("owner can access their own task.messages", async () => {
    const owner = appRouter.createCaller(makeCtx(OWNER_ID));
    const task = await owner.task.create({ title: "My task" });
    const result = await owner.task.messages({ taskId: task.id });
    expect(Array.isArray(result)).toBe(true);
  });

  it("owner can access their own workspace.list", async () => {
    const owner = appRouter.createCaller(makeCtx(OWNER_ID));
    const task = await owner.task.create({ title: "My task" });
    const result = await owner.workspace.list({ taskId: task.id });
    expect(Array.isArray(result)).toBe(true);
  });

  it("owner can access their own replay.events", async () => {
    const owner = appRouter.createCaller(makeCtx(OWNER_ID));
    const task = await owner.task.create({ title: "My task" });
    const result = await owner.replay.events({ taskId: task.id });
    expect(Array.isArray(result)).toBe(true);
  });
});
