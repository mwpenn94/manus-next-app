import { eq, desc, asc, and, or, like, ne, sql, lte, gte, lt, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tasks, taskMessages, bridgeConfigs, taskFiles, userPreferences, workspaceArtifacts, memoryEntries, taskShares, notifications, scheduledTasks, taskEvents, projects, projectKnowledge, skills, slideDecks, connectors, meetingSessions, teams, teamMembers, teamSessions, webappBuilds, designs, connectedDevices, deviceSessions, mobileProjects, appBuilds, taskRatings, videoProjects, githubRepos, webappProjects, webappDeployments, pageViews, taskTemplates, taskBranches, strategyTelemetry, type InsertTask, type InsertTaskMessage, type InsertBridgeConfig, type InsertTaskFile, type InsertUserPreference, type InsertWorkspaceArtifact, type InsertMemoryEntry, type InsertTaskShare, type InsertNotification, type InsertScheduledTask, type InsertTaskEvent, type InsertProject, type InsertProjectKnowledge, type InsertSkill, type InsertSlideDeck, type InsertConnector, type InsertMeetingSession, type InsertConnectedDevice, type InsertDeviceSession, type InsertMobileProject, type InsertAppBuild, type InsertTaskRating, type InsertVideoProject, type InsertGitHubRepo, type InsertWebappProject, type InsertWebappDeployment, type InsertPageView, type InsertTaskTemplate, type InsertTaskBranch, type InsertStrategyTelemetry } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : null;
}

// ── Task Queries ──

export async function createTask(task: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(tasks).values(task);
  const result = await db.select().from(tasks).where(eq(tasks.externalId, task.externalId)).limit(1);
  return result[0] ?? null;
}

export async function getUserTasks(userId: number, opts?: { includeArchived?: boolean; statusFilter?: string; limit?: number; cursor?: number }) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null as number | null };
  const pageLimit = Math.min(opts?.limit ?? 50, 200);
  const conditions = [eq(tasks.userId, userId)];
  if (!opts?.includeArchived) {
    conditions.push(eq(tasks.archived, 0));
  }
  if (opts?.statusFilter && opts.statusFilter !== "all") {
    conditions.push(eq(tasks.status, opts.statusFilter as any));
  }
  if (opts?.cursor) {
    conditions.push(lte(tasks.id, opts.cursor));
  }
  const items = await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.updatedAt)).limit(pageLimit + 1);
  const hasMore = items.length > pageLimit;
  const page = hasMore ? items.slice(0, pageLimit) : items;
  const nextCursor = hasMore ? page[page.length - 1].id : null;
  return { items: page, nextCursor };
}

export async function getTaskByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tasks).where(eq(tasks.externalId, externalId)).limit(1);
  return result[0] ?? null;
}

/**
 * Verify that a task (by externalId) belongs to the given user.
 * Throws if not found or not owned by userId.
 * Returns the task row on success.
 */
export async function verifyTaskOwnership(externalId: string, userId: number) {
  const task = await getTaskByExternalId(externalId);
  if (!task || task.userId !== userId) throw new Error("Task not found or unauthorized");
  return task;
}

/**
 * Verify that a task (by integer id) belongs to the given user.
 * Throws if not found or not owned by userId.
 * Returns the task row on success.
 */
export async function verifyTaskOwnershipById(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = result[0] ?? null;
  if (!task || task.userId !== userId) throw new Error("Task not found or unauthorized");
  return task;
}

export async function updateTaskStatus(externalId: string, status: "idle" | "running" | "completed" | "error" | "paused" | "stopped") {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ status }).where(eq(tasks.externalId, externalId));
}

/**
 * Sweep stale tasks — mark tasks stuck in "running" or "paused" for longer than
 * the specified timeout as "completed" (or "error" if they never produced output).
 * This prevents the sidebar from showing perpetually "In progress" tasks.
 * @param timeoutMs - How long a task can be in running/paused state before being swept (default: 2 hours)
 * @returns Number of tasks swept
 */
export async function sweepStaleTasks(timeoutMs: number = 2 * 60 * 60 * 1000): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - timeoutMs);
  // Find tasks that have been running/paused since before the cutoff
  const staleTasks = await db.select({
    id: tasks.id,
    externalId: tasks.externalId,
    status: tasks.status,
    userId: tasks.userId,
    title: tasks.title,
  })
    .from(tasks)
    .where(
      and(
        or(eq(tasks.status, "running"), eq(tasks.status, "paused")),
        lte(tasks.updatedAt, cutoff)
      )
    )
    .limit(100);
  if (staleTasks.length === 0) return 0;
  // Mark them as completed with staleCompleted flag + create notifications
  for (const t of staleTasks) {
    await db.update(tasks)
      .set({ status: "completed", staleCompleted: 1 })
      .where(eq(tasks.id, t.id));
    // Create a notification for the user
    try {
      await db.insert(notifications).values({
        userId: t.userId,
        type: "stale_completed" as any,
        title: `Task auto-completed: ${(t.title || "Untitled").slice(0, 100)}`,
        content: `This task was inactive for over ${Math.round(timeoutMs / 3600000)} hour(s) and was automatically marked as completed. You can resume it from the task view.`,
        taskExternalId: t.externalId,
      });
    } catch (notifErr: any) {
      console.warn(`[StaleSweep] Failed to create notification for task ${t.externalId}:`, notifErr.message?.slice(0, 100));
    }
  }
  console.log(`[StaleSweep] Marked ${staleTasks.length} stale task(s) as completed with notifications`);
  return staleTasks.length;
}

export async function renameTask(externalId: string, userId: number, title: string) {
  const db = await getDb();
  if (!db) return;
  const task = await getTaskByExternalId(externalId);
  if (!task || task.userId !== userId) throw new Error("Task not found or unauthorized");
  await db.update(tasks).set({ title }).where(eq(tasks.externalId, externalId));
}

export async function archiveTask(externalId: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  const task = await getTaskByExternalId(externalId);
  if (!task || task.userId !== userId) throw new Error("Task not found or unauthorized");
  await db.update(tasks).set({ archived: 1 }).where(eq(tasks.externalId, externalId));
}

export async function toggleTaskFavorite(externalId: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  const task = await getTaskByExternalId(externalId);
  if (!task || task.userId !== userId) throw new Error("Task not found or unauthorized");
  await db.update(tasks).set({ favorite: task.favorite ? 0 : 1 }).where(eq(tasks.externalId, externalId));
  return { favorite: !task.favorite };
}

export async function updateTaskSystemPrompt(externalId: string, userId: number, systemPrompt: string | null) {
  const db = await getDb();
  if (!db) return;
  const task = await getTaskByExternalId(externalId);
  if (!task || task.userId !== userId) throw new Error("Task not found or unauthorized");
  await db.update(tasks).set({ systemPrompt }).where(eq(tasks.externalId, externalId));
}

