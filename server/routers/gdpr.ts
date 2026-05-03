import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { getDb, getUserPreferences } from "../db";
import { 
  aegisFragments,
  aegisLessons,
  aegisQualityScores,
  aegisSessions,
  appBuilds,
  atlasGoalTasks,
  atlasGoals,
  atlasPlans,
  bridgeConfigs,
  connectedDevices,
  connectorHealth,
  connectorHealthLogs,
  connectors,
  designs,
  deviceSessions,
  githubRepos,
  meetingSessions,
  memoryEntries,
  mobileProjects,
  notifications,
  pageViews,
  projectKnowledge,
  projects,
  scheduledTasks,
  skills,
  slideDecks,
  strategyTelemetry,
  taskBranches,
  taskEvents,
  taskFiles,
  taskMessages,
  taskRatings,
  taskShares,
  taskTemplates,
  tasks,
  teamMembers,
  teamSessions,
  teams,
  userPreferences,
  users,
  videoProjects,
  webappBuilds,
  webappDeployments,
  webappProjects,
  workspaceArtifacts,
  sovereignUsageLogs,
  sovereignRoutingDecisions,
  appFeedback,
  automationSchedules,
  dataPipelines,
  dataPipelineRuns,
  memoryEmbeddings,
  scheduleExecutionHistory,
  messageFeedback,
  personalizationPreferences,
  personalizationRules,
  personalizationLearningLog,
  processMetrics,
  improvementInitiatives,
  optimizationCycles,
  orchestrationRuns,
 } from "../../drizzle/schema";

export const gdprRouter = router({
    /** Export all user data as a JSON bundle */
    exportData: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const userId = ctx.user.id;

      // ── Gather ALL user data from ALL user-owned tables ──
      const [userTasks, userPrefs, userMemories, userConnectors, userWebapps, userDesigns,
        userSchedules, userProjects, userSkills, userSlides, userMeetings,
        userConnectorHealth, userConnectorHealthLogs,
        userDevices, userMobileProjects, userAppBuilds, userVideoProjects,
        userGitHubRepos, userTemplates, userBridgeConfigs, userNotifications] = await Promise.all([
        db.select().from(tasks).where(eq(tasks.userId, userId)),
        getUserPreferences(userId),
        db.select().from(memoryEntries).where(eq(memoryEntries.userId, userId)),
        db.select().from(connectors).where(eq(connectors.userId, userId)),
        db.select().from(connectorHealth).where(eq(connectorHealth.userId, userId)),
        db.select().from(connectorHealthLogs).where(eq(connectorHealthLogs.userId, userId)),
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
        connectorHealth: userConnectorHealth,
        connectorHealthLogs: userConnectorHealthLogs,
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
      const { storagePut } = await import("../storage");
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
        await db.delete(messageFeedback).where(inArray(messageFeedback.taskExternalId, taskExternalIds));
      }
      // Also delete messageFeedback by userId directly (covers edge cases)
      await db.delete(messageFeedback).where(eq(messageFeedback.userId, userId));

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
      await db.delete(connectorHealthLogs).where(eq(connectorHealthLogs.userId, userId));
      await db.delete(connectorHealth).where(eq(connectorHealth.userId, userId));
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

      // Phase 5b: personalization & process improvement
      await db.delete(personalizationLearningLog).where(eq(personalizationLearningLog.userId, userId));
      await db.delete(personalizationRules).where(eq(personalizationRules.userId, userId));
      await db.delete(personalizationPreferences).where(eq(personalizationPreferences.userId, userId));
      await db.delete(optimizationCycles).where(eq(optimizationCycles.userId, userId));
      await db.delete(improvementInitiatives).where(eq(improvementInitiatives.userId, userId));
      await db.delete(processMetrics).where(eq(processMetrics.userId, userId));

      // Phase 5c: AEGIS/ATLAS/Sovereign
      const aegisSessionRows = await db.select({ id: aegisSessions.id }).from(aegisSessions).where(eq(aegisSessions.userId, userId));
      const aegisSessionIds = aegisSessionRows.map(s => s.id);
      if (aegisSessionIds.length > 0) {
        await db.delete(aegisQualityScores).where(inArray(aegisQualityScores.sessionId, aegisSessionIds));
        await db.delete(aegisFragments).where(inArray(aegisFragments.sessionId, aegisSessionIds));
        await db.delete(aegisLessons).where(inArray(aegisLessons.sessionId, aegisSessionIds));
      }
      await db.delete(aegisSessions).where(eq(aegisSessions.userId, userId));

      const atlasGoalRows = await db.select({ id: atlasGoals.id }).from(atlasGoals).where(eq(atlasGoals.userId, userId));
      const atlasGoalIds = atlasGoalRows.map(g => g.id);
      if (atlasGoalIds.length > 0) {
        await db.delete(atlasGoalTasks).where(inArray(atlasGoalTasks.goalId, atlasGoalIds));
        await db.delete(atlasPlans).where(inArray(atlasPlans.goalId, atlasGoalIds));
      }
      await db.delete(atlasGoals).where(eq(atlasGoals.userId, userId));

      // Phase 5d: Sovereign cascades
      if (aegisSessionIds.length > 0) {
        await db.delete(sovereignUsageLogs).where(inArray(sovereignUsageLogs.aegisSessionId, aegisSessionIds));
        await db.delete(sovereignRoutingDecisions).where(inArray(sovereignRoutingDecisions.aegisSessionId, aegisSessionIds));
      }

      // Phase 5e: feedback & schedules
      await db.delete(appFeedback).where(eq(appFeedback.userId, userId));
      await db.delete(scheduleExecutionHistory).where(eq(scheduleExecutionHistory.userId, userId));
      await db.delete(automationSchedules).where(eq(automationSchedules.userId, userId));

      // Phase 5f: pipelines & embeddings
      await db.delete(dataPipelineRuns).where(eq(dataPipelineRuns.userId, userId));
      await db.delete(dataPipelines).where(eq(dataPipelines.userId, userId));
      await db.delete(memoryEmbeddings).where(eq(memoryEmbeddings.userId, userId));

      // Phase 5g: orchestration runs
      await db.delete(orchestrationRuns).where(eq(orchestrationRuns.userId, userId));

      // Phase 6: user record
      await db.delete(users).where(eq(users.id, userId));

      // Notify owner
      try {
        const { notifyOwner } = await import("../_core/notification");
        await notifyOwner({ title: "GDPR Data Deletion", content: `User ${ctx.user.name} (ID: ${userId}) requested full data deletion.` });
      } catch (notifyErr) {
        console.warn("[GDPR] Owner notification failed (non-blocking):", notifyErr);
      }
      return { deleted: true, deletedAt: new Date().toISOString() };
    }),
  });
