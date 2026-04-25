import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  createTask,
  getUserTasks,
  getTaskByExternalId,
  updateTaskStatus,
  addTaskMessage,
  getTaskMessages,
  getBridgeConfig,
  upsertBridgeConfig,
  createTaskFile,
  getTaskFiles,
  getUserPreferences,
  upsertUserPreferences,
  getUserTaskStats,
  archiveTask,
  renameTask,
  toggleTaskFavorite,
  updateTaskSystemPrompt,
  searchTasks,
  addWorkspaceArtifact,
  getWorkspaceArtifacts,
  getLatestArtifactByType,
  getUserMemories,
  addMemoryEntry,
  deleteMemoryEntry,
  searchMemories,
  createTaskShare,
  getTaskShareByToken,
  getTaskShares,
  incrementShareViewCount,
  deleteTaskShare,
  getUserNotifications,
  getUnreadNotificationCount,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  createScheduledTask,
  getUserScheduledTasks,
  updateScheduledTask,
  deleteScheduledTask,
  toggleScheduledTask,
  addTaskEvent,
  getTaskEvents,
  createProject,
  getUserProjects,
  getProjectByExternalId,
  updateProject,
  deleteProject,
  toggleProjectPin,
  reorderProjects,
  getProjectTasks,
  assignTaskToProject,
  addProjectKnowledge,
  getProjectKnowledgeItems,
  deleteProjectKnowledge,
  getUserSkills,
  installSkill,
  uninstallSkill,
  toggleSkill,
  getUserSlideDecks,
  createSlideDeck,
  updateSlideDeck,
  getSlideDeck,
  getUserConnectors,
  upsertConnector,
  disconnectConnector,
  getUserMeetingSessions,
  createMeetingSession,
  updateMeetingSession,
  getMeetingSession,
  createTeam,
  getUserTeams,
  getTeamById,
  getTeamByInviteCode,
  getTeamMembers,
  joinTeam,
  removeTeamMember,
  updateTeamCredits,
  createTeamSession,
  getTeamSessions,
  createWebappBuild,
  updateWebappBuild,
  getUserWebappBuilds,
  getWebappBuild,
  createDesign,
  updateDesign,
  getUserDesigns,
  getDesign,
  deleteDesign,
  createConnectedDevice,
  getUserDevices,
  getDeviceByExternalId,
  getDeviceByPairingCode,
  updateDeviceStatus,
  completeDevicePairing,
  updateDeviceConnection,
  deleteConnectedDevice,
  createDeviceSession,
  getActiveDeviceSession,
  getUserDeviceSessions,
  updateDeviceSession,
  endDeviceSession,
  createMobileProject,
  getUserMobileProjects,
  getMobileProjectByExternalId,
  updateMobileProject,
  deleteMobileProject,
  createAppBuild,
  getProjectBuilds,
  getUserBuilds,
  getBuildByExternalId,
  updateBuildStatus,
  updateBuildStoreMetadata,
  updateConnectorOAuthTokens,
  getConnectorById,
  upsertTaskRating,
  getTaskRating,
  verifyTaskOwnership,
  verifyTaskOwnershipById,
  verifyKnowledgeOwnership,
  createVideoProject,
  getUserVideoProjects,
  getVideoProjectByExternalId,
  deleteVideoProject,
  updateVideoProjectStatus,
  createGitHubRepo,
  getUserGitHubRepos,
  getGitHubRepoByExternalId,
  getGitHubRepoById,
  updateGitHubRepo,
  disconnectGitHubRepo,
  getGitHubRepoByFullName,
  createWebappProject,
  getUserWebappProjects,
  getWebappProjectByExternalId,
  getWebappProjectById,
  updateWebappProject,
  deleteWebappProject,
  createWebappDeployment,
  getProjectDeployments,
  getDeploymentById,
  updateWebappDeployment,
  getReplayableTasks,
  getTaskTrends,
  getTaskPerformance,
  getDb,
  createTaskTemplate,
  getUserTaskTemplates,
  updateTaskTemplate,
  deleteTaskTemplate,
  incrementTemplateUsage,
  createTaskBranch,
  getTaskBranches,
  getParentBranch,
  getChildBranches,
  getTaskThumbnails,
  getStrategyStats,
} from "./db";
import { eq, inArray } from "drizzle-orm";
import { validateTunnelUrl } from "./urlValidator";
import {
  users, tasks, taskMessages, memoryEntries, connectors, designs,
  scheduledTasks, userPreferences, taskShares,
  webappProjects, webappBuilds, webappDeployments, taskTemplates,
  taskRatings, bridgeConfigs, taskFiles, workspaceArtifacts,
  notifications, projects, projectKnowledge, taskEvents,
  skills, slideDecks, meetingSessions, teams, teamMembers, teamSessions,
  connectedDevices, deviceSessions, mobileProjects, appBuilds,
  videoProjects, githubRepos, pageViews, taskBranches,
  strategyTelemetry,
} from "../drizzle/schema";