export async function searchTasks(userId: number, query: string, opts?: { dateFrom?: Date; dateTo?: Date; statusFilter?: string }) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${query}%`;

  // Build base conditions
  const baseConds = [eq(tasks.userId, userId), eq(tasks.archived, 0)];
  if (opts?.statusFilter && opts.statusFilter !== "all") {
    baseConds.push(eq(tasks.status, opts.statusFilter as any));
  }
  if (opts?.dateFrom) {
    baseConds.push(gte(tasks.createdAt, opts.dateFrom));
  }
  if (opts?.dateTo) {
    baseConds.push(lte(tasks.createdAt, opts.dateTo));
  }

  // Search in task titles
  const titleMatches = await db.select().from(tasks).where(
    and(...baseConds, like(tasks.title, pattern))
  ).orderBy(desc(tasks.updatedAt)).limit(50);
  // Search in message content
  const allUserTasks = await db.select().from(tasks).where(
    and(...baseConds)
  ).limit(200);
  const taskIds = allUserTasks.map(t => t.id);
  if (taskIds.length === 0) return titleMatches;
  // Batch query: find all taskIds with matching messages in a single query (fixes N+1)
  const titleMatchIds = new Set(titleMatches.map(t => t.id));
  const candidateIds = taskIds.filter(id => !titleMatchIds.has(id));
  if (candidateIds.length === 0) return titleMatches;
  const matchingMsgRows = await db.selectDistinct({ taskId: taskMessages.taskId })
    .from(taskMessages)
    .where(and(
      inArray(taskMessages.taskId, candidateIds),
      like(taskMessages.content, pattern)
    ));
  const matchingTaskIds = new Set(matchingMsgRows.map(r => r.taskId));
  const messageMatches = allUserTasks.filter(t => matchingTaskIds.has(t.id));
  return [...titleMatches, ...messageMatches];
}

// ── Task Rating Queries ──

export async function upsertTaskRating(taskExternalId: string, userId: number, rating: number, feedback?: string | null) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(taskRatings).values({
    taskExternalId,
    userId,
    rating,
    feedback: feedback ?? null,
  }).onDuplicateKeyUpdate({
    set: { rating, feedback: feedback ?? null },
  });
  const [row] = await db.select().from(taskRatings).where(eq(taskRatings.taskExternalId, taskExternalId)).limit(1);
  return row ?? null;
}

export async function getTaskRating(taskExternalId: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(taskRatings).where(eq(taskRatings.taskExternalId, taskExternalId)).limit(1);
  return row ?? null;
}

// ── Task Message Queries ──

export async function addTaskMessage(message: InsertTaskMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(taskMessages).values(message);
}

export async function getTaskMessages(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskMessages)
    .where(eq(taskMessages.taskId, taskId))
    .orderBy(asc(taskMessages.createdAt))
    .limit(500);
}

// ── Bridge Config Queries ──

export async function getBridgeConfig(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(bridgeConfigs).where(eq(bridgeConfigs.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertBridgeConfig(config: InsertBridgeConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(bridgeConfigs).values(config).onDuplicateKeyUpdate({
    set: {
      bridgeUrl: config.bridgeUrl,
      apiKey: config.apiKey,
      enabled: config.enabled,
    },
  });
  return getBridgeConfig(config.userId);
}

// ── Task File Queries ──

export async function createTaskFile(file: InsertTaskFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(taskFiles).values(file);
}

export async function getTaskFiles(taskExternalId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskFiles).where(eq(taskFiles.taskExternalId, taskExternalId)).orderBy(desc(taskFiles.createdAt)).limit(100);
}

/**
 * Batch-fetch the first image attachment for each task.
 * Returns a map of taskExternalId → thumbnail URL.
 * Used for sidebar attachment previews.
 */
export async function getTaskThumbnails(taskExternalIds: string[]): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db || taskExternalIds.length === 0) return {};
  // Fetch all image files for these tasks
  const imageFiles = await db.select({
    taskExternalId: taskFiles.taskExternalId,
    url: taskFiles.url,
    mimeType: taskFiles.mimeType,
  })
    .from(taskFiles)
    .where(
      and(
        inArray(taskFiles.taskExternalId, taskExternalIds),
        sql`${taskFiles.mimeType} LIKE 'image/%'`
      )
    )
    .orderBy(desc(taskFiles.createdAt))
    .limit(taskExternalIds.length * 3); // Get a few per task to ensure coverage
  // Pick the first image per task
  const result: Record<string, string> = {};
  for (const f of imageFiles) {
    if (!result[f.taskExternalId]) {
      result[f.taskExternalId] = f.url;
    }
  }
  return result;
}

// ── User Preferences Queries ──

export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertUserPreferences(prefs: InsertUserPreference) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {};
  if (prefs.generalSettings !== undefined) updateSet.generalSettings = prefs.generalSettings;
  if (prefs.capabilities !== undefined) updateSet.capabilities = prefs.capabilities;
  if (prefs.systemPrompt !== undefined) updateSet.systemPrompt = prefs.systemPrompt;
  await db.insert(userPreferences).values(prefs).onDuplicateKeyUpdate({
    set: Object.keys(updateSet).length > 0 ? updateSet : { updatedAt: new Date() },
  });
  return getUserPreferences(prefs.userId);
}

// ── Usage Stats Queries ──

export async function getUserTaskStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalTasks: 0, completedTasks: 0, runningTasks: 0, errorTasks: 0 };
  const allTasks = await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.archived, 0))).limit(1000);
  return {
    totalTasks: allTasks.length,
    completedTasks: allTasks.filter(t => t.status === "completed").length,
    runningTasks: allTasks.filter(t => t.status === "running").length,
    errorTasks: allTasks.filter(t => t.status === "error").length,
  };
}

// ── Workspace Artifact Queries ──

export async function addWorkspaceArtifact(artifact: InsertWorkspaceArtifact) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(workspaceArtifacts).values(artifact);
}

export async function getWorkspaceArtifacts(taskId: number, type?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(workspaceArtifacts.taskId, taskId)];
  if (type) {
    conditions.push(eq(workspaceArtifacts.artifactType, type as any));
  }
  return db.select().from(workspaceArtifacts).where(and(...conditions)).orderBy(desc(workspaceArtifacts.createdAt)).limit(100);
}

export async function getLatestArtifactByType(taskId: number, type: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workspaceArtifacts).where(
    and(eq(workspaceArtifacts.taskId, taskId), eq(workspaceArtifacts.artifactType, type as any))
  ).orderBy(desc(workspaceArtifacts.createdAt)).limit(1);
  return result[0] ?? null;
}

// ── Library Queries (cross-task aggregation for Library page) ──

export async function getUserLibraryArtifacts(userId: number, opts?: { type?: string; search?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  // Get all task IDs for this user
  const userTasks = await db.select({ id: tasks.id, title: tasks.title, externalId: tasks.externalId })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .limit(1000);
  if (userTasks.length === 0) return { items: [], total: 0 };
  const taskIds = userTasks.map(t => t.id);
  const taskMap = new Map(userTasks.map(t => [t.id, { title: t.title, externalId: t.externalId }]));

  const conditions: any[] = [inArray(workspaceArtifacts.taskId, taskIds)];
  if (opts?.type) {
    conditions.push(eq(workspaceArtifacts.artifactType, opts.type as any));
  }
  if (opts?.search) {
    // Full-text search across label and content
    conditions.push(
      or(
        like(workspaceArtifacts.label, `%${opts.search}%`),
        like(workspaceArtifacts.content, `%${opts.search}%`)
      )
    );
  }

  const [items, countResult] = await Promise.all([
    db.select().from(workspaceArtifacts)
      .where(and(...conditions))
      .orderBy(desc(workspaceArtifacts.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(workspaceArtifacts)
      .where(and(...conditions)),
  ]);

  return {
    items: items.map(item => ({
      ...item,
      taskTitle: taskMap.get(item.taskId)?.title ?? "Unknown Task",
      taskExternalId: taskMap.get(item.taskId)?.externalId ?? "",
    })),
    total: Number(countResult[0]?.count ?? 0),
  };
}

export async function getUserLibraryFiles(userId: number, opts?: { search?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const conditions: any[] = [eq(taskFiles.userId, userId)];
  if (opts?.search) {
    conditions.push(like(taskFiles.fileName, `%${opts.search}%`));
  }

  const [items, countResult] = await Promise.all([
    db.select().from(taskFiles)
      .where(and(...conditions))
      .orderBy(desc(taskFiles.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(taskFiles)
      .where(and(...conditions)),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0) };
}

// ── Memory Entry Queries ──

/**
 * Compute importance score for a memory entry.
 * Formula: accessCount * recencyWeight * sourceBonus
 * - recencyWeight = exp(-daysSinceLastAccess / 14) — 14-day half-life exponential decay
 * - sourceBonus = 2.0 for user-created, 1.0 for auto-extracted
 * - Brand-new memories (accessCount=0) get a floor score of 0.5 * recencyWeight * sourceBonus
 */
export function computeMemoryImportance(mem: { accessCount: number; lastAccessedAt: Date; source: string }): number {
  const daysSince = Math.max(0, (Date.now() - mem.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24));
  const recencyWeight = Math.exp(-daysSince / 14);
  const sourceBonus = mem.source === "user" ? 2.0 : 1.0;
  // Floor: brand-new memories with 0 access still get a base score
  const effectiveAccess = Math.max(mem.accessCount, 0.5);
  return effectiveAccess * recencyWeight * sourceBonus;
}

export async function getUserMemories(userId: number, limit = 50, includeArchived = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(memoryEntries.userId, userId)];
  if (!includeArchived) {
    conditions.push(eq(memoryEntries.archived, 0));
  }
  // Fetch all non-archived memories, then sort by importance score in JS
  // (MySQL doesn't support EXP-based computed columns efficiently)
  const allMemories = await db.select().from(memoryEntries).where(and(...conditions)).limit(500);
  // Sort by importance score descending — most important first
  allMemories.sort((a, b) => computeMemoryImportance(b) - computeMemoryImportance(a));
  return allMemories.slice(0, limit);
}

export async function addMemoryEntry(entry: InsertMemoryEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Deduplication: check if a memory with the same key already exists for this user
  if (entry.userId && entry.key) {
    const existing = await db.select({ id: memoryEntries.id }).from(memoryEntries)
      .where(and(eq(memoryEntries.userId, entry.userId), eq(memoryEntries.key, entry.key)))
      .limit(1);
    if (existing.length > 0) {
      // Update existing memory instead of creating duplicate
      await db.update(memoryEntries)
        .set({ value: entry.value })
        .where(eq(memoryEntries.id, existing[0].id));
      return;
    }
  }
  await db.insert(memoryEntries).values(entry);
}

export async function deleteMemoryEntry(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(memoryEntries).where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId)));
}

export async function searchMemories(userId: number, query: string, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${query}%`;
  return db.select().from(memoryEntries).where(
    and(
      eq(memoryEntries.userId, userId),
      eq(memoryEntries.archived, 0),
      or(like(memoryEntries.key, pattern), like(memoryEntries.value, pattern))
    )
  ).orderBy(desc(memoryEntries.createdAt)).limit(limit);
}

