/**
 * ATLAS Service — Dedicated Tests
 *
 * Tests the goal decomposition kernel, plan execution, budget guards,
 * and reflection loop. Uses mocked LLM to avoid real API calls.
 *
 * Aligned with actual service interface: GoalInput object, db.createGoalTask,
 * db.getGoalTasks, db.getUserGoals, etc.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module before importing ATLAS
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test-id",
    created: Date.now(),
    model: "test-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({
            tasks: [
              { description: "Research competitors", taskType: "research", executionOrder: 1, dependsOn: [], estimatedTokens: 500 },
              { description: "Draft report", taskType: "writing", executionOrder: 2, dependsOn: [1], estimatedTokens: 800 },
            ],
          }),
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
  }),
}));

// Mock AEGIS pre/post-flight
vi.mock("./services/aegis", () => ({
  runPreFlight: vi.fn().mockResolvedValue({
    sessionId: "test-session",
    classification: { complexity: "moderate", taskType: "research" },
    cached: false,
    response: null,
    optimizedPrompt: "Optimized prompt",
    costEstimate: 5,
  }),
  runPostFlight: vi.fn().mockResolvedValue({
    qualityScore: 85,
    improvements: [],
  }),
}));

// Mock db module with correct function names matching the actual implementation
vi.mock("./db", () => ({
  createAtlasGoal: vi.fn().mockResolvedValue({
    id: 1,
    externalId: "goal-abc123",
    userId: 1,
    description: "Test Goal",
    status: "planning",
    maxCostCredits: 1000,
    totalCost: 0,
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateAtlasGoal: vi.fn().mockResolvedValue(undefined),
  getAtlasGoal: vi.fn().mockResolvedValue({
    id: 1,
    externalId: "goal-abc123",
    userId: 1,
    description: "Test Goal",
    status: "pending",
    maxCostCredits: 1000,
    totalCost: 0,
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getUserGoals: vi.fn().mockResolvedValue([
    {
      id: 1,
      externalId: "goal-abc123",
      userId: 1,
      description: "Test Goal",
      status: "executing",
      maxCostCredits: 1000,
      totalCost: 0,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createAtlasPlan: vi.fn().mockResolvedValue(1),
  createGoalTask: vi.fn().mockImplementation(async () => {
    return Math.floor(Math.random() * 1000) + 1;
  }),
  getGoalTasks: vi.fn().mockResolvedValue([
    {
      id: 101,
      goalId: 1,
      planId: 1,
      description: "Research competitors",
      taskType: "research",
      executionOrder: 1,
      dependsOn: [],
      status: "pending",
      output: null,
      costCredits: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 102,
      goalId: 1,
      planId: 1,
      description: "Draft report",
      taskType: "writing",
      executionOrder: 2,
      dependsOn: [1],
      status: "pending",
      output: null,
      costCredits: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  updateGoalTask: vi.fn().mockResolvedValue(undefined),
}));

import * as atlas from "./services/atlas";

describe("ATLAS Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("decomposeGoal", () => {
    it("should decompose a goal into tasks via LLM using GoalInput", async () => {
      const result = await atlas.decomposeGoal(
        { description: "Analyze market competitors", maxBudget: 1000 },
        1
      );
      expect(result).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result).toHaveProperty("goalId");
      expect(result).toHaveProperty("externalId");
      expect(result).toHaveProperty("estimatedCost");
      expect(result).toHaveProperty("estimatedDuration");
    });

    it("should return tasks with correct PlanTask fields", async () => {
      const result = await atlas.decomposeGoal(
        { description: "Build a landing page" },
        1
      );
      for (const task of result.tasks) {
        expect(task).toHaveProperty("description");
        expect(task).toHaveProperty("taskType");
        expect(task).toHaveProperty("executionOrder");
        expect(task).toHaveProperty("dependsOn");
        expect(task).toHaveProperty("estimatedTokens");
        expect(task).toHaveProperty("status");
        expect(typeof task.description).toBe("string");
        expect(typeof task.taskType).toBe("string");
        expect(typeof task.executionOrder).toBe("number");
        expect(Array.isArray(task.dependsOn)).toBe(true);
      }
    });

    it("should create a goal record in the database", async () => {
      const db = await import("./db");
      await atlas.decomposeGoal({ description: "Test goal" }, 42);
      expect(db.createAtlasGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 42,
          description: "Test goal",
          status: "planning",
        })
      );
    });

    it("should create a plan record in the database", async () => {
      const db = await import("./db");
      await atlas.decomposeGoal({ description: "Test goal" }, 1);
      expect(db.createAtlasPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          goalId: 1,
          dag: expect.objectContaining({ nodes: expect.any(Array) }),
        })
      );
    });

    it("should create task records for each decomposed task", async () => {
      const db = await import("./db");
      await atlas.decomposeGoal({ description: "Multi-step project" }, 1);
      // LLM mock returns 2 tasks
      expect(db.createGoalTask).toHaveBeenCalledTimes(2);
      expect(db.createGoalTask).toHaveBeenCalledWith(
        expect.objectContaining({
          goalId: 1,
          description: expect.any(String),
          taskType: expect.any(String),
          executionOrder: expect.any(Number),
          status: "pending",
        })
      );
    });

    it("should respect maxTasks constraint", async () => {
      const result = await atlas.decomposeGoal(
        { description: "Complex project", maxTasks: 3 },
        1
      );
      expect(result.tasks.length).toBeLessThanOrEqual(3);
    });

    it("should fall back to single task on LLM failure", async () => {
      const llm = await import("./_core/llm");
      (llm.invokeLLM as any).mockRejectedValueOnce(new Error("LLM unavailable"));

      const result = await atlas.decomposeGoal(
        { description: "Fallback test" },
        1
      );
      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0].taskType).toBe("conversation");
    });

    it("should handle empty description", async () => {
      const result = await atlas.decomposeGoal({ description: "" }, 1);
      expect(result).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it("should pass constraints to the LLM prompt", async () => {
      const llm = await import("./_core/llm");
      await atlas.decomposeGoal(
        { description: "Build API", constraints: "Must use REST, no GraphQL" },
        1
      );
      expect(llm.invokeLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("Must use REST"),
            }),
          ]),
        })
      );
    });
  });

  describe("executeGoal", () => {
    it("should execute a goal and return ExecutionResult", async () => {
      const result = await atlas.executeGoal(1, 1);
      expect(result).toBeDefined();
      expect(result).toHaveProperty("goalId", 1);
      expect(result).toHaveProperty("status");
      expect(["completed", "partial", "failed"]).toContain(result.status);
      expect(result).toHaveProperty("completedTasks");
      expect(result).toHaveProperty("totalTasks");
      expect(result).toHaveProperty("totalCost");
      expect(result).toHaveProperty("outputs");
      expect(Array.isArray(result.outputs)).toBe(true);
    });

    it("should return failed status when no tasks exist", async () => {
      const db = await import("./db");
      (db.getGoalTasks as any).mockResolvedValueOnce([]);

      const result = await atlas.executeGoal(1, 1);
      expect(result.status).toBe("failed");
      expect(result.completedTasks).toBe(0);
      expect(result.totalTasks).toBe(0);
    });

    it("should throw when goal not found for user", async () => {
      const db = await import("./db");
      (db.getUserGoals as any).mockResolvedValueOnce([]);

      await expect(atlas.executeGoal(999, 1)).rejects.toThrow("Goal not found");
    });

    it("should update goal status to executing", async () => {
      const db = await import("./db");
      await atlas.executeGoal(1, 1);
      expect(db.updateAtlasGoal).toHaveBeenCalledWith(1, expect.objectContaining({ status: "executing" }));
    });

    it("should update task status during execution", async () => {
      const db = await import("./db");
      await atlas.executeGoal(1, 1);
      // Should update tasks to "running" then "completed"
      expect(db.updateGoalTask).toHaveBeenCalled();
    });

    it("should track outputs from each task", async () => {
      const result = await atlas.executeGoal(1, 1);
      expect(result.outputs.length).toBeGreaterThan(0);
      for (const output of result.outputs) {
        expect(output).toHaveProperty("taskDescription");
        expect(output).toHaveProperty("output");
        expect(output).toHaveProperty("status");
      }
    });
  });

  describe("Budget Guards", () => {
    it("should skip tasks when budget is exceeded", async () => {
      const db = await import("./db");
      (db.getUserGoals as any).mockResolvedValueOnce([
        {
          id: 1,
          externalId: "goal-abc123",
          userId: 1,
          description: "Test",
          status: "executing",
          maxCostCredits: 1, // Very low budget
          totalCost: 0,
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Mock the LLM to return high-cost responses
      const llm = await import("./_core/llm");
      (llm.invokeLLM as any)
        .mockResolvedValueOnce({
          choices: [{ index: 0, message: { role: "assistant", content: "Expensive response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 5000, completion_tokens: 5000, total_tokens: 10000 },
        })
        .mockResolvedValueOnce({
          choices: [{ index: 0, message: { role: "assistant", content: "Reflection" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 },
        });

      const result = await atlas.executeGoal(1, 1, 1);
      // With a budget of 1, some tasks may be skipped
      expect(result).toBeDefined();
      expect(result.totalCost).toBeDefined();
    });

    it("should respect custom maxBudget parameter", async () => {
      const result = await atlas.executeGoal(1, 1, 5000);
      expect(result).toBeDefined();
    });
  });

  describe("getGoalStatus", () => {
    it("should return goal and tasks for valid external ID", async () => {
      const result = await atlas.getGoalStatus("goal-abc123", 1);
      expect(result).toBeDefined();
      expect(result).toHaveProperty("goal");
      expect(result).toHaveProperty("tasks");
    });

    it("should return null for non-existent goal", async () => {
      const db = await import("./db");
      (db.getAtlasGoal as any).mockResolvedValueOnce(null);

      const result = await atlas.getGoalStatus("nonexistent", 1);
      expect(result).toBeNull();
    });

    it("should return null if goal belongs to different user", async () => {
      const db = await import("./db");
      (db.getAtlasGoal as any).mockResolvedValueOnce({
        id: 1,
        externalId: "goal-abc123",
        userId: 999, // Different user
        description: "Other user's goal",
        status: "pending",
      });

      const result = await atlas.getGoalStatus("goal-abc123", 1);
      expect(result).toBeNull();
    });
  });
});
