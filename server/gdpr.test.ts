import { describe, expect, it } from "vitest";
import * as fs from "fs";

/**
 * GDPR Compliance Tests — Panel 16 Fix Verification
 * Validates that deleteAllData covers ALL 35 user-owned tables
 * and exportData covers ALL user data with proper redaction.
 */

describe("GDPR deleteAllData completeness", () => {
  it("should exist as a procedure on appRouter", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("gdpr.deleteAllData");
  });

  it("should delete from ALL user-owned tables in routers.ts", () => {
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");

    // Extract the deleteAllData procedure body
    const deleteStart = routerCode.indexOf("deleteAllData: protectedProcedure");
    expect(deleteStart).toBeGreaterThan(-1);

    // Get the procedure body (from start to next procedure or closing)
    const deleteBody = routerCode.slice(deleteStart, deleteStart + 5000);

    // All tables that have a userId column (direct ownership)
    const directUserTables = [
      "tasks", "memoryEntries", "connectors", "designs",
      "scheduledTasks", "userPreferences", "webappBuilds",
      "webappProjects", "notifications", "projects", "skills",
      "slideDecks", "meetingSessions", "connectedDevices",
      "deviceSessions", "mobileProjects", "appBuilds",
      "videoProjects", "githubRepos", "taskTemplates", "bridgeConfigs",
    ];

    for (const table of directUserTables) {
      expect(
        deleteBody.includes(`db.delete(${table})`),
        `deleteAllData must delete from ${table}`
      ).toBe(true);
    }

    // Tables deleted via cascading (taskId/taskExternalId)
    const cascadeTables = [
      "taskMessages", "taskFiles", "workspaceArtifacts",
      "taskEvents", "taskBranches", "taskShares", "taskRatings",
    ];

    for (const table of cascadeTables) {
      expect(
        deleteBody.includes(`db.delete(${table})`),
        `deleteAllData must cascade-delete from ${table}`
      ).toBe(true);
    }

    // Project-dependent tables
    const projectCascadeTables = [
      "projectKnowledge", "webappDeployments", "pageViews",
    ];

    for (const table of projectCascadeTables) {
      expect(
        deleteBody.includes(`db.delete(${table})`),
        `deleteAllData must cascade-delete from ${table}`
      ).toBe(true);
    }

    // Team-dependent tables
    const teamCascadeTables = ["teamSessions", "teamMembers"];

    for (const table of teamCascadeTables) {
      expect(
        deleteBody.includes(`db.delete(${table})`),
        `deleteAllData must cascade-delete from ${table}`
      ).toBe(true);
    }

    // The user record itself must be deleted
    expect(
      deleteBody.includes("db.delete(users)"),
      "deleteAllData must delete the user record itself"
    ).toBe(true);
  });

  it("should delete teams owned by user (ownerId)", () => {
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
    const deleteStart = routerCode.indexOf("deleteAllData: protectedProcedure");
    const deleteBody = routerCode.slice(deleteStart, deleteStart + 5000);

    expect(deleteBody).toContain("teams.ownerId");
    expect(deleteBody).toContain("db.delete(teams)");
  });

  it("should remove user from teams they are a member of", () => {
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
    const deleteStart = routerCode.indexOf("deleteAllData: protectedProcedure");
    const deleteBody = routerCode.slice(deleteStart, deleteStart + 5000);

    // Should delete teamMembers by userId (for teams user is a member of, not owner)
    expect(deleteBody).toContain("teamMembers");
    expect(deleteBody).toContain("teamMembers.userId");
  });

  it("should delete in correct dependency order (children before parents)", () => {
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
    const deleteStart = routerCode.indexOf("deleteAllData: protectedProcedure");
    const deleteBody = routerCode.slice(deleteStart, deleteStart + 5000);

    // taskMessages must be deleted before tasks
    const msgDeletePos = deleteBody.indexOf("db.delete(taskMessages)");
    const taskDeletePos = deleteBody.indexOf("db.delete(tasks)");
    expect(msgDeletePos).toBeLessThan(taskDeletePos);

    // projectKnowledge must be deleted before projects
    const knowledgeDeletePos = deleteBody.indexOf("db.delete(projectKnowledge)");
    const projectDeletePos = deleteBody.indexOf("db.delete(projects)");
    expect(knowledgeDeletePos).toBeLessThan(projectDeletePos);

    // webappDeployments must be deleted before webappProjects
    const deployDeletePos = deleteBody.indexOf("db.delete(webappDeployments)");
    const webappDeletePos = deleteBody.indexOf("db.delete(webappProjects)");
    expect(deployDeletePos).toBeLessThan(webappDeletePos);

    // teamSessions/teamMembers must be deleted before teams
    const sessionDeletePos = deleteBody.indexOf("db.delete(teamSessions)");
    const teamsDeletePos = deleteBody.indexOf("db.delete(teams)");
    expect(sessionDeletePos).toBeLessThan(teamsDeletePos);

    // users must be deleted LAST
    const usersDeletePos = deleteBody.indexOf("db.delete(users)");
    expect(usersDeletePos).toBeGreaterThan(taskDeletePos);
    expect(usersDeletePos).toBeGreaterThan(projectDeletePos);
    expect(usersDeletePos).toBeGreaterThan(teamsDeletePos);
  });

  it("should notify owner after deletion", () => {
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
    const deleteStart = routerCode.indexOf("deleteAllData: protectedProcedure");
    const deleteBody = routerCode.slice(deleteStart, deleteStart + 5000);

    expect(deleteBody).toContain("notifyOwner");
    expect(deleteBody).toContain("GDPR Data Deletion");
  });
});

