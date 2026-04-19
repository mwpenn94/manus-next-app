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
});
export type AppRouter = typeof appRouter;
