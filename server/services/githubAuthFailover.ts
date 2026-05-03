/**
 * GitHub Auth Failover Service
 * 
 * Multi-layer authentication chain that ensures GitHub API access never fails.
 * Tries each auth method in priority order, with automatic token validation,
 * refresh, and fallback. Designed for production stability.
 * 
 * Priority Chain:
 *   1. Direct OAuth token (from connector record, with refresh if expired)
 *   2. Fine-grained PAT (Smart PAT, stored in connector config.token)
 *   3. Classic PAT (stored in connector config.token, ghp_ prefix)
 *   4. Environment-level fallback PAT (GITHUB_FALLBACK_PAT env var)
 *   5. GitHub App installation token (if configured)
 * 
 * Each layer validates before use, skips if invalid, and logs the resolution.
 */

import { getUserConnectors, updateConnectorOAuthTokens } from "../db";
import { getOAuthProvider } from "../connectorOAuth";

export interface GitHubAuthResult {
  token: string;
  source: "oauth" | "smart_pat" | "classic_pat" | "env_fallback" | "app_install";
  username?: string;
  expiresAt?: Date | null;
  needsRefresh: boolean;
}

export interface GitHubAuthFailoverOptions {
  userId: number;
  /** If true, validates the token against GitHub API before returning */
  validate?: boolean;
  /** If true, attempts token refresh before falling back */
  attemptRefresh?: boolean;
  /** Required scopes — if token doesn't have them, skip to next layer */
  requiredScopes?: string[];
}

/**
 * Validate a GitHub token by calling GET /user
 * Returns the username if valid, null if invalid/expired
 */
async function validateGitHubToken(token: string): Promise<{ valid: boolean; uncertain?: boolean; username?: string; scopes?: string[] }> {
  try {
    const resp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(8000), // 8s timeout to avoid blocking the chain
    });
    if (resp.status === 200) {
      const data = await resp.json();
      const scopeHeader = resp.headers.get("x-oauth-scopes") || "";
      const scopes = scopeHeader.split(",").map(s => s.trim()).filter(Boolean);
      return { valid: true, username: data.login, scopes };
    }
    if (resp.status === 401 || resp.status === 403) {
      return { valid: false };
    }
    // Rate limited or server error — mark as uncertain so caller falls through to next layer
    if (resp.status === 429) {
      console.warn("[GitHubAuthFailover] Rate limited during token validation — marking uncertain");
      return { valid: false, uncertain: true, username: "rate-limited" };
    }
    return { valid: false };
  } catch (err) {
    console.error("[GitHubAuthFailover] Token validation network error:", err);
    // Network error — mark as uncertain so caller falls through to next layer
    // DO NOT assume valid — this was causing stale OAuth tokens to be used instead of valid PATs
    return { valid: false, uncertain: true, username: "network-error" };
  }
}

/**
 * Attempt to refresh an OAuth token using the stored refresh token
 */
async function attemptOAuthRefresh(connectorId: number, refreshToken: string): Promise<string | null> {
  try {
    const provider = getOAuthProvider("github");
    if (!provider?.refreshToken) return null;
    const tokens = await provider.refreshToken(refreshToken);
    if (tokens.accessToken) {
      await updateConnectorOAuthTokens(connectorId, {
        accessToken: tokens.accessToken,
        tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
      });
      return tokens.accessToken;
    }
    return null;
  } catch (err) {
    console.error("[GitHubAuthFailover] OAuth refresh failed:", err);
    return null;
  }
}

/**
 * Resolve a valid GitHub token through the multi-layer failover chain.
 * Returns the first valid token found, or null if all layers exhausted.
 */
