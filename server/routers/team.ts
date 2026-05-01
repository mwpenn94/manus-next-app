import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { 
  createTeam,
  createTeamSession,
  getTeamById,
  getTeamByInviteCode,
  getTeamMembers,
  getTeamSessions,
  getUserTeams,
  joinTeam,
  removeTeamMember,
  updateTeamCredits,
 } from "../db";

export const teamRouter = router({
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
      .input(z.object({ inviteCode: z.string().max(50000) }))
      .mutation(async ({ ctx, input }) => {
        const team = await getTeamByInviteCode(input.inviteCode);
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite code" });
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
      .input(z.object({ teamId: z.number(), taskExternalId: z.string().max(500) }))
      .mutation(async ({ ctx, input }) => {
        await createTeamSession({ teamId: input.teamId, taskExternalId: input.taskExternalId, createdBy: ctx.user.id });
        return { success: true };
      }),
  });
