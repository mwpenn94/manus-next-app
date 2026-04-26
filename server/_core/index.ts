import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Builds an HTML page for the OAuth callback popup.
 * If opened as a popup, posts the code back to the opener via postMessage.
 * If opened as same-window redirect, redirects to /connectors with code+state params.
 */
function buildOAuthCallbackHtml(
  connectorId: string | null,
  code: string | null,
  error: string | null,
  state?: string
): string {
  if (error) {
    return `<!DOCTYPE html><html><body><h2>OAuth Error</h2><p>${error}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`;
  }
  // Parse origin from state for same-window redirect
  let origin = "";
  try {
    const parsed = JSON.parse(Buffer.from(state || "", "base64url").toString());
    origin = parsed.origin || "";
  } catch { /* ignore */ }

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<p style="font-family:system-ui;text-align:center;margin-top:40vh">Connecting...</p>
<script>
  (function() {
    var connectorId = ${JSON.stringify(connectorId)};
    var code = ${JSON.stringify(code)};
    var state = ${JSON.stringify(state || "")};
    var origin = ${JSON.stringify(origin)};

    // Try popup flow first (window.opener exists when opened without noopener)
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: "connector-oauth-callback", connectorId: connectorId, code: code }, "*");
        setTimeout(function() { window.close(); }, 800);
        return;
      } catch(e) { /* fall through to redirect */ }
    }

    // Same-window redirect (mobile flow or popup blocked)
    // Use origin from state to build the redirect URL
    var base = origin || window.location.origin;
    window.location.href = base + "/connectors?code=" + encodeURIComponent(code) + "&state=" + encodeURIComponent(state);
  })();
</script>
</body></html>`;
}

function buildOAuthSuccessHtml(
  origin: string,
  connectorId: string,
  userName: string
): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#e5e5e5}
.card{text-align:center;padding:2rem;border-radius:1rem;background:#1a1a1a;border:1px solid #333;max-width:320px}
.check{width:48px;height:48px;border-radius:50%;background:#22c55e20;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
.check svg{width:24px;height:24px;color:#22c55e}
h2{margin:0 0 0.5rem;font-size:1.25rem}p{color:#999;margin:0 0 1.5rem;font-size:0.875rem}
a{display:inline-block;padding:0.625rem 1.5rem;background:#c9a227;color:#000;text-decoration:none;border-radius:0.5rem;font-weight:500;font-size:0.875rem}
</style></head><body>
<div class="card">
  <div class="check"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>
  <h2>Connected!</h2>
  <p>Successfully linked <strong>${userName}</strong> via ${connectorId}.</p>
  <a href="${origin}/connectors?oauth_success=${encodeURIComponent(connectorId)}">Continue</a>
</div>
<script>
  // If opened as popup, notify parent and close
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage({ type: "connector-oauth-success", connectorId: ${JSON.stringify(connectorId)} }, "*");
      setTimeout(function() { window.close(); }, 1200);
    } catch(e) { /* ignore, user can click Continue */ }
  } else {
    // Auto-redirect after 2 seconds for same-window flow
    setTimeout(function() { window.location.href = "${origin}/connectors?oauth_success=${encodeURIComponent(connectorId)}"; }, 2000);
  }
</script>
</body></html>`;
}

/**
 * Build HTML response for Manus OAuth verification callback (Tier 2).
 * On success: notifies opener via postMessage (popup flow) or redirects (same-window).
 * On error: shows error message and auto-closes.
 */