/**
 * Touch lastAccessedAt for a batch of memory IDs (called when memories are injected into agent context).
 */
export async function touchMemoryAccess(memoryIds: number[]) {
  if (memoryIds.length === 0) return;
  const db = await getDb();
  if (!db) return;
  await db.update(memoryEntries)
    .set({
      lastAccessedAt: new Date(),
      accessCount: sql`${memoryEntries.accessCount} + 1`,
    })
    .where(inArray(memoryEntries.id, memoryIds));
}

/**
 * Archive memories whose importance score falls below the threshold.
 * Only archives auto-extracted memories (source='auto'); user-created memories are never auto-archived.
 * Uses composite importance score: accessCount * exp(-daysSince/14) * sourceBonus
 * Default threshold 0.1 ≈ ~45 days with 0 access, or ~90 days with 1 access.
 * Returns the count of archived memories.
 */
export async function archiveStaleMemories(importanceThreshold = 0.1): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Fetch all non-archived auto memories and compute importance in JS
  const candidates = await db.select().from(memoryEntries)
    .where(
      and(
        eq(memoryEntries.archived, 0),
        eq(memoryEntries.source, "auto")
      )
    )
    .limit(1000);
  const toArchive = candidates.filter(m => computeMemoryImportance(m) < importanceThreshold);
  if (toArchive.length === 0) return 0;
  const ids = toArchive.map(m => m.id);
  await db.update(memoryEntries)
    .set({ archived: 1 })
    .where(inArray(memoryEntries.id, ids));
  console.log(`[MemoryDecay] Archived ${ids.length} memories below importance threshold ${importanceThreshold}`);
  return ids.length;
}

/**
 * Unarchive a specific memory (for user-initiated restore).
 */
export async function unarchiveMemory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(memoryEntries)
    .set({ archived: 0, lastAccessedAt: new Date() })
    .where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId)));
}

// ── Task Share Queries ──

export async function createTaskShare(share: InsertTaskShare) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(taskShares).values(share);
  return getTaskShareByToken(share.shareToken);
}

export async function getTaskShareByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(taskShares).where(eq(taskShares.shareToken, token)).limit(1);
  return result[0] ?? null;
}

export async function getTaskShares(taskExternalId: string, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskShares).where(
    and(eq(taskShares.taskExternalId, taskExternalId), eq(taskShares.userId, userId))
  ).orderBy(desc(taskShares.createdAt)).limit(20);
}

export async function incrementShareViewCount(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(taskShares).set({ viewCount: sql`${taskShares.viewCount} + 1` }).where(eq(taskShares.shareToken, token));
}

export async function deleteTaskShare(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(taskShares).where(and(eq(taskShares.id, id), eq(taskShares.userId, userId)));
}

// ── Notification Queries ──

export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(
    and(eq(notifications.userId, userId), eq(notifications.read, 0))
  );
  return Number(result[0]?.count ?? 0);
}

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(notifications).values(notification);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ read: 1 }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ read: 1 }).where(eq(notifications.userId, userId));
}

// ── Scheduled Task Queries ──

export async function createScheduledTask(task: InsertScheduledTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(scheduledTasks).values(task);
  // Return the last inserted
  const result = await db.select().from(scheduledTasks)
    .where(and(eq(scheduledTasks.userId, task.userId), eq(scheduledTasks.name, task.name)))
    .orderBy(desc(scheduledTasks.createdAt)).limit(1);
  return result[0] ?? null;
}

export async function getUserScheduledTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduledTasks)
    .where(eq(scheduledTasks.userId, userId))
    .orderBy(desc(scheduledTasks.createdAt))
    .limit(50);
}

export async function updateScheduledTask(id: number, userId: number, updates: Partial<InsertScheduledTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scheduledTasks).set(updates as any)
    .where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.userId, userId)));
}

export async function deleteScheduledTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scheduledTasks)
    .where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.userId, userId)));
}

export async function toggleScheduledTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(scheduledTasks)
    .where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.userId, userId))).limit(1);
  if (!result[0]) throw new Error("Schedule not found");
  const newEnabled = result[0].enabled ? 0 : 1;
  await db.update(scheduledTasks).set({ enabled: newEnabled })
    .where(eq(scheduledTasks.id, id));
  return { enabled: !!newEnabled };
}

export async function getDueScheduledTasks() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(scheduledTasks)
    .where(and(
      eq(scheduledTasks.enabled, 1),
      lte(scheduledTasks.nextRunAt, now)
    ))
    .limit(20);
}

