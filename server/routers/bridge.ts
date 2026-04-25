import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getBridgeConfig, upsertBridgeConfig } from "../db";

export const bridgeRouter = router({
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
});
