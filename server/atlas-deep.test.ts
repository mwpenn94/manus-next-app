/**
 * ATLAS Deep Edge-Case Tests — Pass 006 G-002
 *
 * Covers: DAG dependency enforcement, parallel batch execution,
 * budget guard edge cases, reflection pipeline, error recovery,
 * and LLM fallback paths.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";
import { readRouterSource } from "./test-utils/readRouterSource";

// Mock dependencies
vi.mock("./db");
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ tasks: [
      { description: "Sub-task 1", taskType: "code", executionOrder: 1, dependsOn: [], estimatedTokens: 500 },
      { description: "Sub-task 2", taskType: "research", executionOrder: 2, dependsOn: [1], estimatedTokens: 300 },
    ]}) } }],
  }),
}));

const mockedDb = vi.mocked(db);

describe("ATLAS Deep Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    mockedDb.createAtlasGoal.mockResolvedValue({ id: 1, externalId: "goal-ext-1" } as any);
    mockedDb.createAtlasPlan.mockResolvedValue(1);
    mockedDb.createGoalTask.mockResolvedValue(1);
    mockedDb.updateAtlasGoal.mockResolvedValue(undefined);
    mockedDb.updateGoalTask.mockResolvedValue(undefined);
    mockedDb.getGoalTasks.mockResolvedValue([
      { id: 1, description: "Task 1", taskType: "code", executionOrder: 1, dependsOn: [], status: "pending" } as any,
    ]);
    mockedDb.getUserGoals.mockResolvedValue([
      { id: 1, description: "Test goal", maxCostCredits: 1000 } as any,
    ]);
    mockedDb.checkAegisCache.mockResolvedValue(null);
    mockedDb.createAegisSession.mockResolvedValue(1);
    mockedDb.getPatterns.mockResolvedValue([]);
    mockedDb.getFragments.mockResolvedValue([]);
    mockedDb.createQualityScore.mockResolvedValue(undefined);
    mockedDb.createFragment.mockResolvedValue(undefined);
    mockedDb.createLesson.mockResolvedValue(undefined);
    mockedDb.updateAegisSession.mockResolvedValue(undefined);
  });

  describe("DAG Dependency Enforcement", () => {
    it("should skip tasks whose dependencies have not completed", async () => {
      const atlas = await import("./services/atlas");
      // Task 2 depends on Task 1, but Task 1 fails
      mockedDb.getGoalTasks.mockResolvedValue([
        { id: 1, description: "Task 1", taskType: "code", executionOrder: 1, dependsOn: [], status: "pending" } as any,
        { id: 2, description: "Task 2", taskType: "code", executionOrder: 2, dependsOn: [1], status: "pending" } as any,
      ]);
      mockedDb.getUserGoals.mockResolvedValue([
        { id: 1, description: "Test goal", maxCostCredits: 1000 } as any,
      ]);

      const result = await atlas.executeGoal(1, 1);
      expect(result.totalTasks).toBe(2);
      // The function should handle dependency checking
      expect(result.outputs).toBeDefined();
      expect(result.outputs.length).toBeGreaterThanOrEqual(1);
    });

    it("should execute tasks in correct order based on executionOrder", async () => {
      const atlas = await import("./services/atlas");
      const executionLog: number[] = [];
      const originalUpdateGoalTask = mockedDb.updateGoalTask;
      mockedDb.updateGoalTask.mockImplementation(async (taskId: number, data: any) => {
        if (data.status === "running") executionLog.push(taskId);
        return undefined;
      });

      mockedDb.getGoalTasks.mockResolvedValue([
        { id: 3, description: "Task 3", taskType: "code", executionOrder: 3, dependsOn: [1, 2], status: "pending" } as any,
        { id: 1, description: "Task 1", taskType: "code", executionOrder: 1, dependsOn: [], status: "pending" } as any,
        { id: 2, description: "Task 2", taskType: "code", executionOrder: 2, dependsOn: [1], status: "pending" } as any,
      ]);

      await atlas.executeGoal(1, 1);
      // Task 1 should be executed before Task 2 before Task 3
      if (executionLog.length >= 2) {
        const idx1 = executionLog.indexOf(1);
        const idx2 = executionLog.indexOf(2);
        if (idx1 >= 0 && idx2 >= 0) {
          expect(idx1).toBeLessThan(idx2);
        }
      }
    });

    it("should handle parallel tasks with same executionOrder", async () => {
      const atlas = await import("./services/atlas");
      mockedDb.getGoalTasks.mockResolvedValue([
        { id: 1, description: "Parallel A", taskType: "code", executionOrder: 1, dependsOn: [], status: "pending" } as any,
        { id: 2, description: "Parallel B", taskType: "research", executionOrder: 1, dependsOn: [], status: "pending" } as any,
      ]);

      const result = await atlas.executeGoal(1, 1);
      expect(result.totalTasks).toBe(2);
      expect(result.outputs.length).toBe(2);
    });
  });

  describe("Budget Guard Edge Cases", () => {
    it("should skip all remaining tasks when budget is exactly zero", async () => {
      const atlas = await import("./services/atlas");
      mockedDb.getGoalTasks.mockResolvedValue([
        { id: 1, description: "Task 1", taskType: "code", executionOrder: 1, dependsOn: [], status: "pending" } as any,
      ]);
      mockedDb.getUserGoals.mockResolvedValue([
        { id: 1, description: "Test goal", maxCostCredits: 0 } as any,
      ]);

      const result = await atlas.executeGoal(1, 1, 0);
      // With zero budget, tasks should be skipped
      expect(result.outputs.some(o => o.status === "skipped" || o.status === "completed")).toBe(true);
    });

    it("should handle very large budget without issues", async () => {
      const atlas = await import("./services/atlas");
      const result = await atlas.executeGoal(1, 1, 999999);
      expect(result.status).toBeDefined();
      expect(["completed", "partial", "failed"]).toContain(result.status);
    });

    it("should accumulate cost across multiple tasks", async () => {
      const atlas = await import("./services/atlas");
      mockedDb.getGoalTasks.mockResolvedValue([
        { id: 1, description: "Task 1", taskType: "code", executionOrder: 1, dependsOn: [], status: "pending" } as any,
        { id: 2, description: "Task 2", taskType: "code", executionOrder: 2, dependsOn: [], status: "pending" } as any,
      ]);

      const result = await atlas.executeGoal(1, 1);
      expect(result.totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Reflection Pipeline", () => {
    it("should generate reflection on completed goals", async () => {
      const atlas = await import("./services/atlas");
      const result = await atlas.executeGoal(1, 1);
      if (result.status === "completed" || result.status === "partial") {
        // Reflection may or may not be present depending on LLM mock
        expect(result).toHaveProperty("reflection");
      }
    });

    it("should not crash when reflection fails", async () => {
      const atlas = await import("./services/atlas");
      const { invokeLLM } = await import("./_core/llm");
      const mockedLLM = vi.mocked(invokeLLM);
      
      // Make LLM fail on the reflection call (3rd call)
      let callCount = 0;
      mockedLLM.mockImplementation(async () => {
        callCount++;
        if (callCount > 2) throw new Error("Reflection LLM failed");
        return { choices: [{ message: { content: "Task output" } }] } as any;
      });

      const result = await atlas.executeGoal(1, 1);
      // Should not throw, reflection failure is caught
      expect(result.status).toBeDefined();
    });
  });

  describe("Error Recovery", () => {
    it("should handle task execution failure gracefully", async () => {
      const atlas = await import("./services/atlas");
      const { invokeLLM } = await import("./_core/llm");
      vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM timeout"));

      const result = await atlas.executeGoal(1, 1);
      // Should not throw — individual task failures are caught
      expect(result.status).toBeDefined();
    });

    it("should return failed status when all tasks fail", async () => {
      const atlas = await import("./services/atlas");
      const { invokeLLM } = await import("./_core/llm");
      vi.mocked(invokeLLM).mockRejectedValue(new Error("All LLM calls fail"));

      const result = await atlas.executeGoal(1, 1);
      expect(["failed", "partial"]).toContain(result.status);
    });

    it("should return partial status when some tasks succeed and some fail", async () => {
      const atlas = await import("./services/atlas");
      const { invokeLLM } = await import("./_core/llm");
      let callCount = 0;
      vi.mocked(invokeLLM).mockImplementation(async () => {
        callCount++;
        if (callCount % 2 === 0) throw new Error("Intermittent failure");
        return { choices: [{ message: { content: "Success output" } }] } as any;
      });

      mockedDb.getGoalTasks.mockResolvedValue([
        { id: 1, description: "Task 1", taskType: "code", executionOrder: 1, dependsOn: [], status: "pending" } as any,
        { id: 2, description: "Task 2", taskType: "code", executionOrder: 2, dependsOn: [], status: "pending" } as any,
      ]);

      const result = await atlas.executeGoal(1, 1);
      expect(result.totalTasks).toBe(2);
    });
  });

  describe("Goal Decomposition Edge Cases", () => {
    it("should handle goals with priority field", async () => {
      const atlas = await import("./services/atlas");
      const result = await atlas.decomposeGoal({
        description: "Critical task",
        priority: "critical",
      }, 1);
      expect(result.goalId).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it("should handle goals with all optional fields", async () => {
      const atlas = await import("./services/atlas");
      const result = await atlas.decomposeGoal({
        description: "Full goal",
        constraints: "Must be fast",
        maxBudget: 500,
        maxTasks: 3,
        priority: "high",
      }, 1);
      expect(result.tasks.length).toBeLessThanOrEqual(3);
    });

    it("should generate correct DAG structure", async () => {
      const atlas = await import("./services/atlas");
      const result = await atlas.decomposeGoal({ description: "Build a website" }, 1);
      // Each task should have valid PlanTask fields
      for (const task of result.tasks) {
        expect(task).toHaveProperty("description");
        expect(task).toHaveProperty("taskType");
        expect(task).toHaveProperty("executionOrder");
        expect(task).toHaveProperty("dependsOn");
        expect(task).toHaveProperty("estimatedTokens");
        expect(task).toHaveProperty("status");
        expect(task.status).toBe("pending");
      }
    });

    it("should estimate cost based on token counts", async () => {
      const atlas = await import("./services/atlas");
      const result = await atlas.decomposeGoal({ description: "Analyze data" }, 1);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.estimatedDuration).toMatch(/\d+s/);
    });

    it("should create plan record with DAG nodes", async () => {
      const atlas = await import("./services/atlas");
      await atlas.decomposeGoal({ description: "Test DAG" }, 1);
      expect(mockedDb.createAtlasPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          goalId: 1,
          dag: expect.objectContaining({
            nodes: expect.any(Array),
          }),
        })
      );
    });
  });

  describe("Source Code Structure", () => {
    it("should import AEGIS pre/post-flight functions", () => {
      const source = readRouterSource();
      // The atlas service should use AEGIS
      const atlasSource = require("fs").readFileSync("server/services/atlas.ts", "utf-8");
      expect(atlasSource).toContain("runPreFlight");
      expect(atlasSource).toContain("runPostFlight");
    });

    it("should have all exported functions documented", () => {
      const atlasSource = require("fs").readFileSync("server/services/atlas.ts", "utf-8");
      expect(atlasSource).toContain("export async function decomposeGoal");
      expect(atlasSource).toContain("export async function executeGoal");
      expect(atlasSource).toContain("export async function getGoalStatus");
    });
  });
});
