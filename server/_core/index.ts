import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
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

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  // Skip JSON parsing for /api/upload (binary) to allow raw body reading
  app.use((req, res, next) => {
    if (req.path === "/api/upload") return next();
    express.json({ limit: "50mb" })(req, res, next);
  });
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // ── File upload endpoint ──
  app.post("/api/upload", async (req, res) => {
    try {
      const { storagePut } = await import("../storage");
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = Buffer.concat(chunks);
          const contentType = req.headers["content-type"] || "application/octet-stream";
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

  // ── SSE streaming endpoint for LLM ──
  // Authenticates user, resolves system prompt (per-task > global > default),
  // calls LLM, and delivers response in real sentence-boundary chunks.
  app.post("/api/stream", async (req, res) => {
    console.log("[Stream] Request received");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Track if the underlying socket is truly destroyed (not just 'close' event)
    let socketDestroyed = false;
    res.on("close", () => { socketDestroyed = res.writableFinished || res.destroyed; });

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
      const { invokeLLM } = await import("./llm").catch((e) => { console.error("[Stream] LLM import failed:", e); return { invokeLLM: null }; });
      const body = req.body || {};
      let messages = body.messages || [];
      const taskExternalId = body.taskExternalId as string | undefined;
      console.log("[Stream] Messages count:", messages.length, "taskExternalId:", taskExternalId);

      if (!invokeLLM) {
        safeWrite(`data: ${JSON.stringify({ error: "LLM service is not available. Please check server configuration." })}\n\n`);
        safeEnd();
        return;
      }

      // Resolve system prompt: per-task > global preferences > default
      let resolvedSystemPrompt: string | null = null;
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
        }
      } catch { /* proceed with default */ }

      if (resolvedSystemPrompt && messages.length > 0 && messages[0].role === "system") {
        messages[0].content = resolvedSystemPrompt;
      } else if (resolvedSystemPrompt) {
        messages = [{ role: "system", content: resolvedSystemPrompt }, ...messages];
      }

      console.log("[Stream] Calling invokeLLM with", messages.length, "messages...");
      const response = await invokeLLM({ messages });
      console.log("[Stream] invokeLLM returned, choices:", response.choices?.length);
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "I couldn't generate a response.";
      console.log("[Stream] Content length:", content.length);

      // Deliver content in sentence-boundary chunks for natural streaming feel
      const sentencePattern = /([^.!?\n]+[.!?\n]+\s*)/g;
      const chunks = content.match(sentencePattern) || [content];
      const captured = chunks.join("");
      if (captured.length < content.length) {
        chunks.push(content.slice(captured.length));
      }

      for (const chunk of chunks) {
        if (!safeWrite(`data: ${JSON.stringify({ delta: chunk })}\n\n`)) break;
      }
      safeWrite(`data: ${JSON.stringify({ done: true, content })}\n\n`);
      safeEnd();
      console.log("[Stream] Response complete");
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

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