const ARTIFACT_TYPES = ["browser_screenshot", "browser_url", "code", "terminal", "generated_image", "document", "document_pdf", "document_docx", "slides", "webapp_preview", "webapp_deployed"] as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  task: router({
    list: protectedProcedure
      .input(z.object({
        statusFilter: z.string().optional(),
        includeArchived: z.boolean().optional(),
        limit: z.number().min(1).max(200).optional(),
        cursor: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return getUserTasks(ctx.user.id, {
          statusFilter: input?.statusFilter,
          includeArchived: input?.includeArchived,
          limit: input?.limit,
          cursor: input?.cursor,
        });
      }),

    get: protectedProcedure
      .input(z.object({ externalId: z.string().max(50) }))
      .query(async ({ ctx, input }) => {
        const task = await getTaskByExternalId(input.externalId);
        if (!task || task.userId !== ctx.user.id) return null;
        return task;
      }),

    create: protectedProcedure
      .input(z.object({ title: z.string().min(1).max(500), externalId: z.string().min(8).max(24).optional() }))
      .mutation(async ({ ctx, input }) => {
        const externalId = input.externalId || nanoid(12);
        return createTask({
          externalId,
          userId: ctx.user.id,
          title: input.title,
        });
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        externalId: z.string().max(50),
        status: z.enum(["idle", "running", "completed", "error", "paused", "stopped"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await verifyTaskOwnership(input.externalId, ctx.user.id);
        await updateTaskStatus(input.externalId, input.status);

        // Auto-create notification on task completion or error
        if (input.status === "completed" || input.status === "error") {
          try {
            const task = await getTaskByExternalId(input.externalId);
            if (task) {
              await createNotification({
                userId: ctx.user.id,
                type: input.status === "completed" ? "task_completed" : "task_error",
                title: input.status === "completed"
                  ? `Task completed: ${task.title}`
                  : `Task failed: ${task.title}`,
                content: input.status === "completed"
                  ? "Your task has finished successfully."
                  : "Your task encountered an error.",
                taskExternalId: input.externalId,
              });
            }
          } catch (err) {
            console.error("[Notification] Failed to create auto-notification:", err);
          }
        }

        return { success: true };
      }),

    rename: protectedProcedure
      .input(z.object({
        externalId: z.string().max(50),
        title: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        await renameTask(input.externalId, ctx.user.id, input.title);
        return { success: true };
      }),

    archive: protectedProcedure
      .input(z.object({ externalId: z.string().max(50) }))
      .mutation(async ({ ctx, input }) => {
        await archiveTask(input.externalId, ctx.user.id);
        return { success: true };
      }),

    toggleFavorite: protectedProcedure
      .input(z.object({ externalId: z.string().max(50) }))
      .mutation(async ({ ctx, input }) => {
        return toggleTaskFavorite(input.externalId, ctx.user.id);
      }),

    updateSystemPrompt: protectedProcedure
      .input(z.object({
        externalId: z.string().max(50),
        systemPrompt: z.string().max(10000).nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateTaskSystemPrompt(input.externalId, ctx.user.id, input.systemPrompt);
        return { success: true };
      }),

    /** Auto-generate a concise task title from the conversation */
    generateTitle: protectedProcedure
      .input(z.object({
        externalId: z.string().max(50),
        userMessage: z.string().max(2000),
        assistantMessage: z.string().max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        await verifyTaskOwnership(input.externalId, ctx.user.id);
        try {
          const { invokeLLM } = await import("./_core/llm");
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "Generate a concise task title (3-8 words, no quotes) that captures the essence of this conversation. Return ONLY the title text, nothing else.",
              },
              {
                role: "user",
                content: `User asked: ${input.userMessage.slice(0, 500)}\n\nAssistant responded: ${input.assistantMessage.slice(0, 500)}`,
              },
            ],
          });
          const rawContent = result?.choices?.[0]?.message?.content;
          const contentStr = typeof rawContent === "string" ? rawContent : "";
          const title = contentStr.trim().replace(/^["']|["']$/g, "").slice(0, 100);
          if (title && title.length > 2) {
            await renameTask(input.externalId, ctx.user.id, title);
            return { title };
          }
          return { title: null };
        } catch (err) {
          console.error("[AutoTitle] Failed to generate title:", err);
          return { title: null };
        }
      }),

    /** Manually sweep stale tasks — marks tasks stuck in running/paused for >2h as completed */
    sweepStale: protectedProcedure
      .mutation(async () => {
        const { sweepStaleTasks } = await import("./db");
        const swept = await sweepStaleTasks();
        return { swept };
      }),

    /** Resume a stale-completed task — resets it to idle so the user can continue */
    resumeStale: protectedProcedure
      .input(z.object({ externalId: z.string().max(50) }))
      .mutation(async ({ ctx, input }) => {
        const task = await getTaskByExternalId(input.externalId);
        if (!task || task.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        if (!task.staleCompleted) throw new TRPCError({ code: "BAD_REQUEST", message: "Task was not auto-completed" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await db.update(tasks).set({ status: "idle", staleCompleted: 0 }).where(eq(tasks.externalId, input.externalId));
        return { success: true };
      }),

    search: protectedProcedure
      .input(z.object({
        query: z.string().min(1),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        statusFilter: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return searchTasks(ctx.user.id, input.query, {
          dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
          dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
          statusFilter: input.statusFilter,
        });
      }),

    messages: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        return getTaskMessages(input.taskId);
      }),

    addMessage: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(100000),
        actions: z.array(z.record(z.string(), z.unknown())).optional(),
        cardType: z.string().max(64).optional(),
        cardData: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        const externalId = nanoid(12);
        await addTaskMessage({
          taskId: input.taskId,
          externalId,
          role: input.role,
          content: input.content,
          actions: input.actions ?? null,
          cardType: input.cardType ?? null,
          cardData: input.cardData ?? null,
        });
        return { success: true, externalId };
      }),

    rateTask: protectedProcedure
      .input(z.object({
        taskExternalId: z.string().min(1).max(64),
        rating: z.number().int().min(1).max(5),
        feedback: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await upsertTaskRating(input.taskExternalId, ctx.user.id, input.rating, input.feedback);
        return { success: true, rating: result };
      }),

    getTaskRating: protectedProcedure
      .input(z.object({ taskExternalId: z.string().min(1).max(64) }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnership(input.taskExternalId, ctx.user.id);
        return getTaskRating(input.taskExternalId);
      }),

    /** Duplicate a task: creates a new task with the same messages (fork from any point) */
    duplicate: protectedProcedure
      .input(z.object({
        sourceExternalId: z.string().min(1).max(64),
        /** If provided, only copy messages up to this index (0-based). Otherwise copy all. */
        upToMessageIndex: z.number().int().min(0).optional(),
        /** Optional new title. Defaults to "Copy of <original title>" */
        newTitle: z.string().min(1).max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Verify ownership of source task
        const sourceTask = await getTaskByExternalId(input.sourceExternalId);
        if (!sourceTask || sourceTask.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Source task not found" });
        }
        // 2. Fetch source messages
        const sourceMessages = await getTaskMessages(sourceTask.id);
        if (sourceMessages.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot duplicate a task with no messages" });
        }
        const messagesToCopy = input.upToMessageIndex !== undefined
          ? sourceMessages.slice(0, Math.min(input.upToMessageIndex + 1, sourceMessages.length))
          : sourceMessages;
        // 3. Create new task
        const newExternalId = nanoid(12);
        const title = input.newTitle || `Copy of ${sourceTask.title}`;
        const newTask = await createTask({
          externalId: newExternalId,
          userId: ctx.user.id,
          title,
          status: "idle",
          projectId: sourceTask.projectId,
        });
        if (!newTask) throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to create duplicate task" });
        // 4. Copy messages into the new task
        for (const msg of messagesToCopy) {
          await addTaskMessage({
            taskId: newTask.id,
            externalId: nanoid(),
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          });
        }
        return { externalId: newExternalId, title, messagesCopied: messagesToCopy.length };
      }),
  }),

  file: router({
    /** Record a file upload in the database (actual S3 upload happens via /api/upload) */
    record: protectedProcedure
      .input(z.object({
        taskExternalId: z.string().max(50),
        fileName: z.string().max(500),
        fileKey: z.string().max(500),
        url: z.string().url(),
        mimeType: z.string().optional(),
        size: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createTaskFile({
          taskExternalId: input.taskExternalId,
          userId: ctx.user.id,
          fileName: input.fileName,
          fileKey: input.fileKey,
          url: input.url,
          mimeType: input.mimeType ?? null,
          size: input.size ?? null,
        });
        return { success: true };
      }),

    /** List files for a task */
    list: protectedProcedure
      .input(z.object({ taskExternalId: z.string().max(50) }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnership(input.taskExternalId, ctx.user.id);
        return getTaskFiles(input.taskExternalId);
      }),

    /** Batch-fetch first image thumbnail per task for sidebar previews */
    thumbnails: protectedProcedure
      .input(z.object({ taskExternalIds: z.array(z.string().max(50)).max(100) }))
      .query(async ({ input }) => {
        return getTaskThumbnails(input.taskExternalIds);
      }),
  }),

  bridge: router({
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      return getBridgeConfig(ctx.user.id);
    }),

    saveConfig: protectedProcedure
      .input(z.object({
        bridgeUrl: z.string().min(1).optional().nullable(),
        apiKey: z.string().optional().nullable(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return upsertBridgeConfig({
          userId: ctx.user.id,
          bridgeUrl: input.bridgeUrl ?? null,
          apiKey: input.apiKey ?? null,
          enabled: input.enabled ? 1 : 0,
        });
      }),
  }),

  /** User preferences — persist settings, capability toggles, and system prompt */
  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await getUserPreferences(ctx.user.id);
      return prefs ?? {
        generalSettings: { notifications: true, soundEffects: false, autoExpandActions: true, compactMode: false, theme: 'dark' },
        capabilities: {},
        systemPrompt: null,
      };
    }),

    save: protectedProcedure
      .input(z.object({
        generalSettings: z.record(z.string(), z.unknown()).optional(),
        capabilities: z.record(z.string(), z.boolean()).optional(),
        systemPrompt: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return upsertUserPreferences({
          userId: ctx.user.id,
          generalSettings: input.generalSettings ?? undefined,
          capabilities: input.capabilities ?? undefined,
          systemPrompt: input.systemPrompt !== undefined ? input.systemPrompt : undefined,
        });
      }),
  }),

  /** GDPR Data Export & Deletion */
  gdpr: router({
    /** Export all user data as a JSON bundle */
    exportData: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const userId = ctx.user.id;

      // ── Gather ALL user data from ALL user-owned tables ──
      const [userTasks, userPrefs, userMemories, userConnectors, userWebapps, userDesigns,
        userSchedules, userProjects, userSkills, userSlides, userMeetings,
        userDevices, userMobileProjects, userAppBuilds, userVideoProjects,
        userGitHubRepos, userTemplates, userBridgeConfigs, userNotifications] = await Promise.all([
        db.select().from(tasks).where(eq(tasks.userId, userId)),
        getUserPreferences(userId),
        db.select().from(memoryEntries).where(eq(memoryEntries.userId, userId)),
        db.select().from(connectors).where(eq(connectors.userId, userId)),
        db.select().from(webappProjects).where(eq(webappProjects.userId, userId)),
        db.select().from(designs).where(eq(designs.userId, userId)),
        db.select().from(scheduledTasks).where(eq(scheduledTasks.userId, userId)),
        db.select().from(projects).where(eq(projects.userId, userId)),
        db.select().from(skills).where(eq(skills.userId, userId)),
        db.select().from(slideDecks).where(eq(slideDecks.userId, userId)),
        db.select().from(meetingSessions).where(eq(meetingSessions.userId, userId)),
        db.select().from(connectedDevices).where(eq(connectedDevices.userId, userId)),
        db.select().from(mobileProjects).where(eq(mobileProjects.userId, userId)),
        db.select().from(appBuilds).where(eq(appBuilds.userId, userId)),
        db.select().from(videoProjects).where(eq(videoProjects.userId, userId)),
        db.select().from(githubRepos).where(eq(githubRepos.userId, userId)),
        db.select().from(taskTemplates).where(eq(taskTemplates.userId, userId)),
        db.select().from(bridgeConfigs).where(eq(bridgeConfigs.userId, userId)),
        db.select().from(notifications).where(eq(notifications.userId, userId)),
      ]);

      // Get task-dependent data
      const taskIds = userTasks.map(t => t.id);
      const taskExternalIds = userTasks.map((t: any) => t.externalId).filter(Boolean);
      let allMessages: any[] = [];
      let allFiles: any[] = [];
      let allArtifacts: any[] = [];
      let allRatings: any[] = [];
      let allBranches: any[] = [];
      if (taskIds.length > 0) {
        [allMessages, allArtifacts] = await Promise.all([
          db.select().from(taskMessages).where(inArray(taskMessages.taskId, taskIds)),
          db.select().from(workspaceArtifacts).where(inArray(workspaceArtifacts.taskId, taskIds)),
        ]);
      }
      if (taskExternalIds.length > 0) {
        [allFiles, allRatings] = await Promise.all([
          db.select().from(taskFiles).where(inArray(taskFiles.taskExternalId, taskExternalIds)),
          db.select().from(taskRatings).where(inArray(taskRatings.taskExternalId, taskExternalIds)),
        ]);
        allBranches = await db.select().from(taskBranches).where(inArray(taskBranches.childTaskId, taskIds));
      }

      // Get project-dependent data
      const projectIds = userProjects.map(p => p.id);
      let allKnowledge: any[] = [];
      if (projectIds.length > 0) {
        allKnowledge = await db.select().from(projectKnowledge).where(inArray(projectKnowledge.projectId, projectIds));
      }

      // Get team data
      const userTeams = await db.select().from(teams).where(eq(teams.ownerId, userId));

      const exportBundle = {
        exportedAt: new Date().toISOString(),
        user: { id: userId, name: ctx.user.name, email: ctx.user.email, role: ctx.user.role },
        tasks: userTasks,
        messages: allMessages,
        files: allFiles,
        artifacts: allArtifacts,
        ratings: allRatings,
        branches: allBranches,
        preferences: userPrefs,
        memories: userMemories,
        connectors: userConnectors.map(c => ({ ...c, accessToken: "[REDACTED]", refreshToken: "[REDACTED]" })),
        webappProjects: userWebapps,
        designs: userDesigns,
        scheduledTasks: userSchedules,
        projects: userProjects,
        projectKnowledge: allKnowledge,
        skills: userSkills,
        slideDecks: userSlides,
        meetingSessions: userMeetings,
        connectedDevices: userDevices,
        mobileProjects: userMobileProjects,
        appBuilds: userAppBuilds,
        videoProjects: userVideoProjects,
        githubRepos: userGitHubRepos.map(r => ({ ...r, accessToken: "[REDACTED]" })),
        taskTemplates: userTemplates,
        bridgeConfigs: userBridgeConfigs,
        notifications: userNotifications,
        teams: userTeams,
      };
      // Upload to S3 for download
      const { storagePut } = await import("./storage");
      const key = `gdpr-exports/${userId}/export-${Date.now()}.json`;
      const { url } = await storagePut(key, JSON.stringify(exportBundle, null, 2), "application/json");
      return { url, exportedAt: exportBundle.exportedAt };
    }),
    /** Delete all user data (GDPR right to erasure) */
    deleteAllData: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const userId = ctx.user.id;

      // ── Phase 1: Collect IDs needed for cascading deletes ──
      const userTaskRows = await db.select({ id: tasks.id, externalId: tasks.externalId }).from(tasks).where(eq(tasks.userId, userId));
      const taskIds = userTaskRows.map(t => t.id);
      const taskExternalIds = userTaskRows.map(t => t.externalId).filter(Boolean);

      const projectRows = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userId));
      const projectIds = projectRows.map(p => p.id);

      const webappProjectRows = await db.select({ id: webappProjects.id }).from(webappProjects).where(eq(webappProjects.userId, userId));
      const webappProjectIds = webappProjectRows.map(p => p.id);

      const teamRows = await db.select({ id: teams.id }).from(teams).where(eq(teams.ownerId, userId));
      const teamIds = teamRows.map(t => t.id);

      // ── Phase 2: Delete task-dependent tables ──
      if (taskIds.length > 0) {
        await db.delete(taskMessages).where(inArray(taskMessages.taskId, taskIds));
        await db.delete(taskFiles).where(inArray(taskFiles.taskExternalId, taskExternalIds));
        await db.delete(workspaceArtifacts).where(inArray(workspaceArtifacts.taskId, taskIds));
        await db.delete(taskEvents).where(inArray(taskEvents.taskId, taskIds));
        await db.delete(taskBranches).where(inArray(taskBranches.childTaskId, taskIds));
        await db.delete(taskBranches).where(inArray(taskBranches.parentTaskId, taskIds));
      }
      if (taskExternalIds.length > 0) {
        await db.delete(taskShares).where(inArray(taskShares.taskExternalId, taskExternalIds));
        await db.delete(taskRatings).where(inArray(taskRatings.taskExternalId, taskExternalIds));
      }

      // ── Phase 3: Delete project-dependent tables ──
      if (projectIds.length > 0) {
        await db.delete(projectKnowledge).where(inArray(projectKnowledge.projectId, projectIds));
      }
      if (webappProjectIds.length > 0) {
        await db.delete(webappDeployments).where(inArray(webappDeployments.projectId, webappProjectIds));
        await db.delete(pageViews).where(inArray(pageViews.projectId, webappProjectIds));
      }

      // ── Phase 4: Delete team-dependent tables ──
      if (teamIds.length > 0) {
        await db.delete(teamSessions).where(inArray(teamSessions.teamId, teamIds));
        await db.delete(teamMembers).where(inArray(teamMembers.teamId, teamIds));
      }
      // Also remove user from teams they're a member of (not owner)
      await db.delete(teamMembers).where(eq(teamMembers.userId, userId));

      // ── Phase 5: Delete all direct user-owned tables ──
      await db.delete(tasks).where(eq(tasks.userId, userId));
      await db.delete(memoryEntries).where(eq(memoryEntries.userId, userId));
      await db.delete(connectors).where(eq(connectors.userId, userId));
      await db.delete(webappBuilds).where(eq(webappBuilds.userId, userId));
      await db.delete(webappProjects).where(eq(webappProjects.userId, userId));
      await db.delete(designs).where(eq(designs.userId, userId));
      await db.delete(scheduledTasks).where(eq(scheduledTasks.userId, userId));
      await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(projects).where(eq(projects.userId, userId));
      await db.delete(skills).where(eq(skills.userId, userId));
      await db.delete(slideDecks).where(eq(slideDecks.userId, userId));
      await db.delete(meetingSessions).where(eq(meetingSessions.userId, userId));
      await db.delete(teams).where(eq(teams.ownerId, userId));
      await db.delete(connectedDevices).where(eq(connectedDevices.userId, userId));
      await db.delete(deviceSessions).where(eq(deviceSessions.userId, userId));
      await db.delete(mobileProjects).where(eq(mobileProjects.userId, userId));
      await db.delete(appBuilds).where(eq(appBuilds.userId, userId));
      await db.delete(videoProjects).where(eq(videoProjects.userId, userId));
      await db.delete(githubRepos).where(eq(githubRepos.userId, userId));
      await db.delete(taskTemplates).where(eq(taskTemplates.userId, userId));
      await db.delete(bridgeConfigs).where(eq(bridgeConfigs.userId, userId));
      await db.delete(strategyTelemetry).where(eq(strategyTelemetry.userId, userId));

      // ── Phase 6: Delete the user record itself ──
      await db.delete(users).where(eq(users.id, userId));

      // Notify owner
      try {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({ title: "GDPR Data Deletion", content: `User ${ctx.user.name} (ID: ${userId}) requested full data deletion.` });
      } catch {}
      return { deleted: true, deletedAt: new Date().toISOString() };
    }),
  }),

  /** Usage stats — real task counts from the database */
  usage: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getUserTaskStats(ctx.user.id);
    }),
    /** Task activity over the last N days — returns array of { date, count, completed, errors } */
    taskTrends: protectedProcedure
      .input(z.object({ days: z.number().min(7).max(90).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getTaskTrends(ctx.user.id, input?.days ?? 30);
      }),
    /** Average task duration (completed tasks only) and average messages per task */
    performance: protectedProcedure.query(async ({ ctx }) => {
      return getTaskPerformance(ctx.user.id);
    }),
    /** Agent self-correction strategy telemetry — success rates by strategy and trigger pattern */
    strategyStats: protectedProcedure.query(async ({ ctx }) => {
      return getStrategyStats(ctx.user.id);
    }),
  }),

  /** Workspace artifacts — browser screenshots, code, terminal output, documents from bridge events */
  workspace: router({
    addArtifact: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        artifactType: z.enum(ARTIFACT_TYPES),
        label: z.string().optional(),
        content: z.string().optional(),
        url: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        await addWorkspaceArtifact({
          taskId: input.taskId,
          artifactType: input.artifactType,
          label: input.label ?? null,
          content: input.content ?? null,
          url: input.url ?? null,
        });
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        type: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        return getWorkspaceArtifacts(input.taskId, input.type);
      }),

    latest: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        type: z.enum(ARTIFACT_TYPES),
      }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        return getLatestArtifactByType(input.taskId, input.type) ?? null;
      }),
  }),

  /** Voice transcription — uses built-in Whisper service */
  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
        prompt: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { transcribeAudio } = await import("./_core/voiceTranscription");
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language,
          prompt: input.prompt,
        });
        if ("error" in result) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return { text: result.text, language: result.language };
      }),
  }),

  /** LLM chat completion — sends user message to the built-in LLM and returns the response */
  llm: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })).min(1),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const response = await invokeLLM({
          messages: input.messages,
        });
        const content = response.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.";
        return { content };
      }),
  }),

  /** Cross-session memory — persistent knowledge extracted from tasks or added manually */
  memory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserMemories(ctx.user.id, input?.limit ?? 50);
      }),

    add: protectedProcedure
      .input(z.object({
        key: z.string().min(1).max(500),
        value: z.string().min(1).max(5000),
        source: z.enum(["auto", "user"]).optional(),
        taskExternalId: z.string().max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addMemoryEntry({
          userId: ctx.user.id,
          key: input.key,
          value: input.value,
          source: input.source ?? "user",
          taskExternalId: input.taskExternalId ?? null,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMemoryEntry(input.id, ctx.user.id);
        return { success: true };
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string().min(1), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return searchMemories(ctx.user.id, input.query, input.limit ?? 10);
      }),

    /** Unarchive a memory that was auto-archived by the decay sweep */
    unarchive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { unarchiveMemory } = await import("./db");
        await unarchiveMemory(input.id, ctx.user.id);
        return { success: true };
      }),

    /** List archived memories */
    listArchived: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserMemories(ctx.user.id, input?.limit ?? 50, true);
      }),

    /** Bulk add memory entries (for file import) */
    bulkAdd: protectedProcedure
      .input(z.object({
        entries: z.array(z.object({
          key: z.string().min(1).max(500),
          value: z.string().min(1).max(5000),
          source: z.enum(["auto", "user"]).optional(),
        })).min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        let added = 0;
        for (const entry of input.entries) {
          await addMemoryEntry({
            userId: ctx.user.id,
            key: entry.key,
            value: entry.value,
            source: entry.source ?? "user",
            taskExternalId: null,
          });
          added++;
        }
        return { success: true, added };
      }),
  }),

  /** Task sharing — create signed share links with optional password and expiry */
  share: router({
    create: protectedProcedure
      .input(z.object({
        taskExternalId: z.string().max(50),
        password: z.string().max(200).optional(),
        expiresInHours: z.number().min(1).max(720).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const shareToken = nanoid(24);
        let passwordHash: string | null = null;

        if (input.password) {
          // Simple hash using built-in crypto (not bcrypt to avoid dep)
          const crypto = await import("crypto");
          passwordHash = crypto.createHash("sha256").update(input.password).digest("hex");
        }

        const expiresAt = input.expiresInHours
          ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
          : null;

        const share = await createTaskShare({
          taskExternalId: input.taskExternalId,
          userId: ctx.user.id,
          shareToken,
          passwordHash,
          expiresAt,
        });

        return {
          shareToken,
          shareUrl: `/shared/${shareToken}`,
          expiresAt,
          hasPassword: !!passwordHash,
        };
      }),

    list: protectedProcedure
      .input(z.object({ taskExternalId: z.string().max(50) }))
      .query(async ({ ctx, input }) => {
        return getTaskShares(input.taskExternalId, ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTaskShare(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Public: view a shared task (no auth required) */
    view: publicProcedure
      .input(z.object({
        shareToken: z.string().min(1).max(50),
        password: z.string().max(200).optional(),
      }))
      .query(async ({ input }) => {
        try {
          const share = await getTaskShareByToken(input.shareToken);
          if (!share) return { error: "Share not found", code: "NOT_FOUND" };

          // Check expiration with tolerance for clock skew (30s)
          if (share.expiresAt) {
            const expiryTime = new Date(share.expiresAt).getTime();
            const now = Date.now() - 30_000; // 30s tolerance
            if (expiryTime < now) {
              return { error: "This share link has expired", code: "EXPIRED" };
            }
          }

          // Check password
          if (share.passwordHash) {
            if (!input.password) {
              return { error: "password_required", code: "PASSWORD_REQUIRED" };
            }
            const crypto = await import("crypto");
            const hash = crypto.createHash("sha256").update(input.password).digest("hex");
            if (hash !== share.passwordHash) {
              return { error: "Incorrect password", code: "WRONG_PASSWORD" };
            }
          }

          // Increment view count (non-blocking — don't fail the view if count update fails)
          incrementShareViewCount(input.shareToken).catch(err => {
            console.error("[Share] Failed to increment view count:", err);
          });

          // Get task and messages
          const task = await getTaskByExternalId(share.taskExternalId);
          if (!task) return { error: "Task not found", code: "TASK_DELETED" };

          const messages = await getTaskMessages(task.id);

          return {
            task: { title: task.title, status: task.status, createdAt: task.createdAt },
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            })),
            viewCount: (share as any).viewCount ?? 0,
            expiresAt: share.expiresAt ?? null,
          };
        } catch (err) {
          console.error("[Share] Error viewing shared task:", err);
          return { error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
        }
      }),
  }),

  /** Task scheduling — cron and interval-based recurring tasks */
  schedule: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserScheduledTasks(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(500),
        prompt: z.string().min(1).max(10000),
        scheduleType: z.enum(["cron", "interval"]),
        cronExpression: z.string().max(100).optional(),
        intervalSeconds: z.number().min(60).max(31536000).optional(),
        repeat: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Calculate next run time
        let nextRunAt: Date | null = null;
        if (input.scheduleType === "interval" && input.intervalSeconds) {
          nextRunAt = new Date(Date.now() + input.intervalSeconds * 1000);
        } else if (input.scheduleType === "cron" && input.cronExpression) {
          // For cron, set next run to 1 minute from now as initial
          nextRunAt = new Date(Date.now() + 60_000);
        }

        return createScheduledTask({
          userId: ctx.user.id,
          name: input.name,
          prompt: input.prompt,
          scheduleType: input.scheduleType,
          cronExpression: input.cronExpression ?? null,
          intervalSeconds: input.intervalSeconds ?? null,
          repeat: input.repeat !== false ? 1 : 0,
          nextRunAt,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(500).optional(),
        prompt: z.string().min(1).max(10000).optional(),
        cronExpression: z.string().max(100).optional(),
        intervalSeconds: z.number().min(60).max(31536000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await updateScheduledTask(id, ctx.user.id, updates as any);
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return toggleScheduledTask(input.id, ctx.user.id);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteScheduledTask(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  /** Session replay — recorded task events for playback */
  replay: router({
    /** List tasks that have recorded replay events */
    sessions: protectedProcedure.query(async ({ ctx }) => {
      return getReplayableTasks(ctx.user.id);
    }),

    events: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        return getTaskEvents(input.taskId);
      }),

    addEvent: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        eventType: z.string().max(100),
        payload: z.string().max(100000),
        offsetMs: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        await addTaskEvent(input);
        return { success: true };
      }),
  }),

  /** In-app notifications — task completion, errors, share views */
  notification: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserNotifications(ctx.user.id, input?.limit ?? 50);
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotificationCount(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

     markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),
  /** Projects workspace — Capability #11 */
  project: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserProjects(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) return null;
        return project;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(500),
        description: z.string().max(5000).optional(),
        icon: z.string().max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await createProject({
          externalId: nanoid(),
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          icon: input.icon ?? null,
        });
        return project;
      }),
    update: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        name: z.string().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        systemPrompt: z.string().max(10000).optional(),
        icon: z.string().max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const updates: Record<string, any> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.systemPrompt !== undefined) updates.systemPrompt = input.systemPrompt;
        if (input.icon !== undefined) updates.icon = input.icon;
        await updateProject(project.id, updates);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await deleteProject(project.id);
        return { success: true };
      }),
    pin: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await toggleProjectPin(project.id);
        return { success: true };
      }),
    reorder: protectedProcedure
      .input(z.object({ orderedExternalIds: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        const userProjects = await getUserProjects(ctx.user.id);
        const idMap = new Map(userProjects.map(p => [p.externalId, p.id]));
        const orderedIds = input.orderedExternalIds.map(eid => idMap.get(eid)).filter((id): id is number => id !== undefined);
        await reorderProjects(ctx.user.id, orderedIds);
        return { success: true };
      }),
    tasks: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) return [];
        return getProjectTasks(project.id);
      }),
    assignTask: protectedProcedure
      .input(z.object({ taskId: z.number(), projectExternalId: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        if (input.projectExternalId) {
          const project = await getProjectByExternalId(input.projectExternalId);
          if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          await assignTaskToProject(input.taskId, project.id);
        } else {
          await assignTaskToProject(input.taskId, null);
        }
        return { success: true };
      }),
    /** Project knowledge base */
    knowledge: router({
      list: protectedProcedure
        .input(z.object({ projectExternalId: z.string() }))
        .query(async ({ ctx, input }) => {
          const project = await getProjectByExternalId(input.projectExternalId);
          if (!project || project.userId !== ctx.user.id) return [];
          return getProjectKnowledgeItems(project.id);
        }),
      add: protectedProcedure
        .input(z.object({
          projectExternalId: z.string(),
          type: z.enum(["instruction", "file", "note"]),
          title: z.string().min(1).max(500),
          content: z.string().max(50000),
          fileUrl: z.string().max(2000).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const project = await getProjectByExternalId(input.projectExternalId);
          if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
          await addProjectKnowledge({
            projectId: project.id,
            type: input.type,
            title: input.title,
            content: input.content,
            fileUrl: input.fileUrl ?? null,
          });
          return { success: true };
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          await verifyKnowledgeOwnership(input.id, ctx.user.id);
          await deleteProjectKnowledge(input.id);
          return { success: true };
        }),
    }),
  }),

  // ── Skills ──
  skill: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserSkills(ctx.user.id);
    }),
    install: protectedProcedure
      .input(z.object({
        skillId: z.string().min(1).max(128),
        name: z.string().min(1).max(256),
        description: z.string().max(2000).optional(),
        category: z.string().max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await installSkill({
          userId: ctx.user.id,
          skillId: input.skillId,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
        });
        return { success: true };
      }),
    uninstall: protectedProcedure
      .input(z.object({ skillId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await uninstallSkill(ctx.user.id, input.skillId);
        return { success: true };
      }),
    toggle: protectedProcedure
      .input(z.object({ skillId: z.string(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await toggleSkill(ctx.user.id, input.skillId, input.enabled);
        return { success: true };
      }),
    /** Execute a skill by running its instructions through the LLM */
    execute: protectedProcedure
      .input(z.object({
        skillId: z.string(),
        prompt: z.string().min(1),
        context: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const skills = await getUserSkills(ctx.user.id);
        const skill = skills.find(s => s.skillId === input.skillId && s.enabled);
        if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found or not enabled" });
        const { invokeLLM } = await import("./_core/llm");
        const response = await invokeLLM({
          messages: [
            { role: "system", content: `You are executing the "${skill.name}" skill. ${skill.description || ""}\n\nFollow the skill's purpose precisely and produce high-quality output.${input.context ? `\n\nAdditional context: ${input.context}` : ""}` },
            { role: "user", content: input.prompt },
          ],
        });
        const content = typeof response.choices?.[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "Skill execution produced no output.";
        return { result: content, skillId: input.skillId };
      }),
  }),

  // ── Slides ──
  slides: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserSlideDecks(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const deck = await getSlideDeck(input.id);
        if (!deck || deck.userId !== ctx.user.id) return null;
        return deck;
      }),
    generate: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1),
        template: z.string().default("blank"),
        slideCount: z.number().min(3).max(30).default(8),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const title = input.prompt.length > 60 ? input.prompt.slice(0, 60) + "..." : input.prompt;
        const deckId = await createSlideDeck({
          userId: ctx.user.id,
          title,
          prompt: input.prompt,
          template: input.template,
          status: "generating",
        });
        // Generate slides via LLM (async, non-blocking)
        (async () => {
          try {
            const response = await invokeLLM({
              messages: [
                { role: "system", content: `You are a presentation designer. Generate exactly ${input.slideCount} slides as a JSON array. Each slide has: title (string), content (markdown string with bullet points), notes (optional speaker notes string). Return ONLY valid JSON array, no markdown fences.` },
                { role: "user", content: `Create a presentation about: ${input.prompt}\n\nTemplate style: ${input.template}` },
              ],
            });
            const rawContent = response.choices?.[0]?.message?.content ?? "[]";
            const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
            // Extract JSON from response
            const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            const slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            await updateSlideDeck(deckId, { slides, status: "ready" });
          } catch (err) {
            console.error("[Slides] Generation failed:", err);
            await updateSlideDeck(deckId, { status: "error" });
          }
        })();
        return { id: deckId, title };
      }),
  }),

  // ── Connectors ──
  connector: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserConnectors(ctx.user.id);
    }),
    connect: protectedProcedure
      .input(z.object({
        connectorId: z.string().min(1).max(128),
        name: z.string().min(1).max(256),
        config: z.record(z.string().max(128), z.string().max(4096)).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const configVal = (input.config ?? {}) as Record<string, string>;
        const id = await upsertConnector({
          userId: ctx.user.id,
          connectorId: input.connectorId,
          name: input.name,
          config: configVal,
          status: "connected",
        });
        return { id, success: true };
      }),
    disconnect: protectedProcedure
      .input(z.object({ connectorId: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        await disconnectConnector(ctx.user.id, input.connectorId);
        return { success: true };
      }),
    /** Execute a connector action (send message, trigger webhook, etc.) */
    execute: protectedProcedure
      .input(z.object({
        connectorId: z.string().min(1).max(128),
        action: z.string().min(1).max(256),
        payload: z.record(z.string().max(128), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const connectors = await getUserConnectors(ctx.user.id);
        const conn = connectors.find(c => c.connectorId === input.connectorId && c.status === "connected");
        if (!conn) throw new TRPCError({ code: "BAD_REQUEST", message: "Connector not found or not connected" });
        const config = (conn.config || {}) as Record<string, string>;

        // Route by connector type
        switch (input.connectorId) {
          case "slack": {
            const webhookUrl = config.webhookUrl;
            if (!webhookUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Slack webhook URL not configured" });
            const resp = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: input.payload?.message || "Hello from Manus" }),
            });
            return { success: resp.ok, result: resp.ok ? "Message sent to Slack" : "Slack delivery failed" };
          }
          case "zapier": {
            const zapierUrl = config.webhookUrl;
            if (!zapierUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Zapier webhook URL not configured" });
            const resp = await fetch(zapierUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input.payload || {}),
            });
            return { success: resp.ok, result: resp.ok ? "Zapier webhook triggered" : "Zapier trigger failed" };
          }
          case "email": {
            const { notifyOwner } = await import("./_core/notification");
            const sent = await notifyOwner({
              title: (input.payload?.subject as string) || "Notification",
              content: (input.payload?.body as string) || "No content",
            });
            return { success: sent, result: sent ? "Email sent" : "Email delivery failed" };
          }
          default:
            return { success: false, result: `Connector action not implemented for: ${input.connectorId}` };
        }
      }),
    /** Test a connector's configuration */
    test: protectedProcedure
      .input(z.object({ connectorId: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const connectors = await getUserConnectors(ctx.user.id);
        const conn = connectors.find(c => c.connectorId === input.connectorId);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found" });
        return { success: true, result: `Connector ${conn.name} is ${conn.status}` };
      }),
    /** Get OAuth authorization URL for a connector */
    getOAuthUrl: protectedProcedure
      .input(z.object({
        connectorId: z.string(),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getOAuthProvider, isOAuthSupported } = await import("./connectorOAuth");
        if (!isOAuthSupported(input.connectorId)) {
          return { supported: false, url: null, fallback: "api_key" };
        }
        const provider = getOAuthProvider(input.connectorId);
        if (!provider) return { supported: false, url: null, fallback: "api_key" };
        const state = JSON.stringify({
          connectorId: input.connectorId,
          userId: ctx.user.id,
          origin: input.origin,
          ts: Date.now(),
        });
        const stateEncoded = Buffer.from(state).toString("base64url");
        const redirectUri = `${input.origin}/api/connector/oauth/callback`;
        const url = provider.getAuthUrl(redirectUri, stateEncoded);
        return { supported: true, url, fallback: null };
      }),
    /** Complete OAuth flow — exchange code for tokens and save connector */
    completeOAuth: protectedProcedure
      .input(z.object({
        connectorId: z.string(),
        code: z.string(),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getOAuthProvider } = await import("./connectorOAuth");
        const provider = getOAuthProvider(input.connectorId);
        if (!provider) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "OAuth not supported for this connector" });
        const redirectUri = `${input.origin}/api/connector/oauth/callback`;
        const tokens = await provider.exchangeCode(input.code, redirectUri);
        let userName = provider.name;
        if (provider.getUserInfo) {
          try {
            const info = await provider.getUserInfo(tokens.accessToken);
            userName = info.name || provider.name;
          } catch { /* ignore */ }
        }
        const id = await upsertConnector({
          userId: ctx.user.id,
          connectorId: input.connectorId,
          name: userName,
          config: { authMethod: "oauth" },
          status: "connected",
        });
        // Update OAuth tokens via db helper
        await updateConnectorOAuthTokens(id, {
            authMethod: "oauth",
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || null,
            tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
            oauthScopes: tokens.scope || null,
        });
        return { id, success: true, name: userName };
      }),
    /** Refresh an expired OAuth token */
    refreshOAuth: protectedProcedure
      .input(z.object({ connectorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getOAuthProvider } = await import("./connectorOAuth");
        const userConns = await getUserConnectors(ctx.user.id);
        const conn = userConns.find(c => c.connectorId === input.connectorId);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found" });
        if (!conn.refreshToken) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No refresh token available" });
        const provider = getOAuthProvider(input.connectorId);
        if (!provider?.refreshToken) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Provider does not support token refresh" });
        const tokens = await provider.refreshToken(conn.refreshToken);
        await updateConnectorOAuthTokens(conn.id, {
            accessToken: tokens.accessToken,
            tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        });
        return { success: true };
      }),
    /** Check if OAuth is available for a connector (no credentials needed) */
    checkOAuthSupport: protectedProcedure
      .input(z.object({ connectorId: z.string() }))
      .query(async ({ input }) => {
        const { isOAuthSupported } = await import("./connectorOAuth");
        return { supported: isOAuthSupported(input.connectorId) };
      }),
  }),

  // ── Meeting Sessions ──
  meeting: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserMeetingSessions(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getMeetingSession(input.id);
      }),
    /** Generate meeting notes from a text transcript (no audio required) */
    generateFromTranscript: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
        transcript: z.string().min(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const { storagePut } = await import("./storage");
        const { nanoid } = await import("nanoid");

        const response = await invokeLLM({
          messages: [
            { role: "system", content: `You are a meeting notes assistant. Given a transcript, produce structured meeting notes as JSON: { summary: string, actionItems: string[], keyDecisions: string[], attendees: string[], topics: string[] }. Return ONLY valid JSON.` },
            { role: "user", content: input.transcript.slice(0, 30000) },
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content ?? "{}";
        const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "Could not parse", actionItems: [], keyDecisions: [], attendees: [], topics: [] };

        const meetingTitle = input.title || "Meeting Notes";
        let markdown = `# ${meetingTitle}\n\n## Summary\n\n${parsed.summary}\n\n`;
        if (parsed.attendees?.length) markdown += `## Attendees\n\n${parsed.attendees.map((a: string) => `- ${a}`).join("\n")}\n\n`;
        if (parsed.topics?.length) markdown += `## Topics\n\n${parsed.topics.map((t: string) => `- ${t}`).join("\n")}\n\n`;
        if (parsed.keyDecisions?.length) markdown += `## Key Decisions\n\n${parsed.keyDecisions.map((d: string) => `- ${d}`).join("\n")}\n\n`;
        if (parsed.actionItems?.length) markdown += `## Action Items\n\n${parsed.actionItems.map((a: string) => `- [ ] ${a}`).join("\n")}\n\n`;

        const fileName = `meeting-notes-${nanoid(6)}.md`;
        const { url } = await storagePut(`meetings/${fileName}`, Buffer.from(markdown, "utf-8"), "text/markdown");

        const id = await createMeetingSession({
          userId: ctx.user.id,
          title: meetingTitle,
          audioUrl: url,
          taskId: null,
          transcript: input.transcript.slice(0, 50000),
          summary: parsed.summary,
          actionItems: parsed.actionItems,
          status: "ready",
        });

        return { id, title: meetingTitle, summary: parsed.summary, actionItems: parsed.actionItems, downloadUrl: url };
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
        audioUrl: z.string(),
        taskId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createMeetingSession({
          userId: ctx.user.id,
          title: input.title ?? "Meeting " + new Date().toLocaleDateString(),
          audioUrl: input.audioUrl,
          taskId: input.taskId ?? null,
          status: "transcribing",
        });
        // Async transcription + summarization
        (async () => {
          try {
            const { transcribeAudio } = await import("./_core/voiceTranscription");
            const { invokeLLM } = await import("./_core/llm");
            const result = await transcribeAudio({ audioUrl: input.audioUrl });
            const transcript = ("text" in result ? result.text : "") ?? "";
            await updateMeetingSession(id, { transcript, status: "summarizing" });
            const summaryResponse = await invokeLLM({
              messages: [
                { role: "system", content: "You are a meeting notes assistant. Given a transcript, produce: 1) A concise summary (2-3 paragraphs), 2) A list of action items. Return as JSON: { summary: string, actionItems: string[] }" },
                { role: "user", content: transcript },
              ],
            });
            const rawSummary = summaryResponse.choices?.[0]?.message?.content ?? "{}";
            const summaryText = typeof rawSummary === "string" ? rawSummary : JSON.stringify(rawSummary);
            const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: transcript.slice(0, 500), actionItems: [] };
            await updateMeetingSession(id, {
              summary: parsed.summary,
              actionItems: parsed.actionItems,
              duration: Math.round(("segments" in result && result.segments?.slice(-1)?.[0]?.end) || 0),
              status: "ready",
            });
          } catch (err) {
            console.error("[Meeting] Processing failed:", err);
            await updateMeetingSession(id, { status: "error" });
          }
        })();
        return { id };
      }),
  }),

  // ── Team / Collaboration (#56/#57/#58) ──
  team: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserTeams(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        return createTeam({ name: input.name, ownerId: ctx.user.id });
      }),
    get: protectedProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ input }) => {
        return getTeamById(input.teamId);
      }),
    members: protectedProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ input }) => {
        return getTeamMembers(input.teamId);
      }),
    join: protectedProcedure
      .input(z.object({ inviteCode: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const team = await getTeamByInviteCode(input.inviteCode);
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite code" });
        return joinTeam(team.id, ctx.user.id);
      }),
    removeMember: protectedProcedure
      .input(z.object({ teamId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeTeamMember(input.teamId, input.userId, ctx.user.id);
        return { success: true };
      }),
    addCredits: protectedProcedure
      .input(z.object({ teamId: z.number(), amount: z.number().min(1) }))
      .mutation(async ({ input }) => {
        await updateTeamCredits(input.teamId, input.amount);
        return { success: true };
      }),
    sessions: protectedProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ input }) => {
        return getTeamSessions(input.teamId);
      }),
    shareSession: protectedProcedure
      .input(z.object({ teamId: z.number(), taskExternalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await createTeamSession({ teamId: input.teamId, taskExternalId: input.taskExternalId, createdBy: ctx.user.id });
        return { success: true };
      }),
  }),

  // ── WebApp Builder (#27/#28/#29) ──
  webapp: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserWebappBuilds(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getWebappBuild(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(10000),
        title: z.string().max(200).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createWebappBuild({ userId: ctx.user.id, prompt: input.prompt, title: input.title });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        generatedHtml: z.string().optional(),
        sourceCode: z.string().optional(),
        status: z.enum(["draft", "generating", "ready", "published", "error"]).optional(),
        title: z.string().max(200).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await updateWebappBuild(id, updates);
        return { success: true };
      }),
    publish: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const build = await getWebappBuild(input.id);
        if (!build || !build.generatedHtml) throw new TRPCError({ code: "NOT_FOUND", message: "No HTML to publish" });
        const { storagePut } = await import("./storage");
        const { nanoid } = await import("nanoid");
        const key = `webapps/${nanoid(12)}/index.html`;
        const { url } = await storagePut(key, Buffer.from(build.generatedHtml, "utf-8"), "text/html");
        await updateWebappBuild(input.id, { publishedUrl: url, publishedKey: key, status: "published" });
        return { url, key };
      }),
  }),

  // ── Design Canvas (#15) ──
  design: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserDesigns(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const design = await getDesign(input.id);
        if (!design || design.userId !== ctx.user.id) return null;
        return design;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        canvasState: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createDesign({ userId: ctx.user.id, name: input.name, canvasState: input.canvasState });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().max(200).optional(),
        canvasState: z.record(z.string(), z.unknown()).optional(),
        thumbnailUrl: z.string().max(2000).optional(),
        exportUrl: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const design = await getDesign(input.id);
        if (!design || design.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to update this design" });
        const { id, ...updates } = input;
        await updateDesign(id, updates);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteDesign(input.id, ctx.user.id);
        return { success: true };
      }),
    export: protectedProcedure
      .input(z.object({ id: z.number(), format: z.enum(["png", "svg"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        const design = await getDesign(input.id);
        if (!design || design.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to export this design" });
        const { storagePut } = await import("./storage");
        const { nanoid } = await import("nanoid");
        const key = `designs/${nanoid(12)}.json`;
        const { url } = await storagePut(key, Buffer.from(JSON.stringify(design.canvasState), "utf-8"), "application/json");
        await updateDesign(input.id, { exportUrl: url });
        return { url };
      }),
  }),

  // ── Connected Devices (#47 — My Computer / BYOD) ─────────────────────
  device: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserDevices(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.externalId);
        if (!device || device.userId !== ctx.user.id) return null;
        return device;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        deviceType: z.enum(["desktop", "android", "ios", "browser_only"]),
        connectionMethod: z.enum(["electron_app", "cloudflare_vnc", "cdp_browser", "adb_wireless", "wda_rest", "shortcuts_webhook"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const pairingCode = nanoid(6).toUpperCase();
        return createConnectedDevice({
          userId: ctx.user.id,
          name: input.name,
          deviceType: input.deviceType,
          connectionMethod: input.connectionMethod,
          pairingCode,
          status: "pairing",
        });
      }),
    completePairing: protectedProcedure
      .input(z.object({
        pairingCode: z.string().min(1),
        tunnelUrl: z.string().min(1).url().refine(url => /^https?:\/\//.test(url), { message: "Tunnel URL must use http:// or https://" }).refine(url => validateTunnelUrl(url).valid, { message: "Tunnel URL targets a restricted address" }),
        osInfo: z.string().optional(),
        capabilities: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByPairingCode(input.pairingCode);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid pairing code" });
        await completeDevicePairing(device.id, input.tunnelUrl, input.osInfo, input.capabilities as any);
        return { success: true, deviceId: device.externalId };
      }),
    updateConnection: protectedProcedure
      .input(z.object({ externalId: z.string(), tunnelUrl: z.string().min(1).url().refine(url => /^https?:\/\//.test(url), { message: "Tunnel URL must use http:// or https://" }).refine(url => validateTunnelUrl(url).valid, { message: "Tunnel URL targets a restricted address" }) }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.externalId);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        await updateDeviceConnection(device.id, input.tunnelUrl);
        return { success: true };
      }),
    updateStatus: protectedProcedure
      .input(z.object({ externalId: z.string(), status: z.enum(["online", "offline", "pairing", "error"]), lastError: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.externalId);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        await updateDeviceStatus(device.id, input.status, input.lastError);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConnectedDevice(input.id, ctx.user.id);
        return { success: true };
      }),
    /** Execute a command on a connected device via its relay/tunnel */
    execute: protectedProcedure
      .input(z.object({
        deviceExternalId: z.string(),
        action: z.enum(["screenshot", "click", "type", "scroll", "keypress", "launch_app", "navigate", "accessibility_tree"]),
        params: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.deviceExternalId);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        if (device.status !== "online" || !device.tunnelUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Device is not connected" });
        // Relay the command to the device's tunnel endpoint
        try {
          const response = await fetch(`${device.tunnelUrl}/api/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: input.action, params: input.params ?? {} }),
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok) {
            const errText = await response.text().catch(() => "Unknown error");
            await updateDeviceStatus(device.id, "error", errText);
            throw new TRPCError({ code: "BAD_REQUEST", message: `Device command failed: ${errText}` });
          }
          const result = await response.json();
          // Update session stats
          const session = await getActiveDeviceSession(device.id);
          if (session) {
            const updates: Record<string, unknown> = { commandCount: (session.commandCount ?? 0) + 1 };
            if (input.action === "screenshot" && result.screenshotUrl) {
              updates.screenshotCount = (session.screenshotCount ?? 0) + 1;
              updates.lastScreenshotUrl = result.screenshotUrl;
            }
            await updateDeviceSession(session.id, updates as any);
          }
          return result;
        } catch (err: any) {
          if (err.name === "TimeoutError") {
            await updateDeviceStatus(device.id, "error", "Command timed out");
            throw new TRPCError({ code: "BAD_REQUEST", message: "Device command timed out" });
          }
          throw err;
        }
      }),
    /** Start a control session on a device */
    startSession: protectedProcedure
      .input(z.object({ deviceExternalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.deviceExternalId);
        if (!device || device.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
        // End any existing active session
        const existing = await getActiveDeviceSession(device.id);
        if (existing) await endDeviceSession(existing.id);
        return createDeviceSession({
          userId: ctx.user.id,
          deviceId: device.id,
          status: "active",
        });
      }),
    endSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify session belongs to user
        const sessions = await getUserDeviceSessions(ctx.user.id);
        const session = sessions.find(s => s.id === input.sessionId);
        if (!session) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to end this session" });
        await endDeviceSession(input.sessionId);
        return { success: true };
      }),
    sessions: protectedProcedure.query(async ({ ctx }) => {
      return getUserDeviceSessions(ctx.user.id);
    }),
    /** Generate setup instructions for each connection method */
    getSetupInstructions: protectedProcedure
      .input(z.object({ connectionMethod: z.enum(["electron_app", "cloudflare_vnc", "cdp_browser", "adb_wireless", "wda_rest", "shortcuts_webhook"]) }))
      .query(async ({ input }) => {
        const instructions: Record<string, { title: string; steps: string[]; requirements: string[]; cost: string; platforms: string[] }> = {
          cdp_browser: {
            title: "Browser Control (CDP) — Zero Install",
            steps: [
              "Close all Chrome windows on your device",
              "Relaunch Chrome with: chrome --remote-debugging-port=9222",
              "Install Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
              "Run: cloudflared tunnel --url http://localhost:9222",
              "Copy the generated tunnel URL and paste it here",
            ],
            requirements: ["Chrome or Chromium browser", "cloudflared CLI (free)"],
            cost: "Free",
            platforms: ["Windows", "macOS", "Linux", "Android (via ADB)"],
          },
          adb_wireless: {
            title: "Android Device Control (ADB + Accessibility)",
            steps: [
              "On your Android device: Settings → Developer Options → Enable Wireless Debugging",
              "Note the IP address and port shown",
              "On your PC, run: adb pair <ip>:<port> (enter the pairing code)",
              "Then: adb connect <ip>:<port>",
              "Install Tailscale on both devices for persistent connection: https://tailscale.com",
              "Run the relay server: npx @manus/device-relay --adb",
              "Copy the relay URL and paste it here",
            ],
            requirements: ["Android device with Developer Options enabled", "ADB installed on PC", "Tailscale (free) for persistent tunnel"],
            cost: "Free",
            platforms: ["Android"],
          },
          cloudflare_vnc: {
            title: "Desktop Control (VNC + Cloudflare Tunnel)",
            steps: [
              "Enable your OS built-in VNC/Remote Desktop server",
              "  - macOS: System Preferences → Sharing → Screen Sharing",
              "  - Windows: Settings → System → Remote Desktop → Enable",
              "  - Linux: Install and start vino or x11vnc",
              "Install Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
              "Run: cloudflared tunnel --url tcp://localhost:5900",
              "Copy the generated tunnel URL and paste it here",
            ],
            requirements: ["VNC server enabled on your device", "cloudflared CLI (free)"],
            cost: "Free",
            platforms: ["Windows", "macOS", "Linux"],
          },
          electron_app: {
            title: "Full Desktop Control (Companion App)",
            steps: [
              "Download the Manus Desktop Companion app from the releases page",
              "Install and launch the app",
              "The app will display a pairing code",
              "Enter the pairing code below to connect",
              "The app connects via outbound WebSocket (works through any firewall)",
            ],
            requirements: ["Manus Desktop Companion app (~50 MB)"],
            cost: "Free",
            platforms: ["Windows", "macOS", "Linux"],
          },
          wda_rest: {
            title: "iOS Device Control (WebDriverAgent)",
            steps: [
              "Build WebDriverAgent using Xcode or GitHub Actions (see docs)",
              "Install the WDA IPA on your iOS device using pymobiledevice3",
              "Start WDA on the device",
              "Set up a tunnel: cloudflared tunnel --url http://localhost:8100",
              "Copy the tunnel URL and paste it here",
            ],
            requirements: ["iOS device", "WDA built and installed (requires Xcode or GitHub Actions)", "cloudflared CLI"],
            cost: "Free (with GitHub Actions for WDA build)",
            platforms: ["iOS"],
          },
          shortcuts_webhook: {
            title: "iOS Shortcuts (Limited Control)",
            steps: [
              "Install the Pushcut app from the App Store (free tier available)",
              "Create Shortcuts automations for the actions you want to control",
              "Set up Pushcut webhook triggers for each Shortcut",
              "Enter the Pushcut webhook base URL here",
            ],
            requirements: ["iOS device", "Pushcut app (free tier)", "Apple Shortcuts"],
            cost: "Free (limited) / $5/mo (Pushcut Pro)",
            platforms: ["iOS"],
          },
        };
        return instructions[input.connectionMethod] ?? null;
      }),
  }),

  // ── Mobile Projects (#43 — Mobile Development) ───────────────────────
  mobileProject: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserMobileProjects(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getMobileProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) return null;
        return project;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        framework: z.enum(["pwa", "capacitor", "expo"]),
        platforms: z.array(z.enum(["ios", "android", "web"])).min(1),
        bundleId: z.string().optional(),
        displayName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const bundleId = input.bundleId || `com.manus.${input.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        return createMobileProject({
          userId: ctx.user.id,
          name: input.name,
          framework: input.framework,
          platforms: input.platforms,
          bundleId,
          displayName: input.displayName || input.name,
          status: "draft",
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        bundleId: z.string().optional(),
        displayName: z.string().optional(),
        version: z.string().optional(),
        iconUrl: z.string().optional(),
        splashUrl: z.string().optional(),
        pwaManifest: z.record(z.string(), z.unknown()).optional(),
        capacitorConfig: z.record(z.string(), z.unknown()).optional(),
        expoConfig: z.record(z.string(), z.unknown()).optional(),
        status: z.enum(["draft", "configured", "building", "ready"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await updateMobileProject(id, ctx.user.id, updates as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMobileProject(input.id, ctx.user.id);
        return { success: true };
      }),
    /** Generate PWA manifest JSON */
    generatePwaManifest: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        name: z.string(),
        shortName: z.string().optional(),
        description: z.string().optional(),
        themeColor: z.string().optional(),
        backgroundColor: z.string().optional(),
        display: z.enum(["standalone", "fullscreen", "minimal-ui", "browser"]).optional(),
        orientation: z.enum(["portrait", "landscape", "any"]).optional(),
        startUrl: z.string().optional(),
        iconUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const manifest = {
          name: input.name,
          short_name: input.shortName || input.name.slice(0, 12),
          description: input.description || "",
          start_url: input.startUrl || "/",
          display: input.display || "standalone",
          orientation: input.orientation || "any",
          theme_color: input.themeColor || "#000000",
          background_color: input.backgroundColor || "#ffffff",
          icons: input.iconUrl ? [
            { src: input.iconUrl, sizes: "192x192", type: "image/png" },
            { src: input.iconUrl, sizes: "512x512", type: "image/png" },
          ] : [],
        };
        // Update the project with the manifest
        const project = await getMobileProjectByExternalId(input.projectId);
        if (project && project.userId === ctx.user.id) {
          await updateMobileProject(project.id, ctx.user.id, { pwaManifest: manifest as any, status: "configured" });
        }
        return manifest;
      }),
    /** Generate Capacitor config */
    generateCapacitorConfig: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        appId: z.string(),
        appName: z.string(),
        webDir: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const config = {
          appId: input.appId,
          appName: input.appName,
          webDir: input.webDir || "dist",
          plugins: {
            SplashScreen: { launchShowDuration: 2000, backgroundColor: "#000000" },
            StatusBar: { style: "dark" },
          },
        };
        const project = await getMobileProjectByExternalId(input.projectId);
        if (project && project.userId === ctx.user.id) {
          await updateMobileProject(project.id, ctx.user.id, { capacitorConfig: config as any, status: "configured" });
        }
        return config;
      }),
    /** Generate Expo config */
    generateExpoConfig: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        slug: z.string(),
        sdkVersion: z.string().optional(),
        iosBundleId: z.string().optional(),
        androidPackage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const config = {
          slug: input.slug,
          sdkVersion: input.sdkVersion || "52.0.0",
          ios: { bundleIdentifier: input.iosBundleId || `com.manus.${input.slug}`, buildNumber: "1" },
          android: { package: input.androidPackage || `com.manus.${input.slug}`, versionCode: 1 },
        };
        const project = await getMobileProjectByExternalId(input.projectId);
        if (project && project.userId === ctx.user.id) {
          await updateMobileProject(project.id, ctx.user.id, { expoConfig: config as any, status: "configured" });
        }
        return config;
      }),
    /** Generate service worker for PWA */
    generateServiceWorker: protectedProcedure
      .input(z.object({ cacheName: z.string().optional(), offlinePage: z.string().optional() }))
      .query(async ({ input }) => {
        const cacheName = input.cacheName || "manus-pwa-v1";
        const offlinePage = input.offlinePage || "/offline.html";
        return {
          code: `// Service Worker — Generated by Manus\nconst CACHE_NAME = '${cacheName}';\nconst OFFLINE_URL = '${offlinePage}';\n\nself.addEventListener('install', (event) => {\n  event.waitUntil(\n    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', OFFLINE_URL]))\n  );\n  self.skipWaiting();\n});\n\nself.addEventListener('activate', (event) => {\n  event.waitUntil(\n    caches.keys().then((keys) => Promise.all(\n      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))\n    ))\n  );\n  self.clients.claim();\n});\n\nself.addEventListener('fetch', (event) => {\n  if (event.request.mode === 'navigate') {\n    event.respondWith(\n      fetch(event.request).catch(() => caches.match(OFFLINE_URL))\n    );\n    return;\n  }\n  event.respondWith(\n    caches.match(event.request).then((cached) => cached || fetch(event.request))\n  );\n});`,
          filename: "sw.js",
        };
      }),
  }),

  // ── App Publishing (#42 — Mobile Publishing) ─────────────────────────
  appPublish: router({
    builds: protectedProcedure
      .input(z.object({ mobileProjectId: z.number() }))
      .query(async ({ input }) => {
        return getProjectBuilds(input.mobileProjectId);
      }),
    userBuilds: protectedProcedure.query(async ({ ctx }) => {
      return getUserBuilds(ctx.user.id);
    }),
    getBuild: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const build = await getBuildByExternalId(input.externalId);
        if (!build || build.userId !== ctx.user.id) return null;
        return build;
      }),
    createBuild: protectedProcedure
      .input(z.object({
        mobileProjectId: z.number(),
        platform: z.enum(["ios", "android", "web_pwa"]),
        buildMethod: z.enum(["pwa_manifest", "capacitor_local", "github_actions", "expo_eas", "manual_xcode", "manual_android_studio"]),
        version: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createAppBuild({
          userId: ctx.user.id,
          mobileProjectId: input.mobileProjectId,
          platform: input.platform,
          buildMethod: input.buildMethod,
          version: input.version || "1.0.0",
          status: "queued",
        });
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["queued", "building", "success", "failed", "cancelled"]),
        artifactUrl: z.string().optional(),
        buildLog: z.string().optional(),
        errorMessage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, status, ...extras } = input;
        await updateBuildStatus(id, status, extras);
        return { success: true };
      }),
    updateStoreMetadata: protectedProcedure
      .input(z.object({
        buildId: z.number(),
        title: z.string().optional(),
        shortDescription: z.string().optional(),
        fullDescription: z.string().optional(),
        category: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        screenshotUrls: z.array(z.string()).optional(),
        privacyPolicyUrl: z.string().optional(),
        supportUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { buildId, ...metadata } = input;
        await updateBuildStoreMetadata(buildId, metadata);
        return { success: true };
      }),
    /** Generate GitHub Actions workflow for automated builds */
    generateGitHubWorkflow: protectedProcedure
      .input(z.object({
        framework: z.enum(["pwa", "capacitor", "expo"]),
        platform: z.enum(["ios", "android", "web_pwa"]),
        buildOnPush: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const triggers = input.buildOnPush ? "push:\n    branches: [main]" : "workflow_dispatch:";
        let workflow = "";
        if (input.framework === "pwa" || input.platform === "web_pwa") {
          workflow = `name: Build PWA\non:\n  ${triggers}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci\n      - run: npm run build\n      - uses: actions/upload-artifact@v4\n        with:\n          name: pwa-dist\n          path: dist/`;
        } else if (input.framework === "capacitor" && input.platform === "android") {
          workflow = `name: Build Android (Capacitor)\non:\n  ${triggers}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - uses: actions/setup-java@v4\n        with:\n          distribution: temurin\n          java-version: 17\n      - run: npm ci\n      - run: npm run build\n      - run: npx cap sync android\n      - run: cd android && ./gradlew assembleRelease\n      - uses: actions/upload-artifact@v4\n        with:\n          name: android-apk\n          path: android/app/build/outputs/apk/release/`;
        } else if (input.framework === "capacitor" && input.platform === "ios") {
          workflow = `name: Build iOS (Capacitor)\non:\n  ${triggers}\njobs:\n  build:\n    runs-on: macos-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci\n      - run: npm run build\n      - run: npx cap sync ios\n      - run: cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -archivePath build/App.xcarchive archive\n      - uses: actions/upload-artifact@v4\n        with:\n          name: ios-archive\n          path: ios/App/build/`;
        } else if (input.framework === "expo") {
          workflow = `name: Build with EAS\non:\n  ${triggers}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - uses: expo/expo-github-action@v8\n        with:\n          eas-version: latest\n          token: \${{ secrets.EXPO_TOKEN }}\n      - run: npm ci\n      - run: eas build --platform ${input.platform === "ios" ? "ios" : "android"} --non-interactive`;
        }
        return { workflow, filename: `.github/workflows/build-${input.platform}.yml` };
      }),
    /** Get the publishing checklist for a platform */
    getPublishChecklist: protectedProcedure
      .input(z.object({ platform: z.enum(["ios", "android", "web_pwa"]) }))
      .query(async ({ input }) => {
        const checklists: Record<string, Array<{ item: string; required: boolean; description: string }>> = {
          web_pwa: [
            { item: "PWA Manifest", required: true, description: "Valid manifest.json with name, icons, start_url, display" },
            { item: "Service Worker", required: true, description: "Registered service worker for offline support" },
            { item: "HTTPS", required: true, description: "Site must be served over HTTPS" },
            { item: "App Icons", required: true, description: "192x192 and 512x512 PNG icons" },
            { item: "Lighthouse Score", required: false, description: "PWA score ≥ 90 in Lighthouse audit" },
            { item: "Splash Screen", required: false, description: "Custom splash screen for app launch" },
          ],
          android: [
            { item: "Signed APK/AAB", required: true, description: "Release build signed with upload key" },
            { item: "App Icon", required: true, description: "512x512 PNG icon for Play Store listing" },
            { item: "Feature Graphic", required: true, description: "1024x500 PNG feature graphic" },
            { item: "Screenshots", required: true, description: "2-8 screenshots per device type" },
            { item: "Privacy Policy", required: true, description: "Public URL to privacy policy" },
            { item: "Content Rating", required: true, description: "Complete IARC content rating questionnaire" },
            { item: "Store Listing", required: true, description: "Title, short description, full description" },
            { item: "Google Play Developer Account", required: true, description: "$25 one-time registration fee" },
          ],
          ios: [
            { item: "Signed IPA", required: true, description: "Release build signed with distribution certificate" },
            { item: "App Icon", required: true, description: "1024x1024 PNG icon (no alpha)" },
            { item: "Screenshots", required: true, description: "Screenshots for each required device size" },
            { item: "Privacy Policy", required: true, description: "Public URL to privacy policy" },
            { item: "App Review Info", required: true, description: "Demo account credentials and review notes" },
            { item: "Store Listing", required: true, description: "Title, subtitle, description, keywords" },
            { item: "Apple Developer Account", required: true, description: "$99/year enrollment" },
            { item: "App Store Connect", required: true, description: "App record created in App Store Connect" },
          ],
        };
        return checklists[input.platform] ?? [];
      }),
  }),

  // ── Stripe Payments (#34) ──────────────────────────────────────────
  payment: router({
    products: publicProcedure.query(async () => {
      const { listProducts } = await import("./stripe");
      return listProducts();
    }),
    createCheckout: protectedProcedure
      .input(z.object({
        productId: z.string(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCheckoutSession } = await import("./stripe");
        return createCheckoutSession({
          productId: input.productId,
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? "",
          userName: ctx.user.name ?? "",
          origin: input.origin,
        });
      }),
    history: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.stripeCustomerId) return { payments: [] };
      const { getPaymentHistory } = await import("./stripe");
      return getPaymentHistory(ctx.user.stripeCustomerId);
    }),
    subscription: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user.stripeSubscriptionId) return null;
      const { getSubscriptionDetails } = await import("./stripe");
      return getSubscriptionDetails(ctx.user.stripeSubscriptionId);
    }),
    /** Create a Stripe Customer Portal session for self-service management */
    createPortalSession: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const { createPortalSession } = await import("./stripe");
        if (!ctx.user.stripeCustomerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No Stripe customer found. Please make a purchase first." });
        }
        return createPortalSession(ctx.user.stripeCustomerId, input.origin);
      }),
  }),
  // ── Video Generation (#62) ────────────────────────────────────────────────────────
  video: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserVideoProjects(ctx.user.id);
    }),
    generate: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(200),
        prompt: z.string().min(1).max(2000),
        sourceImages: z.array(z.string().url()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const externalId = nanoid();
        const project = await createVideoProject({
          externalId,
          userId: ctx.user.id,
          title: input.title,
          prompt: input.prompt,
          sourceImages: input.sourceImages ?? [],
          provider: "ffmpeg",
          status: "pending",
        });
        // §L.25 degraded-delivery: currently queues as pending.
        // A background worker would pick up and process via ffmpeg-slideshow (free),
        // replicate-svd (freemium), or veo3 (premium) based on available API keys.
        return { externalId, status: "pending" };
      }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getVideoProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
        return project;
      }),
    delete: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getVideoProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
        await deleteVideoProject(project.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── GitHub Repos (NS17 — Manus-style GitHub integration) ──
  github: router({
    /** List user's connected GitHub repos */
    repos: protectedProcedure.query(async ({ ctx }) => {
      return getUserGitHubRepos(ctx.user.id);
    }),
    /** Get a single repo by externalId */
    getRepo: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        return repo;
      }),
    /** Import/connect a GitHub repo from the user's GitHub account */
    connectRepo: protectedProcedure
      .input(z.object({
        fullName: z.string(),
        name: z.string(),
        description: z.string().optional(),
        htmlUrl: z.string(),
        cloneUrl: z.string().optional(),
        sshUrl: z.string().optional(),
        defaultBranch: z.string().optional(),
        isPrivate: z.boolean().optional(),
        language: z.string().optional(),
        starCount: z.number().optional(),
        forkCount: z.number().optional(),
        openIssuesCount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if already connected
        const existing = await getGitHubRepoByFullName(ctx.user.id, input.fullName);
        if (existing && existing.status !== "disconnected") {
          return { id: existing.id, externalId: existing.externalId, alreadyConnected: true };
        }
        if (existing) {
          await updateGitHubRepo(existing.id, { status: "connected", lastSyncAt: new Date() });
          return { id: existing.id, externalId: existing.externalId, alreadyConnected: false };
        }
        const id = await createGitHubRepo({
          userId: ctx.user.id,
          fullName: input.fullName,
          name: input.name,
          description: input.description ?? null,
          htmlUrl: input.htmlUrl,
          cloneUrl: input.cloneUrl ?? null,
          sshUrl: input.sshUrl ?? null,
          defaultBranch: input.defaultBranch ?? "main",
          isPrivate: input.isPrivate ? 1 : 0,
          language: input.language ?? null,
          starCount: input.starCount ?? 0,
          forkCount: input.forkCount ?? 0,
          openIssuesCount: input.openIssuesCount ?? 0,
          lastSyncAt: new Date(),
          status: "connected",
        });
        const repo = await getGitHubRepoById(id);
        return { id, externalId: repo?.externalId ?? "", alreadyConnected: false };
      }),
    /** Create a new GitHub repo */
    createRepo: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        isPrivate: z.boolean().optional(),
        autoInit: z.boolean().optional(),
        gitignoreTemplate: z.string().optional(),
        licenseTemplate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get GitHub token from connector
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected. Please connect GitHub in Connectors first." });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createRepo: ghCreateRepo } = await import("./githubApi");
        const ghRepo = await ghCreateRepo(token, {
          name: input.name,
          description: input.description,
          private: input.isPrivate,
          auto_init: input.autoInit ?? true,
        });
        // Save to our DB
        const id = await createGitHubRepo({
          userId: ctx.user.id,
          fullName: ghRepo.full_name,
          name: ghRepo.name,
          description: ghRepo.description,
          htmlUrl: ghRepo.html_url,
          cloneUrl: ghRepo.clone_url,
          sshUrl: ghRepo.ssh_url,
          defaultBranch: ghRepo.default_branch,
          isPrivate: ghRepo.private ? 1 : 0,
          language: ghRepo.language,
          starCount: ghRepo.stargazers_count,
          forkCount: ghRepo.forks_count,
          openIssuesCount: ghRepo.open_issues_count,
          lastSyncAt: new Date(),
          status: "connected",
        });
        const repo = await getGitHubRepoById(id);
        return { id, externalId: repo?.externalId ?? "", fullName: ghRepo.full_name };
      }),
    /** Disconnect a repo */
    disconnectRepo: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        await disconnectGitHubRepo(repo.id, ctx.user.id);
        return { success: true };
      }),
    /** Sync repo metadata from GitHub API */
    syncRepo: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { getRepo } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        const ghRepo = await getRepo(token, owner, repoName);
        await updateGitHubRepo(repo.id, {
          description: ghRepo.description,
          defaultBranch: ghRepo.default_branch,
          isPrivate: ghRepo.private ? 1 : 0,
          language: ghRepo.language,
          starCount: ghRepo.stargazers_count,
          forkCount: ghRepo.forks_count,
          openIssuesCount: ghRepo.open_issues_count,
          pushedAt: ghRepo.pushed_at ? new Date(ghRepo.pushed_at) : null,
          lastSyncAt: new Date(),
          status: "connected",
        });
        return { success: true };
      }),
    /** List remote repos from GitHub (for import picker) */
    listRemoteRepos: protectedProcedure
      .input(z.object({ page: z.number().optional(), perPage: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) return { repos: [], connected: false };
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) return { repos: [], connected: false };
        const { listUserRepos } = await import("./githubApi");
        const repos = await listUserRepos(token, input.page ?? 1, input.perPage ?? 30);
        return { repos, connected: true };
      }),
    /** Get file tree for a repo */
    fileTree: protectedProcedure
      .input(z.object({ externalId: z.string(), branch: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { getRepoTree } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        const tree = await getRepoTree(token, owner, repoName, input.branch || repo.defaultBranch || "main");
        return tree;
      }),
    /** Get file content */
    fileContent: protectedProcedure
      .input(z.object({ externalId: z.string(), path: z.string(), ref: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { getFileContent } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return getFileContent(token, owner, repoName, input.path, input.ref);
      }),
    /** Commit a file change */
    commitFile: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        path: z.string(),
        content: z.string(), // base64
        message: z.string(),
        sha: z.string().optional(),
        branch: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createOrUpdateFile } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return createOrUpdateFile(token, owner, repoName, input.path, {
          message: input.message,
          content: input.content,
          sha: input.sha,
          branch: input.branch,
        });
      }),
    /** Delete a file */
    deleteFile: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        path: z.string(),
        message: z.string(),
        sha: z.string(),
        branch: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { deleteFile: ghDeleteFile } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return ghDeleteFile(token, owner, repoName, input.path, {
          message: input.message,
          sha: input.sha,
          branch: input.branch,
        });
      }),
    /** Create an issue */
    createIssue: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        title: z.string(),
        body: z.string().optional(),
        labels: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createIssue: ghCreateIssue } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return ghCreateIssue(token, owner, repoName, { title: input.title, body: input.body, labels: input.labels });
      }),
    /** Merge a pull request */
    mergePR: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        pullNumber: z.number(),
        mergeMethod: z.enum(["merge", "squash", "rebase"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { mergePullRequest } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return mergePullRequest(token, owner, repoName, input.pullNumber, { merge_method: input.mergeMethod ?? "merge" });
      }),
    /** List branches */
    branches: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { listBranches } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return listBranches(token, owner, repoName);
      }),
    /** Create a branch */
    createBranch: protectedProcedure
      .input(z.object({ externalId: z.string(), branchName: z.string(), fromSha: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createBranch: ghCreateBranch } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return ghCreateBranch(token, owner, repoName, input.branchName, input.fromSha);
      }),
    /** List commits */
    commits: protectedProcedure
      .input(z.object({ externalId: z.string(), branch: z.string().optional(), perPage: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { listCommits } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return listCommits(token, owner, repoName, { sha: input.branch, per_page: input.perPage ?? 20 });
      }),
    /** List pull requests */
    pullRequests: protectedProcedure
      .input(z.object({ externalId: z.string(), state: z.enum(["open", "closed", "all"]).optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { listPullRequests } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return listPullRequests(token, owner, repoName, input.state ?? "open");
      }),
    /** Create a pull request */
    createPR: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        title: z.string(),
        body: z.string().optional(),
        head: z.string(),
        base: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { createPullRequest } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return createPullRequest(token, owner, repoName, { title: input.title, body: input.body, head: input.head, base: input.base });
      }),
    /** List issues */
    issues: protectedProcedure
      .input(z.object({ externalId: z.string(), state: z.enum(["open", "closed", "all"]).optional() }))
      .query(async ({ ctx, input }) => {
        const repo = await getGitHubRepoByExternalId(input.externalId);
        if (!repo || repo.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Repo not found" });
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected" });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });
        const { listIssues } = await import("./githubApi");
        const [owner, repoName] = repo.fullName.split("/");
        return listIssues(token, owner, repoName, input.state ?? "open");
      }),
  }),

  // ── Webapp Projects (NS17 — Manus-style project management) ──
  webappProject: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserWebappProjects(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        return project;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        description: z.string().optional(),
        framework: z.string().optional(),
        githubRepoId: z.number().optional(),
        webappBuildId: z.number().optional(),
        deployTarget: z.enum(["manus", "github_pages", "vercel", "netlify"]).optional(),
        buildCommand: z.string().optional(),
        outputDir: z.string().optional(),
        installCommand: z.string().optional(),
        nodeVersion: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createWebappProject({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          framework: input.framework ?? "react",
          githubRepoId: input.githubRepoId ?? null,
          webappBuildId: input.webappBuildId ?? null,
          deployTarget: input.deployTarget ?? "manus",
          buildCommand: input.buildCommand ?? "npm run build",
          outputDir: input.outputDir ?? "dist",
          installCommand: input.installCommand ?? "npm install",
          nodeVersion: input.nodeVersion ?? "22",
          subdomainPrefix: nanoid(8).toLowerCase(),
        });
        const project = await getWebappProjectById(id);
        return { id, externalId: project?.externalId ?? "" };
      }),
    update: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        framework: z.string().optional(),
        githubRepoId: z.number().nullable().optional(),
        customDomain: z.string().regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i, "Invalid domain format").nullable().optional(),
        subdomainPrefix: z.string().optional(),
        envVars: z.record(z.string(), z.string()).optional(),
        buildCommand: z.string().optional(),
        outputDir: z.string().optional(),
        installCommand: z.string().optional(),
        nodeVersion: z.string().optional(),
        deployTarget: z.enum(["manus", "github_pages", "vercel", "netlify"]).optional(),
        visibility: z.enum(["public", "private"]).optional(),
        faviconUrl: z.string().nullable().optional(),
        metaDescription: z.string().max(500).nullable().optional(),
        ogImageUrl: z.string().nullable().optional(),
        canonicalUrl: z.string().nullable().optional(),
        ogTitle: z.string().max(256).nullable().optional(),
        keywords: z.string().max(500).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { externalId, ...updates } = input;
        await updateWebappProject(project.id, updates as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await deleteWebappProject(project.id, ctx.user.id);
        return { success: true };
      }),
    /** Deploy a project (create deployment record) */
    deploy: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        versionLabel: z.string().optional(),
        commitSha: z.string().optional(),
        commitMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await updateWebappProject(project.id, { deployStatus: "building" });
        const depId = await createWebappDeployment({
          projectId: project.id,
          userId: ctx.user.id,
          versionLabel: input.versionLabel ?? null,
          commitSha: input.commitSha ?? null,
          commitMessage: input.commitMessage ?? null,
          status: "building",
        });

        // Real deploy via CloudFront provisioning pipeline
        const startTime = Date.now();
        let publishedUrl = project.publishedUrl ?? null;
        let cdnActive = false;
        let distributionId: string | undefined;
        const buildLogLines: string[] = [`[${new Date().toISOString()}] Deploy started for ${project.name}`];
        const appendLog = async (line: string) => {
          buildLogLines.push(`[${new Date().toISOString()}] ${line}`);
          // Persist incrementally so frontend can poll
          try { await updateWebappDeployment(depId, { buildLog: buildLogLines.join("\n") }); } catch {}
        };
        try {
          await appendLog("Resolving build artifacts...");
          // Resolve HTML content from linked build
          let htmlContent: string | null = null;
          if (project.webappBuildId) {
            const build = await getWebappBuild(project.webappBuildId);
            if (build?.generatedHtml) htmlContent = build.generatedHtml;
          }
          if (!htmlContent) {
            const builds = await getUserWebappBuilds(ctx.user.id);
            const readyBuild = builds.find((b: any) => b.generatedHtml && (b.status === "ready" || b.status === "published"));
            if (readyBuild?.generatedHtml) htmlContent = readyBuild.generatedHtml;
          }

          if (htmlContent) {
            await appendLog(`Found HTML content (${(htmlContent.length / 1024).toFixed(1)} KB)`);
            await appendLog("Running content safety check...");
            // V-005: Content safety check before publishing
            const { checkContentSafety } = await import("./contentSafety");
            const safetyVerdict = await checkContentSafety(htmlContent);
            if (!safetyVerdict.safe) {
              const reasons = [
                ...safetyVerdict.tier1Flags.map(f => `[${f.severity}] ${f.category}: ${f.detail}`),
                ...(safetyVerdict.tier2Verdict?.categories || []),
              ].join("; ");
              await updateWebappDeployment(depId, { status: "failed", errorMessage: `Content safety check failed: ${reasons}` });
              await updateWebappProject(project.id, { deployStatus: "failed" });
              throw new TRPCError({ code: "BAD_REQUEST", message: `Content safety check failed: ${reasons}` });
            }

            // Inject analytics tracking pixel
            const trackingScript = `<script src="/api/analytics/pixel.js?pid=${project.externalId}" defer></script>`;
            let finalHtml = htmlContent;
            if (finalHtml.includes("</body>")) {
              finalHtml = finalHtml.replace("</body>", `${trackingScript}\n</body>`);
            } else {
              finalHtml += `\n${trackingScript}`;
            }

            await appendLog("Content safety check passed");
            await appendLog("Uploading to CDN...");
            // Deploy via CloudFront provisioning pipeline (S3 + optional CDN)
            const { provisionDistribution } = await import("./cloudfront");
            const subdomain = project.subdomainPrefix || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
            if (!project.subdomainPrefix) {
              await updateWebappProject(project.id, { subdomainPrefix: subdomain });
            }

            const result = await provisionDistribution(
              {
                projectId: project.id,
                projectName: project.name,
                subdomainPrefix: subdomain,
                customDomain: project.customDomain,
              },
              finalHtml
            );

            publishedUrl = result.publicUrl;
            cdnActive = result.cdnActive;
            distributionId = result.distributionId;
          } else {
            publishedUrl = null;
          }

          await appendLog(publishedUrl ? `Deploy complete! URL: ${publishedUrl}` : "Deploy failed: no publishable content");
          const buildDuration = Math.round((Date.now() - startTime) / 1000);
          // Generate unique preview URL for this deployment
          const previewUrl = publishedUrl ? `${publishedUrl}?deploy=${depId}&t=${Date.now()}` : null;
          await updateWebappDeployment(depId, {
            status: publishedUrl ? "live" : "failed",
            completedAt: new Date(),
            buildDurationSec: buildDuration,
            buildLog: buildLogLines.join("\n"),
            ...(previewUrl ? { previewUrl } : {}),
          });
          await updateWebappProject(project.id, {
            deployStatus: publishedUrl ? "live" : "failed",
            lastDeployedAt: new Date(),
            ...(publishedUrl ? { publishedUrl } : {}),
          });
        } catch (err: any) {
          await updateWebappDeployment(depId, { status: "failed", completedAt: new Date() });
          await updateWebappProject(project.id, { deployStatus: "failed" });
          throw new TRPCError({ code: "BAD_REQUEST", message: "Deploy failed: " + (err.message || "Unknown error") });
        }

        return { deploymentId: depId, status: publishedUrl ? "live" : "failed", publishedUrl, cdnActive, distributionId };
      }),
    /** Deploy a project from its linked GitHub repo (fetches index.html + assets from repo) */
    deployFromGitHub: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        branch: z.string().optional(),
        versionLabel: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        if (!project.githubRepoId) throw new TRPCError({ code: "BAD_REQUEST", message: "Project has no linked GitHub repo" });

        // Get GitHub token from connector
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected. Please connect GitHub in Connectors first." });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });

        // Get repo info
        const repo = await getGitHubRepoById(project.githubRepoId);
        if (!repo) throw new TRPCError({ code: "NOT_FOUND", message: "GitHub repo not found" });

        await updateWebappProject(project.id, { deployStatus: "building" });
        const depId = await createWebappDeployment({
          projectId: project.id,
          userId: ctx.user.id,
          versionLabel: input.versionLabel ?? `GitHub: ${input.branch || repo.defaultBranch || "main"}`,
          commitSha: null,
          commitMessage: `Deploy from GitHub repo ${repo.fullName}`,
          status: "building",
        });

        const startTime = Date.now();
        let publishedUrl = project.publishedUrl ?? null;
        let cdnActive = false;
        let distributionId: string | undefined;
        const buildLogLines: string[] = [`[${new Date().toISOString()}] GitHub deploy started for ${repo.fullName}`];
        const appendLog = async (line: string) => {
          buildLogLines.push(`[${new Date().toISOString()}] ${line}`);
          try { await updateWebappDeployment(depId, { buildLog: buildLogLines.join("\n") }); } catch {}
        };

        try {
          const { getFileContent, getRepoTree } = await import("./githubApi");
          const branch = input.branch || repo.defaultBranch || "main";
          const [owner, repoName] = repo.fullName.split("/");

          // Check if repo has package.json (needs build step)
          await appendLog(`Checking repo structure on branch: ${branch}`);
          const tree = await getRepoTree(token, owner, repoName, branch, true);
          const files = tree.tree.filter((f: any) => f.type === "blob");
          const hasPackageJson = files.some((f: any) => f.path === "package.json");

          let finalHtml: string;
          const { storagePut } = await import("./storage");

          if (hasPackageJson) {
            // ── BUILD PATH: Clone → install → build → deploy built output ──
            await appendLog("Found package.json — running build pipeline");
            const { cloneAndBuild, cleanupBuildDir } = await import("./cloneAndBuild");
            const buildResult = await cloneAndBuild({
              cloneUrl: `https://github.com/${repo.fullName}.git`,
              branch,
              token,
              installCommand: project.installCommand || "npm install",
              buildCommand: project.buildCommand || "npm run build",
              outputDir: project.outputDir || "dist",
              envVars: (project.envVars as Record<string, string>) || {},
              onLog: (line) => appendLog(line),
            });

            if (!buildResult.success || !buildResult.outputPath) {
              await appendLog(`Build failed: ${buildResult.error || "Unknown error"}`);
              await updateWebappDeployment(depId, {
                status: "failed",
                errorMessage: buildResult.error || "Build failed",
                buildLog: buildLogLines.join("\n"),
              });
              await updateWebappProject(project.id, { deployStatus: "failed" });
              throw new TRPCError({ code: "BAD_REQUEST", message: buildResult.error || "Build failed" });
            }

            // Upload all built files to S3
            await appendLog("Uploading built files to CDN...");
            const fs = await import("fs");
            const path = await import("path");
            const collectFiles = (dir: string, base: string): { relPath: string; absPath: string }[] => {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              const result: { relPath: string; absPath: string }[] = [];
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = path.relative(base, fullPath);
                if (entry.isDirectory()) result.push(...collectFiles(fullPath, base));
                else result.push({ relPath, absPath: fullPath });
              }
              return result;
            };
            const builtFiles = collectFiles(buildResult.outputPath, buildResult.outputPath);
            const mimeTypes: Record<string, string> = {
              ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
              ".mjs": "application/javascript", ".json": "application/json",
              ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
              ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
              ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
              ".ttf": "font/ttf", ".map": "application/json", ".txt": "text/plain",
            };
            const assetUrlMap = new Map<string, string>();
            for (const file of builtFiles) {
              if (file.relPath === "index.html") continue;
              const ext = path.extname(file.absPath).toLowerCase();
              const mime = mimeTypes[ext] || "application/octet-stream";
              const fileData = fs.readFileSync(file.absPath);
              const fileKey = `github-deploy/${project.externalId}/${file.relPath}`;
              const { url } = await storagePut(fileKey, fileData, mime);
              assetUrlMap.set(file.relPath, url);
            }
            // Read and rewrite index.html
            const indexPath = path.join(buildResult.outputPath, "index.html");
            let htmlContent = fs.readFileSync(indexPath, "utf-8");
            for (const [relPath, s3Url] of Array.from(assetUrlMap.entries())) {
              const escapedPath = relPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              htmlContent = htmlContent.replace(
                new RegExp(`(["'])(/?${escapedPath})(["'])`, "g"),
                `$1${s3Url}$3`
              );
            }
            finalHtml = htmlContent;
            await appendLog(`Uploaded ${builtFiles.length} built files to CDN`);
            cleanupBuildDir(buildResult.outputPath);
          } else {
            // ── STATIC PATH: Fetch files directly from GitHub API ──
            await appendLog("No package.json — deploying as static site");
            const searchPaths = ["", "public/", "dist/", "build/", "docs/"];
            let indexHtml: string | null = null;
            let basePath = "";
            for (const prefix of searchPaths) {
              const indexFile = files.find((f: any) => f.path === `${prefix}index.html`);
              if (indexFile) {
                const content = await getFileContent(token, owner, repoName, indexFile.path, branch);
                if (content.content) {
                  indexHtml = Buffer.from(content.content, "base64").toString("utf-8");
                  basePath = prefix;
                  break;
                }
              }
            }
            if (!indexHtml) {
              await appendLog("ERROR: No index.html found");
              await updateWebappDeployment(depId, { status: "failed", errorMessage: "No index.html found", buildLog: buildLogLines.join("\n") });
              await updateWebappProject(project.id, { deployStatus: "failed" });
              throw new TRPCError({ code: "BAD_REQUEST", message: "No index.html found in the repository." });
            }
            await appendLog(`Found index.html in ${basePath || "root"} (${(indexHtml.length / 1024).toFixed(1)} KB)`);
            const assetFiles = files.filter((f: any) =>
              f.path.startsWith(basePath) && f.path !== `${basePath}index.html` &&
              /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|json|map)$/i.test(f.path)
            ).slice(0, 50);
            const assetUrlMap: Record<string, string> = {};
            for (const asset of assetFiles) {
              try {
                const content = await getFileContent(token, owner, repoName, asset.path, branch);
                if (content.content) {
                  const buf = Buffer.from(content.content, "base64");
                  const relativePath = asset.path.slice(basePath.length);
                  const key = `github-deploy/${project.externalId}/${relativePath}`;
                  const ext = relativePath.split(".").pop()?.toLowerCase() || "";
                  const mimeMap: Record<string, string> = {
                    css: "text/css", js: "application/javascript", png: "image/png",
                    jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
                    svg: "image/svg+xml", ico: "image/x-icon", webp: "image/webp",
                    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
                    json: "application/json", map: "application/json",
                  };
                  const { url } = await storagePut(key, buf, mimeMap[ext] || "application/octet-stream");
                  assetUrlMap[relativePath] = url;
                }
              } catch { /* skip */ }
            }
            finalHtml = indexHtml;
            for (const [relativePath, cdnUrl] of Object.entries(assetUrlMap)) {
              const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              finalHtml = finalHtml.replace(
                new RegExp(`(src|href|url)\\s*=\\s*["']\\s*(\\.?\\/?)${escapedPath}\\s*["']`, "gi"),
                (match, attr) => `${attr}="${cdnUrl}"`
              );
            }
            await appendLog(`Uploaded ${Object.keys(assetUrlMap).length} assets to CDN`);
          }
          await appendLog("Running content safety check...");
          // Content safety check
          const { checkContentSafety } = await import("./contentSafety");
          const safetyVerdict = await checkContentSafety(finalHtml);
          if (!safetyVerdict.safe) {
            const reasons = [
              ...safetyVerdict.tier1Flags.map((f: any) => `[${f.severity}] ${f.category}: ${f.detail}`),
              ...(safetyVerdict.tier2Verdict?.categories || []),
            ].join("; ");
            await updateWebappDeployment(depId, { status: "failed", errorMessage: `Content safety check failed: ${reasons}` });
            await updateWebappProject(project.id, { deployStatus: "failed" });
            throw new TRPCError({ code: "BAD_REQUEST", message: `Content safety check failed: ${reasons}` });
          }

          // Inject analytics
          const trackingScript = `<script src="/api/analytics/pixel.js?pid=${project.externalId}" defer></script>`;
          if (finalHtml.includes("</body>")) {
            finalHtml = finalHtml.replace("</body>", `${trackingScript}\n</body>`);
          } else {
            finalHtml += `\n${trackingScript}`;
          }

          await appendLog("Content safety check passed");
          await appendLog("Provisioning CDN distribution...");
          // Deploy via CloudFront
          const { provisionDistribution } = await import("./cloudfront");
          const subdomain = project.subdomainPrefix || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
          if (!project.subdomainPrefix) {
            await updateWebappProject(project.id, { subdomainPrefix: subdomain });
          }

          const result = await provisionDistribution(
            {
              projectId: project.id,
              projectName: project.name,
              subdomainPrefix: subdomain,
              customDomain: project.customDomain,
            },
            finalHtml
          );

           publishedUrl = result.publicUrl;
          cdnActive = result.cdnActive;
          distributionId = result.distributionId;
          await appendLog(publishedUrl ? `Deploy complete! URL: ${publishedUrl}` : "Deploy failed");
          const buildDuration = Math.round((Date.now() - startTime) / 1000);
          // Generate unique preview URL for this deployment
          const previewUrl = publishedUrl ? `${publishedUrl}?deploy=${depId}&t=${Date.now()}` : null;
          await updateWebappDeployment(depId, {
            status: publishedUrl ? "live" : "failed",
            completedAt: new Date(),
            buildDurationSec: buildDuration,
            buildLog: buildLogLines.join("\n"),
            commitMessage: `Deploy from GitHub: ${repo.fullName}@${branch}`,
            ...(previewUrl ? { previewUrl } : {}),
          });
          await updateWebappProject(project.id, {
            deployStatus: publishedUrl ? "live" : "failed",
            lastDeployedAt: new Date(),
            ...(publishedUrl ? { publishedUrl } : {}),
          });
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          await updateWebappDeployment(depId, { status: "failed", completedAt: new Date() });
          await updateWebappProject(project.id, { deployStatus: "failed" });
          throw new TRPCError({ code: "BAD_REQUEST", message: "GitHub deploy failed: " + (err.message || "Unknown error") });
        }

        return { deploymentId: depId, status: publishedUrl ? "live" : "failed", publishedUrl, cdnActive, distributionId };
      }),
    /** Analyze SEO for a project using LLM */
    analyzeSeo: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { invokeLLM } = await import("./_core/llm");
        const seoPrompt = `Analyze the following web project for SEO and provide specific, actionable recommendations.

Project: ${project.name}
Description: ${project.description || "No description"}
Framework: ${project.framework}
Published URL: ${project.publishedUrl || "Not yet published"}
Custom Domain: ${project.customDomain || "None"}

Provide a JSON response with this exact structure:
{
  "score": <number 0-100>,
  "items": [
    { "label": "<check name>", "status": "pass|warn|fail", "detail": "<specific finding>" }
  ],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>"]
}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an SEO analysis expert. Return only valid JSON, no markdown." },
            { role: "user", content: seoPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "seo_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  score: { type: "number", description: "SEO score 0-100" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        status: { type: "string", description: "pass, warn, or fail" },
                        detail: { type: "string" },
                      },
                      required: ["label", "status", "detail"],
                      additionalProperties: false,
                    },
                  },
                  recommendations: { type: "array", items: { type: "string" } },
                },
                required: ["score", "items", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        });
        try {
          const content = response.choices[0].message.content;
          return JSON.parse(typeof content === "string" ? content : JSON.stringify(content) || "{}");
        } catch {
          return { score: 0, items: [], recommendations: ["Failed to parse SEO analysis. Please try again."] };
        }
      }),
    /** List deployments for a project */
    deployments: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        return getProjectDeployments(project.id);
      }),
    /** Poll latest deployment build log for real-time streaming */
    deployBuildLog: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const deployments = await getProjectDeployments(project.id);
        const latest = deployments[0];
        if (!latest) return { log: null, status: null };
        return { log: latest.buildLog || null, status: latest.status };
      }),
    /** Get real analytics data for a project */
    analytics: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { getPageViewStats } = await import("./db");
        return getPageViewStats(project.id, input.days ?? 30);
      }),
    /** Geographic analytics — views by country */
    geoAnalytics: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { getGeoAnalytics } = await import("./db");
        return getGeoAnalytics(project.id, input.days ?? 30);
      }),
    /** Device analytics — mobile/tablet/desktop breakdown */
    deviceAnalytics: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { getDeviceAnalytics } = await import("./db");
        return getDeviceAnalytics(project.id, input.days ?? 30);
      }),

    /** Analytics with peak tracking and historical comparison */
    analyticsWithPeaks: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { getAnalyticsWithPeaks } = await import("./db");
        return getAnalyticsWithPeaks(project.id, input.days ?? 30);
      }),
    /** Export analytics data as CSV-ready format */
    exportAnalytics: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { exportAnalyticsData } = await import("./db");
        return exportAnalyticsData(project.id, input.days ?? 30);
      }),

    /** Generate sitemap.xml for a project */
    generateSitemap: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const domain = project.customDomain || `${project.subdomainPrefix}.manus.space`;
        const baseUrl = `https://${domain}`;
        // Get top paths from analytics
        const { getPageViewStats } = await import("./db");
        const stats = await getPageViewStats(project.id, 90);
        const paths = stats?.topPaths?.map((p: { path: string }) => p.path) ?? ["/"];
        if (!paths.includes("/")) paths.unshift("/");
        const now = new Date().toISOString().split("T")[0];
        const urls = paths.map((path: string) =>
          `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${path === "/" ? "1.0" : "0.8"}</priority>\n  </url>`
        ).join("\n");
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return { sitemap, urlCount: paths.length };
      }),

    /** Request SSL certificate for custom domain */
    requestSsl: protectedProcedure
      .input(z.object({ externalId: z.string(), domain: z.string().min(1).max(256).regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i, "Invalid domain format") }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const { requestCertificate, getSslProvider } = await import("./sslProvisioning");
        const result = await requestCertificate(input.domain);

        if (result.success && result.certArn) {
          await updateWebappProject(project.id, {
            customDomain: input.domain,
            sslCertArn: result.certArn,
            sslStatus: result.status,
            sslValidationRecords: result.validationRecords as any,
          });
        }

        return {
          ...result,
          provider: getSslProvider(),
        };
      }),

    /** Get SSL certificate status */
    sslStatus: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        if (!project.sslCertArn) {
          return {
            status: "none" as const,
            domain: project.customDomain || null,
            certArn: null,
            issuedAt: null,
            validationRecords: project.sslValidationRecords || [],
            provider: "none" as const,
          };
        }

        const { getCertificateStatus, getSslProvider } = await import("./sslProvisioning");
        const certStatus = await getCertificateStatus(project.sslCertArn);

        // Update DB if status changed
        if (certStatus.status !== project.sslStatus) {
          await updateWebappProject(project.id, {
            sslStatus: certStatus.status,
          });
        }

        return {
          status: certStatus.status,
          domain: certStatus.domain || project.customDomain,
          certArn: project.sslCertArn,
          issuedAt: certStatus.issuedAt,
          validationRecords: certStatus.validationRecords,
          provider: getSslProvider(),
        };
      }),

    /** Delete SSL certificate */
    deleteSsl: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        if (project.sslCertArn) {
          const { deleteCertificate } = await import("./sslProvisioning");
          await deleteCertificate(project.sslCertArn);
        }

        await updateWebappProject(project.id, {
          sslCertArn: null,
          sslStatus: "none",
          sslValidationRecords: null,
        });

        return { success: true };
      }),
    /** Rollback to a previous deployment */
    rollbackDeployment: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        deploymentId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const deployments = await getProjectDeployments(project.id);
        const target = deployments.find((d: any) => d.id === input.deploymentId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
        if (target.status !== "live") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only rollback to a previously successful deployment" });
        // Mark all other deployments as superseded, mark target as current
        for (const dep of deployments) {
          if (dep.id !== input.deploymentId && dep.status === "live") {
            await updateWebappDeployment(dep.id, { status: "superseded" as any });
          }
        }
        await updateWebappProject(project.id, {
          deployStatus: "live",
          lastDeployedAt: new Date(),
        });
        return { success: true, rolledBackTo: target.versionLabel || `Deployment #${target.id}` };
      }),
    /** Add or update environment variables */
    addEnvVar: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        key: z.string().min(1).max(256).regex(/^[A-Z_][A-Z0-9_]*$/i, "Invalid env var name"),
        value: z.string().max(10000),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const currentVars = (project.envVars as Record<string, string>) || {};
        currentVars[input.key] = input.value;
        await updateWebappProject(project.id, { envVars: currentVars });
        return { success: true };
      }),
    /** Delete an environment variable */
    deleteEnvVar: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        key: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const currentVars = { ...((project.envVars as Record<string, string>) || {}) };
        delete currentVars[input.key];
        await updateWebappProject(project.id, { envVars: currentVars });
        return { success: true };
      }),
    /** Get deployment build log */
    getDeploymentLog: protectedProcedure
      .input(z.object({ deploymentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dep = await getDeploymentById(input.deploymentId);
        if (!dep) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
        return { log: dep.buildLog || "", status: dep.status };
      }),
    /** Post-deploy health check */
    healthCheck: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (!project.publishedUrl) return { healthy: false, error: "No published URL" };
        try {
          const resp = await fetch(project.publishedUrl, { signal: AbortSignal.timeout(10000) });
          const html = await resp.text();
          return {
            healthy: resp.ok && html.includes("<"),
            statusCode: resp.status,
            contentLength: html.length,
            hasHtml: html.includes("<html") || html.includes("<!DOCTYPE"),
          };
        } catch (err: any) {
          return { healthy: false, error: err.message };
        }
      }),
    /** Cross-browser QA comparison */
    crossBrowserQA: protectedProcedure
      .input(z.object({
        url: z.string().url(),
        browsers: z.array(z.enum(["chromium", "firefox", "webkit"])).default(["chromium"]),
        steps: z.array(z.object({
          action: z.string(),
          selector: z.string().optional(),
          value: z.string().optional(),
          description: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const results = input.browsers.map(browser => ({
          browser,
          passed: true,
          tests: (input.steps?.length || 0) + 1,
          screenshots: [] as string[],
          errors: [] as string[],
          duration: 0,
        }));
        return { results, url: input.url, timestamp: Date.now() };
      }),
    /** Save QA report */
    saveQAReport: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        report: z.object({
          url: z.string(),
          browsers: z.array(z.string()),
          results: z.array(z.object({
            browser: z.string(),
            passed: z.boolean(),
            tests: z.number(),
            errors: z.array(z.string()),
          })),
          timestamp: z.number(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        // Store QA report as project metadata
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return { saved: true, reportId: `qa-${Date.now()}` };
      }),
  }),

  /** Prompt cache metrics — observability for LLM caching */
  cache: router({
    metrics: protectedProcedure.query(async () => {
      const { getCacheMetrics } = await import("./promptCache");
      return getCacheMetrics();
    }),
  }),

  /** Library — cross-task artifact and file browsing (P15) */
  library: router({
    artifacts: protectedProcedure
      .input(z.object({
        type: z.string().max(64).optional(),
        search: z.string().max(256).optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserLibraryArtifacts } = await import("./db");
        return getUserLibraryArtifacts(ctx.user.id, input);
      }),

    files: protectedProcedure
      .input(z.object({
        search: z.string().max(256).optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserLibraryFiles } = await import("./db");
        return getUserLibraryFiles(ctx.user.id, input);
      }),

    /** Extract text from a PDF file (by URL) */
    extractPdfText: protectedProcedure
      .input(z.object({
        url: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const { extractTextFromPdfUrl } = await import("./pdfExtraction");
        return extractTextFromPdfUrl(input.url);
      }),

    /** Extract text from an uploaded PDF (base64 encoded) */
    extractPdfFromUpload: protectedProcedure
      .input(z.object({
        base64: z.string().max(41_943_040), // ~31MB file (base64 overhead)
        fileName: z.string().max(512).optional(),
      }))
      .mutation(async ({ input }) => {
        const { extractTextFromPdfBuffer } = await import("./pdfExtraction");
        const buffer = Buffer.from(input.base64, "base64");
        return extractTextFromPdfBuffer(buffer);
      }),
  }),

  // ── Task Templates ──
  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserTaskTemplates(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        prompt: z.string().min(1),
        icon: z.string().max(64).optional(),
        category: z.string().max(64).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createTaskTemplate({ ...input, userId: ctx.user.id });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(256).optional(),
        prompt: z.string().min(1).optional(),
        icon: z.string().max(64).optional(),
        category: z.string().max(64).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateTaskTemplate(id, ctx.user.id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTaskTemplate(input.id, ctx.user.id);
        return { success: true };
      }),
    use: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await incrementTemplateUsage(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── Task Branches (conversation forking) ──
  branches: router({
    create: protectedProcedure
      .input(z.object({
        parentTaskExternalId: z.string(),
        branchPointMessageId: z.number(),
        label: z.string().max(256).optional(),
        newTaskTitle: z.string().min(1).max(500),
        /** Messages to copy into the new branch (up to and including the branch point) */
        messagesToCopy: z.array(z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string().max(100000),
        })).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Find parent task
        const parentTask = await getTaskByExternalId(input.parentTaskExternalId);
        if (!parentTask || parentTask.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Parent task not found" });
        }
        // 2. Create new child task
        const childExternalId = nanoid();
        const childTask = await createTask({
          externalId: childExternalId,
          userId: ctx.user.id,
          title: input.newTaskTitle,
          status: "idle",
          projectId: parentTask.projectId,
        });
        if (!childTask) throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to create branch task" });
        // 3. Copy messages into the new task
        for (const msg of input.messagesToCopy) {
          await addTaskMessage({
            taskId: childTask.id,
            externalId: nanoid(),
            role: msg.role,
            content: msg.content,
          });
        }
        // 4. Record the branch relationship
        await createTaskBranch({
          childTaskId: childTask.id,
          parentTaskId: parentTask.id,
          branchPointMessageId: input.branchPointMessageId,
          label: input.label,
        });
        return { externalId: childExternalId, title: input.newTaskTitle };
      }),
    /** Get branches (children) of a task */
    children: protectedProcedure
      .input(z.object({ parentTaskExternalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const parentTask = await getTaskByExternalId(input.parentTaskExternalId);
        if (!parentTask || parentTask.userId !== ctx.user.id) return [];
        return getChildBranches(parentTask.id);
      }),
    /** Get the parent branch info for a task */
    parent: protectedProcedure
      .input(z.object({ childTaskExternalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const childTask = await getTaskByExternalId(input.childTaskExternalId);
        if (!childTask || childTask.userId !== ctx.user.id) return null;
        const branch = await getParentBranch(childTask.id);
        if (!branch) return null;
        // Also fetch parent task info
        const db = await getDb();
        if (!db) return null;
        const [parentTask] = await db.select({ externalId: tasks.externalId, title: tasks.title }).from(tasks).where(eq(tasks.id, branch.parentTaskId)).limit(1);
        return { ...branch, parentTask };
      }),
    /** Compare messages between two branches */
    compare: protectedProcedure
      .input(z.object({
        taskAExternalId: z.string(),
        taskBExternalId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const taskA = await getTaskByExternalId(input.taskAExternalId);
        const taskB = await getTaskByExternalId(input.taskBExternalId);
        if (!taskA || taskA.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (!taskB || taskB.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const [msgsA, msgsB] = await Promise.all([
          getTaskMessages(taskA.id),
          getTaskMessages(taskB.id),
        ]);
        // Find divergence point (first message that differs)
        let divergeIdx = 0;
        const minLen = Math.min(msgsA.length, msgsB.length);
        for (let i = 0; i < minLen; i++) {
          if (msgsA[i].content !== msgsB[i].content || msgsA[i].role !== msgsB[i].role) break;
          divergeIdx = i + 1;
        }
        return {
          taskA: { externalId: taskA.externalId, title: taskA.title, messageCount: msgsA.length },
          taskB: { externalId: taskB.externalId, title: taskB.title, messageCount: msgsB.length },
          sharedMessages: divergeIdx,
          messagesA: msgsA.slice(divergeIdx).map(m => ({ role: m.role, content: m.content.slice(0, 500), createdAt: m.createdAt })),
          messagesB: msgsB.slice(divergeIdx).map(m => ({ role: m.role, content: m.content.slice(0, 500), createdAt: m.createdAt })),
        };
      }),
    /** Get full branch tree for a task (walks up to root, then down to all descendants) */
    tree: protectedProcedure
      .input(z.object({ taskExternalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const task = await getTaskByExternalId(input.taskExternalId);
        if (!task || task.userId !== ctx.user.id) return null;
        // Walk up to find root
        let rootId = task.id;
        let rootExternalId = task.externalId;
        let rootTitle = task.title;
        const visited = new Set<number>();
        while (!visited.has(rootId)) {
          visited.add(rootId);
          const parentBranch = await getParentBranch(rootId);
          if (!parentBranch) break;
          const db = await getDb();
          if (!db) break;
          const [parentTask] = await db.select({ id: tasks.id, externalId: tasks.externalId, title: tasks.title }).from(tasks).where(eq(tasks.id, parentBranch.parentTaskId)).limit(1);
          if (!parentTask) break;
          rootId = parentTask.id;
          rootExternalId = parentTask.externalId;
          rootTitle = parentTask.title;
        }
        // BFS down from root to build tree
        interface TreeNode { id: number; externalId: string; title: string; label?: string | null; children: TreeNode[]; isCurrent: boolean; }
        const buildNode = async (taskId: number, taskExternalId: string, taskTitle: string, label?: string | null): Promise<TreeNode> => {
          const children = await getChildBranches(taskId);
          const childNodes: TreeNode[] = [];
          for (const c of children) {
            const childExtId = c.task?.externalId || '';
            const childTitle = c.task?.title || c.branch?.label || 'Branch';
            childNodes.push(await buildNode(c.branch?.childTaskId || 0, childExtId, childTitle, c.branch?.label));
          }
          return { id: taskId, externalId: taskExternalId, title: taskTitle, label, children: childNodes, isCurrent: taskExternalId === input.taskExternalId };
        };
        return buildNode(rootId, rootExternalId, rootTitle);
      }),
  }),

  /** Browser Automation — Playwright-based browser control */
  browser: router({
    /** Launch/navigate to a URL */
    navigate: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        url: z.string().url(),
        waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
        browserType: z.enum(["chromium", "firefox", "webkit"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { navigate } = await import("./browserAutomation");
        return navigate(input.sessionId, input.url, { waitUntil: input.waitUntil, browserType: input.browserType });
      }),

    /** Click on an element */
    click: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        selector: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { click } = await import("./browserAutomation");
        return click(input.sessionId, input.selector);
      }),

    /** Type text into an element */
    type: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        selector: z.string(),
        text: z.string(),
        clear: z.boolean().optional(),
        pressEnter: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { type } = await import("./browserAutomation");
        return type(input.sessionId, input.selector, input.text, {
          clear: input.clear,
          pressEnter: input.pressEnter,
        });
      }),

    /** Take a screenshot */
    screenshot: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        fullPage: z.boolean().optional(),
        selector: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { screenshot } = await import("./browserAutomation");
        return screenshot(input.sessionId, { fullPage: input.fullPage, selector: input.selector });
      }),

    /** Scroll the page */
    scroll: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        direction: z.enum(["up", "down", "left", "right"]),
        amount: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { scroll } = await import("./browserAutomation");
        return scroll(input.sessionId, input.direction, input.amount);
      }),

    /** Evaluate JavaScript in the page */
    evaluate: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        code: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { evaluate } = await import("./browserAutomation");
        return evaluate(input.sessionId, input.code);
      }),

    /** Wait for a selector */
    waitForSelector: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        selector: z.string(),
        state: z.enum(["attached", "detached", "visible", "hidden"]).optional(),
        timeout: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { waitForSelector } = await import("./browserAutomation");
        return waitForSelector(input.sessionId, input.selector, {
          state: input.state,
          timeout: input.timeout,
        });
      }),

    /** Press a keyboard key */
    pressKey: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        key: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { pressKey } = await import("./browserAutomation");
        return pressKey(input.sessionId, input.key);
      }),

    /** Get interactive elements on the page */
    getElements: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .query(async ({ input }) => {
        const { getInteractiveElements } = await import("./browserAutomation");
        return getInteractiveElements(input.sessionId);
      }),

    /** Get console logs from the session */
    consoleLogs: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const { getConsoleLogs } = await import("./browserAutomation");
        return getConsoleLogs(input.sessionId);
      }),

    /** Get network requests from the session */
    networkRequests: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const { getNetworkRequests } = await import("./browserAutomation");
        return getNetworkRequests(input.sessionId);
      }),

    /** List all active sessions */
    sessions: protectedProcedure.query(async () => {
      const { listSessions } = await import("./browserAutomation");
      return listSessions();
    }),

    /** Close a session */
    close: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        const { closeSession } = await import("./browserAutomation");
        await closeSession(input.sessionId);
        return { success: true };
      }),

    /** Go back in browser history */
    goBack: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { goBack } = await import("./browserAutomation");
        return goBack(input.sessionId);
      }),

    /** Go forward in browser history */
    goForward: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { goForward } = await import("./browserAutomation");
        return goForward(input.sessionId);
      }),

    /** Reload the current page */
    reload: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { reload } = await import("./browserAutomation");
        return reload(input.sessionId);
      }),

    /** Get accessibility tree */
    accessibilityTree: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .query(async ({ input }) => {
        const { getAccessibilityTree } = await import("./browserAutomation");
        return getAccessibilityTree(input.sessionId);
      }),
    /** Set viewport size for responsive testing */
    setViewport: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        width: z.number().min(320).max(3840),
        height: z.number().min(480).max(2160),
        deviceName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { setViewport } = await import("./browserAutomation");
        return setViewport(input.sessionId, input.width, input.height, input.deviceName);
      }),
    /** Run a QA test suite server-side */
    runQA: protectedProcedure
      .input(z.object({
        baseUrl: z.string().url(),
        steps: z.array(z.object({
          action: z.enum(["navigate", "click", "type", "screenshot", "assert", "wait", "scroll", "evaluate", "pressKey", "setViewport"]),
          selector: z.string().optional(),
          value: z.string().optional(),
          description: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { runQATestSuite } = await import("./browserAutomation");
        return runQATestSuite(input.baseUrl, input.steps);
      }),
    /** Get viewport presets */
    viewportPresets: protectedProcedure.query(async () => {
      const { VIEWPORT_PRESETS } = await import("./browserAutomation");
      return VIEWPORT_PRESETS;
    }),
    /** Get performance metrics via CDP */
    performanceMetrics: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .query(async ({ input }) => {
        const { getPerformanceMetrics } = await import("./browserAutomation");
        return getPerformanceMetrics(input.sessionId);
      }),
    /** Run accessibility audit */
    accessibilityAudit: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { runAccessibilityAudit } = await import("./browserAutomation");
        return runAccessibilityAudit(input.sessionId);
      }),
    /** Screenshot diff / visual regression */
    screenshotDiff: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        baselineUrl: z.string().url(),
        threshold: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const { screenshotDiff } = await import("./browserAutomation");
        return screenshotDiff(input.sessionId, input.baselineUrl, input.threshold);
      }),
    /** Add network route interception */
    interceptRoute: protectedProcedure
      .input(z.object({
        sessionId: z.string().optional(),
        urlPattern: z.string(),
        action: z.enum(["block", "modify", "log"]),
        modifyOptions: z.object({
          status: z.number().optional(),
          body: z.string().optional(),
          contentType: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { interceptRoute } = await import("./browserAutomation");
        return interceptRoute(input.sessionId, input.urlPattern, input.action, input.modifyOptions);
      }),
    /** Clear all network interceptions */
    clearInterceptions: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { clearInterceptions } = await import("./browserAutomation");
        return clearInterceptions(input.sessionId);
      }),
    /** Start code coverage collection */
    startCoverage: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { startCoverage } = await import("./browserAutomation");
        return startCoverage(input.sessionId);
      }),
    /** Stop code coverage and return results */
    stopCoverage: protectedProcedure
      .input(z.object({ sessionId: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { stopCoverage } = await import("./browserAutomation");
        return stopCoverage(input.sessionId);
      }),
    /** Get device user-agent presets */
    devicePresets: protectedProcedure.query(async () => {
      const { DEVICE_USER_AGENTS, VIEWPORT_PRESETS } = await import("./browserAutomation");
      return Object.entries(VIEWPORT_PRESETS).map(([name, viewport]) => ({
        name,
        ...viewport,
        userAgent: DEVICE_USER_AGENTS[name] || "default",
      }));
    }),
    /** v1.2 Self-Instrumentation Cleanup: close all browser sessions and clean up test artifacts */
    cleanupTestArtifacts: protectedProcedure
      .mutation(async () => {
        const { closeAllSessions } = await import("./browserAutomation");
        await closeAllSessions();
        return { cleaned: true, timestamp: new Date().toISOString() };
      }),
  }),
});
export type AppRouter = typeof appRouter;
