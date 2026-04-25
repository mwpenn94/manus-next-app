import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { tasks } from "../../drizzle/schema";
import {
  createTask,
  getTaskByExternalId,
  getTaskMessages,
  addTaskMessage,
  createTaskBranch,
  getParentBranch,
  getChildBranches,
  getDb,
} from "../db";

export const branchesRouter = router({
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
});