export async function markScheduledTaskRun(id: number, status: "success" | "error" | "running", nextRunAt: Date | null) {
  const db = await getDb();
  if (!db) return;
  const updates: Record<string, unknown> = {
    lastRunAt: new Date(),
    lastStatus: status,
    runCount: sql`${scheduledTasks.runCount} + 1`,
  };
  if (nextRunAt) updates.nextRunAt = nextRunAt;
  await db.update(scheduledTasks).set(updates).where(eq(scheduledTasks.id, id));
}

// ── Task Event Queries (for session replay) ──

export async function addTaskEvent(event: InsertTaskEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(taskEvents).values(event);
}

export async function getTaskEvents(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskEvents)
    .where(eq(taskEvents.taskId, taskId))
    .orderBy(taskEvents.offsetMs)
    .limit(500);
}

/** Get tasks that have recorded replay events, with event count and duration */
export async function getReplayableTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      taskId: tasks.id,
      externalId: tasks.externalId,
      title: tasks.title,
      status: tasks.status,
      createdAt: tasks.createdAt,
      eventCount: sql<number>`COUNT(${taskEvents.id})`,
      durationMs: sql<number>`MAX(${taskEvents.offsetMs})`,
    })
    .from(tasks)
    .innerJoin(taskEvents, eq(tasks.id, taskEvents.taskId))
    .where(eq(tasks.userId, userId))
    .groupBy(tasks.id)
    .orderBy(desc(tasks.createdAt))
    .limit(50);
  return rows;
}

// ── Project Queries (Capability #11) ──
export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(projects).values(project);
  const [created] = await db.select().from(projects)
    .where(eq(projects.externalId, project.externalId!))
    .limit(1);
  return created;
}

export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.archived, 0)))
    .orderBy(desc(projects.updatedAt))
    .limit(50);
}

export async function getProjectByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const [project] = await db.select().from(projects)
    .where(eq(projects.externalId, externalId))
    .limit(1);
  return project ?? null;
}

export async function updateProject(id: number, updates: Partial<{ name: string; description: string; systemPrompt: string; icon: string; archived: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(updates).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set({ archived: 1 }).where(eq(projects.id, id));
}

export async function getProjectTasks(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.archived, 0)))
    .orderBy(desc(tasks.updatedAt))
    .limit(100);
}

export async function assignTaskToProject(taskId: number, projectId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tasks).set({ projectId }).where(eq(tasks.id, taskId));
}

// ── Project Knowledge Queries ──
export async function addProjectKnowledge(knowledge: InsertProjectKnowledge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(projectKnowledge).values(knowledge);
}

export async function getProjectKnowledgeItems(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectKnowledge)
    .where(eq(projectKnowledge.projectId, projectId))
    .orderBy(desc(projectKnowledge.createdAt))
    .limit(100);
}

export async function deleteProjectKnowledge(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectKnowledge).where(eq(projectKnowledge.id, id));
}

/**
 * Verify that a project knowledge item belongs to a project owned by the given user.
 * Throws if not found or not owned.
 */
export async function verifyKnowledgeOwnership(knowledgeId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(projectKnowledge).where(eq(projectKnowledge.id, knowledgeId)).limit(1);
  const item = rows[0];
  if (!item) throw new Error("Knowledge item not found");
  const projRows = await db.select().from(projects).where(eq(projects.id, item.projectId)).limit(1);
  const project = projRows[0];
  if (!project || project.userId !== userId) throw new Error("Knowledge item not found or unauthorized");
  return item;
}


// ── Skills helpers ──

export async function getUserSkills(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).where(eq(skills.userId, userId)).orderBy(desc(skills.installedAt));
}

export async function installSkill(skill: InsertSkill) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(skills).values(skill);
}

export async function uninstallSkill(userId: number, skillId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(skills).where(and(eq(skills.userId, userId), eq(skills.skillId, skillId)));
}

export async function toggleSkill(userId: number, skillId: string, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(skills).set({ enabled }).where(and(eq(skills.userId, userId), eq(skills.skillId, skillId)));
}

// ── Slide Decks helpers ──

export async function getUserSlideDecks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slideDecks).where(eq(slideDecks.userId, userId)).orderBy(desc(slideDecks.createdAt));
}

export async function createSlideDeck(deck: InsertSlideDeck) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(slideDecks).values(deck).$returningId();
  return result.id;
}

export async function updateSlideDeck(id: number, updates: Partial<InsertSlideDeck>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(slideDecks).set({ ...updates, updatedAt: new Date() }).where(eq(slideDecks.id, id));
}

export async function getSlideDeck(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(slideDecks).where(eq(slideDecks.id, id)).limit(1);
  return rows[0] ?? null;
}

// ── Connectors helpers ──

export async function getUserConnectors(userId: number) {
  const { decryptToken } = await import("./encryption");
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(connectors).where(eq(connectors.userId, userId)).orderBy(desc(connectors.createdAt));
  // Decrypt tokens at read time (V-004 security fix — transparent to callers)
  return rows.map(row => ({
    ...row,
    accessToken: row.accessToken ? decryptToken(row.accessToken) : row.accessToken,
    refreshToken: row.refreshToken ? decryptToken(row.refreshToken) : row.refreshToken,
  }));
}

export async function upsertConnector(connector: InsertConnector) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if exists
  const existing = await db.select().from(connectors)
    .where(and(eq(connectors.userId, connector.userId), eq(connectors.connectorId, connector.connectorId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(connectors)
      .set({ config: connector.config, status: connector.status ?? "connected", lastSyncAt: new Date() })
      .where(eq(connectors.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(connectors).values(connector).$returningId();
  return result.id;
}

export async function disconnectConnector(userId: number, connectorId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(connectors)
    .set({ status: "disconnected", config: {} })
    .where(and(eq(connectors.userId, userId), eq(connectors.connectorId, connectorId)));
}

// ── Meeting Sessions helpers ──

export async function getUserMeetingSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetingSessions).where(eq(meetingSessions.userId, userId)).orderBy(desc(meetingSessions.createdAt));
}

export async function createMeetingSession(session: InsertMeetingSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(meetingSessions).values(session).$returningId();
  return result.id;
}

export async function updateMeetingSession(id: number, updates: Partial<InsertMeetingSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(meetingSessions).set(updates).where(eq(meetingSessions.id, id));
}

export async function getMeetingSession(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(meetingSessions).where(eq(meetingSessions.id, id)).limit(1);
  return rows[0] ?? null;
}


// ── Team Queries (Capability #56/#57/#58) ──

export async function createTeam(team: { name: string; ownerId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(teams).values(team).$returningId();
  // Also add owner as team member
  await db.insert(teamMembers).values({ teamId: result.id, userId: team.ownerId, role: "owner" });
  const [created] = await db.select().from(teams).where(eq(teams.id, result.id)).limit(1);
  return created;
}

export async function getUserTeams(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const memberships = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
  if (memberships.length === 0) return [];
  const teamIds = memberships.map(m => m.teamId);
  const result = [];
  for (const teamId of teamIds) {
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (team) result.push({ ...team, memberRole: memberships.find(m => m.teamId === teamId)!.role });
  }
  return result;
}

export async function getTeamById(teamId: number) {
  const db = await getDb();
  if (!db) return null;
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  return team ?? null;
}

export async function getTeamByInviteCode(inviteCode: string) {
  const db = await getDb();
  if (!db) return null;
  const [team] = await db.select().from(teams).where(eq(teams.inviteCode, inviteCode)).limit(1);
  return team ?? null;
}

export async function getTeamMembers(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  const result = [];
  for (const m of members) {
    const [user] = await db.select().from(users).where(eq(users.id, m.userId)).limit(1);
    if (user) result.push({ ...m, user: { id: user.id, name: user.name, email: user.email } });
  }
  return result;
}

export async function joinTeam(teamId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if already a member
  const existing = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))).limit(1);
  if (existing.length > 0) return existing[0];
  // Check seat limit
  const team = await getTeamById(teamId);
  if (!team) throw new Error("Team not found");
  const memberCount = await db.select({ count: sql<number>`count(*)` }).from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  if (Number(memberCount[0]?.count ?? 0) >= team.maxSeats) throw new Error("Team is full");
  await db.insert(teamMembers).values({ teamId, userId, role: "member" });
  return { teamId, userId, role: "member" as const };
}