describe("GDPR exportData completeness", () => {
  it("should exist as a procedure on appRouter", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("gdpr.exportData");
  });

  it("should export from ALL user-owned tables", () => {
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
    const exportStart = routerCode.indexOf("exportData: protectedProcedure");
    const exportBody = routerCode.slice(exportStart, exportStart + 5000);

    // All direct user-owned tables that should be queried
    const directTables = [
      "tasks", "memoryEntries", "connectors", "designs",
      "scheduledTasks", "webappProjects", "projects", "skills",
      "slideDecks", "meetingSessions", "connectedDevices",
      "mobileProjects", "appBuilds", "videoProjects",
      "githubRepos", "taskTemplates", "bridgeConfigs", "notifications",
    ];

    for (const table of directTables) {
      expect(
        exportBody.includes(`.from(${table})`),
        `exportData must query from ${table}`
      ).toBe(true);
    }

    // Cascade tables
    const cascadeTables = [
      "taskMessages", "taskFiles", "workspaceArtifacts",
      "taskRatings", "taskBranches", "projectKnowledge",
    ];

    for (const table of cascadeTables) {
      expect(
        exportBody.includes(`.from(${table})`),
        `exportData must query cascade table ${table}`
      ).toBe(true);
    }
  });

  it("should redact sensitive fields in export", () => {
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
    const exportStart = routerCode.indexOf("exportData: protectedProcedure");
    const exportBody = routerCode.slice(exportStart, exportStart + 5000);

    // Connector tokens must be redacted
    expect(exportBody).toContain('accessToken: "[REDACTED]"');
    expect(exportBody).toContain('refreshToken: "[REDACTED]"');

    // GitHub repo tokens must be redacted
    expect(exportBody).toContain('accessToken: "[REDACTED]"');
  });

  it("should upload export to S3 and return URL", () => {
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
    const exportStart = routerCode.indexOf("exportData: protectedProcedure");
    const exportBody = routerCode.slice(exportStart, exportStart + 6000);

    expect(exportBody).toContain("storagePut");
    expect(exportBody).toContain("gdpr-exports");
    expect(exportBody).toContain("return { url");
  });

  it("should include team data in export", () => {
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");
    const exportStart = routerCode.indexOf("exportData: protectedProcedure");
    const exportBody = routerCode.slice(exportStart, exportStart + 5000);

    expect(exportBody).toContain("teams");
    expect(exportBody).toContain("teams.ownerId");
  });
});

describe("Schema table coverage verification", () => {
  it("all schema tables with userId should be in deleteAllData", () => {
    const schemaCode = fs.readFileSync("drizzle/schema.ts", "utf-8");
    const routerCode = fs.readFileSync("server/routers.ts", "utf-8");

    // Find all table definitions
    const tableMatches = schemaCode.matchAll(/export const (\w+) = mysqlTable/g);
    const allTables = Array.from(tableMatches).map(m => m[1]);

    // Find tables with userId column
    const tablesWithUserId: string[] = [];
    for (const table of allTables) {
      const tableStart = schemaCode.indexOf(`export const ${table} = mysqlTable`);
      const tableEnd = schemaCode.indexOf("});", tableStart);
      const tableBody = schemaCode.slice(tableStart, tableEnd);
      if (tableBody.includes("userId") || tableBody.includes("ownerId")) {
        tablesWithUserId.push(table);
      }
    }

    // Get the deleteAllData body
    const deleteStart = routerCode.indexOf("deleteAllData: protectedProcedure");
    const deleteBody = routerCode.slice(deleteStart, deleteStart + 5000);

    // Every table with userId/ownerId should be referenced in deleteAllData
    for (const table of tablesWithUserId) {
      // Skip 'users' table — it's deleted separately
      if (table === "users") continue;
      expect(
        deleteBody.includes(table),
        `Table '${table}' has userId/ownerId but is not in deleteAllData`
      ).toBe(true);
    }
  });
});
