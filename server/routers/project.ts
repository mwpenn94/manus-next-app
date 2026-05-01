import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { 
  addProjectKnowledge,
  assignTaskToProject,
  createProject,
  deleteProject,
  deleteProjectKnowledge,
  getProjectByExternalId,
  getProjectKnowledgeItems,
  getProjectTasks,
  getUserProjects,
  reorderProjects,
  toggleProjectPin,
  updateProject,
  verifyKnowledgeOwnership,
 } from "../db";
import { tasks } from "../../drizzle/schema";

export const projectRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserProjects(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string().max(500) }))
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
        externalId: z.string().max(500),
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
      .input(z.object({ externalId: z.string().max(500) }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await deleteProject(project.id);
        return { success: true };
      }),
    pin: protectedProcedure
      .input(z.object({ externalId: z.string().max(500) }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await toggleProjectPin(project.id);
        return { success: true };
      }),
    reorder: protectedProcedure
      .input(z.object({ orderedExternalIds: z.array(z.string().max(10000)) }))
      .mutation(async ({ ctx, input }) => {
        const userProjects = await getUserProjects(ctx.user.id);
        const idMap = new Map(userProjects.map(p => [p.externalId, p.id]));
        const orderedIds = input.orderedExternalIds.map(eid => idMap.get(eid)).filter((id): id is number => id !== undefined);
        await reorderProjects(ctx.user.id, orderedIds);
        return { success: true };
      }),
    tasks: protectedProcedure
      .input(z.object({ externalId: z.string().max(500) }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) return [];
        return getProjectTasks(project.id);
      }),
    assignTask: protectedProcedure
      .input(z.object({ taskId: z.number(), projectExternalId: z.string().max(500).nullable() }))
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
        .input(z.object({ projectExternalId: z.string().max(500) }))
        .query(async ({ ctx, input }) => {
          const project = await getProjectByExternalId(input.projectExternalId);
          if (!project || project.userId !== ctx.user.id) return [];
          return getProjectKnowledgeItems(project.id);
        }),
      add: protectedProcedure
        .input(z.object({
          projectExternalId: z.string().max(500),
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
  });