export async function removeTeamMember(teamId: number, userId: number, requesterId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Only owner/admin can remove
  const [requester] = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, requesterId))).limit(1);
  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    throw new Error("Not authorized to remove members");
  }
  await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
}

export async function updateTeamCredits(teamId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teams).set({ creditBalance: sql`${teams.creditBalance} + ${amount}` }).where(eq(teams.id, teamId));
}

// ── Team Sessions ──

export async function createTeamSession(session: { teamId: number; taskExternalId: string; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(teamSessions).values(session);
}

export async function getTeamSessions(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamSessions).where(eq(teamSessions.teamId, teamId)).orderBy(desc(teamSessions.createdAt)).limit(50);
}

// ── WebApp Build Queries (Capability #27/#28/#29) ──

export async function createWebappBuild(build: { userId: number; prompt: string; title?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(webappBuilds).values({
    userId: build.userId,
    prompt: build.prompt,
    title: build.title ?? "Untitled App",
    status: "generating",
  }).$returningId();
  const [created] = await db.select().from(webappBuilds).where(eq(webappBuilds.id, result.id)).limit(1);
  return created;
}

export async function updateWebappBuild(id: number, updates: Partial<{
  generatedHtml: string;
  sourceCode: string;
  publishedUrl: string;
  publishedKey: string;
  status: "draft" | "generating" | "ready" | "published" | "error";
  title: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(webappBuilds).set(updates).where(eq(webappBuilds.id, id));
}

export async function getUserWebappBuilds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webappBuilds).where(eq(webappBuilds.userId, userId)).orderBy(desc(webappBuilds.createdAt)).limit(50);
}

export async function getWebappBuild(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [build] = await db.select().from(webappBuilds).where(eq(webappBuilds.id, id)).limit(1);
  return build ?? null;
}

export async function getWebappBuildByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const [build] = await db.select().from(webappBuilds).where(eq(webappBuilds.externalId, externalId)).limit(1);
  return build ?? null;
}

// ── Design Queries (Capability #15) ──

export async function createDesign(design: { userId: number; name: string; canvasState?: any }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(designs).values({
    userId: design.userId,
    name: design.name,
    canvasState: design.canvasState ?? { layers: [], width: 1024, height: 768, background: "#ffffff" },
  }).$returningId();
  const [created] = await db.select().from(designs).where(eq(designs.id, result.id)).limit(1);
  return created;
}

export async function updateDesign(id: number, updates: Partial<{
  name: string;
  canvasState: any;
  thumbnailUrl: string;
  exportUrl: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(designs).set(updates).where(eq(designs.id, id));
}

export async function getUserDesigns(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designs).where(eq(designs.userId, userId)).orderBy(desc(designs.createdAt)).limit(50);
}

export async function getDesign(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [design] = await db.select().from(designs).where(eq(designs.id, id)).limit(1);
  return design ?? null;
}

export async function deleteDesign(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(designs).where(and(eq(designs.id, id), eq(designs.userId, userId)));
}


// ── Connected Devices (Capability #47 — BYOD) ──

export async function createConnectedDevice(device: InsertConnectedDevice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(connectedDevices).values(device);
  const result = await db.select().from(connectedDevices).where(eq(connectedDevices.externalId, device.externalId!)).limit(1);
  return result[0] ?? null;
}

export async function getUserDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(connectedDevices).where(eq(connectedDevices.userId, userId)).orderBy(desc(connectedDevices.updatedAt));
}

export async function getDeviceByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(connectedDevices).where(eq(connectedDevices.externalId, externalId)).limit(1);
  return result[0] ?? null;
}

export async function getDeviceByPairingCode(pairingCode: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(connectedDevices).where(and(eq(connectedDevices.pairingCode, pairingCode), eq(connectedDevices.paired, 0))).limit(1);
  return result[0] ?? null;
}

export async function updateDeviceStatus(id: number, status: "online" | "offline" | "pairing" | "error", lastError?: string) {
  const db = await getDb();
  if (!db) return;
  const updates: Record<string, unknown> = { status };
  if (status === "online") updates.lastConnected = new Date();
  if (lastError !== undefined) updates.lastError = lastError;
  await db.update(connectedDevices).set(updates).where(eq(connectedDevices.id, id));
}

export async function completeDevicePairing(id: number, tunnelUrl: string, osInfo?: string, capabilities?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.update(connectedDevices).set({
    paired: 1,
    status: "online",
    tunnelUrl,
    osInfo: osInfo ?? null,
    capabilities: capabilities as any ?? null,
    lastConnected: new Date(),
  }).where(eq(connectedDevices.id, id));
}

export async function updateDeviceConnection(id: number, tunnelUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(connectedDevices).set({ tunnelUrl, status: "online", lastConnected: new Date() }).where(eq(connectedDevices.id, id));
}

export async function deleteConnectedDevice(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(connectedDevices).where(and(eq(connectedDevices.id, id), eq(connectedDevices.userId, userId)));
}

// ── Device Sessions (Capability #47) ──

export async function createDeviceSession(session: InsertDeviceSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(deviceSessions).values(session);
  const result = await db.select().from(deviceSessions).where(eq(deviceSessions.externalId, session.externalId!)).limit(1);
  return result[0] ?? null;
}

export async function getActiveDeviceSession(deviceId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(deviceSessions).where(and(eq(deviceSessions.deviceId, deviceId), eq(deviceSessions.status, "active"))).limit(1);
  return result[0] ?? null;
}

export async function getUserDeviceSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deviceSessions).where(eq(deviceSessions.userId, userId)).orderBy(desc(deviceSessions.startedAt)).limit(50);
}

export async function updateDeviceSession(id: number, updates: { status?: "active" | "paused" | "ended" | "error"; commandCount?: number; screenshotCount?: number; lastScreenshotUrl?: string; metadata?: Record<string, unknown>; endedAt?: Date }) {
  const db = await getDb();
  if (!db) return;
  await db.update(deviceSessions).set(updates as any).where(eq(deviceSessions.id, id));
}

export async function endDeviceSession(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(deviceSessions).set({ status: "ended", endedAt: new Date() }).where(eq(deviceSessions.id, id));
}

// ── Mobile Projects (Capability #43 — Mobile Development) ──

export async function createMobileProject(project: InsertMobileProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(mobileProjects).values(project);
  const result = await db.select().from(mobileProjects).where(eq(mobileProjects.externalId, project.externalId!)).limit(1);
  return result[0] ?? null;
}

export async function getUserMobileProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mobileProjects).where(eq(mobileProjects.userId, userId)).orderBy(desc(mobileProjects.updatedAt));
}

export async function getMobileProjectByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(mobileProjects).where(eq(mobileProjects.externalId, externalId)).limit(1);
  return result[0] ?? null;
}

