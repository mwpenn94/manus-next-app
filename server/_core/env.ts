export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // ── Connector OAuth credentials ──
  // Only use CONNECTOR_ prefixed env vars (user-configured OAuth apps).
  // Platform's GITHUB_CLIENT_ID / MICROSOFT_365_CLIENT_ID are NOT used here
  // because they are registered with the Manus platform's redirect URIs,
  // not our app's /api/connector/oauth/callback. Using them would cause
  // a redirect_uri_mismatch error from the OAuth provider.
  // Users who want OAuth must create their own OAuth app and configure
  // CONNECTOR_*_CLIENT_ID / CONNECTOR_*_CLIENT_SECRET in Settings → Secrets.
  GITHUB_OAUTH_CLIENT_ID: process.env.CONNECTOR_GITHUB_CLIENT_ID ?? "",
  GITHUB_OAUTH_CLIENT_SECRET: process.env.CONNECTOR_GITHUB_CLIENT_SECRET ?? "",
  GOOGLE_OAUTH_CLIENT_ID: process.env.CONNECTOR_GOOGLE_CLIENT_ID ?? "",
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.CONNECTOR_GOOGLE_CLIENT_SECRET ?? "",
  NOTION_OAUTH_CLIENT_ID: process.env.CONNECTOR_NOTION_CLIENT_ID ?? "",
  NOTION_OAUTH_CLIENT_SECRET: process.env.CONNECTOR_NOTION_CLIENT_SECRET ?? "",
  SLACK_OAUTH_CLIENT_ID: process.env.CONNECTOR_SLACK_CLIENT_ID ?? "",
  SLACK_OAUTH_CLIENT_SECRET: process.env.CONNECTOR_SLACK_CLIENT_SECRET ?? "",
  MICROSOFT_365_OAUTH_CLIENT_ID: process.env.CONNECTOR_MICROSOFT_365_CLIENT_ID ?? "",
  MICROSOFT_365_OAUTH_CLIENT_SECRET: process.env.CONNECTOR_MICROSOFT_365_CLIENT_SECRET ?? "",
  // Stripe payment integration (auto-injected by platform)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  VITE_STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
};
