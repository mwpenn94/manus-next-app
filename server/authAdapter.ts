/**
 * Auth Adapter — Abstraction layer for authentication providers
 *
 * Supports:
 * - Manus OAuth (current, default)
 * - Clerk (future migration)
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

// ── Manus OAuth Provider (current) ──

class ManusOAuthProvider implements AuthProvider {
  name = "manus";

  async getUserFromRequest(req: Request): Promise<AuthUser | null> {
    // Delegates to existing server/_core/context.ts
    // This is a pass-through — the actual implementation lives in _core
    return null; // Handled by existing middleware
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
    // Handled by existing JWT verification in _core
    return null;
  }
}

// ── Clerk Provider (future) ──

class ClerkAuthProvider implements AuthProvider {
  name = "clerk";

  async getUserFromRequest(req: Request): Promise<AuthUser | null> {
    // Clerk integration stub
    // When Clerk is configured, this will use @clerk/express middleware
    //
    // Implementation plan:
    // 1. Install @clerk/express
    // 2. Use clerkMiddleware() to populate req.auth
    // 3. Map Clerk user to AuthUser interface
    //
    // const { userId } = req.auth;
    // if (!userId) return null;
    // const clerkUser = await clerkClient.users.getUser(userId);
    // return {
    //   id: clerkUser.id,
    //   openId: clerkUser.id,
    //   name: clerkUser.firstName + " " + clerkUser.lastName,
    //   avatarUrl: clerkUser.imageUrl,
    //   email: clerkUser.emailAddresses[0]?.emailAddress,
    //   role: clerkUser.publicMetadata.role as "admin" | "user" || "user",
    // };

    console.warn("[AuthAdapter] Clerk provider not yet configured. Falling back to null.");
    return null;
  }

  getLoginUrl(returnPath?: string, _origin?: string): string {
    // Clerk uses its own hosted sign-in page or embedded <SignIn /> component
    const clerkSignInUrl = process.env.CLERK_SIGN_IN_URL || "/sign-in";
    return returnPath ? `${clerkSignInUrl}?redirect_url=${encodeURIComponent(returnPath)}` : clerkSignInUrl;
  }

  async handleLogout(_req: Request, res: Response): Promise<void> {
    // Clerk handles logout via its own endpoint
    // With @clerk/express, call signOut()
    res.clearCookie("__session");
    res.json({ success: true });
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    // Clerk JWT verification stub
    // const { sub } = await clerkClient.verifyToken(token);
    // return this.getUserById(sub);
    console.warn("[AuthAdapter] Clerk token verification not yet configured.");
    return null;
  }
}

// ── Provider Factory ──

const providers: Record<string, () => AuthProvider> = {
  manus: () => new ManusOAuthProvider(),
  clerk: () => new ClerkAuthProvider(),
};

let _currentProvider: AuthProvider | null = null;

/**
 * Get the current auth provider based on AUTH_PROVIDER env var.
 * Defaults to "manus".
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
 * Register a custom auth provider.
 */
export function registerAuthProvider(name: string, factory: () => AuthProvider): void {
  providers[name] = factory;
}

export type { AuthProvider as IAuthProvider };
