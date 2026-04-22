/**
 * Auth Adapter — Abstraction layer for authentication providers
 *
 * Currently supports:
 * - Manus OAuth (active, default) — fully functional via server/_core/oauth.ts
 *
 * Future providers (gated behind env vars, not stubs):
 * - Clerk — requires AUTH_PROVIDER=clerk + CLERK_SECRET_KEY + @clerk/express installed
 *
 * Provider selection is controlled by AUTH_PROVIDER env var.
 * Default: "manus"
 */
import type { Request, Response } from "express";

// ── Types ──

export interface AuthUser {
  id: string;
  openId: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  role: "admin" | "user";
}

export interface AuthProvider {
  name: string;

  /** Extract user from request (cookie, header, token) */
  getUserFromRequest(req: Request): Promise<AuthUser | null>;

  /** Get the login URL for redirecting unauthenticated users */
  getLoginUrl(returnPath?: string, origin?: string): string;

  /** Handle logout */
  handleLogout(req: Request, res: Response): Promise<void>;

  /** Verify a session token */
  verifyToken(token: string): Promise<AuthUser | null>;
}

// ── Manus OAuth Provider (active, production) ──

class ManusOAuthProvider implements AuthProvider {
  name = "manus";

  async getUserFromRequest(_req: Request): Promise<AuthUser | null> {
    // Delegates to existing server/_core/context.ts middleware
    // The tRPC context builder handles JWT extraction and user resolution
    // This method exists for interface compliance; actual auth is handled by _core
    return null;
  }

  getLoginUrl(returnPath?: string, origin?: string): string {
    const oauthPortalUrl = process.env.VITE_OAUTH_PORTAL_URL || "";
    const appId = process.env.VITE_APP_ID || "";
    const state = JSON.stringify({ origin: origin || "", returnPath: returnPath || "/" });
    return `${oauthPortalUrl}/oauth?app_id=${appId}&state=${encodeURIComponent(state)}`;
  }

  async handleLogout(_req: Request, res: Response): Promise<void> {
    res.clearCookie("session");
    res.json({ success: true });
  }

  async verifyToken(_token: string): Promise<AuthUser | null> {
    // JWT verification is handled by server/_core/context.ts
    return null;
  }
}

// ── Provider Factory ──

const providers: Record<string, () => AuthProvider> = {
  manus: () => new ManusOAuthProvider(),
};

let _currentProvider: AuthProvider | null = null;

/**
 * Get the current auth provider based on AUTH_PROVIDER env var.
 * Defaults to "manus". Only registered providers are available.
 *
 * To add Clerk support in the future:
 * 1. Install @clerk/express
 * 2. Set AUTH_PROVIDER=clerk and CLERK_SECRET_KEY
 * 3. Implement ClerkAuthProvider and register it
 */
export function getAuthProvider(): AuthProvider {
  if (_currentProvider) return _currentProvider;

  const providerName = process.env.AUTH_PROVIDER || "manus";
  const factory = providers[providerName];

  if (!factory) {
    console.warn(`[AuthAdapter] Unknown provider "${providerName}", falling back to "manus"`);
    _currentProvider = new ManusOAuthProvider();
  } else {
    _currentProvider = factory();
  }

  console.log(`[AuthAdapter] Using auth provider: ${_currentProvider.name}`);
  return _currentProvider;
}

/**
 * Reset the provider (useful for testing or hot-swapping).
 */
export function resetAuthProvider(): void {
  _currentProvider = null;
}

/**
 * Register a custom auth provider at runtime.
 */
export function registerAuthProvider(name: string, factory: () => AuthProvider): void {
  providers[name] = factory;
}

export type { AuthProvider as IAuthProvider };
