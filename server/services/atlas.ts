/**
 * ATLAS Service — Goal Decomposition & Execution Kernel
 *
 * Implements the ATLAS planning layer:
 * - Goal decomposition (break complex goals into sub-tasks with dependency DAG)
 * - Plan generation with budget guards
 * - Task execution orchestration with failure recovery
 * - Reflection and self-improvement after execution
 *
 * Ported from atlas-hybrid/server/services/atlas.ts with adaptations for manus-next-app.
 */

import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { runPreFlight, runPostFlight } from "./aegis";

// ── Types ──

export interface GoalInput {
  description: string;
  constraints?: string;
  maxBudget?: number;
  maxTasks?: number;
  priority?: "low" | "medium" | "high" | "critical";
}

export interface DecomposedPlan {
  goalId: number;
  externalId: string;
  tasks: PlanTask[];
  estimatedCost: number;
  estimatedDuration: string;
}

export interface PlanTask {
  id?: number;
  description: string;
  taskType: string;
  executionOrder: number;
  dependsOn: number[];
  estimatedTokens: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

export interface ExecutionResult {
  goalId: number;
  status: "completed" | "partial" | "failed";
  completedTasks: number;
  totalTasks: number;
  totalCost: number;
  outputs: Array<{ taskDescription: string; output: string; status: string }>;
  reflection?: string;
}

// ── Goal Decomposition ──

/**
 * Decompose a complex goal into a DAG of sub-tasks using LLM.
 */
export async function decomposeGoal(input: GoalInput, userId: number): Promise<DecomposedPlan> {
  const maxTasks = input.maxTasks ?? 8;

  // Create the goal record
  const goal = await db.createAtlasGoal({
    userId,
    description: input.description,
    maxCostCredits: input.maxBudget ?? 1000,
    status: "planning",
  });

  if (!goal) throw new Error("Failed to create goal");

  // Use LLM to decompose the goal
  let tasks: PlanTask[];
  try {
    const decompositionPrompt = `You are a task planner. Decompose this goal into ${maxTasks} or fewer concrete sub-tasks.

Goal: ${input.description}
${input.constraints ? `Constraints: ${input.constraints}` : ""}

Return a JSON object with a "tasks" array. Each task has:
- description: what needs to be done (detailed)
- taskType: one of "code", "research", "writing", "data", "design", "planning", "conversation"
- executionOrder: integer (1-based, tasks with same order can run in parallel)
- dependsOn: array of executionOrder numbers this task depends on (empty if no dependencies)
- estimatedTokens: rough token estimate for this task

Return ONLY the JSON object, no markdown or explanation.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a precise task decomposition engine. Return only valid JSON." },
        { role: "user", content: decompositionPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "task_decomposition",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    taskType: { type: "string" },
                    executionOrder: { type: "integer" },
                    dependsOn: { type: "array", items: { type: "integer" } },
                    estimatedTokens: { type: "integer" },
                  },
                  required: ["description", "taskType", "executionOrder", "dependsOn", "estimatedTokens"],
                  additionalProperties: false,
                },
              },
            },
            required: ["tasks"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(typeof content === "string" ? content : "{}");
    tasks = (parsed.tasks || []).slice(0, maxTasks).map((t: any, i: number) => ({
      description: t.description,
      taskType: t.taskType || "conversation",
      executionOrder: t.executionOrder || i + 1,
      dependsOn: t.dependsOn || [],
      estimatedTokens: t.estimatedTokens || 500,
      status: "pending" as const,
    }));
  } catch (err) {
    // Fallback: single-task plan
    console.warn("[ATLAS] LLM decomposition failed, using single-task fallback:", err);
    tasks = [{
      description: input.description,
      taskType: "conversation",
      executionOrder: 1,
      dependsOn: [],
      estimatedTokens: 1000,
      status: "pending",
    }];
  }

  // Create plan record with proper DAG structure
  const dagNodes = tasks.map((t, i) => ({
    id: `task-${i + 1}`,
    taskId: i + 1,
    dependsOn: t.dependsOn.map((d) => `task-${d}`),
  }));

  const planId = await db.createAtlasPlan({
    goalId: goal.id,
    dag: { nodes: dagNodes },
  });

  // Create task records
  for (const task of tasks) {
    const taskId = await db.createGoalTask({
      goalId: goal.id,
      planId,
      description: task.description,
      taskType: task.taskType,
      executionOrder: task.executionOrder,
      dependsOn: task.dependsOn,
      status: "pending",
    });
    task.id = taskId;
  }

  // Update goal status
  await db.updateAtlasGoal(goal.id, { status: "planning", progress: 5 });

  const estimatedCost = tasks.reduce((sum, t) => sum + Math.ceil(t.estimatedTokens * 0.003), 0);

  return {
    goalId: goal.id,
    externalId: goal.externalId,
    tasks,
    estimatedCost,
    estimatedDuration: `${Math.ceil(tasks.length * 15)}s`,
  };
}

// ── Task Execution ──

/**
 * Execute a single task within a goal plan, with AEGIS pre/post-flight.
 */
async function executeTask(
  task: { id: number; description: string; taskType: string | null; executionOrder: number },
  goalDescription: string,
  userId: number,
  previousOutputs: string[]
): Promise<{ output: string; cost: number; status: "completed" | "failed" }> {
  // Update task status
  await db.updateGoalTask(task.id, { status: "running" });

  try {
    // Build the task prompt with context from previous outputs
    const contextStr = previousOutputs.length > 0
      ? `\n\nPrevious task outputs for context:\n${previousOutputs.slice(-3).map((o, i) => `[Output ${i + 1}]: ${o.slice(0, 500)}`).join("\n")}`
      : "";

    const taskPrompt = `Goal: ${goalDescription}\n\nCurrent task: ${task.description}${contextStr}\n\nComplete this task thoroughly.`;

    // Run AEGIS pre-flight
    const preFlight = await runPreFlight(taskPrompt, userId);

    let output: string;
    let cost = preFlight.costEstimate ?? 0;

    if (preFlight.cached && preFlight.response) {
      output = preFlight.response;
      cost = 0;
    } else {
      // Execute via LLM
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are executing a sub-task as part of a larger goal. Be thorough and specific." },
          { role: "user", content: preFlight.optimizedPrompt ?? taskPrompt },
        ],
      });
      const content = response.choices[0].message.content;
      output = typeof content === "string" ? content : JSON.stringify(content);
    }

    // Run AEGIS post-flight
    if (preFlight.sessionId) {
      await runPostFlight(preFlight.sessionId, output, task.taskType ?? "conversation", cost);
    }

    // Update task record
    await db.updateGoalTask(task.id, {
      status: "completed",
      output: output.slice(0, 10000),
      costCredits: cost,
      completedAt: new Date(),
    });

    return { output, cost, status: "completed" };
  } catch (err: any) {
    console.error(`[ATLAS] Task execution failed: ${task.description?.slice(0, 80)}`, err.message?.slice(0, 200));
    await db.updateGoalTask(task.id, {
      status: "failed",
      output: `Error: ${err.message?.slice(0, 500) ?? "Unknown error"}`,
      completedAt: new Date(),
    });
    return { output: "", cost: 0, status: "failed" };
  }
}

/**
 * Execute all tasks in a goal plan, respecting the dependency DAG and budget guards.
 */
export async function executeGoal(goalId: number, userId: number, maxBudget?: number): Promise<ExecutionResult> {
  const goalTasks = await db.getGoalTasks(goalId);

  if (goalTasks.length === 0) {
    return { goalId, status: "failed", completedTasks: 0, totalTasks: 0, totalCost: 0, outputs: [] };
  }

  // Get goal description
  const goalRows = await db.getUserGoals(userId, { limit: 100 });
  const goalRow = goalRows.find((g) => g.id === goalId);
  if (!goalRow) throw new Error("Goal not found");

  await db.updateAtlasGoal(goalId, { status: "executing" });

  const budget = maxBudget ?? goalRow.maxCostCredits ?? 1000;
  let totalCost = 0;
  const outputs: Array<{ taskDescription: string; output: string; status: string }> = [];
  const previousOutputs: string[] = [];
  let completedTasks = 0;

  // Group tasks by execution order
  const orderGroups = new Map<number, typeof goalTasks>();
  for (const task of goalTasks) {
    const order = task.executionOrder;
    if (!orderGroups.has(order)) orderGroups.set(order, []);
    orderGroups.get(order)!.push(task);
  }

  // Execute in order
  const sortedOrders = Array.from(orderGroups.keys()).sort((a, b) => a - b);

  for (const order of sortedOrders) {
    const batch = orderGroups.get(order)!;

    // Budget guard
    if (totalCost >= budget) {
      console.warn(`[ATLAS] Budget exceeded (${totalCost} >= ${budget}), skipping remaining tasks`);
      for (const task of batch) {
        await db.updateGoalTask(task.id, { status: "skipped" });
        outputs.push({ taskDescription: task.description, output: "Skipped: budget exceeded", status: "skipped" });
      }
      continue;
    }

    // Check dependencies
    const completedStatuses = new Set<number>();
    for (const [o, tasks] of Array.from(orderGroups.entries())) {
      if (tasks.every((t: any) => t.status === "completed")) completedStatuses.add(o);
    }

    const allDepsCompleted = batch.every((task) => {
      const deps = (task.dependsOn as number[]) || [];
      return deps.every((depOrder) => completedStatuses.has(depOrder));
    });

    if (!allDepsCompleted) {
      for (const task of batch) {
        await db.updateGoalTask(task.id, { status: "skipped" });
        outputs.push({ taskDescription: task.description, output: "Skipped: dependency not met", status: "skipped" });
      }
      continue;
    }

    // Execute batch (sequentially for now)
    for (const task of batch) {
      const result = await executeTask(
        { id: task.id, description: task.description, taskType: task.taskType, executionOrder: task.executionOrder },
        goalRow.description,
        userId,
        previousOutputs
      );
      totalCost += result.cost;
      outputs.push({ taskDescription: task.description, output: result.output.slice(0, 2000), status: result.status });
      if (result.status === "completed") {
        completedTasks++;
        previousOutputs.push(result.output);
      }
    }

    // Update progress
    const progress = Math.round((completedTasks / goalTasks.length) * 100);
    await db.updateAtlasGoal(goalId, { progress, totalCost });
  }

  // Determine overall status
  const status = completedTasks === goalTasks.length
    ? "completed"
    : completedTasks > 0
      ? "partial"
      : "failed";

  // Update goal
  await db.updateAtlasGoal(goalId, {
    status: status === "completed" ? "completed" : status === "partial" ? "executing" : "failed",
    progress: status === "completed" ? 100 : Math.round((completedTasks / goalTasks.length) * 100),
    totalCost,
  });

  // Run reflection if completed
  let reflection: string | undefined;
  if (status === "completed" || status === "partial") {
    try {
      reflection = await reflect(goalRow.description, outputs, totalCost);
      if (reflection) {
        await db.updateAtlasGoal(goalId, { reflection });
      }
    } catch (err) {
      console.warn("[ATLAS] Reflection failed:", err);
    }
  }

  return { goalId, status, completedTasks, totalTasks: goalTasks.length, totalCost, outputs, reflection };
}

// ── Reflection ──

/**
 * After goal execution, reflect on what went well and what could be improved.
 */
async function reflect(
  goalDescription: string,
  outputs: Array<{ taskDescription: string; output: string; status: string }>,
  totalCost: number
): Promise<string> {
  const summary = outputs.map((o) => `- ${o.taskDescription.slice(0, 80)}: ${o.status}`).join("\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a self-improvement engine. Analyze the execution results and provide a brief reflection (2-3 sentences) on what went well, what could be improved, and any patterns to remember.",
      },
      {
        role: "user",
        content: `Goal: ${goalDescription}\nTotal cost: ${totalCost} credits\nResults:\n${summary}`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  return typeof content === "string" ? content : "";
}

// ── Goal Status ──

export async function getGoalStatus(goalExternalId: string, userId: number) {
  const goal = await db.getAtlasGoal(goalExternalId);
  if (!goal || goal.userId !== userId) return null;
  const tasks = await db.getGoalTasks(goal.id);
  return { goal, tasks };
}
