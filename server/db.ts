import { eq, desc, asc, and, or, like, ne, sql, lte, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tasks, taskMessages, bridgeConfigs, taskFiles, userPreferences, workspaceArtifacts, memoryEntries, taskShares, notifications, scheduledTasks, taskEvents, projects, projectKnowledge, skills, slideDecks, connectors, meetingSessions, teams, teamMembers, teamSessions, webappBuilds, designs, connectedDevices, deviceSessions, mobileProjects, appBuilds, taskRatings, videoProjects, githubRepos, webappProjects, webappDeployments, pageViews, type InsertTask, type InsertTaskMessage, type InsertBridgeConfig, type InsertTaskFile, type InsertUserPreference, type InsertWorkspaceArtifact, type InsertMemoryEntry, type InsertTaskShare, type InsertNotification, type InsertScheduledTask, type InsertTaskEvent, type InsertProject, type InsertProjectKnowledge, type InsertSkill, type InsertSlideDeck, type InsertConnector, type InsertMeetingSession, type InsertConnectedDevice, type InsertDeviceSession, type InsertMobileProject, type InsertAppBuild, type InsertTaskRating, type InsertVideoProject, type InsertGitHubRepo, type InsertWebappProject, type InsertWebappDeployment, type InsertPageView } from "../drizzle/schema";
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

export async function getUserTasks(userId: number, opts?: { includeArchived?: boolean; statusFilter?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(tasks.userId, userId)];
  if (!opts?.includeArchived) {
    conditions.push(eq(tasks.archived, 0));
  }
  if (opts?.statusFilter && opts.statusFilter !== "all") {
    conditions.push(eq(tasks.status, opts.statusFilter as any));
  }
  return db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.updatedAt)).limit(200);
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
  const messageMatches: typeof allUserTasks = [];
  for (const t of allUserTasks) {
    // Skip tasks already found by title
    if (titleMatches.some(tm => tm.id === t.id)) continue;
    const msgs = await db.select().from(taskMessages).where(
      and(eq(taskMessages.taskId, t.id), like(taskMessages.content, pattern))
    ).limit(1);
    if (msgs.length > 0) messageMatches.push(t);
  }
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
    conditions.push(like(workspaceArtifacts.label, `%${opts.search}%`));
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

export async function getUserMemories(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memoryEntries).where(eq(memoryEntries.userId, userId)).orderBy(desc(memoryEntries.createdAt)).limit(limit);
}

export async function addMemoryEntry(entry: InsertMemoryEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
    and(eq(memoryEntries.userId, userId), or(like(memoryEntries.key, pattern), like(memoryEntries.value, pattern)))
  ).orderBy(desc(memoryEntries.createdAt)).limit(limit);
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
  const db = await getDb();
  if (!db) return [];
  return db.select().from(connectors).where(eq(connectors.userId, userId)).orderBy(desc(connectors.createdAt));
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
  const db = await getDb();
  if (!db) return;
  await db.update(connectors).set(data as any).where(eq(connectors.id, connectorDbId));
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
