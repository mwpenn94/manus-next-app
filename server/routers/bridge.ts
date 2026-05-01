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

  /** Health check the configured bridge endpoint */
  healthCheck: protectedProcedure.mutation(async ({ ctx }) => {
    const config = await getBridgeConfig(ctx.user.id);
    if (!config?.bridgeUrl) return { status: "not_configured" as const, latencyMs: 0 };

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${config.bridgeUrl}/health`, {
        method: "GET",
        signal: controller.signal,
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      });
      clearTimeout(timeout);
      return {
        status: response.ok ? "connected" as const : "error" as const,
        latencyMs: Date.now() - start,
        statusCode: response.status,
      };
    } catch (err) {
      return {
        status: "disconnected" as const,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }),

  /** List available tools on the bridge */
  listTools: protectedProcedure.query(async ({ ctx }) => {
    const config = await getBridgeConfig(ctx.user.id);
    if (!config?.bridgeUrl) return { tools: [] as string[] };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${config.bridgeUrl}/tools`, {
        method: "GET",
        signal: controller.signal,
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        return { tools: (data.tools || []) as string[] };
      }
      return { tools: [] as string[] };
    } catch {
      return { tools: [] as string[] };
    }
  }),

  /** Execute a tool via bridge relay */
  execute: protectedProcedure
    .input(z.object({
      tool: z.string(),
      args: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const config = await getBridgeConfig(ctx.user.id);
      if (!config?.bridgeUrl) throw new Error("Bridge not configured");

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(`${config.bridgeUrl}/execute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({ tool: input.tool, args: input.args || {} }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const result = await response.json();
        return { success: response.ok, result, statusCode: response.status };
      } catch (err) {
        return {
          success: false,
          result: null,
          error: err instanceof Error ? err.message : "Execution failed",
        };
      }
    }),
});
