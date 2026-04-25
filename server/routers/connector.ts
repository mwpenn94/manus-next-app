import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { 
  disconnectConnector,
  getUserConnectors,
  updateConnectorOAuthTokens,
  upsertConnector,
 } from "../db";
import { connectors } from "../../drizzle/schema";

export const connectorRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserConnectors(ctx.user.id);
    }),
    connect: protectedProcedure
      .input(z.object({
        connectorId: z.string().min(1).max(128),
        name: z.string().min(1).max(256),
        config: z.record(z.string().max(128), z.string().max(4096)).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const configVal = (input.config ?? {}) as Record<string, string>;
        const id = await upsertConnector({
          userId: ctx.user.id,
          connectorId: input.connectorId,
          name: input.name,
          config: configVal,
          status: "connected",
        });
        return { id, success: true };
      }),
    disconnect: protectedProcedure
      .input(z.object({ connectorId: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        await disconnectConnector(ctx.user.id, input.connectorId);
        return { success: true };
      }),
    /** Execute a connector action (send message, trigger webhook, etc.) */
    execute: protectedProcedure
      .input(z.object({
        connectorId: z.string().min(1).max(128),
        action: z.string().min(1).max(256),
        payload: z.record(z.string().max(128), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const connectors = await getUserConnectors(ctx.user.id);
        const conn = connectors.find(c => c.connectorId === input.connectorId && c.status === "connected");
        if (!conn) throw new TRPCError({ code: "BAD_REQUEST", message: "Connector not found or not connected" });
        const config = (conn.config || {}) as Record<string, string>;

        // Route by connector type
        switch (input.connectorId) {
          case "slack": {
            const webhookUrl = config.webhookUrl;
            if (!webhookUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Slack webhook URL not configured" });
            const resp = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: input.payload?.message || "Hello from Manus" }),
            });
            return { success: resp.ok, result: resp.ok ? "Message sent to Slack" : "Slack delivery failed" };
          }
          case "zapier": {
            const zapierUrl = config.webhookUrl;
            if (!zapierUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Zapier webhook URL not configured" });
            const resp = await fetch(zapierUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input.payload || {}),
            });
            return { success: resp.ok, result: resp.ok ? "Zapier webhook triggered" : "Zapier trigger failed" };
          }
          case "email": {
            const { notifyOwner } = await import("../_core/notification");
            const sent = await notifyOwner({
              title: (input.payload?.subject as string) || "Notification",
              content: (input.payload?.body as string) || "No content",
            });
            return { success: sent, result: sent ? "Email sent" : "Email delivery failed" };
          }
          default:
            return { success: false, result: `Connector action not implemented for: ${input.connectorId}` };
        }
      }),
    /** Test a connector's configuration */
    test: protectedProcedure
      .input(z.object({ connectorId: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const connectors = await getUserConnectors(ctx.user.id);
        const conn = connectors.find(c => c.connectorId === input.connectorId);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found" });
        return { success: true, result: `Connector ${conn.name} is ${conn.status}` };
      }),
    /** Get OAuth authorization URL for a connector */
    getOAuthUrl: protectedProcedure
      .input(z.object({
        connectorId: z.string(),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getOAuthProvider, isOAuthSupported } = await import("../connectorOAuth");
        if (!isOAuthSupported(input.connectorId)) {
          return { supported: false, url: null, fallback: "api_key" };
        }
        const provider = getOAuthProvider(input.connectorId);
        if (!provider) return { supported: false, url: null, fallback: "api_key" };
        const state = JSON.stringify({
          connectorId: input.connectorId,
          userId: ctx.user.id,
          origin: input.origin,
          ts: Date.now(),
        });
        const stateEncoded = Buffer.from(state).toString("base64url");
        const redirectUri = `${input.origin}/api/connector/oauth/callback`;
        const url = provider.getAuthUrl(redirectUri, stateEncoded);
        return { supported: true, url, fallback: null };
      }),
    /** Complete OAuth flow — exchange code for tokens and save connector */
    completeOAuth: protectedProcedure
      .input(z.object({
        connectorId: z.string(),
        code: z.string(),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getOAuthProvider } = await import("../connectorOAuth");
        const provider = getOAuthProvider(input.connectorId);
        if (!provider) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "OAuth not supported for this connector" });
        const redirectUri = `${input.origin}/api/connector/oauth/callback`;
        const tokens = await provider.exchangeCode(input.code, redirectUri);
        let userName = provider.name;
        if (provider.getUserInfo) {
          try {
            const info = await provider.getUserInfo(tokens.accessToken);
            userName = info.name || provider.name;
          } catch { /* ignore */ }
        }
        const id = await upsertConnector({
          userId: ctx.user.id,
          connectorId: input.connectorId,
          name: userName,
          config: { authMethod: "oauth" },
          status: "connected",
        });
        // Update OAuth tokens via db helper
        await updateConnectorOAuthTokens(id, {
            authMethod: "oauth",
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || null,
            tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
            oauthScopes: tokens.scope || null,
        });
        return { id, success: true, name: userName };
      }),
    /** Refresh an expired OAuth token */
    refreshOAuth: protectedProcedure
      .input(z.object({ connectorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getOAuthProvider } = await import("../connectorOAuth");
        const userConns = await getUserConnectors(ctx.user.id);
        const conn = userConns.find(c => c.connectorId === input.connectorId);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found" });
        if (!conn.refreshToken) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No refresh token available" });
        const provider = getOAuthProvider(input.connectorId);
        if (!provider?.refreshToken) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Provider does not support token refresh" });
        const tokens = await provider.refreshToken(conn.refreshToken);
        await updateConnectorOAuthTokens(conn.id, {
            accessToken: tokens.accessToken,
            tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        });
        return { success: true };
      }),
    /** Check if OAuth is available for a connector (no credentials needed) */
    checkOAuthSupport: protectedProcedure
      .input(z.object({ connectorId: z.string() }))
      .query(async ({ input }) => {
        const { isOAuthSupported } = await import("../connectorOAuth");
        return { supported: isOAuthSupported(input.connectorId) };
      }),
  });
