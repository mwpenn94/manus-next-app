export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Guard: if env vars are missing, fall back to the current origin login path
  // This prevents "The string did not match the expected pattern" on iOS Safari
  // when new URL() receives "undefined/app-auth" as input.
  if (!oauthPortalUrl || oauthPortalUrl === "undefined") {
    console.warn("[getLoginUrl] VITE_OAUTH_PORTAL_URL is not configured, falling back to origin");
    return `${window.location.origin}/api/oauth/callback`;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(returnPath ? `${redirectUri}|${returnPath}` : redirectUri);

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId || "");
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (e) {
    // If URL construction fails for any reason, don't crash the app
    console.error("[getLoginUrl] Failed to construct login URL:", e);
    return `${window.location.origin}/api/oauth/callback`;
  }
};