export async function resolveGitHubAuth(options: GitHubAuthFailoverOptions): Promise<GitHubAuthResult | null> {
  const { userId, validate = true, attemptRefresh = true } = options;
  const layers: string[] = [];

  try {
    // Get all connectors for this user
    const connectors = await getUserConnectors(userId);
    const githubConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");

    // ── Priority Check: If PAT exists in config, try PAT layers FIRST ──
    // This prevents the common failure mode where a stale OAuth token is validated
    // (rate-limited/network error returns uncertain) before the valid PAT is tried.
    const connConfig = (githubConn?.config && typeof githubConn.config === "object")
      ? githubConn.config as Record<string, any>
      : null;
    const hasPATInConfig = connConfig && (connConfig.token || connConfig.pat || connConfig.smartPat);
    const patToken = hasPATInConfig ? (connConfig!.token || connConfig!.pat || connConfig!.smartPat) : null;

    if (patToken && typeof patToken === "string" && (patToken.startsWith("github_pat_") || patToken.startsWith("ghp_"))) {
      // PAT exists — try it FIRST (skip OAuth entirely when PAT is explicitly configured)
      const patSource = patToken.startsWith("github_pat_") ? "smart_pat" : "classic_pat";
      layers.push(patSource);
      if (validate) {
        const result = await validateGitHubToken(patToken);
        if (result.valid) {
          console.log(`[GitHubAuthFailover] PAT-priority: ${patSource} valid (user: ${result.username})`);
          return {
            token: patToken,
            source: patSource,
            username: result.username,
            expiresAt: null,
            needsRefresh: false,
          };
        }
        if (result.uncertain) {
          // Rate-limited or network error — use PAT anyway since user explicitly configured it
          console.warn(`[GitHubAuthFailover] PAT-priority: ${patSource} validation uncertain, using anyway (user explicitly configured)`);
          return {
            token: patToken,
            source: patSource,
            username: result.username,
            expiresAt: null,
            needsRefresh: false,
          };
        }
        console.warn(`[GitHubAuthFailover] PAT-priority: ${patSource} invalid, falling through to OAuth`);
      } else {
        return {
          token: patToken,
          source: patSource,
          username: githubConn?.name || undefined,
          expiresAt: null,
          needsRefresh: false,
        };
      }
    }

    // ── Layer 1: OAuth Token ──
    if (githubConn?.accessToken) {
      layers.push("oauth");
      const token = githubConn.accessToken;
      
      // Check if token is expired based on stored expiry
      const isExpired = githubConn.tokenExpiresAt && new Date(githubConn.tokenExpiresAt) < new Date();
      
      if (isExpired && attemptRefresh && githubConn.refreshToken) {
        const refreshed = await attemptOAuthRefresh(githubConn.id, githubConn.refreshToken);
        if (refreshed) {
          console.log("[GitHubAuthFailover] Layer 1: OAuth token refreshed successfully");
          return {
            token: refreshed,
            source: "oauth",
            username: githubConn.name || undefined,
            expiresAt: null,
            needsRefresh: false,
          };
        }
      }
      
      if (!isExpired) {
        if (validate) {
          const result = await validateGitHubToken(token);
          if (result.valid) {
            console.log(`[GitHubAuthFailover] Layer 1: OAuth token valid (user: ${result.username})`);
            return {
              token,
              source: "oauth",
              username: result.username,
              expiresAt: githubConn.tokenExpiresAt ? new Date(githubConn.tokenExpiresAt) : null,
              needsRefresh: false,
            };
          }
          console.warn("[GitHubAuthFailover] Layer 1: OAuth token invalid, trying refresh...");
          // Try refresh even if not marked expired
          if (attemptRefresh && githubConn.refreshToken) {
            const refreshed = await attemptOAuthRefresh(githubConn.id, githubConn.refreshToken);
            if (refreshed) {
              return {
                token: refreshed,
                source: "oauth",
                username: githubConn.name || undefined,
                expiresAt: null,
                needsRefresh: false,
              };
            }
          }
        } else {
          return {
            token,
            source: "oauth",
            username: githubConn.name || undefined,
            expiresAt: githubConn.tokenExpiresAt ? new Date(githubConn.tokenExpiresAt) : null,
            needsRefresh: false,
          };
        }
      }
    }

    // ── Layer 2: Smart PAT (fine-grained, github_pat_ prefix) ──
    if (githubConn?.config && typeof githubConn.config === "object") {
      const config = githubConn.config as Record<string, any>;
      const storedToken = config.token || config.pat || config.smartPat;
      if (storedToken && typeof storedToken === "string" && storedToken.startsWith("github_pat_")) {
        layers.push("smart_pat");
        if (validate) {
          const result = await validateGitHubToken(storedToken);
          if (result.valid) {
            console.log(`[GitHubAuthFailover] Layer 2: Smart PAT valid (user: ${result.username})`);
            return {
              token: storedToken,
              source: "smart_pat",
              username: result.username,
              expiresAt: null, // Fine-grained PATs don't have expiry in API response
              needsRefresh: false,
            };
          }
          console.warn("[GitHubAuthFailover] Layer 2: Smart PAT invalid");
        } else {
          return {
            token: storedToken,
            source: "smart_pat",
            username: githubConn.name || undefined,
            expiresAt: null,
            needsRefresh: false,
          };
        }
      }
    }

    // ── Layer 3: Classic PAT (ghp_ prefix) ──
    if (githubConn?.config && typeof githubConn.config === "object") {
      const config = githubConn.config as Record<string, any>;
      const storedToken = config.token || config.pat;
      if (storedToken && typeof storedToken === "string" && storedToken.startsWith("ghp_")) {
        layers.push("classic_pat");
        if (validate) {
          const result = await validateGitHubToken(storedToken);
          if (result.valid) {
            console.log(`[GitHubAuthFailover] Layer 3: Classic PAT valid (user: ${result.username})`);
            return {
              token: storedToken,
              source: "classic_pat",
              username: result.username,
              expiresAt: null,
              needsRefresh: false,
            };
          }
          console.warn("[GitHubAuthFailover] Layer 3: Classic PAT invalid");
        } else {
          return {
            token: storedToken,
            source: "classic_pat",
            username: githubConn.name || undefined,
            expiresAt: null,
            needsRefresh: false,
          };
        }
      }
    }

    // ── Layer 4: Environment Fallback PAT ──
    const envPat = process.env.GITHUB_FALLBACK_PAT;
    if (envPat) {
      layers.push("env_fallback");
      if (validate) {
        const result = await validateGitHubToken(envPat);
        if (result.valid) {
          console.log(`[GitHubAuthFailover] Layer 4: Env fallback PAT valid (user: ${result.username})`);
          return {
            token: envPat,
            source: "env_fallback",
            username: result.username,
            expiresAt: null,
            needsRefresh: false,
          };
        }
        console.warn("[GitHubAuthFailover] Layer 4: Env fallback PAT invalid");
      } else {
        return {
          token: envPat,
          source: "env_fallback",
          expiresAt: null,
          needsRefresh: false,
        };
      }
    }

    // ── Layer 5: GitHub App Installation Token ──
    const appId = process.env.GITHUB_APP_ID;
    const appPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
    if (appId && appPrivateKey && installationId) {
      layers.push("app_install");
      try {
        const installToken = await getGitHubAppInstallationToken(appId, appPrivateKey, installationId);
        if (installToken) {
          console.log("[GitHubAuthFailover] Layer 5: GitHub App installation token acquired");
          return {
            token: installToken,
            source: "app_install",
            expiresAt: new Date(Date.now() + 55 * 60 * 1000), // ~55 min
            needsRefresh: true,
          };
        }
      } catch (err) {
        console.error("[GitHubAuthFailover] Layer 5: App install token failed:", err);
      }
    }

    console.error(`[GitHubAuthFailover] All layers exhausted for user ${userId}. Tried: ${layers.join(" → ")}`);
    return null;
  } catch (err) {
    console.error("[GitHubAuthFailover] Fatal error:", err);
    return null;
  }
}

