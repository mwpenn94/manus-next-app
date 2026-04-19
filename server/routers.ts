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
});
export type AppRouter = typeof appRouter;
