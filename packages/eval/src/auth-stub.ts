/**
 * auth-stub.ts — Authentication stub for benchmark evaluation
 *
 * Per §C.2: Provides a mock authentication context for running
 * benchmark task shells without requiring real OAuth flow.
 *
 * Usage:
 *   import { createAuthStub } from './auth-stub';
 *   const auth = createAuthStub({ userId: 'bench-user-1', role: 'admin' });
 *   // auth.user, auth.token, auth.headers
 */

export interface AuthStubUser {
  openId: string;
  name: string;
  role: "admin" | "user";
  avatarUrl: string;
}

export interface AuthStubContext {
  user: AuthStubUser;
  token: string;
  headers: Record<string, string>;
  isAuthenticated: true;
}

export interface AuthStubOptions {
  userId?: string;
  name?: string;
  role?: "admin" | "user";
}

/**
 * Create a mock auth context for benchmark evaluation.
 * Returns a user object, JWT-like token, and pre-built headers.
 */
export function createAuthStub(options: AuthStubOptions = {}): AuthStubContext {
  const userId = options.userId || `bench-user-${Date.now()}`;
  const name = options.name || "Benchmark User";
  const role = options.role || "admin";

  const user: AuthStubUser = {
    openId: userId,
    name,
    role,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
  };

  // Generate a deterministic mock JWT for the benchmark user
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, name, role, iat: Math.floor(Date.now() / 1000) })
  ).toString("base64url");
  const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.benchmark-stub-signature`;

  return {
    user,
    token,
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: `session=${token}`,
      "Content-Type": "application/json",
    },
    isAuthenticated: true,
  };
}

/**
 * Create an unauthenticated context for testing auth-required endpoints.
 */
export function createUnauthStub(): {
  user: null;
  token: null;
  headers: Record<string, string>;
  isAuthenticated: false;
} {
  return {
    user: null,
    token: null,
    headers: { "Content-Type": "application/json" },
    isAuthenticated: false,
  };
}

/**
 * Simulate the OAuth callback flow for integration tests.
 * Returns a session cookie string that can be used in subsequent requests.
 */
export function simulateOAuthCallback(baseUrl: string): {
  callbackUrl: string;
  sessionCookie: string;
} {
  const stub = createAuthStub();
  return {
    callbackUrl: `${baseUrl}/api/oauth/callback?code=bench-code&state=bench-state`,
    sessionCookie: `session=${stub.token}`,
  };
}
