export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Connector OAuth credentials (optional — falls back to API key entry when not set)
  // Platform injects GITHUB_CLIENT_ID (not GITHUB_OAUTH_CLIENT_ID), so we read both with fallback
  GITHUB_OAUTH_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? process.env.GITHUB_OAUTH_CLIENT_ID ?? "",
  GITHUB_OAUTH_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "",
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
  NOTION_OAUTH_CLIENT_ID: process.env.NOTION_CLIENT_ID ?? process.env.NOTION_OAUTH_CLIENT_ID ?? "",
  NOTION_OAUTH_CLIENT_SECRET: process.env.NOTION_CLIENT_SECRET ?? process.env.NOTION_OAUTH_CLIENT_SECRET ?? "",
  SLACK_OAUTH_CLIENT_ID: process.env.SLACK_CLIENT_ID ?? process.env.SLACK_OAUTH_CLIENT_ID ?? "",
  SLACK_OAUTH_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET ?? process.env.SLACK_OAUTH_CLIENT_SECRET ?? "",
  // Stripe payment integration (auto-injected by platform)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  VITE_STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
};