export async function updateMobileProject(id: number, userId: number, updates: Partial<InsertMobileProject>) {
  const db = await getDb();
  if (!db) return;
  await db.update(mobileProjects).set(updates as any).where(and(eq(mobileProjects.id, id), eq(mobileProjects.userId, userId)));
}

export async function deleteMobileProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(mobileProjects).where(and(eq(mobileProjects.id, id), eq(mobileProjects.userId, userId)));
}

// ── App Builds (Capability #42 — Mobile Publishing) ──

export async function createAppBuild(build: InsertAppBuild) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(appBuilds).values(build);
  const result = await db.select().from(appBuilds).where(eq(appBuilds.externalId, build.externalId!)).limit(1);
  return result[0] ?? null;
}

export async function getProjectBuilds(mobileProjectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appBuilds).where(eq(appBuilds.mobileProjectId, mobileProjectId)).orderBy(desc(appBuilds.startedAt));
}

export async function getUserBuilds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appBuilds).where(eq(appBuilds.userId, userId)).orderBy(desc(appBuilds.startedAt)).limit(50);
}

export async function getBuildByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(appBuilds).where(eq(appBuilds.externalId, externalId)).limit(1);
  return result[0] ?? null;
}

export async function updateBuildStatus(id: number, status: "queued" | "building" | "success" | "failed" | "cancelled", extras?: { artifactUrl?: string; buildLog?: string; errorMessage?: string; completedAt?: Date }) {
  const db = await getDb();
  if (!db) return;
  const updates: Record<string, unknown> = { status };
  if (extras?.artifactUrl) updates.artifactUrl = extras.artifactUrl;
  if (extras?.buildLog) updates.buildLog = extras.buildLog;
  if (extras?.errorMessage) updates.errorMessage = extras.errorMessage;
  if (extras?.completedAt) updates.completedAt = extras.completedAt;
  if (status === "success" || status === "failed" || status === "cancelled") {
    updates.completedAt = updates.completedAt ?? new Date();
  }
  await db.update(appBuilds).set(updates).where(eq(appBuilds.id, id));
}

export async function updateBuildStoreMetadata(id: number, storeMetadata: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.update(appBuilds).set({ storeMetadata: storeMetadata as any }).where(eq(appBuilds.id, id));
}

// ── Connector OAuth Helpers ──

export async function updateConnectorOAuthTokens(
  connectorDbId: number,
  data: {
    authMethod?: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenExpiresAt?: Date | null;
    oauthScopes?: string | null;
  }
) {
  const { encryptToken } = await import("./encryption");
  const db = await getDb();
  if (!db) return;
  // Encrypt tokens at rest (V-004 security fix)
  const encrypted = { ...data } as any;
  if (encrypted.accessToken) {
    encrypted.accessToken = encryptToken(encrypted.accessToken);
  }
  if (encrypted.refreshToken) {
    encrypted.refreshToken = encryptToken(encrypted.refreshToken);
  }
  await db.update(connectors).set(encrypted).where(eq(connectors.id, connectorDbId));
}

export async function getConnectorById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(connectors).where(eq(connectors.id, id));
  return rows[0] ?? null;
}

// ── Video Projects (#62) ──
export async function createVideoProject(project: InsertVideoProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(videoProjects).values(project);
  const [result] = await db.select().from(videoProjects).where(eq(videoProjects.externalId, project.externalId)).limit(1);
  return result;
}

export async function getUserVideoProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videoProjects).where(eq(videoProjects.userId, userId)).orderBy(desc(videoProjects.createdAt)).limit(100);
}

export async function getVideoProjectByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const [project] = await db.select().from(videoProjects).where(eq(videoProjects.externalId, externalId));
  return project ?? null;
}

export async function updateVideoProjectStatus(
  id: number,
  status: "pending" | "generating" | "ready" | "error",
  extras?: { videoUrl?: string; thumbnailUrl?: string; duration?: number; errorMessage?: string; completedAt?: Date }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(videoProjects).set({ status, ...extras }).where(eq(videoProjects.id, id));
}

export async function deleteVideoProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(videoProjects).where(and(eq(videoProjects.id, id), eq(videoProjects.userId, userId)));
}


// ── GitHub Repos ──
export async function createGitHubRepo(data: InsertGitHubRepo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(githubRepos).values(data).$returningId();
  return result.id;
}

export async function getUserGitHubRepos(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(githubRepos).where(and(eq(githubRepos.userId, userId), ne(githubRepos.status, "disconnected"))).orderBy(desc(githubRepos.updatedAt));
}

export async function getGitHubRepoByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const [repo] = await db.select().from(githubRepos).where(eq(githubRepos.externalId, externalId));
  return repo ?? null;
}

export async function getGitHubRepoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [repo] = await db.select().from(githubRepos).where(eq(githubRepos.id, id));
  return repo ?? null;
}

export async function updateGitHubRepo(id: number, data: Partial<InsertGitHubRepo>) {
  const db = await getDb();
  if (!db) return;
  await db.update(githubRepos).set(data).where(eq(githubRepos.id, id));
}

export async function disconnectGitHubRepo(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(githubRepos).set({ status: "disconnected" }).where(and(eq(githubRepos.id, id), eq(githubRepos.userId, userId)));
}

export async function getGitHubRepoByFullName(userId: number, fullName: string) {
  const db = await getDb();
  if (!db) return null;
  const [repo] = await db.select().from(githubRepos).where(and(eq(githubRepos.userId, userId), eq(githubRepos.fullName, fullName)));
  return repo ?? null;
}

// ── Webapp Projects ──
export async function createWebappProject(data: InsertWebappProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(webappProjects).values(data).$returningId();
  return result.id;
}

export async function getUserWebappProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webappProjects).where(eq(webappProjects.userId, userId)).orderBy(desc(webappProjects.updatedAt));
}

export async function getWebappProjectByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const [project] = await db.select().from(webappProjects).where(eq(webappProjects.externalId, externalId));
  return project ?? null;
}

export async function getWebappProjectById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [project] = await db.select().from(webappProjects).where(eq(webappProjects.id, id));
  return project ?? null;
}

export async function updateWebappProject(id: number, data: Partial<InsertWebappProject>) {
  const db = await getDb();
  if (!db) return;
  await db.update(webappProjects).set(data).where(eq(webappProjects.id, id));
}

export async function deleteWebappProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(webappProjects).where(and(eq(webappProjects.id, id), eq(webappProjects.userId, userId)));
}

// ── Webapp Deployments ──
export async function createWebappDeployment(data: InsertWebappDeployment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(webappDeployments).values(data).$returningId();
  return result.id;
}

export async function getProjectDeployments(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webappDeployments).where(eq(webappDeployments.projectId, projectId)).orderBy(desc(webappDeployments.createdAt));
}

export async function getDeploymentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [dep] = await db.select().from(webappDeployments).where(eq(webappDeployments.id, id));
  return dep ?? null;
}

export async function updateWebappDeployment(id: number, data: Partial<InsertWebappDeployment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(webappDeployments).set(data).where(eq(webappDeployments.id, id));
}


// ── Analytics Queries ──

export async function getTaskTrends(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const allTasks = await db.select().from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.archived, 0), gte(tasks.createdAt, cutoff))
  );
  // Group by date
  const byDate = new Map<string, { count: number; completed: number; errors: number }>();
  // Pre-fill all dates
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { count: 0, completed: 0, errors: 0 });
  }
  for (const t of allTasks) {
    const key = t.createdAt.toISOString().slice(0, 10);
    const entry = byDate.get(key);
    if (entry) {
      entry.count++;
      if (t.status === "completed") entry.completed++;
      if (t.status === "error") entry.errors++;
    }
  }
  return Array.from(byDate.entries()).map(([date, data]) => ({ date, ...data }));
}

