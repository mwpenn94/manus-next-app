import { eq, desc, and, or, like, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tasks, taskMessages, bridgeConfigs, taskFiles, userPreferences, workspaceArtifacts, type InsertTask, type InsertTaskMessage, type InsertBridgeConfig, type InsertTaskFile, type InsertUserPreference, type InsertWorkspaceArtifact } from "../drizzle/schema";
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
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ── Task Queries ──

export async function createTask(task: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(tasks).values(task);
  const result = await db.select().from(tasks).where(eq(tasks.externalId, task.externalId)).limit(1);
  return result[0];
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
  return db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.updatedAt));
}

export async function getTaskByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.externalId, externalId)).limit(1);
  return result[0];
}

export async function updateTaskStatus(externalId: string, status: "idle" | "running" | "completed" | "error") {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set({ status }).where(eq(tasks.externalId, externalId));
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

export async function searchTasks(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${query}%`;
  // Search in task titles
  const titleMatches = await db.select().from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.archived, 0), like(tasks.title, pattern))
  ).orderBy(desc(tasks.updatedAt));
  // Search in message content
  const allUserTasks = await db.select().from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.archived, 0))
  );
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

// ── Task Message Queries ──

export async function addTaskMessage(message: InsertTaskMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(taskMessages).values(message);
}

export async function getTaskMessages(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskMessages).where(eq(taskMessages.taskId, taskId));
}

// ── Bridge Config Queries ──

export async function getBridgeConfig(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bridgeConfigs).where(eq(bridgeConfigs.userId, userId)).limit(1);
  return result[0];
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
  return db.select().from(taskFiles).where(eq(taskFiles.taskExternalId, taskExternalId)).orderBy(desc(taskFiles.createdAt));
}

// ── User Preferences Queries ──

export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return result[0];
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
  const allTasks = await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.archived, 0)));
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
  return db.select().from(workspaceArtifacts).where(and(...conditions)).orderBy(desc(workspaceArtifacts.createdAt));
}

export async function getLatestArtifactByType(taskId: number, type: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workspaceArtifacts).where(
    and(eq(workspaceArtifacts.taskId, taskId), eq(workspaceArtifacts.artifactType, type as any))
  ).orderBy(desc(workspaceArtifacts.createdAt)).limit(1);
  return result[0];
}
