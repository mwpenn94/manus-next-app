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
  app.use(express.json({ limit: "50mb" }));
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
  app.post("/api/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Track whether the client disconnected (abort)
    let aborted = false;
    req.on("close", () => { aborted = true; });

    try {
      const { invokeLLM } = await import("./llm").catch(() => ({ invokeLLM: null }));
      // Parse body from raw chunks since we set up raw body handling
      const bodyChunks: Buffer[] = [];
      await new Promise<void>((resolve) => {
        req.on("data", (c: Buffer) => bodyChunks.push(c));
        req.on("end", resolve);
      });
      const body = JSON.parse(Buffer.concat(bodyChunks).toString());
      const messages = body.messages || [];

      if (!invokeLLM) {
        res.write(`data: ${JSON.stringify({ error: "LLM service is not available. Please check server configuration." })}\n\n`);
        res.end();
        return;
      }

      const response = await invokeLLM({ messages });
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "I couldn't generate a response.";

      // Stream word-by-word for a natural feel
      const words = content.split(" ");
      for (let i = 0; i < words.length; i++) {
        if (aborted) return;
        const delta = words[i] + (i < words.length - 1 ? " " : "");
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        await new Promise(r => setTimeout(r, 25 + Math.random() * 25));
      }
      if (aborted) return;
      res.write(`data: ${JSON.stringify({ done: true, content })}\n\n`);
      res.end();
    } catch (err: any) {
      if (aborted) return;
      console.error("[Stream] Error:", err);
      res.write(`data: ${JSON.stringify({ error: err.message || "Streaming failed" })}\n\n`);
      res.end();
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
