/**
 * OAuth Connector Providers
 * 
 * Implements OAuth 2.0 flows for GitHub, Google, Notion, and Slack.
 * Each provider defines: authorize URL, token exchange, user info fetch, and scopes.
 * Falls back to API key entry when OAuth credentials are not configured.
 */
import { ENV } from "./_core/env";
const env = ENV as unknown as Record<string, string>;

export interface OAuthProvider {
  id: string;
  name: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Build the full authorization URL */
  getAuthUrl(redirectUri: string, state: string): string;
  /** Exchange authorization code for tokens */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResult>;
  /** Refresh an expired access token */
  refreshToken?(refreshToken: string): Promise<OAuthTokenResult>;
  /** Get user info to display connection status */
  getUserInfo?(accessToken: string): Promise<{ name: string; email?: string; avatar?: string }>;
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
}

// ── GitHub OAuth ──
const githubProvider: OAuthProvider = {
  id: "github",
  name: "GitHub",
  authorizeUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  scopes: ["repo", "read:user", "user:email"],
  
  getAuthUrl(redirectUri: string, state: string) {
    const clientId = env.GITHUB_OAUTH_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(" "),
      state,
      allow_signup: "true",
    });
    return `${this.authorizeUrl}?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const resp = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_CLIENT_ID || "",
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET || "",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = await resp.json() as Record<string, string>;
    if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scope: data.scope,
      tokenType: data.token_type,
    };
  },

  async getUserInfo(accessToken: string) {
    const resp = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    const data = await resp.json() as Record<string, string>;
    return { name: data.login || data.name, email: data.email, avatar: data.avatar_url };
  },
};

// ── Google OAuth (Drive + Calendar) ──
const googleProvider: OAuthProvider = {
  id: "google",
  name: "Google",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],

  getAuthUrl(redirectUri: string, state: string) {
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.scopes.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `${this.authorizeUrl}?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const resp = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID || "",
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const data = await resp.json() as Record<string, string | number>;
    if (data.error) throw new Error(`Google OAuth error: ${data.error_description || data.error}`);
    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string,
      expiresIn: data.expires_in as number,
      scope: data.scope as string,
    };
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokenResult> {
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID || "",
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET || "",
        grant_type: "refresh_token",
      }),
    });
    const data = await resp.json() as Record<string, string | number>;
    return {
      accessToken: data.access_token as string,
      expiresIn: data.expires_in as number,
    };
  },

  async getUserInfo(accessToken: string) {
    const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await resp.json() as Record<string, string>;
    return { name: data.name || data.email, email: data.email, avatar: data.picture };
  },
};

// ── Notion OAuth ──
const notionProvider: OAuthProvider = {
  id: "notion",
  name: "Notion",
  authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
  tokenUrl: "https://api.notion.com/v1/oauth/token",
  scopes: [],

  getAuthUrl(redirectUri: string, state: string) {
    const clientId = env.NOTION_OAUTH_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      owner: "user",
    });
    return `${this.authorizeUrl}?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const credentials = Buffer.from(
      `${env.NOTION_OAUTH_CLIENT_ID || ""}:${env.NOTION_OAUTH_CLIENT_SECRET || ""}`
    ).toString("base64");
    const resp = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    const data = await resp.json() as Record<string, string>;
    if (data.error) throw new Error(`Notion OAuth error: ${data.error}`);
    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
    };
  },

  async getUserInfo(accessToken: string) {
    const resp = await fetch("https://api.notion.com/v1/users/me", {
      headers: { Authorization: `Bearer ${accessToken}`, "Notion-Version": "2022-06-28" },
    });
    const data = await resp.json() as Record<string, any>;
    return { name: data.name || "Notion User", email: data.person?.email, avatar: data.avatar_url };
  },
};

// ── Slack OAuth ──
const slackProvider: OAuthProvider = {
  id: "slack",
  name: "Slack",
  authorizeUrl: "https://slack.com/oauth/v2/authorize",
  tokenUrl: "https://slack.com/api/oauth.v2.access",
  scopes: ["chat:write", "channels:read", "users:read"],

  getAuthUrl(redirectUri: string, state: string) {
    const clientId = env.SLACK_OAUTH_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(","),
      state,
    });
    return `${this.authorizeUrl}?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const resp = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.SLACK_OAUTH_CLIENT_ID || "",
        client_secret: env.SLACK_OAUTH_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
      }),
    });
    const data = await resp.json() as Record<string, any>;
    if (!data.ok) throw new Error(`Slack OAuth error: ${data.error}`);
    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      scope: data.scope,
    };
  },

  async getUserInfo(accessToken: string) {
    const resp = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await resp.json() as Record<string, string>;
    return { name: data.user || "Slack User" };
  },
};

// ── Microsoft 365 OAuth (Azure AD) ──
const microsoftProvider: OAuthProvider = {
  id: "microsoft-365",
  name: "Microsoft 365",
  authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  scopes: ["openid", "profile", "email", "User.Read", "Mail.Read", "Files.ReadWrite", "Calendars.Read"],

  getAuthUrl(redirectUri: string, state: string) {
    const clientId = env.MICROSOFT_365_OAUTH_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(" "),
      state,
      response_type: "code",
      response_mode: "query",
    });
    return `${this.authorizeUrl}?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const resp = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.MICROSOFT_365_OAUTH_CLIENT_ID || "",
        client_secret: env.MICROSOFT_365_OAUTH_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const data = await resp.json() as Record<string, any>;
    if (data.error) throw new Error(`Microsoft OAuth error: ${data.error_description || data.error}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      tokenType: data.token_type,
    };
  },

  async refreshToken(refreshToken: string) {
    const resp = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: env.MICROSOFT_365_OAUTH_CLIENT_ID || "",
        client_secret: env.MICROSOFT_365_OAUTH_CLIENT_SECRET || "",
        grant_type: "refresh_token",
      }),
    });
    const data = await resp.json() as Record<string, any>;
    if (data.error) throw new Error(`Microsoft refresh error: ${data.error_description || data.error}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
      scope: data.scope,
      tokenType: data.token_type,
    };
  },

  async getUserInfo(accessToken: string) {
    const resp = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await resp.json() as Record<string, string>;
    return {
      name: data.displayName || "Microsoft User",
      email: data.mail || data.userPrincipalName,
    };
  },
};

// ── Provider Registry ──
export const oauthProviders: Record<string, OAuthProvider> = {
  github: githubProvider,
  "google-drive": googleProvider,
  calendar: googleProvider,
  notion: notionProvider,
  slack: slackProvider,
  "microsoft-365": microsoftProvider,
};

export function getOAuthProvider(connectorId: string): OAuthProvider | undefined {
  return oauthProviders[connectorId];
}

export function isOAuthSupported(connectorId: string): boolean {
  const provider = oauthProviders[connectorId];
  if (!provider) return false;
  // Check if the required env vars are configured
  switch (connectorId) {
    case "github":
      return !!(env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET);
    case "google-drive":
    case "calendar":
      return !!(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
    case "notion":
      return !!(env.NOTION_OAUTH_CLIENT_ID && env.NOTION_OAUTH_CLIENT_SECRET);
    case "slack":
      return !!(env.SLACK_OAUTH_CLIENT_ID && env.SLACK_OAUTH_CLIENT_SECRET);
    case "microsoft-365":
      return !!(env.MICROSOFT_365_OAUTH_CLIENT_ID && env.MICROSOFT_365_OAUTH_CLIENT_SECRET);
    default:
      return false;
  }
}