export async function getTaskPerformance(userId: number) {
  const db = await getDb();
  if (!db) return { avgDurationMs: 0, avgMessagesPerTask: 0, completionRate: 0, totalMessages: 0 };
  const allTasks = await db.select().from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.archived, 0))
  );
  const completedTasks = allTasks.filter(t => t.status === "completed");
  const totalTasks = allTasks.length;
  const completionRate = totalTasks > 0 ? completedTasks.length / totalTasks : 0;
  // Average duration for completed tasks
  let totalDurationMs = 0;
  for (const t of completedTasks) {
    totalDurationMs += t.updatedAt.getTime() - t.createdAt.getTime();
  }
  const avgDurationMs = completedTasks.length > 0 ? totalDurationMs / completedTasks.length : 0;
  // Average messages per task
  const taskIds = allTasks.map(t => t.id);
  let totalMessages = 0;
  if (taskIds.length > 0) {
    const msgs = await db.select().from(taskMessages).where(inArray(taskMessages.taskId, taskIds));
    totalMessages = msgs.length;
  }
  const avgMessagesPerTask = totalTasks > 0 ? totalMessages / totalTasks : 0;
  return { avgDurationMs, avgMessagesPerTask, completionRate, totalMessages };
}


// ── Page Views (Analytics) ──

export async function recordPageView(data: InsertPageView) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pageViews).values(data);
}

export async function getPageViewStats(projectId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return { totalViews: 0, uniqueVisitors: 0, viewsByDay: [], topPaths: [], topReferrers: [] };

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Total views
  const allViews = await db.select().from(pageViews)
    .where(and(eq(pageViews.projectId, projectId), gte(pageViews.viewedAt, since)));

  const totalViews = allViews.length;
  const uniqueHashes = new Set(allViews.map(v => v.visitorHash).filter(Boolean));
  const uniqueVisitors = uniqueHashes.size;

  // Views by day
  const dayMap: Record<string, number> = {};
  for (const v of allViews) {
    const day = v.viewedAt.toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  }
  const viewsByDay = Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top paths
  const pathMap: Record<string, number> = {};
  for (const v of allViews) {
    pathMap[v.path] = (pathMap[v.path] || 0) + 1;
  }
  const topPaths = Object.entries(pathMap)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top referrers
  const refMap: Record<string, number> = {};
  for (const v of allViews) {
    const ref = v.referrer || "Direct";
    refMap[ref] = (refMap[ref] || 0) + 1;
  }
  const topReferrers = Object.entries(refMap)
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalViews, uniqueVisitors, viewsByDay, topPaths, topReferrers };
}

export async function getPageViewsByProject(projectId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pageViews)
    .where(eq(pageViews.projectId, projectId))
    .orderBy(desc(pageViews.viewedAt))
    .limit(limit);
}

/** Geographic analytics — views grouped by country code */
export async function getGeoAnalytics(projectId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const allViews = await db.select().from(pageViews)
    .where(and(eq(pageViews.projectId, projectId), gte(pageViews.viewedAt, since)));

  const countryMap: Record<string, number> = {};
  for (const v of allViews) {
    const country = v.country || "Unknown";
    countryMap[country] = (countryMap[country] || 0) + 1;
  }

  return Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}

/** Device analytics — views classified by screen width into mobile/tablet/desktop */
export async function getDeviceAnalytics(projectId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return { mobile: 0, tablet: 0, desktop: 0, unknown: 0, total: 0 };

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const allViews = await db.select().from(pageViews)
    .where(and(eq(pageViews.projectId, projectId), gte(pageViews.viewedAt, since)));

  let mobile = 0, tablet = 0, desktop = 0, unknown = 0;
  for (const v of allViews) {
    if (v.screenWidth == null) {
      unknown++;
    } else if (v.screenWidth < 768) {
      mobile++;
    } else if (v.screenWidth < 1024) {
      tablet++;
    } else {
      desktop++;
    }
  }

  return { mobile, tablet, desktop, unknown, total: allViews.length };
}

/** Analytics with peak tracking and historical comparison */
export async function getAnalyticsWithPeaks(projectId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return { peakDay: null, peakHour: null, dailyAverage: 0, weekOverWeekChange: null };

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const allViews = await db.select().from(pageViews)
    .where(and(eq(pageViews.projectId, projectId), gte(pageViews.viewedAt, since)));

  // Peak day tracking
  const dayMap: Record<string, number> = {};
  const hourMap: Record<number, number> = {};
  for (const v of allViews) {
    if (v.viewedAt) {
      const dateKey = v.viewedAt.toISOString().split("T")[0];
      dayMap[dateKey] = (dayMap[dateKey] || 0) + 1;
      hourMap[v.viewedAt.getUTCHours()] = (hourMap[v.viewedAt.getUTCHours()] || 0) + 1;
    }
  }

  // Find peak day
  let peakDay: { date: string; count: number } | null = null;
  for (const [date, count] of Object.entries(dayMap)) {
    if (!peakDay || count > peakDay.count) peakDay = { date, count };
  }

  // Find peak hour (0-23 UTC)
  let peakHour: { hour: number; count: number } | null = null;
  for (const [hour, count] of Object.entries(hourMap)) {
    if (!peakHour || count > peakHour.count) peakHour = { hour: Number(hour), count };
  }

  // Daily average
  const uniqueDays = Object.keys(dayMap).length;
  const dailyAverage = uniqueDays > 0 ? Math.round(allViews.length / uniqueDays) : 0;

  // Week-over-week comparison
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const thisWeek = allViews.filter(v => v.viewedAt && v.viewedAt >= oneWeekAgo).length;
  const lastWeek = allViews.filter(v => v.viewedAt && v.viewedAt >= twoWeeksAgo && v.viewedAt < oneWeekAgo).length;
  const weekOverWeekChange = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  return { peakDay, peakHour, dailyAverage, weekOverWeekChange };
}

/** Export analytics data as CSV-ready format */
export async function exportAnalyticsData(projectId: number, days: number = 30): Promise<{
  headers: string[];
  rows: string[][];
}> {
  const db = await getDb();
  if (!db) return { headers: [], rows: [] };

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const allViews = await db.select().from(pageViews)
    .where(and(eq(pageViews.projectId, projectId), gte(pageViews.viewedAt, since)))
    .orderBy(desc(pageViews.viewedAt));

  const headers = ["Date", "Path", "Country", "Referrer", "Device Type", "Screen Width"];
  const rows = allViews.map(v => {
    const deviceType = v.screenWidth == null ? "unknown" : v.screenWidth < 768 ? "mobile" : v.screenWidth < 1024 ? "tablet" : "desktop";
    return [
      v.viewedAt?.toISOString() ?? "",
      v.path ?? "/",
      v.country ?? "Unknown",
      v.referrer ?? "direct",
      deviceType,
      String(v.screenWidth ?? ""),
    ];
  });

  return { headers, rows };
}


// ── Task Templates ──

export async function createTaskTemplate(data: InsertTaskTemplate) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(taskTemplates).values(data).$returningId();
  return result;
}

export async function getUserTaskTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskTemplates).where(eq(taskTemplates.userId, userId)).orderBy(asc(taskTemplates.sortOrder), desc(taskTemplates.usageCount));
}

