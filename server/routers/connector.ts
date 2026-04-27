import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { 
  disconnectConnector,
  getUserConnectors,
  updateConnectorOAuthTokens,
  upsertConnector,
  getOrCreateConnectorHealth,
  getUserConnectorHealth,
  updateConnectorHealth,
  toggleAutoRefresh,
  logConnectorHealthEvent,
  getConnectorHealthLogs,
  computeHealthStatus,
  syncConnectorHealthFromConnector,
 } from "../db";
import { connectors } from "../../drizzle/schema";
import { ENV } from "../_core/env";

/**
 * Connectors that can be verified via Manus OAuth (Tier 2).
 * Maps connectorId → the Manus loginMethod that proves identity for that provider.
 * e.g., if a user logged into Manus via GitHub, we can verify their GitHub identity.
 */
const MANUS_VERIFIABLE_CONNECTORS: Record<string, { loginMethods: string[]; identityLabel: string }> = {
  "github": { loginMethods: ["github"], identityLabel: "GitHub username" },
  "microsoft-365": { loginMethods: ["microsoft"], identityLabel: "Microsoft account" },
  "google-drive": { loginMethods: ["google"], identityLabel: "Google account" },
  "calendar": { loginMethods: ["google"], identityLabel: "Google account" },
};

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
        returnPath: z.string().optional(),
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
          returnPath: input.returnPath || "/connectors",
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
    /** Public: returns which OAuth connectors are configured (no auth needed) */
    oauthAvailability: publicProcedure.query(async () => {
      const { isOAuthSupported } = await import("../connectorOAuth");
      const connectorIds = ["github", "google-drive", "calendar", "notion", "slack", "microsoft-365"];
      const result: Record<string, boolean> = {};
      for (const id of connectorIds) {
        result[id] = isOAuthSupported(id);
      }
      return result;
    }),

    // ══════════════════════════════════════════════════════════════════════
    // TIER 2: Manus OAuth Verification — Verify identity via Manus portal
    // ══════════════════════════════════════════════════════════════════════

    /**
     * tieredAuthStatus — Returns available auth tiers for each connector.
     * Public endpoint so the UI can render tier options before user connects.
     * 
     * Tiers:
     *   1 = Direct OAuth (CONNECTOR_* env vars configured)
     *   2 = Manus Verify (connector maps to a Manus login method)
     *   3 = Smart PAT (tokenHelp available — always true for known connectors)
     *   4 = Manual Entry (always available)
     */
    tieredAuthStatus: publicProcedure.query(async () => {
      const { isOAuthSupported } = await import("../connectorOAuth");
      const connectorIds = ["github", "google-drive", "calendar", "notion", "slack", "microsoft-365",
                            "vercel", "openai", "anthropic", "firecrawl", "similarweb", "zapier", "email"];
      const result: Record<string, {
        tier1: boolean;  // Direct OAuth
        tier2: boolean;  // Manus Verify
        tier3: boolean;  // Smart PAT (tokenHelp)
        tier4: boolean;  // Manual Entry
        bestTier: number;
      }> = {};

      // Manus OAuth is available if the platform OAuth env vars are set
      const manusOAuthAvailable = !!(ENV.appId && ENV.oAuthServerUrl);

      for (const id of connectorIds) {
        const tier1 = isOAuthSupported(id);
        const tier2 = manusOAuthAvailable && !!MANUS_VERIFIABLE_CONNECTORS[id];
        const tier3 = true;  // All known connectors have tokenHelp or manual fields
        const tier4 = true;  // Always available

        const bestTier = tier1 ? 1 : tier2 ? 2 : tier3 ? 3 : 4;
        result[id] = { tier1, tier2, tier3, tier4, bestTier };
      }
      return result;
    }),

    /**
     * verifyViaManus — Generates a Manus OAuth portal URL for identity verification.
     * The user authenticates at the Manus portal (via GitHub/Google/Microsoft),
     * and the callback extracts their verified identity to assist with connector setup.
     */
    verifyViaManus: protectedProcedure
      .input(z.object({
        connectorId: z.string(),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const verifiable = MANUS_VERIFIABLE_CONNECTORS[input.connectorId];
        if (!verifiable) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Connector ${input.connectorId} does not support Manus verification`,
          });
        }

        if (!ENV.appId || !ENV.oAuthServerUrl) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Manus OAuth is not configured on this instance",
          });
        }

        // Build the Manus OAuth portal URL.
        // The redirectUri includes connector metadata as query params.
        // The Manus portal accepts any redirectUri and redirects back to it with code+state.
        const callbackBase = `${input.origin}/api/connector/manus/callback`;
        const redirectUri = `${callbackBase}?cid=${encodeURIComponent(input.connectorId)}&uid=${ctx.user.id}`;
        const state = Buffer.from(redirectUri).toString("base64");

        const oauthPortalUrl = process.env.VITE_OAUTH_PORTAL_URL || "https://manus.im";
        const url = new URL(`${oauthPortalUrl}/app-auth`);
        url.searchParams.set("appId", ENV.appId);
        url.searchParams.set("redirectUri", redirectUri);
        url.searchParams.set("state", state);
        url.searchParams.set("type", "signIn");

        return {
          url: url.toString(),
          connectorId: input.connectorId,
          identityLabel: verifiable.identityLabel,
        };
      }),

    /**
     * completeManusVerification — Called by the frontend after the Manus OAuth
     * callback has completed (popup flow). Reads the user's Manus profile to
     * extract their verified identity and saves it to the connector record.
     */
    completeManusVerification: protectedProcedure
      .input(z.object({
        connectorId: z.string(),
        verifiedIdentity: z.string().min(1).max(256),
        verifiedEmail: z.string().optional(),
        loginMethod: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const verifiable = MANUS_VERIFIABLE_CONNECTORS[input.connectorId];
        if (!verifiable) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Connector ${input.connectorId} does not support Manus verification`,
          });
        }

        // Save the connector with manus_oauth auth method and verified identity
        const id = await upsertConnector({
          userId: ctx.user.id,
          connectorId: input.connectorId,
          name: input.verifiedIdentity,
          config: {
            authMethod: "manus_oauth",
            verifiedIdentity: input.verifiedIdentity,
            verifiedEmail: input.verifiedEmail || "",
            loginMethod: input.loginMethod || "",
          },
          status: "connected",
        });

        // Also update the authMethod and manusVerifiedIdentity columns
        await updateConnectorOAuthTokens(id, {
          authMethod: "manus_oauth",
        });

        // Update manusVerifiedIdentity via direct DB update
        const dbModule = await import("../db");
        const db = await dbModule.getDb();
        if (db) {
          const { eq } = await import("drizzle-orm");
          await db.update(connectors)
            .set({ manusVerifiedIdentity: input.verifiedIdentity })
            .where(eq(connectors.id, id));
        }

        return {
          id,
          success: true,
          verifiedIdentity: input.verifiedIdentity,
          connectorId: input.connectorId,
        };
      }),

    // ══════════════════════════════════════════════════════════════════════
    // CONNECTOR HEALTH DASHBOARD — Token lifecycle, auto-refresh, monitoring
    // ══════════════════════════════════════════════════════════════════════

    /** Get health status for all user connectors (merged with connector data) */
    getHealth: protectedProcedure.query(async ({ ctx }) => {
      const userConns = await getUserConnectors(ctx.user.id);
      const healthRecords = await getUserConnectorHealth(ctx.user.id);
      const healthMap = new Map(healthRecords.map(h => [h.connectorId, h]));

      return userConns
        .filter(c => c.status === "connected")
        .map(conn => {
          const health = healthMap.get(conn.connectorId);
          const hasRefreshToken = !!conn.refreshToken;
          const hasExpiry = !!conn.tokenExpiresAt;
          const supportsAutoRefresh = hasRefreshToken && hasExpiry;
          const authMethodCategory = conn.authMethod || "api_key";

          // Compute live health status
          const healthStatus = computeHealthStatus(
            conn.tokenExpiresAt,
            conn.refreshToken,
            health?.autoRefreshEnabled ?? false,
            health?.refreshFailCount ?? 0
          );

          return {
            connectorId: conn.connectorId,
            name: conn.name,
            authMethod: conn.authMethod,
            authMethodCategory,
            tokenExpiresAt: conn.tokenExpiresAt?.toISOString() || null,
            lastSyncAt: conn.lastSyncAt?.toISOString() || null,
            oauthScopes: conn.oauthScopes,
            healthStatus,
            supportsAutoRefresh,
            autoRefreshEnabled: health?.autoRefreshEnabled ?? false,
            lastRefreshAt: health?.lastRefreshAt?.toISOString() || null,
            nextRefreshAt: health?.nextRefreshAt?.toISOString() || null,
            refreshFailCount: health?.refreshFailCount ?? 0,
            lastRefreshError: health?.lastRefreshError || null,
          };
        });
    }),

    /** Get health details for a single connector */
    getHealthDetail: protectedProcedure
      .input(z.object({ connectorId: z.string() }))
      .query(async ({ ctx, input }) => {
        const health = await getOrCreateConnectorHealth(ctx.user.id, input.connectorId);
        const logs = await getConnectorHealthLogs(ctx.user.id, input.connectorId, 20);
        const userConns = await getUserConnectors(ctx.user.id);
        const conn = userConns.find(c => c.connectorId === input.connectorId);

        return {
          health: {
            ...health,
            lastRefreshAt: health.lastRefreshAt ? new Date(health.lastRefreshAt).toISOString() : null,
            lastSyncAt: health.lastSyncAt ? new Date(health.lastSyncAt).toISOString() : null,
            nextRefreshAt: health.nextRefreshAt ? new Date(health.nextRefreshAt).toISOString() : null,
          },
          logs: logs.map(l => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          })),
          tokenExpiresAt: conn?.tokenExpiresAt?.toISOString() || null,
          hasRefreshToken: !!conn?.refreshToken,
        };
      }),

    /** Toggle auto-refresh for a connector */
    updateAutoRefresh: protectedProcedure
      .input(z.object({
        connectorId: z.string(),
        enabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify the connector exists and is connected
        const userConns = await getUserConnectors(ctx.user.id);
        const conn = userConns.find(c => c.connectorId === input.connectorId);
        if (!conn || conn.status !== "connected") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found or not connected" });
        }
        // Only allow auto-refresh for OAuth connectors with refresh tokens
        if (input.enabled && !conn.refreshToken) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Auto-refresh requires an OAuth connection with a refresh token",
          });
        }
        const result = await toggleAutoRefresh(ctx.user.id, input.connectorId, input.enabled);

        // If enabling, compute next refresh time (5 min before expiry, or now if already expired)
        if (input.enabled && conn.tokenExpiresAt) {
          const expiresMs = conn.tokenExpiresAt.getTime();
          const bufferMs = 5 * 60 * 1000; // 5 minutes before expiry
          const nextRefreshMs = Math.max(Date.now(), expiresMs - bufferMs);
          await updateConnectorHealth(ctx.user.id, input.connectorId, {
            nextRefreshAt: new Date(nextRefreshMs),
          });
        }

        return { success: true, autoRefreshEnabled: input.enabled };
      }),

    /** Manual token refresh trigger */
    manualRefresh: protectedProcedure
      .input(z.object({ connectorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getOAuthProvider } = await import("../connectorOAuth");
        const userConns = await getUserConnectors(ctx.user.id);
        const conn = userConns.find(c => c.connectorId === input.connectorId);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found" });
        if (!conn.refreshToken) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No refresh token available" });
        }
        const provider = getOAuthProvider(input.connectorId);
        if (!provider?.refreshToken) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Provider does not support token refresh" });
        }

        try {
          const tokens = await provider.refreshToken(conn.refreshToken);
          const newExpiry = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null;
          await updateConnectorOAuthTokens(conn.id, {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || undefined,
            tokenExpiresAt: newExpiry,
          });

          // Update health record
          await updateConnectorHealth(ctx.user.id, input.connectorId, {
            healthStatus: "healthy",
            lastRefreshAt: new Date(),
            refreshFailCount: 0,
            lastRefreshError: null,
            nextRefreshAt: newExpiry ? new Date(newExpiry.getTime() - 5 * 60 * 1000) : null,
          });
          await logConnectorHealthEvent(ctx.user.id, input.connectorId, "manual_refresh", `New expiry: ${newExpiry?.toISOString()}`);

          return {
            success: true,
            newExpiresAt: newExpiry?.toISOString() || null,
            healthStatus: "healthy" as const,
          };
        } catch (err: any) {
          // Log failure
          const health = await getOrCreateConnectorHealth(ctx.user.id, input.connectorId);
          const newFailCount = (health.refreshFailCount ?? 0) + 1;
          await updateConnectorHealth(ctx.user.id, input.connectorId, {
            refreshFailCount: newFailCount,
            lastRefreshError: err.message || "Unknown error",
            healthStatus: newFailCount >= 3 ? "refresh_failed" : "expiring_soon",
          });
          await logConnectorHealthEvent(ctx.user.id, input.connectorId, "refresh_failed", err.message);

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Token refresh failed: ${err.message}`,
          });
        }
      }),

    /** Get health event logs for a connector */
    getHealthLogs: protectedProcedure
      .input(z.object({ connectorId: z.string(), limit: z.number().min(1).max(100).default(20) }))
      .query(async ({ ctx, input }) => {
        const logs = await getConnectorHealthLogs(ctx.user.id, input.connectorId, input.limit);
        return logs.map(l => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
        }));
      }),
  });
