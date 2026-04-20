import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
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
  return `<!DOCTYPE html><html><body>
<p>Connecting...</p>
<script>
  (function() {
    var connectorId = ${JSON.stringify(connectorId)};
    var code = ${JSON.stringify(code)};
    var state = ${JSON.stringify(state || "")};
    if (window.opener) {
      window.opener.postMessage({ type: "connector-oauth-callback", connectorId: connectorId, code: code }, "*");
      setTimeout(function() { window.close(); }, 500);
    } else {
      window.location.href = "/connectors?code=" + encodeURIComponent(code) + "&state=" + encodeURIComponent(state);
    }
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
    contentSecurityPolicy: false, // CSP handled by Vite in dev, custom in prod
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
    max: 200, // 200 requests per minute
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
  app.use("/api/stream", streamLimiter);
  app.use("/api/upload", uploadLimiter);
  app.use("/api/tts", ttsLimiter);
  app.use("/api/trpc", apiLimiter);

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
    if (req.path === "/api/upload" || req.path === "/api/stripe/webhook") return next();
    express.json({ limit: "50mb" })(req, res, next);
  });
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

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

      // Decode state to extract connectorId and origin
      let state: { connectorId: string; userId: number; origin: string };
      try {
        state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
      } catch {
        return res.status(400).send(buildOAuthCallbackHtml(null, null, "Invalid state parameter"));
      }

      // Send HTML that posts the code back to the opener window (popup flow)
      // or redirects to /connectors with query params (same-window flow)
      res.send(buildOAuthCallbackHtml(state.connectorId, code, null, stateRaw));
    } catch (err: any) {
      console.error("[Connector OAuth Callback] Error:", err);
      res.status(500).send(buildOAuthCallbackHtml(null, null, err.message || "OAuth callback failed"));
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
          const fileName = (req.headers["x-file-name"] as string) || `upload-${Date.now()}`;
          const taskId = (req.headers["x-task-id"] as string) || "unknown";
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
  app.get("/api/tts/voices", async (_req, res) => {
    try {
      const { getAvailableVoices, DEFAULT_VOICES } = await import("../tts");
      const voices = await getAvailableVoices();
      res.json({ voices, defaults: DEFAULT_VOICES });
    } catch (err: any) {
      console.error("[TTS Voices] Error:", err);
      res.status(500).json({ error: err.message || "Failed to list voices" });
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
      const mode = (body.mode === "speed" ? "speed" : body.mode === "max" ? "max" : "quality") as "speed" | "quality" | "max";
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
          // Load cross-session memory
          try {
            const { getUserMemories } = await import("../db");
            const memories = await getUserMemories(user.id, 20);
            if (memories.length > 0) {
              memoryContext = memories.map(m => `- **${m.key}**: ${m.value}`).join("\n");
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

      // Run the agentic stream
      await runAgentStream({
        messages,
        taskExternalId,
        resolvedSystemPrompt,
        safeWrite,
        safeEnd,
        mode,
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
      if (streamUserId && taskExternalId && messages.length >= 2) {
        import("../memoryExtractor").then(({ extractMemories }) => {
          extractMemories(
            streamUserId!,
            taskExternalId,
            messages.map((m: any) => ({ role: m.role, content: typeof m.content === "string" ? m.content : "[non-text]" }))
          ).catch(() => { /* fire-and-forget */ });
        }).catch(() => { /* ignore */ });
      }
    } catch (err: any) {
      console.error("[Stream] Error:", err);
      safeWrite(`data: ${JSON.stringify({ error: err.message || "Streaming failed" })}\n\n`);
      safeEnd();
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