function buildManusVerifyHtml(
  result: {
    connectorId: string;
    verifiedIdentity: string;
    loginMethod: string;
    email: string;
    origin: string;
  } | null,
  error?: string
): string {
  if (error || !result) {
    return `<!DOCTYPE html><html><body>
<div style="font-family:system-ui;text-align:center;margin-top:40vh;color:#e5e5e5;background:#0a0a0a;min-height:100vh">
  <h2 style="color:#ef4444">Verification Failed</h2>
  <p>${error || "Unknown error"}</p>
</div>
<script>setTimeout(()=>window.close(),3000)</script>
</body></html>`;
  }

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#e5e5e5}
.card{text-align:center;padding:2rem;border-radius:1rem;background:#1a1a1a;border:1px solid #333;max-width:360px}
.check{width:48px;height:48px;border-radius:50%;background:#22c55e20;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
.check svg{width:24px;height:24px;color:#22c55e}
h2{margin:0 0 0.5rem;font-size:1.25rem}p{color:#999;margin:0 0 0.5rem;font-size:0.875rem}
.identity{color:#c9a227;font-weight:600;font-size:1rem}
a{display:inline-block;padding:0.625rem 1.5rem;background:#c9a227;color:#000;text-decoration:none;border-radius:0.5rem;font-weight:500;font-size:0.875rem;margin-top:1rem}
</style></head><body>
<div class="card">
  <div class="check"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
  <h2>Identity Verified</h2>
  <p class="identity">${result.verifiedIdentity}</p>
  <p>Verified via ${result.loginMethod} through Manus</p>
  <p style="font-size:0.75rem;color:#666">You can now set up your ${result.connectorId} connector with guided token creation.</p>
  <a href="${result.origin}/connectors?manus_verified=${encodeURIComponent(result.connectorId)}&identity=${encodeURIComponent(result.verifiedIdentity)}&method=${encodeURIComponent(result.loginMethod)}">Continue</a>
</div>
<script>
  (function() {
    var data = {
      type: "connector-manus-verified",
      connectorId: ${JSON.stringify(result.connectorId)},
      verifiedIdentity: ${JSON.stringify(result.verifiedIdentity)},
      loginMethod: ${JSON.stringify(result.loginMethod)},
      email: ${JSON.stringify(result.email)}
    };
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(data, "*");
        setTimeout(function() { window.close(); }, 1200);
        return;
      } catch(e) { /* fall through */ }
    }
    // Same-window: auto-redirect after 2s
    setTimeout(function() {
      window.location.href = ${JSON.stringify(result.origin)} + "/connectors?manus_verified=" + encodeURIComponent(${JSON.stringify(result.connectorId)}) + "&identity=" + encodeURIComponent(${JSON.stringify(result.verifiedIdentity)}) + "&method=" + encodeURIComponent(${JSON.stringify(result.loginMethod)});
    }, 2000);
  })();
</script>
</body></html>`;
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1); // Trust first proxy for rate limiting behind reverse proxy
  const server = createServer(app);

  // ── Security Headers ──
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "wss:", "ws:", "https://api.manus.im", "https://api.stripe.com", "https://*.amazonaws.com"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    } : false, // CSP disabled in dev for Vite HMR
    crossOriginEmbedderPolicy: false, // Required for OAuth popups
  }));

  // ── Rate Limiting ──
  // Strict limit for LLM stream (costs real money per call)
  const streamLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute per IP
    message: { error: "Too many requests. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  // Moderate limit for file uploads
  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30, // 30 uploads per minute
    message: { error: "Upload rate limit exceeded." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  // General API rate limit
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 600, // 600 requests per minute (batched tRPC calls fire many at once)
    message: { error: "Rate limit exceeded. Please try again shortly." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  // TTS rate limit (generous but bounded)
  const ttsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60, // 60 TTS requests per minute per IP
    message: { error: "TTS rate limit exceeded. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  // Analytics collect rate limit (P0 security fix)
  const analyticsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60, // 60 page views per minute per IP
    message: { error: "Analytics rate limit exceeded." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/stream", streamLimiter);
  app.use("/api/upload", uploadLimiter);
  app.use("/api/tts", ttsLimiter);
  app.use("/api/trpc", apiLimiter);
  app.use("/api/analytics/collect", analyticsLimiter);

  // Webhook rate limiters (G-005)
  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100, // 100 webhook events per minute per IP (Stripe sends bursts)
    message: { error: "Webhook rate limit exceeded." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/stripe/webhook", webhookLimiter);
  app.use("/api/github/webhook", webhookLimiter);

  // ── GitHub webhook (raw body for HMAC verification) ──
  app.post("/api/github/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const { handleGitHubWebhook } = await import("../githubWebhook");
      await handleGitHubWebhook(req, res);
    } catch (err: any) {
      console.error("[GitHub Webhook] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Stripe webhook (raw body required BEFORE json parser) ──
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const { handleStripeWebhook } = await import("../stripe");
      await handleStripeWebhook(req, res);
    } catch (err: any) {
      console.error("[Stripe Webhook] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Configure body parser with larger size limit for file uploads
  // Skip JSON parsing for /api/upload (binary) and /api/stripe/webhook (raw) to allow raw body reading
  app.use((req, res, next) => {
    if (req.path === "/api/upload" || req.path === "/api/stripe/webhook" || req.path === "/api/github/webhook") return next();
    express.json({ limit: "50mb" })(req, res, (err) => {
      if (err) {
        // Silently handle ALL body-parser errors (malformed JSON, entity.parse.failed,
        // debug-collector sending "[unserializable proxy]", etc.)
        // Do NOT log stack traces for these — they are expected from browser debug collectors
        if (!res.headersSent) {
          return res.status(400).json({ error: "Invalid JSON body" });
        }
        return;
      }
      next();
    });
  });
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Storage proxy for /manus-storage/* paths
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ── OG Image endpoint for shared tasks ──
  app.get("/api/og-image/:token", async (req, res) => {
    try {
      const token = req.params.token;
      if (!token || token.length > 50) {
        res.status(400).send("Invalid token");
        return;
      }
      const { getTaskShareByToken, getTaskByExternalId, getTaskMessages } = await import("../db");
      const share = await getTaskShareByToken(token);
      if (!share) {
        res.status(404).send("Share not found");
        return;
      }
      const task = await getTaskByExternalId(share.taskExternalId);
      if (!task) {
        res.status(404).send("Task not found");
        return;
      }
      // Count steps
      const messages = await getTaskMessages(task.id);
      let stepCount = 0;
      for (const msg of messages.filter(m => m.role === "assistant")) {
        try {
          const actions = typeof msg.actions === "string" ? JSON.parse(msg.actions) : msg.actions;
          if (Array.isArray(actions)) stepCount += actions.length;
        } catch { /* skip */ }
      }
      // Generate OG image
      const { generateOgImageBuffer } = await import("../routers/ogImage");
      const { buffer, contentType } = await generateOgImageBuffer(
        task.title || "Shared Task",
        stepCount,
        task.status || "completed",
        task.createdAt,
      );
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600"); // Cache 1 hour
      res.send(buffer);
    } catch (err) {
      console.error("[OG Image] Error:", err);
      res.status(500).send("Error generating image");
    }
  });

  // ── Scheduled Task: VU Monitor ──
  app.post("/api/scheduled/vu-monitor", async (req, res) => {
    try {
      const { handleVuMonitor } = await import("../scheduledVuMonitor");
      await handleVuMonitor(req, res);
    } catch (err: any) {
      console.error("[VU Monitor] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Scheduled Connector Refresh ──
  app.post("/api/scheduled/connector-refresh", async (req, res) => {
    try {
      const { handleConnectorRefresh } = await import("../scheduledConnectorRefresh");
      await handleConnectorRefresh(req, res);
    } catch (err: any) {
      console.error("[ConnectorRefresh] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Scheduled Health Check (G-009) ──
  app.post("/api/scheduled/health", async (req, res) => {
    try {
      const { handleHealthCheck } = await import("../scheduledHealthCheck");
      await handleHealthCheck(req, res);
    } catch (err: any) {
      console.error("[ScheduledHealthCheck] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Client Error Reporting (B5 Observability) ──
  app.post("/api/client-error", express.json(), async (req, res) => {
    try {
      const { message, stack, componentStack, url, timestamp } = req.body || {};
      console.error(`[ClientError] ${message || "Unknown"}`, {
        url,
        timestamp,
        stack: stack?.slice(0, 500),
        componentStack: componentStack?.slice(0, 300),
      });
      res.json({ received: true });
    } catch {
      res.status(200).json({ received: true });
    }
  });

  // ── Dev-only: Test Login for E2E (Playwright) ──
  // Creates a valid session cookie for the owner user without OAuth redirect.
  // Only available in development (NODE_ENV !== 'production').
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/test-login", async (req, res) => {
      try {
        const { ENV } = await import("./env");
        const { sdk: sdkLogin } = await import("./sdk");
        const { getSessionCookieOptions } = await import("./cookies");
        const { COOKIE_NAME, ONE_YEAR_MS } = await import("@shared/const");
        const openId = ENV.ownerOpenId;
        if (!openId) {
          res.status(500).json({ error: "OWNER_OPEN_ID not configured" });
          return;
        }
        // Ensure user exists in DB
        const { upsertUser } = await import("../db");
        await upsertUser({
          openId,
          name: process.env.OWNER_NAME || "Test User",
          email: null,
          lastSignedIn: new Date(),
        });
        // Create a session token (same as OAuth callback)
        const sessionToken = await sdkLogin.createSessionToken(openId, {
          name: process.env.OWNER_NAME || "Test User",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        res.json({ ok: true, openId, message: "Test session created" });
      } catch (e: any) {
        console.error("[test-login] Failed:", e);
        res.status(500).json({ error: e.message });
      }
    });
  }

  // ── §L.33 Runtime Validator — Health & Diagnostics ──
  app.get("/api/health", async (_req, res) => {
    try {
      const { buildValidationReport } = await import("../runtimeValidator");
      const report = await buildValidationReport();
      const statusCode = report.overall === "down" ? 503 : report.overall === "degraded" ? 207 : 200;
      res.status(statusCode).json(report);
    } catch (e: any) {
      res.status(500).json({ overall: "down", error: e.message });
    }
  });

  // ── §L.33 IA-1 through IA-5: Full Validation Endpoint ──
  app.get("/_validate", async (req, res) => {
    try {
      const { buildValidationReport, getRecentTraces, getActiveTraceCount } = await import("../runtimeValidator");
      const report = await buildValidationReport();
      const traces = getRecentTraces(20);
      const validation = {
        ...report,
        ia1_services: report.services,
        ia2_traces: { activeCount: getActiveTraceCount(), recent: traces },
        ia3_syntheticUsers: { supported: true, detectionMethod: "email+name+openId pattern matching" },
        ia4_features: report.features,
        ia5_artifactIntegrity: { endpoint: "POST /_validate/artifact", description: "Submit artifact for integrity check" },
      };
      const statusCode = report.overall === "down" ? 503 : report.overall === "degraded" ? 207 : 200;
      res.status(statusCode).json(validation);
    } catch (e: any) {
      res.status(500).json({ overall: "down", error: e.message });
    }
  });

  // ── §L.33 IA-5: Artifact integrity check endpoint ──
  app.post("/_validate/artifact", express.json(), async (req, res) => {
    try {
      const { checkArtifactIntegrity } = await import("../runtimeValidator");
      const result = checkArtifactIntegrity(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ valid: false, reason: e.message });
    }
  });

  // ── Analytics Collection Endpoint ──
  app.post("/api/analytics/collect", express.json(), async (req, res) => {
    try {
      const { projectId, path, referrer, screenWidth } = req.body;
      if (!projectId) return res.status(400).json({ error: "projectId required" });

      // Privacy-preserving visitor hash: SHA-256(IP + daily salt)
      const crypto = await import("crypto");
      const dailySalt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      const ipStr = Array.isArray(ip) ? ip[0] : ip;
      const visitorHash = crypto.createHash("sha256").update(`${ipStr}:${dailySalt}`).digest("hex").slice(0, 32);

      const userAgent = (req.headers["user-agent"] || "").slice(0, 512);

      const { recordPageView, getWebappProjectByExternalId, updateWebappProject } = await import("../db");
      
      // Look up project by externalId
      const project = await getWebappProjectByExternalId(String(projectId));
      if (!project) return res.status(404).json({ error: "Project not found" });

      // Country detection: CDN headers first, then IP-based geolocation fallback
      const countryHeader = req.headers["cf-ipcountry"] || req.headers["x-country"] || req.headers["x-vercel-ip-country"];
      let country: string | null = countryHeader ? String(Array.isArray(countryHeader) ? countryHeader[0] : countryHeader).slice(0, 8).toUpperCase() : null;

      // Fallback: IP-based geolocation via ip-api.com with LRU cache
      if (!country && ipStr !== "unknown") {
        try {
          const { lookupCountry } = await import("../geoip");
          const geo = await lookupCountry(ipStr);
          if (geo.countryCode) {
            country = geo.countryCode.toUpperCase();
          }
        } catch (geoErr: any) {
          // Non-fatal: proceed without country data
          console.warn("[Analytics] GeoIP fallback error:", geoErr.message);
        }
      }

      const pagePath = String(path || "/").slice(0, 512);

      await recordPageView({
        projectId: project.id,
        path: pagePath,
        referrer: referrer ? String(referrer).slice(0, 2048) : null,
        userAgent,
        visitorHash,
        country,
        screenWidth: screenWidth ? Number(screenWidth) : null,
      });

      // Increment aggregate counters on the project
      await updateWebappProject(project.id, {
        totalPageViews: (project.totalPageViews ?? 0) + 1,
      });

      // Notify real-time analytics relay
      try {
        const { notifyPageView } = await import("../analyticsRelay");
        notifyPageView({
          projectExternalId: String(projectId),
          visitorHash,
          path: pagePath,
          country,
        });
      } catch {
        // Non-fatal: relay may not be initialized yet
      }

      // Set CORS headers for cross-origin tracking
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).end();
    } catch (err: any) {
      console.error("[Analytics] Collection error:", err.message);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // CORS preflight for analytics
  app.options("/api/analytics/collect", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
  });

  // Tracking pixel script served to deployed apps
  app.get("/api/analytics/pixel.js", (req, res) => {
    const projectId = req.query.pid || "";
    const origin = `${req.protocol}://${req.get("host")}`;
    const script = `
(function() {
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return;
  var data = {
    projectId: "${String(projectId).replace(/"/g, '')}",
    path: location.pathname,
    referrer: document.referrer || null,
    screenWidth: screen.width
  };
  fetch("${origin}/api/analytics/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    keepalive: true
  }).catch(function() {});
})();
`.trim();
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(script);
  });

  // ── Connector OAuth callback (receives redirect from GitHub/Google/Notion/Slack) ──
  app.get("/api/connector/oauth/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      const stateRaw = req.query.state as string;
      const error = req.query.error as string;

      if (error) {
        return res.status(400).send(buildOAuthCallbackHtml(null, null, `OAuth error: ${error}`));
      }
      if (!code || !stateRaw) {
        return res.status(400).send(buildOAuthCallbackHtml(null, null, "Missing code or state parameter"));
      }

      // Decode state to extract connectorId, userId, and origin
      let state: { connectorId: string; userId: number; origin: string };
      try {
        state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
      } catch {
        return res.status(400).send(buildOAuthCallbackHtml(null, null, "Invalid state parameter"));
      }

      // ── Server-side token exchange (eliminates popup/postMessage dependency) ──
      // This is the Manus-style approach: exchange code on the server, then redirect.
      try {
        const { getOAuthProvider } = await import("../connectorOAuth");
        const { upsertConnector, updateConnectorOAuthTokens } = await import("../db");
        const provider = getOAuthProvider(state.connectorId);
        if (!provider) throw new Error("Unknown connector");

        const redirectUri = `${state.origin}/api/connector/oauth/callback`;
        const tokens = await provider.exchangeCode(code, redirectUri);

        let userName = provider.name;
        if (provider.getUserInfo) {
          try {
            const info = await provider.getUserInfo(tokens.accessToken);
            userName = info.name || provider.name;
          } catch { /* ignore user info errors */ }
        }

        const connId = await upsertConnector({
          userId: state.userId,
          connectorId: state.connectorId,
          name: userName,
          config: { authMethod: "oauth" },
          status: "connected",
        });
        await updateConnectorOAuthTokens(connId, {
          authMethod: "oauth",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || null,
          tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
          oauthScopes: tokens.scope || null,
        });

        console.log(`[Connector OAuth] Successfully connected ${state.connectorId} for user ${state.userId} as ${userName}`);

        // Redirect back to connectors page with success indicator
        const base = state.origin || "";
        return res.send(buildOAuthSuccessHtml(base, state.connectorId, userName));
      } catch (exchangeErr: any) {
        console.error("[Connector OAuth] Token exchange failed:", exchangeErr);
        // Fall back to client-side exchange via postMessage/redirect
        return res.send(buildOAuthCallbackHtml(state.connectorId, code, null, stateRaw));
      }
    } catch (err: any) {
      console.error("[Connector OAuth Callback] Error:", err);
      res.status(500).send(buildOAuthCallbackHtml(null, null, err.message || "OAuth callback failed"));
    }
  });

  // ── Manus OAuth Verification callback for Connectors (Tier 2) ──
  // This route handles the redirect from the Manus OAuth portal when a user
  // verifies their identity for a connector. It exchanges the Manus code for
  // user info, extracts the verified identity (loginMethod, name, email),
  // and saves it to the connector record.
  app.get("/api/connector/manus/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      const stateRaw = req.query.state as string;
      const connectorId = req.query.cid as string;
      const userId = parseInt(req.query.uid as string, 10);

      if (!code || !stateRaw) {
        return res.status(400).send(buildManusVerifyHtml(null, "Missing code or state parameter"));
      }
      if (!connectorId || isNaN(userId)) {
        return res.status(400).send(buildManusVerifyHtml(null, "Missing connector ID or user ID"));
      }

      // Exchange the Manus OAuth code for tokens and get user info
      const { sdk: sdkInstance } = await import("./sdk");
      const tokenResponse = await sdkInstance.exchangeCodeForToken(code, stateRaw);
      const userInfo = await sdkInstance.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        return res.status(400).send(buildManusVerifyHtml(null, "Could not verify identity"));
      }

      // Extract verified identity
      const verifiedIdentity = userInfo.name || userInfo.email || userInfo.openId;
      const loginMethod = userInfo.loginMethod || userInfo.platform || "unknown";

      // Save the connector with manus_oauth auth method
      const { upsertConnector, updateConnectorOAuthTokens, getDb } = await import("../db");
      const { connectors } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const connId = await upsertConnector({
        userId,
        connectorId,
        name: verifiedIdentity,
        config: {
          authMethod: "manus_oauth",
          verifiedIdentity,
          verifiedEmail: userInfo.email || "",
          loginMethod,
        },
        status: "connected",
      });

      await updateConnectorOAuthTokens(connId, {
        authMethod: "manus_oauth",
      });

      // Update manusVerifiedIdentity column
      const db = await getDb();
      if (db) {
        await db.update(connectors)
          .set({ manusVerifiedIdentity: verifiedIdentity })
          .where(eq(connectors.id, connId));
      }

      console.log(`[Connector Manus Verify] Verified ${connectorId} for user ${userId} as ${verifiedIdentity} (${loginMethod})`);

      // Determine origin from the redirectUri in state
      let origin = "";
      try {
        const redirectUri = Buffer.from(stateRaw, "base64").toString();
        const parsed = new URL(redirectUri);
        origin = parsed.origin;
      } catch { /* ignore */ }

      // Return HTML that notifies the opener (popup) or redirects (same-window)
      return res.send(buildManusVerifyHtml({
        connectorId,
        verifiedIdentity,
        loginMethod,
        email: userInfo.email || "",
        origin,
      }));
    } catch (err: any) {
      console.error("[Connector Manus Verify] Error:", err);
      return res.status(500).send(buildManusVerifyHtml(null, err.message || "Verification failed"));
    }
  });

  // ── File upload endpoint (auth required) ──
  app.post("/api/upload", async (req, res) => {
    try {
      // Auth check: require valid session
      const { sdk: sdkInstance } = await import("./sdk");
      const user = await sdkInstance.authenticateRequest(req).catch(() => null);
      if (!user) {
        return res.status(401).json({ error: "Authentication required for file uploads" });
      }

      const { storagePut } = await import("../storage");
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = Buffer.concat(chunks);
          const contentType = req.headers["content-type"] || "application/octet-stream";
          // Enforce upload limit: 100MB for video, 50MB for other files
          const isVideo = (contentType.startsWith("video/"));
          const maxSize = isVideo ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
          if (body.length > maxSize) {
            return res.status(413).json({ error: `File too large. Maximum size is ${isVideo ? "100MB" : "50MB"}.` });
          }
          // ADV-01 fix: Sanitize file name and task ID to prevent path traversal
          const rawFileName = (req.headers["x-file-name"] as string) || `upload-${Date.now()}`;
          const rawTaskId = (req.headers["x-task-id"] as string) || "unknown";
          const sanitize = (s: string) => s.replace(/[\/\\:*?"<>|\x00-\x1f]/g, "_").replace(/\.\./g, "_").slice(0, 200);
          const fileName = sanitize(rawFileName);
          const taskId = sanitize(rawTaskId);
          const fileKey = `task-files/${taskId}/${Date.now()}-${fileName}`;
          const { key, url } = await storagePut(fileKey, body, contentType);
          res.json({ success: true, key, url, fileName });
        } catch (err: any) {
          console.error("[Upload] S3 error:", err);
          res.status(500).json({ error: err.message || "Upload failed" });
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  // ── TTS endpoint — Edge TTS neural voice synthesis ──
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice, rate, pitch, volume } = req.body || {};
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Text is required" });
      }
      // Limit text length to prevent abuse (max ~5000 chars ≈ 3 minutes of speech)
      if (text.length > 5000) {
        return res.status(400).json({ error: "Text too long. Maximum 5000 characters." });
      }

      const { synthesizeSpeech } = await import("../tts");
      const audioBuffer = await synthesizeSpeech({
        text: text.trim(),
        voice: voice || undefined,
        rate: rate || undefined,
        pitch: pitch || undefined,
        volume: volume || undefined,
      });

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      });
      res.send(audioBuffer);
    } catch (err: any) {
      console.error("[TTS] Error:", err);
      res.status(500).json({ error: err.message || "TTS synthesis failed" });
    }
  });

  // ── TTS streaming endpoint — sentence-by-sentence for low latency ──
  app.post("/api/tts/stream", async (req, res) => {
    try {
      const { text, voice, rate, pitch, volume } = req.body || {};
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Text is required" });
      }
      if (text.length > 5000) {
        return res.status(400).json({ error: "Text too long. Maximum 5000 characters." });
      }

      const { synthesizeSpeechStream } = await import("../tts");

      res.set({
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      });

      for await (const chunk of synthesizeSpeechStream({
        text: text.trim(),
        voice: voice || undefined,
        rate: rate || undefined,
        pitch: pitch || undefined,
        volume: volume || undefined,
      })) {
        if (res.destroyed) break;
        res.write(chunk);
      }
      res.end();
    } catch (err: any) {
      console.error("[TTS Stream] Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "TTS streaming failed" });
      } else {
        res.end();
      }
    }
  });

  // ── TTS voices endpoint — list available voices ──
  app.get("/api/tts/voices", async (req, res) => {
    try {
      const { getVoicesByLanguage, DEFAULT_VOICES } = await import("../tts");
      const lang = (req.query.lang as string) || "en";
      const voices = await getVoicesByLanguage(lang);
      res.json({ voices, defaults: DEFAULT_VOICES });
    } catch (err: any) {
      console.error("[TTS Voices] Error:", err);
      res.status(500).json({ error: err.message || "Failed to list voices" });
    }
  });

  // ── TTS available languages ──
  app.get("/api/tts/languages", async (_req, res) => {
    try {
      const { getAvailableLanguages } = await import("../tts");
      const languages = await getAvailableLanguages();
      res.json({ languages });
    } catch (err: any) {
      console.error("[TTS Languages] Error:", err);
      res.status(500).json({ error: err.message || "Failed to list languages" });
    }
  });

  // ── SSE streaming endpoint for LLM (Agentic) ──
  // Multi-turn agentic loop: LLM calls tools (search, image gen, code exec),
  // server executes them, streams progress, feeds results back until done.
  app.post("/api/stream", async (req, res) => {
    console.log("[Stream] Agentic request received");

    // Auth guard: require valid session before starting expensive LLM calls
    try {
      const { sdk: sdkAuth } = await import("./sdk");
      const authUser = await sdkAuth.authenticateRequest(req).catch(() => null);
      if (!authUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
    } catch {
      return res.status(401).json({ error: "Authentication required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // SSE heartbeat: send a ping comment every 15s to keep the connection alive
    // on mobile networks and through proxies that close idle connections.
    const heartbeatInterval = setInterval(() => {
      try {
        if (!res.destroyed) {
          res.write(`data: ${JSON.stringify({ heartbeat: true, ts: Date.now() })}\n\n`);
        } else {
          clearInterval(heartbeatInterval);
        }
      } catch {
        clearInterval(heartbeatInterval);
      }
    }, 15_000);

    // Clean up heartbeat when client disconnects
    req.on("close", () => clearInterval(heartbeatInterval));
    res.on("close", () => clearInterval(heartbeatInterval));

    const safeWrite = (data: string): boolean => {
      try {
        if (res.destroyed) return false;
        return res.write(data);
      } catch {
        return false;
      }
    };

    const safeEnd = () => {
      try {
        clearInterval(heartbeatInterval);
        if (!res.destroyed) res.end();
      } catch { /* ignore */ }
    };

    try {
      const { runAgentStream } = await import("../agentStream");
      const body = req.body || {};
      const messages = body.messages || [];
      // Enforce message array size limit (prevent abuse)
      if (messages.length > 200) {
        safeWrite(`data: ${JSON.stringify({ error: "Too many messages in conversation. Please start a new task." })}\n\n`);
        safeEnd();
        return;
      }
      const taskExternalId = body.taskExternalId as string | undefined;
      const mode = (body.mode === "speed" ? "speed" : body.mode === "max" ? "max" : body.mode === "limitless" ? "limitless" : "quality") as "speed" | "quality" | "max" | "limitless";
      console.log("[Stream] Messages count:", messages.length, "taskExternalId:", taskExternalId, "mode:", mode);

      // Resolve system prompt: per-task > global preferences > default
      let resolvedSystemPrompt: string | null = null;
      let memoryContext: string | undefined;
      try {
        const { sdk: sdkInstance } = await import("./sdk");
        const user = await sdkInstance.authenticateRequest(req).catch(() => null);
        if (user) {
          if (taskExternalId) {
            const { getTaskByExternalId } = await import("../db");
            const task = await getTaskByExternalId(taskExternalId);
            if (task?.systemPrompt) resolvedSystemPrompt = task.systemPrompt;
          }
          if (!resolvedSystemPrompt) {
            const { getUserPreferences } = await import("../db");
            const prefs = await getUserPreferences(user.id);
            if (prefs?.systemPrompt) resolvedSystemPrompt = prefs.systemPrompt as string;
          }
          // Check if user has disabled cross-session memory
          let memoryEnabled = true; // Default: ON (Manus-aligned)
          try {
            const { getUserPreferences: gup } = await import("../db");
            const memPrefs = await gup(user.id);
            if (memPrefs?.generalSettings && typeof memPrefs.generalSettings === "object") {
              const gs = memPrefs.generalSettings as Record<string, unknown>;
              if (gs.memoryEnabled === false) memoryEnabled = false;
            }
          } catch { /* default to enabled */ }

          // Load cross-session memory with strict relevance filtering (skip if disabled)
          if (!memoryEnabled) {
            console.log("[Stream] Memory disabled by user preference — skipping injection");
          }
          try {
            if (!memoryEnabled) throw new Error("skip"); // Skip to catch block
            const { getUserMemories } = await import("../db");
            // Read per-user memory tuning preferences (halfLifeDays)
            let userHalfLifeDays = 14; // default
            try {
              const { getUserPreferences: gupMem } = await import("../db");
              const memTunePrefs = await gupMem(user.id);
              if (memTunePrefs?.generalSettings && typeof memTunePrefs.generalSettings === "object") {
                const gs = memTunePrefs.generalSettings as Record<string, unknown>;
                if (typeof gs.memoryDecayHalfLife === "number" && gs.memoryDecayHalfLife >= 3 && gs.memoryDecayHalfLife <= 90) {
                  userHalfLifeDays = gs.memoryDecayHalfLife;
                }
              }
            } catch { /* use default */ }
            const memories = await getUserMemories(user.id, 20, false, userHalfLifeDays);
            if (memories.length > 0) {
              // Extract the first user message to determine current task topic
              const firstUserMsg = messages.find((m: any) => m.role === "user");
              const taskText = firstUserMsg
                ? (typeof firstUserMsg.content === "string" ? firstUserMsg.content : "").toLowerCase()
                : "";
              
              // Detect short/vague queries — if the user's message is very short,
              // only inject identity memories, never topic-specific ones.
              // This prevents "help refine this build?" from pulling in specific build details.
              const isVagueQuery = taskText.length < 80;
              
              // Stop words that are too common to be meaningful for relevance matching
              const STOP_WORDS = new Set([
                "help", "make", "create", "build", "show", "give", "find", "tell",
                "want", "need", "like", "good", "best", "that", "this", "with",
                "from", "have", "been", "will", "would", "could", "should",
                "about", "what", "when", "where", "which", "there", "their",
                "them", "then", "than", "some", "more", "also", "just",
                "into", "over", "after", "before", "between", "under",
                "level", "step", "guide", "setup", "using", "following",
                "refine", "generate", "update", "change", "modify",
              ]);
              
              // Filter memories by relevance using a 3-tier system:
              // Tier 1 (STRICT_IDENTITY_KEYS): Always included — core user identity
              // Tier 2 (SOFT_PREFERENCE_KEYS): Included for non-vague queries with 1+ keyword match
              // Tier 3 (Topic memories): Included only for substantive queries with 2+ keyword matches
              const STRICT_IDENTITY_KEYS = [
                "name", "identity", "location", "timezone", "language",
                "role", "profession", "job",
              ];
              const SOFT_PREFERENCE_KEYS = [
                "preference", "communication", "style", "expertise",
                "stack", "framework",
              ];
              const relevantMemories = memories.filter((m: any) => {
                const keyLower = (m.key || "").toLowerCase();
                const valueLower = (m.value || "").toLowerCase();
                // Tier 1: Always include strict identity memories (name, location, role, etc.)
                if (STRICT_IDENTITY_KEYS.some(k => keyLower.includes(k))) return true;
                // Tier 2: Soft preference memories (communication style, tech stack, etc.)
                // For vague queries: only include if the key itself is purely about preferences
                // (e.g., "Communication preference" yes, "ESO PvP preference" no)
                if (SOFT_PREFERENCE_KEYS.some(k => keyLower.includes(k))) {
                  // Check if the key is purely preference-related (no topic-specific words)
                  const keyWords = keyLower.split(/\W+/).filter((w: string) => w.length >= 4);
                  const topicWords = keyWords.filter((w: string) =>
                    !SOFT_PREFERENCE_KEYS.some(pk => w.includes(pk)) &&
                    !STRICT_IDENTITY_KEYS.some(ik => w.includes(ik)) &&
                    !["user", "general", "default", "personal", "overall"].includes(w)
                  );
                  // If no topic-specific words in key, it's a pure preference — always include
                  if (topicWords.length === 0) return true;
                  // If topic-specific words exist (e.g., "ESO PvP preference"), treat as Tier 3
                  // but with relaxed threshold: 1+ keyword match instead of 2+
                  if (!isVagueQuery && taskText.length > 0) {
                    const memWords = (keyLower + " " + valueLower)
                      .split(/\W+/)
                      .filter((w: string) => w.length >= 5 && !STOP_WORDS.has(w));
                    const matchCount = memWords.filter((w: string) => taskText.includes(w)).length;
                    return matchCount >= 1; // Relaxed: 1+ match for topic-tagged preferences
                  }
                  return false;
                }
                // Tier 3: Topic-specific memories — strict filtering
                // For vague queries, NEVER include topic-specific memories
                if (isVagueQuery) return false;
                // For substantive queries: require 2+ significant keyword matches
                // with min word length of 5 chars and stop word exclusion
                if (taskText.length > 0) {
                  const memWords = (keyLower + " " + valueLower)
                    .split(/\W+/)
                    .filter((w: string) => w.length >= 5 && !STOP_WORDS.has(w));
                  const matchCount = memWords.filter((w: string) => taskText.includes(w)).length;
                  return matchCount >= 2; // Require 2+ keyword matches
                }
                return false;
              });
              
              if (relevantMemories.length > 0) {
                memoryContext = relevantMemories.map((m: any) => `- **${m.key}**: ${m.value}`).join("\n");
                // Emit knowledge_recalled event so the client can show the badge
                try {
                  const knowledgeEvent = JSON.stringify({ knowledge_recalled: { count: relevantMemories.length, keys: relevantMemories.map((m: any) => m.key).slice(0, 5) } });
                  res.write(`data: ${knowledgeEvent}\n\n`);
                } catch { /* non-critical */ }
                // Touch lastAccessedAt for injected memories (memory decay/TTL)
                try {
                  const { touchMemoryAccess } = await import("../db");
                  const memoryIds = relevantMemories.map((m: any) => m.id).filter(Boolean);
                  if (memoryIds.length > 0) await touchMemoryAccess(memoryIds);
                } catch { /* non-critical */ }
              }
            }
          } catch { /* memory is optional */ }
        }
      } catch { /* proceed with default */ }

      // Resolve server-side task ID for artifact persistence
      let taskServerId: number | null = null;
      if (taskExternalId) {
        try {
          const { getTaskByExternalId } = await import("../db");
          const taskRecord = await getTaskByExternalId(taskExternalId);
          if (taskRecord) taskServerId = taskRecord.id;
        } catch { /* ignore */ }
      }

      // Resolve userId for memory extraction
      let streamUserId: number | null = null;
      try {
        const { sdk: sdkInstance2 } = await import("./sdk");
        const streamUser = await sdkInstance2.authenticateRequest(req).catch(() => null);
        if (streamUser) streamUserId = streamUser.id;
      } catch { /* ignore */ }

      // Read autoTuneStrategies preference (default: true)
      let autoTuneStrategies = true;
      try {
        if (streamUserId) {
          const { getUserPreferences: gupAT } = await import("../db");
          const atPrefs = await gupAT(streamUserId);
          if (atPrefs?.generalSettings && typeof atPrefs.generalSettings === "object") {
            const gs = atPrefs.generalSettings as Record<string, unknown>;
            if (gs.autoTuneStrategies === false) autoTuneStrategies = false;
          }
        }
      } catch { /* default to enabled */ }

      // Run the agentic stream
      await runAgentStream({
        messages,
        taskExternalId,
        userId: streamUserId ?? undefined,
        resolvedSystemPrompt,
        safeWrite,
        safeEnd,
        mode,
        autoTuneStrategies,
        memoryContext,
        // Persist the final assistant response server-side so it survives client disconnects
        onComplete: async (content) => {
          if (!taskServerId || !content.trim()) return;
          try {
            const { addTaskMessage } = await import("../db");
            const { nanoid } = await import("nanoid");
            await addTaskMessage({
              taskId: taskServerId,
              externalId: `srv-${nanoid(12)}`,
              role: "assistant",
              content,
              actions: null,
            });
            console.log("[Stream] Assistant message persisted server-side for task", taskServerId);
          } catch (err) {
            console.error("[Stream] Failed to persist assistant message:", err);
          }
        },
        onArtifact: async (artifact) => {
          console.log("[Stream] Artifact produced:", artifact.type, artifact.label);
          if (taskServerId) {
            try {
              const { addWorkspaceArtifact } = await import("../db");
              await addWorkspaceArtifact({
                taskId: taskServerId,
                artifactType: artifact.type as any,
                label: artifact.label || null,
                content: artifact.content || null,
                url: artifact.url || null,
              });
              console.log("[Stream] Artifact persisted:", artifact.type);
            } catch (err) {
              console.error("[Stream] Failed to persist artifact:", err);
            }
          }
        },
      });

      // Fire-and-forget: extract memories from the completed conversation
      // Skip extraction if user has disabled memory persistence
      if (streamUserId && taskExternalId && messages.length >= 2) {
        // Check memoryEnabled preference before extracting
        const shouldExtract = await (async () => {
          try {
            const { getUserPreferences: gup2 } = await import("../db");
            const p = await gup2(streamUserId!);
            if (p?.generalSettings && typeof p.generalSettings === "object") {
              const gs = p.generalSettings as Record<string, unknown>;
              if (gs.memoryEnabled === false) {
                console.log("[Stream] Memory disabled — skipping extraction");
                return false;
              }
            }
          } catch { /* default to enabled */ }
          return true;
        })();
        if (shouldExtract) {
          import("../memoryExtractor").then(({ extractMemories }) => {
            extractMemories(
              streamUserId!,
              taskExternalId,
              messages.map((m: any) => ({ role: m.role, content: typeof m.content === "string" ? m.content : "[non-text]" }))
            ).catch(() => { /* fire-and-forget */ });
          }).catch(() => { /* ignore */ });
        }
      }
    } catch (err: any) {
      console.error("[Stream] Error:", err);
      // Map raw errors to user-friendly messages before sending to frontend
      const rawMsg = err.message || "Streaming failed";
      const status = err.status || err.statusCode || 0;
      let friendlyMsg = rawMsg;
      let retryable = false;
      if (status === 412 || rawMsg.includes("usage exhausted") || rawMsg.includes("usage_exhausted")) {
        friendlyMsg = "Your account credits have been exhausted. Please add more credits to continue.";
      } else if (status === 402 || rawMsg.includes("payment required")) {
        friendlyMsg = "A payment issue is preventing the request. Please check your billing settings.";
      } else if (status >= 500) {
        friendlyMsg = "The AI service encountered a temporary error. Please try again.";
        retryable = true;
      } else if (rawMsg.includes("LLM invoke failed")) {
        friendlyMsg = "The AI service was unable to process your request. Please try again.";
        retryable = true;
      }
      safeWrite(`data: ${JSON.stringify({ error: friendlyMsg, retryable })}\n\n`);
      safeEnd();
    }
  });

  // Webapp preview proxy — forwards /api/webapp-preview/* to the agent's dev server
  // Includes retry logic for when the dev server is still starting up
  app.use("/api/webapp-preview", async (req, res) => {
    try {
      const { getActiveProject } = await import("../agentTools");
      const { port } = getActiveProject();
      if (!port) {
        return res.status(503).json({ error: "No active webapp project. The agent hasn't created a webapp yet." });
      }

      const http = await import("http");
      const maxRetries = 3;
      let lastError = "";

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const success = await new Promise<boolean>((resolve) => {
          const targetUrl = `http://127.0.0.1:${port}${req.url}`;
          const proxyReq = http.request(
            targetUrl,
            {
              method: req.method,
              headers: { ...req.headers, host: `127.0.0.1:${port}` },
              timeout: 5000,
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
              proxyRes.pipe(res, { end: true });
              resolve(true);
            }
          );
          proxyReq.on("error", (err) => {
            lastError = err.message;
            resolve(false);
          });
          proxyReq.on("timeout", () => {
            proxyReq.destroy();
            lastError = "Connection timed out";
            resolve(false);
          });
          if (req.method !== "GET" && req.method !== "HEAD") {
            req.pipe(proxyReq, { end: true });
          } else {
            proxyReq.end();
          }
        });

        if (success) return;

        // Wait before retry (only if not last attempt)
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      // All retries failed
      if (!res.headersSent) {
        res.status(502).json({
          error: `Webapp dev server on port ${port} is not reachable after ${maxRetries} attempts. ${lastError}`,
          hint: "The dev server may still be starting. Try refreshing in a few seconds.",
        });
      }
    } catch (err: any) {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Initialize WebSocket relay for desktop companion devices
  import("../deviceRelay").then(({ initDeviceRelay }) => {
    initDeviceRelay(server);
  }).catch((err) => {
    console.error("[Server] Failed to init device relay:", err);
  });

  // §L.35 Voice streaming WebSocket (STT → LLM → TTS pipeline)
  import("../voiceStream").then(({ initVoiceStream }) => {
    initVoiceStream(server);
  }).catch((err) => {
    console.error("[Server] Failed to init voice stream:", err);
  });

  // Real-time analytics WebSocket relay
  import("../analyticsRelay").then(({ initAnalyticsRelay }) => {
    initAnalyticsRelay(server);
  }).catch((err) => {
    console.error("[Server] Failed to init analytics relay:", err);
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Start the background task scheduler
    import("../scheduler").then(({ startScheduler }) => {
      startScheduler();
    }).catch((err) => {
      console.error("[Server] Failed to start scheduler:", err);
    });
  });
}

startServer().catch(console.error);