/**
 * Get a GitHub App installation token (Layer 5 helper)
 * Uses JWT to authenticate as the app, then requests an installation token
 */
async function getGitHubAppInstallationToken(
  appId: string,
  privateKey: string,
  installationId: string
): Promise<string | null> {
  try {
    // Create JWT for GitHub App authentication
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + 600,
      iss: appId,
    };

    // Use jose for JWT signing
    const { SignJWT, importPKCS8 } = await import("jose");
    const key = await importPKCS8(privateKey, "RS256");
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256" })
      .sign(key);

    // Request installation token
    const resp = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (resp.ok) {
      const data = await resp.json();
      return data.token;
    }
    return null;
  } catch (err) {
    console.error("[GitHubAuthFailover] App installation token error:", err);
    return null;
  }
}

/**
 * Store the Smart PAT in the connector record for future failover use
 */
export async function storeSmartPat(userId: number, pat: string): Promise<boolean> {
  try {
    const connectors = await getUserConnectors(userId);
    const githubConn = connectors.find(c => c.connectorId === "github");
    
    if (!githubConn) {
      // Create a new connector record with the PAT
      const { upsertConnector } = await import("../db");
      await upsertConnector({
        userId,
        connectorId: "github",
        name: "GitHub (Smart PAT)",
        config: { token: pat, authMethod: "smart_pat" },
        status: "connected",
      });
    } else {
      // Update existing connector's config to include the PAT
      const { getDb } = await import("../db");
      const { connectors: connectorsTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        const existingConfig = (githubConn.config as Record<string, any>) || {};
        await db.update(connectorsTable)
          .set({ config: { ...existingConfig, token: pat, authMethod: existingConfig.authMethod || "smart_pat" } })
          .where(eq(connectorsTable.id, githubConn.id));
      }
    }
    return true;
  } catch (err) {
    console.error("[GitHubAuthFailover] Failed to store Smart PAT:", err);
    return false;
  }
}

