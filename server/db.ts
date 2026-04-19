import { eq, desc, and, or, like, ne, sql, lte, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tasks, taskMessages, bridgeConfigs, taskFiles, userPreferences, workspaceArtifacts, memoryEntries, taskShares, notifications, scheduledTasks, taskEvents, projects, projectKnowledge, skills, slideDecks, connectors, meetingSessions, teams, teamMembers, teamSessions, webappBuilds, designs, connectedDevices, deviceSessions, mobileProjects, appBuilds, type InsertTask, type InsertTaskMessage, type InsertBridgeConfig, type InsertTaskFile, type InsertUserPreference, type InsertWorkspaceArtifact, type InsertMemoryEntry, type InsertTaskShare, type InsertNotification, type InsertScheduledTask, type InsertTaskEvent, type InsertProject, type InsertProjectKnowledge, type InsertSkill, type InsertSlideDeck, type InsertConnector, type InsertMeetingSession, type InsertConnectedDevice, type InsertDeviceSession, type InsertMobileProject, type InsertAppBuild } from "../drizzle/schema";
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
  ).orderBy(desc(tasks.updatedAt)).limit(50);
  // Search in message content
  const allUserTasks = await db.select().from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.archived, 0))
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

// ── Task Message Queries ──

export async function addTaskMessage(message: InsertTaskMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(taskMessages).values(message);
}

export async function getTaskMessages(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskMessages).where(eq(taskMessages.taskId, taskId)).limit(500);
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
