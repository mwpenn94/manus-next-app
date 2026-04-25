import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

/**
 * Extract share token from a URL path that starts with /share/ or /shared/
 * Returns null if the path doesn't match.
 */
function extractShareToken(url: string): string | null {
  const match = url.match(/^\/share[d]?\/([^?/]+)/);
  return match ? match[1] : null;
}

/**
 * Inject OG/social meta tags into the HTML template for share pages.
 * Works for both /share/:token and /shared/:token (legacy) routes.
 */
async function injectShareMeta(template: string, token: string): Promise<string> {
  try {
    const { getTaskShareByToken } = await import("../db");
    const share = await getTaskShareByToken(token);
    if (share) {
      const title = `Shared Task — Manus Next`;
      const desc = `View a shared AI agent task on Manus Next.`;
      return template
        .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
        .replace(/content="Manus — Your Autonomous AI Agent"/, `content="${title}"`)
        .replace(/content="An open-source autonomous AI agent[^"]*"/, `content="${desc}"`);
    }
  } catch { /* fallback to default meta */ }
  return template;
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      // Inject dynamic meta tags for shared task pages (/share/ and /shared/)
      const shareToken = extractShareToken(url);
      if (shareToken) {
        template = await injectShareMeta(template, shareToken);
      }

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // For shared pages, inject dynamic meta tags
  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    const shareToken = extractShareToken(url);
    if (shareToken) {
      try {
        const { getTaskShareByToken } = await import("../db");
        const share = await getTaskShareByToken(shareToken);
        if (share) {
          let html = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
          html = await injectShareMeta(html, shareToken);
          return res.status(200).set({ "Content-Type": "text/html" }).end(html);
        }
      } catch { /* fallback */ }
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