/**
 * Health check — returns the status of all auth layers for monitoring
 */
export async function getAuthLayerHealth(userId: number): Promise<{
  layers: Array<{
    name: string;
    available: boolean;
    valid: boolean | null;
    username?: string;
    expiresAt?: string | null;
  }>;
  activeLayer: string | null;
}> {
  const connectors = await getUserConnectors(userId);
  const githubConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
  const layers: Array<{
    name: string;
    available: boolean;
    valid: boolean | null;
    username?: string;
    expiresAt?: string | null;
  }> = [];
  let activeLayer: string | null = null;

  // Layer 1: OAuth
  const hasOAuth = !!githubConn?.accessToken;
  let oauthValid: boolean | null = null;
  let oauthUser: string | undefined;
  if (hasOAuth) {
    const result = await validateGitHubToken(githubConn!.accessToken!);
    oauthValid = result.valid;
    oauthUser = result.username;
    if (result.valid && !activeLayer) activeLayer = "oauth";
  }
  layers.push({
    name: "OAuth Token",
    available: hasOAuth,
    valid: oauthValid,
    username: oauthUser,
    expiresAt: githubConn?.tokenExpiresAt?.toString() || null,
  });

  // Layer 2: Smart PAT
  const config = (githubConn?.config as Record<string, any>) || {};
  const smartPat = config.token && config.token.startsWith("github_pat_") ? config.token : null;
  let smartPatValid: boolean | null = null;
  let smartPatUser: string | undefined;
  if (smartPat) {
    const result = await validateGitHubToken(smartPat);
    smartPatValid = result.valid;
    smartPatUser = result.username;
    if (result.valid && !activeLayer) activeLayer = "smart_pat";
  }
  layers.push({
    name: "Smart PAT (Fine-grained)",
    available: !!smartPat,
    valid: smartPatValid,
    username: smartPatUser,
    expiresAt: null,
  });

  // Layer 3: Classic PAT
  const classicPat = config.token && config.token.startsWith("ghp_") ? config.token : null;
  let classicPatValid: boolean | null = null;
  let classicPatUser: string | undefined;
  if (classicPat) {
    const result = await validateGitHubToken(classicPat);
    classicPatValid = result.valid;
    classicPatUser = result.username;
    if (result.valid && !activeLayer) activeLayer = "classic_pat";
  }
  layers.push({
    name: "Classic PAT",
    available: !!classicPat,
    valid: classicPatValid,
    username: classicPatUser,
    expiresAt: null,
  });

  // Layer 4: Env Fallback
  const envPat = process.env.GITHUB_FALLBACK_PAT;
  let envValid: boolean | null = null;
  let envUser: string | undefined;
  if (envPat) {
    const result = await validateGitHubToken(envPat);
    envValid = result.valid;
    envUser = result.username;
    if (result.valid && !activeLayer) activeLayer = "env_fallback";
  }
  layers.push({
    name: "Environment Fallback",
    available: !!envPat,
    valid: envValid,
    username: envUser,
    expiresAt: null,
  });

  // Layer 5: GitHub App
  const hasApp = !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY && process.env.GITHUB_APP_INSTALLATION_ID);
  layers.push({
    name: "GitHub App Installation",
    available: hasApp,
    valid: hasApp ? null : null, // Don't validate app tokens proactively (expensive)
    expiresAt: null,
  });

  return { layers, activeLayer };
}
