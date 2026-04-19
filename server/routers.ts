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
} from "./db";

const ARTIFACT_TYPES = ["browser_screenshot", "browser_url", "code", "terminal", "generated_image", "document"] as const;

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
      }).optional())
      .query(async ({ ctx, input }) => {
        return getUserTasks(ctx.user.id, {
          statusFilter: input?.statusFilter,
          includeArchived: input?.includeArchived,
        });
      }),

    get: protectedProcedure
      .input(z.object({ externalId: z.string().max(50) }))
      .query(async ({ input }) => {
        return getTaskByExternalId(input.externalId);
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
        status: z.enum(["idle", "running", "completed", "error"]),
      }))
      .mutation(async ({ ctx, input }) => {
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

    search: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        return searchTasks(ctx.user.id, input.query);
      }),

    messages: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        return getTaskMessages(input.taskId);
      }),

    addMessage: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(100000),
        actions: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const externalId = nanoid(12);
        await addTaskMessage({
          taskId: input.taskId,
          externalId,
          role: input.role,
          content: input.content,
          actions: input.actions ?? null,
        });
        return { success: true, externalId };
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
      .query(async ({ input }) => {
        return getTaskFiles(input.taskExternalId);
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
        generalSettings: { notifications: true, soundEffects: false, autoExpandActions: true, compactMode: false },
        capabilities: {},
        systemPrompt: null,
      };
    }),

    save: protectedProcedure
      .input(z.object({
        generalSettings: z.any().optional(),
        capabilities: z.any().optional(),
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

  /** Usage stats — real task counts from the database */
  usage: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getUserTaskStats(ctx.user.id);
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
      .mutation(async ({ input }) => {
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
      .query(async ({ input }) => {
        return getWorkspaceArtifacts(input.taskId, input.type);
      }),

    latest: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        type: z.enum(ARTIFACT_TYPES),
      }))
      .query(async ({ input }) => {
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
          throw new Error(result.error);
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
        shareToken: z.string().max(50),
        password: z.string().max(200).optional(),
      }))
      .query(async ({ input }) => {
        const share = await getTaskShareByToken(input.shareToken);
        if (!share) return { error: "Share not found" };

        // Check expiration
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
          return { error: "This share link has expired" };
        }

        // Check password
        if (share.passwordHash) {
          if (!input.password) {
            return { error: "password_required" };
          }
          const crypto = await import("crypto");
          const hash = crypto.createHash("sha256").update(input.password).digest("hex");
          if (hash !== share.passwordHash) {
            return { error: "Incorrect password" };
          }
        }

        // Increment view count
        await incrementShareViewCount(input.shareToken);

        // Get task and messages
        const task = await getTaskByExternalId(share.taskExternalId);
        if (!task) return { error: "Task not found" };

        const messages = await getTaskMessages(task.id);

        return {
          task: { title: task.title, status: task.status, createdAt: task.createdAt },
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        };
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
    events: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        return getTaskEvents(input.taskId);
      }),

    addEvent: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        eventType: z.string().max(100),
        payload: z.string().max(100000),
        offsetMs: z.number(),
      }))
      .mutation(async ({ input }) => {
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
        if (!project || project.userId !== ctx.user.id) throw new Error("Project not found");
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
        if (!project || project.userId !== ctx.user.id) throw new Error("Project not found");
        await deleteProject(project.id);
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
          if (!project || project.userId !== ctx.user.id) throw new Error("Project not found");
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
          if (!project || project.userId !== ctx.user.id) throw new Error("Project not found");
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
        .mutation(async ({ input }) => {
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
        skillId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
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
        if (!skill) throw new Error("Skill not found or not enabled");
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
      .query(async ({ input }) => {
        return getSlideDeck(input.id);
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
        connectorId: z.string(),
        name: z.string(),
        config: z.record(z.string(), z.string()).optional(),
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
      .input(z.object({ connectorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await disconnectConnector(ctx.user.id, input.connectorId);
        return { success: true };
      }),
    /** Execute a connector action (send message, trigger webhook, etc.) */
    execute: protectedProcedure
      .input(z.object({
        connectorId: z.string(),
        action: z.string(),
        payload: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const connectors = await getUserConnectors(ctx.user.id);
        const conn = connectors.find(c => c.connectorId === input.connectorId && c.status === "connected");
        if (!conn) throw new Error("Connector not found or not connected");
        const config = (conn.config || {}) as Record<string, string>;

        // Route by connector type
        switch (input.connectorId) {
          case "slack": {
            const webhookUrl = config.webhookUrl;
            if (!webhookUrl) throw new Error("Slack webhook URL not configured");
            const resp = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: input.payload?.message || "Hello from Manus Next" }),
            });
            return { success: resp.ok, result: resp.ok ? "Message sent to Slack" : "Slack delivery failed" };
          }
          case "zapier": {
            const zapierUrl = config.webhookUrl;
            if (!zapierUrl) throw new Error("Zapier webhook URL not configured");
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
      .input(z.object({ connectorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const connectors = await getUserConnectors(ctx.user.id);
        const conn = connectors.find(c => c.connectorId === input.connectorId);
        if (!conn) throw new Error("Connector not found");
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
        if (!provider) throw new Error("OAuth not supported for this connector");
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
        if (!conn) throw new Error("Connector not found");
        if (!conn.refreshToken) throw new Error("No refresh token available");
        const provider = getOAuthProvider(input.connectorId);
        if (!provider?.refreshToken) throw new Error("Provider does not support token refresh");
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
        if (!team) throw new Error("Invalid invite code");
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
        if (!build || !build.generatedHtml) throw new Error("No HTML to publish");
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
      .query(async ({ input }) => {
        return getDesign(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        canvasState: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createDesign({ userId: ctx.user.id, name: input.name, canvasState: input.canvasState });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().max(200).optional(),
        canvasState: z.any().optional(),
        thumbnailUrl: z.string().max(2000).optional(),
        exportUrl: z.string().max(2000).optional(),
      }))
      .mutation(async ({ input }) => {
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
      .mutation(async ({ input }) => {
        const design = await getDesign(input.id);
        if (!design) throw new Error("Design not found");
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
        tunnelUrl: z.string().min(1),
        osInfo: z.string().optional(),
        capabilities: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByPairingCode(input.pairingCode);
        if (!device || device.userId !== ctx.user.id) throw new Error("Invalid pairing code");
        await completeDevicePairing(device.id, input.tunnelUrl, input.osInfo, input.capabilities as any);
        return { success: true, deviceId: device.externalId };
      }),
    updateConnection: protectedProcedure
      .input(z.object({ externalId: z.string(), tunnelUrl: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.externalId);
        if (!device || device.userId !== ctx.user.id) throw new Error("Device not found");
        await updateDeviceConnection(device.id, input.tunnelUrl);
        return { success: true };
      }),
    updateStatus: protectedProcedure
      .input(z.object({ externalId: z.string(), status: z.enum(["online", "offline", "pairing", "error"]), lastError: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.externalId);
        if (!device || device.userId !== ctx.user.id) throw new Error("Device not found");
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
        if (!device || device.userId !== ctx.user.id) throw new Error("Device not found");
        if (device.status !== "online" || !device.tunnelUrl) throw new Error("Device is not connected");
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
            throw new Error(`Device command failed: ${errText}`);
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
            throw new Error("Device command timed out");
          }
          throw err;
        }
      }),
    /** Start a control session on a device */
    startSession: protectedProcedure
      .input(z.object({ deviceExternalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const device = await getDeviceByExternalId(input.deviceExternalId);
        if (!device || device.userId !== ctx.user.id) throw new Error("Device not found");
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
      .mutation(async ({ input }) => {
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
          code: `// Service Worker — Generated by Manus Next\nconst CACHE_NAME = '${cacheName}';\nconst OFFLINE_URL = '${offlinePage}';\n\nself.addEventListener('install', (event) => {\n  event.waitUntil(\n    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', OFFLINE_URL]))\n  );\n  self.skipWaiting();\n});\n\nself.addEventListener('activate', (event) => {\n  event.waitUntil(\n    caches.keys().then((keys) => Promise.all(\n      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))\n    ))\n  );\n  self.clients.claim();\n});\n\nself.addEventListener('fetch', (event) => {\n  if (event.request.mode === 'navigate') {\n    event.respondWith(\n      fetch(event.request).catch(() => caches.match(OFFLINE_URL))\n    );\n    return;\n  }\n  event.respondWith(\n    caches.match(event.request).then((cached) => cached || fetch(event.request))\n  );\n});`,
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
          userEmail: ctx.user.openId ?? "",
          userName: ctx.user.name ?? "",
          origin: input.origin,
        });
      }),
  }),
});
export type AppRouter = typeof appRouter;
