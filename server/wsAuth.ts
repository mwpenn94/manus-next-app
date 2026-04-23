/**
 * WebSocket Authentication Middleware (V-001 Security Fix)
 * 
 * Validates JWT session cookies on WebSocket upgrade requests.
 * Applies to all WS endpoints: /ws/device, /ws/voice, /api/analytics/ws
 */
import type { IncomingMessage } from "http";
import type { WebSocket } from "ws";
import cookie from "cookie";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "";

export interface AuthenticatedRequest extends IncomingMessage {
  wsUser?: {
    id: number;
    openId: string;
    name: string;
    role: string;
  };
}

/**
 * Extract and verify JWT from the session cookie on a WebSocket upgrade request.
 * Returns the user payload if valid, null if invalid/missing.
 */
export async function authenticateWsUpgrade(req: IncomingMessage): Promise<{
  id: number;
  openId: string;
  name: string;
  role: string;
} | null> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookie.parse(cookieHeader);
    const token = cookies["session"] || cookies["token"];
    if (!token) return null;

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.id || !payload.openId) return null;

    return {
      id: payload.id as number,
      openId: payload.openId as string,
      name: (payload.name as string) || "Unknown",
      role: (payload.role as string) || "user",
    };
  } catch {
    return null;
  }
}

/**
 * Guard a WebSocket connection handler with authentication.
 * Closes the connection with 4401 if authentication fails.
 */
export function requireWsAuth(
  handler: (ws: WebSocket, req: AuthenticatedRequest) => void
): (ws: WebSocket, req: IncomingMessage) => void {
  return async (ws: WebSocket, req: IncomingMessage) => {
    const user = await authenticateWsUpgrade(req);
    if (!user) {
      ws.close(4401, "Authentication required");
      return;
    }
    const authReq = req as AuthenticatedRequest;
    authReq.wsUser = user;
    handler(ws, authReq);
  };
}

/**
 * Guard for analytics relay — allows owner-only access to dashboard WS.
 * Regular page view tracking doesn't need auth (public analytics pixel).
 */
export function requireOwnerWsAuth(
  handler: (ws: WebSocket, req: AuthenticatedRequest) => void
): (ws: WebSocket, req: IncomingMessage) => void {
  return async (ws: WebSocket, req: IncomingMessage) => {
    const user = await authenticateWsUpgrade(req);
    if (!user) {
      ws.close(4401, "Authentication required");
      return;
    }
    const authReq = req as AuthenticatedRequest;
    authReq.wsUser = user;
    handler(ws, authReq);
  };
}