export async function updateTaskTemplate(id: number, userId: number, data: Partial<InsertTaskTemplate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(taskTemplates).set(data).where(and(eq(taskTemplates.id, id), eq(taskTemplates.userId, userId)));
}

export async function deleteTaskTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(taskTemplates).where(and(eq(taskTemplates.id, id), eq(taskTemplates.userId, userId)));
}

export async function incrementTemplateUsage(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(taskTemplates).set({ usageCount: sql`${taskTemplates.usageCount} + 1` }).where(and(eq(taskTemplates.id, id), eq(taskTemplates.userId, userId)));
}

// ── Task Branches ──

export async function createTaskBranch(data: InsertTaskBranch) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(taskBranches).values(data).$returningId();
  return result;
}

export async function getTaskBranches(parentTaskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskBranches).where(eq(taskBranches.parentTaskId, parentTaskId)).orderBy(desc(taskBranches.createdAt));
}

export async function getParentBranch(childTaskId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(taskBranches).where(eq(taskBranches.childTaskId, childTaskId)).limit(1);
  return rows[0] ?? null;
}

export async function getChildBranches(parentTaskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    branch: taskBranches,
    task: {
      externalId: tasks.externalId,
      title: tasks.title,
      status: tasks.status,
    },
  }).from(taskBranches)
    .innerJoin(tasks, eq(taskBranches.childTaskId, tasks.id))
    .where(eq(taskBranches.parentTaskId, parentTaskId))
    .orderBy(desc(taskBranches.createdAt));
}


// ── Strategy Telemetry ──

/**
 * Record a strategy telemetry entry when stuck detection triggers an intervention.
 * Returns the inserted row ID for later outcome update.
 */
export async function recordStrategyTelemetry(entry: InsertStrategyTelemetry): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(strategyTelemetry).values(entry).$returningId();
  return result?.id ?? null;
}

/**
 * Update the outcome of a strategy telemetry entry after the intervention plays out.
 * @param id - The telemetry row ID
 * @param outcome - resolved (unstuck), escalated (stuck again), forced_final (hit max)
 * @param turnsAfter - How many turns elapsed after intervention
 */
export async function updateTelemetryOutcome(
  id: number,
  outcome: "resolved" | "escalated" | "forced_final",
  turnsAfter?: number
) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = { outcome };
  if (turnsAfter !== undefined) updateSet.turnsAfter = turnsAfter;
  await db.update(strategyTelemetry).set(updateSet).where(eq(strategyTelemetry.id, id));
}

/**
 * Get aggregate strategy success rates, optionally filtered by userId.
 * Returns: { strategyLabel, triggerPattern, totalUses, resolvedCount, escalatedCount, forcedFinalCount, successRate }
 */
export async function getStrategyStats(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = userId ? [eq(strategyTelemetry.userId, userId)] : [];
  const rows = await db.select({
    strategyLabel: strategyTelemetry.strategyLabel,
    triggerPattern: strategyTelemetry.triggerPattern,
    outcome: strategyTelemetry.outcome,
  }).from(strategyTelemetry)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(strategyTelemetry.createdAt))
    .limit(1000);

  // Aggregate in JS for flexibility
  const agg = new Map<string, { total: number; resolved: number; escalated: number; forced_final: number; pending: number }>();
  for (const row of rows) {
    const key = `${row.strategyLabel}||${row.triggerPattern ?? "unknown"}`;
    if (!agg.has(key)) agg.set(key, { total: 0, resolved: 0, escalated: 0, forced_final: 0, pending: 0 });
    const entry = agg.get(key)!;
    entry.total++;
    if (row.outcome === "resolved") entry.resolved++;
    else if (row.outcome === "escalated") entry.escalated++;
    else if (row.outcome === "forced_final") entry.forced_final++;
    else entry.pending++;
  }

  return Array.from(agg.entries()).map(([key, stats]) => {
    const [strategyLabel, triggerPattern] = key.split("||");
    return {
      strategyLabel,
      triggerPattern,
      totalUses: stats.total,
      resolvedCount: stats.resolved,
      escalatedCount: stats.escalated,
      forcedFinalCount: stats.forced_final,
      pendingCount: stats.pending,
      successRate: stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0,
    };
  }).sort((a, b) => b.totalUses - a.totalUses);
}

/**
 * Get the most recent pending telemetry entry for a task (to update its outcome).
 */
export async function getPendingTelemetry(taskExternalId: string): Promise<{ id: number; stuckCount: number; strategyLabel: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    id: strategyTelemetry.id,
    stuckCount: strategyTelemetry.stuckCount,
    strategyLabel: strategyTelemetry.strategyLabel,
  }).from(strategyTelemetry)
    .where(and(
      eq(strategyTelemetry.taskExternalId, taskExternalId),
      eq(strategyTelemetry.outcome, "pending")
    ))
    .orderBy(desc(strategyTelemetry.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get the preferred strategy order for a given trigger pattern based on historical telemetry.
 * Returns an ordered array of strategy labels, best-performing first.
 * Falls back to null if insufficient data (< MIN_SAMPLES per pattern).
 *
 * The auto-tuning algorithm:
 * 1. Query all resolved/escalated/forced_final telemetry for the given trigger pattern
 * 2. Group by strategyLabel and compute success rate (resolved / total)
 * 3. Require at least MIN_SAMPLES total observations for the pattern to be tunable
 * 4. Return strategies sorted by success rate descending
 * 5. Include an exploration slot: with 20% probability, shuffle the top strategy down
 *    to prevent feedback loops (always picking the same strategy)
 */
const MIN_SAMPLES_FOR_TUNING = 5;

export async function getPreferredStrategyOrder(
  triggerPattern: string,
  userId?: number,
): Promise<string[] | null> {
  const db = await getDb();
  if (!db) return null;

  const conditions = [
    eq(strategyTelemetry.triggerPattern, triggerPattern),
    // Only count resolved outcomes (not pending)
    sql`${strategyTelemetry.outcome} != 'pending'`,
  ];
  if (userId) conditions.push(eq(strategyTelemetry.userId, userId));

  const rows = await db
    .select({
      strategyLabel: strategyTelemetry.strategyLabel,
      outcome: strategyTelemetry.outcome,
    })
    .from(strategyTelemetry)
    .where(and(...conditions))
    .orderBy(desc(strategyTelemetry.createdAt))
    .limit(500);

  if (rows.length < MIN_SAMPLES_FOR_TUNING) return null; // Insufficient data — use default order

  // Aggregate by strategy
  const stats = new Map<string, { resolved: number; total: number }>();
  for (const row of rows) {
    if (!stats.has(row.strategyLabel)) stats.set(row.strategyLabel, { resolved: 0, total: 0 });
    const s = stats.get(row.strategyLabel)!;
    s.total++;
    if (row.outcome === "resolved") s.resolved++;
  }

  // Sort by success rate descending, break ties by total uses
  const ranked = Array.from(stats.entries())
    .map(([label, s]) => ({
      label,
      successRate: s.total > 0 ? s.resolved / s.total : 0,
      total: s.total,
    }))
    .sort((a, b) => b.successRate - a.successRate || b.total - a.total);

  const order = ranked.map((r) => r.label);

  // Exploration: 20% of the time, swap the top strategy with a random other one
  // This prevents feedback loops where we always pick the same strategy
  if (order.length > 1 && Math.random() < 0.2) {
    const swapIdx = 1 + Math.floor(Math.random() * (order.length - 1));
    [order[0], order[swapIdx]] = [order[swapIdx], order[0]];
  }

  return order;
}
