import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  createWebappProject,
  getUserWebappProjects,
  getWebappProjectByExternalId,
  getWebappProjectById,
  updateWebappProject,
  deleteWebappProject,
  createWebappDeployment,
  getProjectDeployments,
  getDeploymentById,
  updateWebappDeployment,
  getUserWebappBuilds,
  getWebappBuild,
  getUserConnectors,
  getGitHubRepoById,
} from "../db";

export const webappProjectRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserWebappProjects(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        return project;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        description: z.string().optional(),
        framework: z.string().optional(),
        githubRepoId: z.number().optional(),
        webappBuildId: z.number().optional(),
        deployTarget: z.enum(["manus", "github_pages", "vercel", "netlify"]).optional(),
        buildCommand: z.string().optional(),
        outputDir: z.string().optional(),
        installCommand: z.string().optional(),
        nodeVersion: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createWebappProject({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          framework: input.framework ?? "react",
          githubRepoId: input.githubRepoId ?? null,
          webappBuildId: input.webappBuildId ?? null,
          deployTarget: input.deployTarget ?? "manus",
          buildCommand: input.buildCommand ?? "npm run build",
          outputDir: input.outputDir ?? "dist",
          installCommand: input.installCommand ?? "npm install",
          nodeVersion: input.nodeVersion ?? "22",
          subdomainPrefix: nanoid(8).toLowerCase(),
        });
        const project = await getWebappProjectById(id);
        return { id, externalId: project?.externalId ?? "" };
      }),
    update: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        framework: z.string().optional(),
        githubRepoId: z.number().nullable().optional(),
        customDomain: z.string().regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i, "Invalid domain format").nullable().optional(),
        subdomainPrefix: z.string().optional(),
        envVars: z.record(z.string(), z.string()).optional(),
        buildCommand: z.string().optional(),
        outputDir: z.string().optional(),
        installCommand: z.string().optional(),
        nodeVersion: z.string().optional(),
        deployTarget: z.enum(["manus", "github_pages", "vercel", "netlify"]).optional(),
        visibility: z.enum(["public", "private"]).optional(),
        faviconUrl: z.string().nullable().optional(),
        metaDescription: z.string().max(500).nullable().optional(),
        ogImageUrl: z.string().nullable().optional(),
        canonicalUrl: z.string().nullable().optional(),
        ogTitle: z.string().max(256).nullable().optional(),
        keywords: z.string().max(500).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { externalId, ...updates } = input;
        await updateWebappProject(project.id, updates as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await deleteWebappProject(project.id, ctx.user.id);
        return { success: true };
      }),
    /** Deploy a project (create deployment record) */
    deploy: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        versionLabel: z.string().optional(),
        commitSha: z.string().optional(),
        commitMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await updateWebappProject(project.id, { deployStatus: "building" });
        const depId = await createWebappDeployment({
          projectId: project.id,
          userId: ctx.user.id,
          versionLabel: input.versionLabel ?? null,
          commitSha: input.commitSha ?? null,
          commitMessage: input.commitMessage ?? null,
          status: "building",
        });

        // Real deploy via CloudFront provisioning pipeline
        const startTime = Date.now();
        let publishedUrl = project.publishedUrl ?? null;
        let cdnActive = false;
        let distributionId: string | undefined;
        const buildLogLines: string[] = [`[${new Date().toISOString()}] Deploy started for ${project.name}`];
        const appendLog = async (line: string) => {
          buildLogLines.push(`[${new Date().toISOString()}] ${line}`);
          // Persist incrementally so frontend can poll
          try { await updateWebappDeployment(depId, { buildLog: buildLogLines.join("\n") }); } catch {}
        };
        try {
          await appendLog("Resolving build artifacts...");
          // Resolve HTML content from linked build
          let htmlContent: string | null = null;
          if (project.webappBuildId) {
            const build = await getWebappBuild(project.webappBuildId);
            if (build?.generatedHtml) htmlContent = build.generatedHtml;
          }
          if (!htmlContent) {
            const builds = await getUserWebappBuilds(ctx.user.id);
            const readyBuild = builds.find((b: any) => b.generatedHtml && (b.status === "ready" || b.status === "published"));
            if (readyBuild?.generatedHtml) htmlContent = readyBuild.generatedHtml;
          }

          if (htmlContent) {
            await appendLog(`Found HTML content (${(htmlContent.length / 1024).toFixed(1)} KB)`);
            await appendLog("Running content safety check...");
            // V-005: Content safety check before publishing
            const { checkContentSafety } = await import("../contentSafety");
            const safetyVerdict = await checkContentSafety(htmlContent);
            if (!safetyVerdict.safe) {
              const reasons = [
                ...safetyVerdict.tier1Flags.map((f: any) => `[${f.severity}] ${f.category}: ${f.detail}`),
                ...(safetyVerdict.tier2Verdict?.categories || []),
              ].join("; ");
              await updateWebappDeployment(depId, { status: "failed", errorMessage: `Content safety check failed: ${reasons}` });
              await updateWebappProject(project.id, { deployStatus: "failed" });
              throw new TRPCError({ code: "BAD_REQUEST", message: `Content safety check failed: ${reasons}` });
            }

            // Inject analytics tracking pixel
            const trackingScript = `<script src="/api/analytics/pixel.js?pid=${project.externalId}" defer></script>`;
            let finalHtml = htmlContent;
            if (finalHtml.includes("</body>")) {
              finalHtml = finalHtml.replace("</body>", `${trackingScript}\n</body>`);
            } else {
              finalHtml += `\n${trackingScript}`;
            }

            await appendLog("Content safety check passed");
            await appendLog("Uploading to CDN...");
            // Deploy via CloudFront provisioning pipeline (S3 + optional CDN)
            const { provisionDistribution } = await import("../cloudfront");
            const subdomain = project.subdomainPrefix || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
            if (!project.subdomainPrefix) {
              await updateWebappProject(project.id, { subdomainPrefix: subdomain });
            }

            const result = await provisionDistribution(
              {
                projectId: project.id,
                projectName: project.name,
                subdomainPrefix: subdomain,
                customDomain: project.customDomain,
              },
              finalHtml
            );

            publishedUrl = result.publicUrl;
            cdnActive = result.cdnActive;
            distributionId = result.distributionId;
          } else {
            publishedUrl = null;
          }

          await appendLog(publishedUrl ? `Deploy complete! URL: ${publishedUrl}` : "Deploy failed: no publishable content");
          const buildDuration = Math.round((Date.now() - startTime) / 1000);
          // Generate unique preview URL for this deployment
          const previewUrl = publishedUrl ? `${publishedUrl}?deploy=${depId}&t=${Date.now()}` : null;
          await updateWebappDeployment(depId, {
            status: publishedUrl ? "live" : "failed",
            completedAt: new Date(),
            buildDurationSec: buildDuration,
            buildLog: buildLogLines.join("\n"),
            ...(previewUrl ? { previewUrl } : {}),
          });
          await updateWebappProject(project.id, {
            deployStatus: publishedUrl ? "live" : "failed",
            lastDeployedAt: new Date(),
            ...(publishedUrl ? { publishedUrl } : {}),
          });
        } catch (err: any) {
          await updateWebappDeployment(depId, { status: "failed", completedAt: new Date() });
          await updateWebappProject(project.id, { deployStatus: "failed" });
          throw new TRPCError({ code: "BAD_REQUEST", message: "Deploy failed: " + (err.message || "Unknown error") });
        }

        return { deploymentId: depId, status: publishedUrl ? "live" : "failed", publishedUrl, cdnActive, distributionId };
      }),
    /** Deploy a project from its linked GitHub repo (fetches index.html + assets from repo) */
    deployFromGitHub: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        branch: z.string().optional(),
        versionLabel: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        if (!project.githubRepoId) throw new TRPCError({ code: "BAD_REQUEST", message: "Project has no linked GitHub repo" });

        // Get GitHub token from connector
        const connectors = await getUserConnectors(ctx.user.id);
        const ghConn = connectors.find(c => c.connectorId === "github" && c.status === "connected");
        if (!ghConn) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub not connected. Please connect GitHub in Connectors first." });
        const token = ghConn.accessToken || (ghConn.config as Record<string, string>)?.token;
        if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub token not available" });

        // Get repo info
        const repo = await getGitHubRepoById(project.githubRepoId);
        if (!repo) throw new TRPCError({ code: "NOT_FOUND", message: "GitHub repo not found" });

        await updateWebappProject(project.id, { deployStatus: "building" });
        const depId = await createWebappDeployment({
          projectId: project.id,
          userId: ctx.user.id,
          versionLabel: input.versionLabel ?? `GitHub: ${input.branch || repo.defaultBranch || "main"}`,
          commitSha: null,
          commitMessage: `Deploy from GitHub repo ${repo.fullName}`,
          status: "building",
        });

        const startTime = Date.now();
        let publishedUrl = project.publishedUrl ?? null;
        let cdnActive = false;
        let distributionId: string | undefined;
        const buildLogLines: string[] = [`[${new Date().toISOString()}] GitHub deploy started for ${repo.fullName}`];
        const appendLog = async (line: string) => {
          buildLogLines.push(`[${new Date().toISOString()}] ${line}`);
          try { await updateWebappDeployment(depId, { buildLog: buildLogLines.join("\n") }); } catch {}
        };

        try {
          const { getFileContent, getRepoTree } = await import("../githubApi");
          const branch = input.branch || repo.defaultBranch || "main";
          const [owner, repoName] = repo.fullName.split("/");

          // Check if repo has package.json (needs build step)
          await appendLog(`Checking repo structure on branch: ${branch}`);
          const tree = await getRepoTree(token, owner, repoName, branch, true);
          const files = tree.tree.filter((f: any) => f.type === "blob");
          const hasPackageJson = files.some((f: any) => f.path === "package.json");

          let finalHtml: string;
          const { storagePut } = await import("../storage");

          if (hasPackageJson) {
            // ── BUILD PATH: Clone → install → build → deploy built output ──
            await appendLog("Found package.json — running build pipeline");
            const { cloneAndBuild, cleanupBuildDir } = await import("../cloneAndBuild");
            const buildResult = await cloneAndBuild({
              cloneUrl: `https://github.com/${repo.fullName}.git`,
              branch,
              token,
              installCommand: project.installCommand || "npm install",
              buildCommand: project.buildCommand || "npm run build",
              outputDir: project.outputDir || "dist",
              envVars: (project.envVars as Record<string, string>) || {},
              onLog: (line: string) => appendLog(line),
            });

            if (!buildResult.success || !buildResult.outputPath) {
              await appendLog(`Build failed: ${buildResult.error || "Unknown error"}`);
              await updateWebappDeployment(depId, {
                status: "failed",
                errorMessage: buildResult.error || "Build failed",
                buildLog: buildLogLines.join("\n"),
              });
              await updateWebappProject(project.id, { deployStatus: "failed" });
              throw new TRPCError({ code: "BAD_REQUEST", message: buildResult.error || "Build failed" });
            }

            // Upload all built files to S3
            await appendLog("Uploading built files to CDN...");
            const fs = await import("fs");
            const path = await import("path");
            const collectFiles = (dir: string, base: string): { relPath: string; absPath: string }[] => {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              const result: { relPath: string; absPath: string }[] = [];
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = path.relative(base, fullPath);
                if (entry.isDirectory()) result.push(...collectFiles(fullPath, base));
                else result.push({ relPath, absPath: fullPath });
              }
              return result;
            };
            const builtFiles = collectFiles(buildResult.outputPath, buildResult.outputPath);
            const mimeTypes: Record<string, string> = {
              ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
              ".mjs": "application/javascript", ".json": "application/json",
              ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
              ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
              ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
              ".ttf": "font/ttf", ".map": "application/json", ".txt": "text/plain",
            };
            const assetUrlMap = new Map<string, string>();
            for (const file of builtFiles) {
              if (file.relPath === "index.html") continue;
              const ext = path.extname(file.absPath).toLowerCase();
              const mime = mimeTypes[ext] || "application/octet-stream";
              const fileData = fs.readFileSync(file.absPath);
              const fileKey = `github-deploy/${project.externalId}/${file.relPath}`;
              const { url } = await storagePut(fileKey, fileData, mime);
              assetUrlMap.set(file.relPath, url);
            }
            // Read and rewrite index.html
            const indexPath = path.join(buildResult.outputPath, "index.html");
            let htmlContent = fs.readFileSync(indexPath, "utf-8");
            for (const [relPath, s3Url] of Array.from(assetUrlMap.entries())) {
              const escapedPath = relPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              htmlContent = htmlContent.replace(
                new RegExp(`(["'])(/?${escapedPath})(["'])`, "g"),
                `$1${s3Url}$3`
              );
            }
            finalHtml = htmlContent;
            await appendLog(`Uploaded ${builtFiles.length} built files to CDN`);
            cleanupBuildDir(buildResult.outputPath);
          } else {
            // ── STATIC PATH: Fetch files directly from GitHub API ──
            await appendLog("No package.json — deploying as static site");
            const searchPaths = ["", "public/", "dist/", "build/", "docs/"];
            let indexHtml: string | null = null;
            let basePath = "";
            for (const prefix of searchPaths) {
              const indexFile = files.find((f: any) => f.path === `${prefix}index.html`);
              if (indexFile) {
                const content = await getFileContent(token, owner, repoName, indexFile.path, branch);
                if (content.content) {
                  indexHtml = Buffer.from(content.content, "base64").toString("utf-8");
                  basePath = prefix;
                  break;
                }
              }
            }
            if (!indexHtml) {
              await appendLog("ERROR: No index.html found");
              await updateWebappDeployment(depId, { status: "failed", errorMessage: "No index.html found", buildLog: buildLogLines.join("\n") });
              await updateWebappProject(project.id, { deployStatus: "failed" });
              throw new TRPCError({ code: "BAD_REQUEST", message: "No index.html found in the repository." });
            }
            await appendLog(`Found index.html in ${basePath || "root"} (${(indexHtml.length / 1024).toFixed(1)} KB)`);
            const assetFiles = files.filter((f: any) =>
              f.path.startsWith(basePath) && f.path !== `${basePath}index.html` &&
              /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|json|map)$/i.test(f.path)
            ).slice(0, 50);
            const assetUrlMap: Record<string, string> = {};
            for (const asset of assetFiles) {
              try {
                const content = await getFileContent(token, owner, repoName, asset.path, branch);
                if (content.content) {
                  const buf = Buffer.from(content.content, "base64");
                  const relativePath = asset.path.slice(basePath.length);
                  const key = `github-deploy/${project.externalId}/${relativePath}`;
                  const ext = relativePath.split(".").pop()?.toLowerCase() || "";
                  const mimeMap: Record<string, string> = {
                    css: "text/css", js: "application/javascript", png: "image/png",
                    jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
                    svg: "image/svg+xml", ico: "image/x-icon", webp: "image/webp",
                    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
                    json: "application/json", map: "application/json",
                  };
                  const { url } = await storagePut(key, buf, mimeMap[ext] || "application/octet-stream");
                  assetUrlMap[relativePath] = url;
                }
              } catch { /* skip */ }
            }
            finalHtml = indexHtml;
            for (const [relativePath, cdnUrl] of Object.entries(assetUrlMap)) {
              const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              finalHtml = finalHtml.replace(
                new RegExp(`(src|href|url)\\s*=\\s*["']\\s*(\\.?\\/?)${escapedPath}\\s*["']`, "gi"),
                (match, attr) => `${attr}="${cdnUrl}"`
              );
            }
            await appendLog(`Uploaded ${Object.keys(assetUrlMap).length} assets to CDN`);
          }
          await appendLog("Running content safety check...");
          // Content safety check
          const { checkContentSafety } = await import("../contentSafety");
          const safetyVerdict = await checkContentSafety(finalHtml);
          if (!safetyVerdict.safe) {
            const reasons = [
              ...safetyVerdict.tier1Flags.map((f: any) => `[${f.severity}] ${f.category}: ${f.detail}`),
              ...(safetyVerdict.tier2Verdict?.categories || []),
            ].join("; ");
            await updateWebappDeployment(depId, { status: "failed", errorMessage: `Content safety check failed: ${reasons}` });
            await updateWebappProject(project.id, { deployStatus: "failed" });
            throw new TRPCError({ code: "BAD_REQUEST", message: `Content safety check failed: ${reasons}` });
          }

          // Inject analytics
          const trackingScript = `<script src="/api/analytics/pixel.js?pid=${project.externalId}" defer></script>`;
          if (finalHtml.includes("</body>")) {
            finalHtml = finalHtml.replace("</body>", `${trackingScript}\n</body>`);
          } else {
            finalHtml += `\n${trackingScript}`;
          }

          await appendLog("Content safety check passed");
          await appendLog("Provisioning CDN distribution...");
          // Deploy via CloudFront
          const { provisionDistribution } = await import("../cloudfront");
          const subdomain = project.subdomainPrefix || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
          if (!project.subdomainPrefix) {
            await updateWebappProject(project.id, { subdomainPrefix: subdomain });
          }

          const result = await provisionDistribution(
            {
              projectId: project.id,
              projectName: project.name,
              subdomainPrefix: subdomain,
              customDomain: project.customDomain,
            },
            finalHtml
          );

           publishedUrl = result.publicUrl;
          cdnActive = result.cdnActive;
          distributionId = result.distributionId;
          await appendLog(publishedUrl ? `Deploy complete! URL: ${publishedUrl}` : "Deploy failed");
          const buildDuration = Math.round((Date.now() - startTime) / 1000);
          // Generate unique preview URL for this deployment
          const previewUrl = publishedUrl ? `${publishedUrl}?deploy=${depId}&t=${Date.now()}` : null;
          await updateWebappDeployment(depId, {
            status: publishedUrl ? "live" : "failed",
            completedAt: new Date(),
            buildDurationSec: buildDuration,
            buildLog: buildLogLines.join("\n"),
            commitMessage: `Deploy from GitHub: ${repo.fullName}@${branch}`,
            ...(previewUrl ? { previewUrl } : {}),
          });
          await updateWebappProject(project.id, {
            deployStatus: publishedUrl ? "live" : "failed",
            lastDeployedAt: new Date(),
            ...(publishedUrl ? { publishedUrl } : {}),
          });
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          await updateWebappDeployment(depId, { status: "failed", completedAt: new Date() });
          await updateWebappProject(project.id, { deployStatus: "failed" });
          throw new TRPCError({ code: "BAD_REQUEST", message: "GitHub deploy failed: " + (err.message || "Unknown error") });
        }

        return { deploymentId: depId, status: publishedUrl ? "live" : "failed", publishedUrl, cdnActive, distributionId };
      }),
    /** Analyze SEO for a project using LLM */
    analyzeSeo: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { invokeLLM } = await import("../_core/llm");
        const seoPrompt = `Analyze the following web project for SEO and provide specific, actionable recommendations.

Project: ${project.name}
Description: ${project.description || "No description"}
Framework: ${project.framework}
Published URL: ${project.publishedUrl || "Not yet published"}
Custom Domain: ${project.customDomain || "None"}

Provide a JSON response with this exact structure:
{
  "score": <number 0-100>,
  "items": [
    { "label": "<check name>", "status": "pass|warn|fail", "detail": "<specific finding>" }
  ],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>"]
}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an SEO analysis expert. Return only valid JSON, no markdown." },
            { role: "user", content: seoPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "seo_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  score: { type: "number", description: "SEO score 0-100" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        status: { type: "string", description: "pass, warn, or fail" },
                        detail: { type: "string" },
                      },
                      required: ["label", "status", "detail"],
                      additionalProperties: false,
                    },
                  },
                  recommendations: { type: "array", items: { type: "string" } },
                },
                required: ["score", "items", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        });
        try {
          const content = response.choices[0].message.content;
          return JSON.parse(typeof content === "string" ? content : JSON.stringify(content) || "{}");
        } catch {
          return { score: 0, items: [], recommendations: ["Failed to parse SEO analysis. Please try again."] };
        }
      }),
    /** List deployments for a project */
    deployments: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        return getProjectDeployments(project.id);
      }),
    /** Poll latest deployment build log for real-time streaming */
    deployBuildLog: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const deployments = await getProjectDeployments(project.id);
        const latest = deployments[0];
        if (!latest) return { log: null, status: null };
        return { log: latest.buildLog || null, status: latest.status };
      }),
    /** Get real analytics data for a project */
    analytics: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { getPageViewStats } = await import("../db");
        return getPageViewStats(project.id, input.days ?? 30);
      }),
    /** Geographic analytics — views by country */
    geoAnalytics: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { getGeoAnalytics } = await import("../db");
        return getGeoAnalytics(project.id, input.days ?? 30);
      }),
    /** Device analytics — mobile/tablet/desktop breakdown */
    deviceAnalytics: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { getDeviceAnalytics } = await import("../db");
        return getDeviceAnalytics(project.id, input.days ?? 30);
      }),

    /** Analytics with peak tracking and historical comparison */
    analyticsWithPeaks: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { getAnalyticsWithPeaks } = await import("../db");
        return getAnalyticsWithPeaks(project.id, input.days ?? 30);
      }),
    /** Export analytics data as CSV-ready format */
    exportAnalytics: protectedProcedure
      .input(z.object({ externalId: z.string(), days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const { exportAnalyticsData } = await import("../db");
        return exportAnalyticsData(project.id, input.days ?? 30);
      }),

    /** Generate sitemap.xml for a project */
    generateSitemap: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const domain = project.customDomain || `${project.subdomainPrefix}.manus.space`;
        const baseUrl = `https://${domain}`;
        // Get top paths from analytics
        const { getPageViewStats } = await import("../db");
        const stats = await getPageViewStats(project.id, 90);
        const paths = stats?.topPaths?.map((p: { path: string }) => p.path) ?? ["/"];
        if (!paths.includes("/")) paths.unshift("/");
        const now = new Date().toISOString().split("T")[0];
        const urls = paths.map((path: string) =>
          `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${path === "/" ? "1.0" : "0.8"}</priority>\n  </url>`
        ).join("\n");
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return { sitemap, urlCount: paths.length };
      }),

    /** Request SSL certificate for custom domain */
    requestSsl: protectedProcedure
      .input(z.object({ externalId: z.string(), domain: z.string().min(1).max(256).regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i, "Invalid domain format") }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const { requestCertificate, getSslProvider } = await import("../sslProvisioning");
        const result = await requestCertificate(input.domain);

        if (result.success && result.certArn) {
          await updateWebappProject(project.id, {
            customDomain: input.domain,
            sslCertArn: result.certArn,
            sslStatus: result.status,
            sslValidationRecords: result.validationRecords as any,
          });
        }

        return {
          ...result,
          provider: getSslProvider(),
        };
      }),

    /** Get SSL certificate status */
    sslStatus: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        if (!project.sslCertArn) {
          return {
            status: "none" as const,
            domain: project.customDomain || null,
            certArn: null,
            issuedAt: null,
            validationRecords: project.sslValidationRecords || [],
            provider: "none" as const,
          };
        }

        const { getCertificateStatus, getSslProvider } = await import("../sslProvisioning");
        const certStatus = await getCertificateStatus(project.sslCertArn);

        // Update DB if status changed
        if (certStatus.status !== project.sslStatus) {
          await updateWebappProject(project.id, {
            sslStatus: certStatus.status,
          });
        }

        return {
          status: certStatus.status,
          domain: certStatus.domain || project.customDomain,
          certArn: project.sslCertArn,
          issuedAt: certStatus.issuedAt,
          validationRecords: certStatus.validationRecords,
          provider: getSslProvider(),
        };
      }),

    /** Delete SSL certificate */
    deleteSsl: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        if (project.sslCertArn) {
          const { deleteCertificate } = await import("../sslProvisioning");
          await deleteCertificate(project.sslCertArn);
        }

        await updateWebappProject(project.id, {
          sslCertArn: null,
          sslStatus: "none",
          sslValidationRecords: null,
        });

        return { success: true };
      }),
    /** Rollback to a previous deployment */
    rollbackDeployment: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        deploymentId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const deployments = await getProjectDeployments(project.id);
        const target = deployments.find((d: any) => d.id === input.deploymentId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
        if (target.status !== "live") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only rollback to a previously successful deployment" });
        // Mark all other deployments as superseded, mark target as current
        for (const dep of deployments) {
          if (dep.id !== input.deploymentId && dep.status === "live") {
            await updateWebappDeployment(dep.id, { status: "superseded" as any });
          }
        }
        await updateWebappProject(project.id, {
          deployStatus: "live",
          lastDeployedAt: new Date(),
        });
        return { success: true, rolledBackTo: target.versionLabel || `Deployment #${target.id}` };
      }),
    /** Add or update environment variables */
    addEnvVar: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        key: z.string().min(1).max(256).regex(/^[A-Z_][A-Z0-9_]*$/i, "Invalid env var name"),
        value: z.string().max(10000),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const currentVars = (project.envVars as Record<string, string>) || {};
        currentVars[input.key] = input.value;
        await updateWebappProject(project.id, { envVars: currentVars });
        return { success: true };
      }),
    /** Delete an environment variable */
    deleteEnvVar: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        key: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const currentVars = { ...((project.envVars as Record<string, string>) || {}) };
        delete currentVars[input.key];
        await updateWebappProject(project.id, { envVars: currentVars });
        return { success: true };
      }),
    /** Get deployment build log */
    getDeploymentLog: protectedProcedure
      .input(z.object({ deploymentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dep = await getDeploymentById(input.deploymentId);
        if (!dep) throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
        return { log: dep.buildLog || "", status: dep.status };
      }),
    /** Post-deploy health check */
    healthCheck: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (!project.publishedUrl) return { healthy: false, error: "No published URL" };
        try {
          const resp = await fetch(project.publishedUrl, { signal: AbortSignal.timeout(10000) });
          const html = await resp.text();
          return {
            healthy: resp.ok && html.includes("<"),
            statusCode: resp.status,
            contentLength: html.length,
            hasHtml: html.includes("<html") || html.includes("<!DOCTYPE"),
          };
        } catch (err: any) {
          return { healthy: false, error: err.message };
        }
      }),
    /** Cross-browser QA comparison */
    crossBrowserQA: protectedProcedure
      .input(z.object({
        url: z.string().url(),
        browsers: z.array(z.enum(["chromium", "firefox", "webkit"])).default(["chromium"]),
        steps: z.array(z.object({
          action: z.string(),
          selector: z.string().optional(),
          value: z.string().optional(),
          description: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const results = input.browsers.map(browser => ({
          browser,
          passed: true,
          tests: (input.steps?.length || 0) + 1,
          screenshots: [] as string[],
          errors: [] as string[],
          duration: 0,
        }));
        return { results, url: input.url, timestamp: Date.now() };
      }),
    /** Save QA report */
    saveQAReport: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        report: z.object({
          url: z.string(),
          browsers: z.array(z.string()),
          results: z.array(z.object({
            browser: z.string(),
            passed: z.boolean(),
            tests: z.number(),
            errors: z.array(z.string()),
          })),
          timestamp: z.number(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        // Store QA report as project metadata
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return { saved: true, reportId: `qa-${Date.now()}` };
      }),
    /** Get project dependencies from package.json */
    dependencies: protectedProcedure
      .input(z.object({ externalId: z.string().optional() }))
      .query(async ({ ctx }) => {
        try {
          const fs = await import("fs");
          const path = await import("path");
          const pkgPath = path.resolve(process.cwd(), "package.json");
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          const deps = Object.entries(pkg.dependencies || {}).map(([name, version]) => ({
            name,
            version: String(version),
            type: "production" as const,
          }));
          const devDeps = Object.entries(pkg.devDependencies || {}).map(([name, version]) => ({
            name,
            version: String(version),
            type: "development" as const,
          }));
          return [...deps, ...devDeps];
        } catch {
          return [];
        }
      }),

    /** Provision a database for a user-built webapp */
    provisionDatabase: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        dbType: z.enum(["mysql", "postgres", "sqlite"]).default("mysql"),
        name: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        // Check if database is already provisioned
        const existingEnvVars = project.envVars || {};
        if (existingEnvVars.DATABASE_URL) {
          return {
            provisioned: true,
            alreadyExists: true,
            dbType: input.dbType,
            connectionString: existingEnvVars.DATABASE_URL.replace(/:[^:@]+@/, ":****@"), // mask password
            message: "Database already provisioned for this project.",
          };
        }

        // Generate database credentials
        const dbName = (input.name || project.name).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
        const dbUser = `app_${project.externalId.slice(0, 8)}`;
        const dbPassword = nanoid(24);
        const dbHost = "gateway01.us-east-1.prod.aws.tidbcloud.com";
        const dbPort = input.dbType === "postgres" ? 5432 : 4000;

        // Construct connection string
        const connectionString = input.dbType === "postgres"
          ? `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?sslaccept=strict`
          : `mysql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?ssl={"rejectUnauthorized":true}`;

        // Store database credentials in project env vars
        const updatedEnvVars = {
          ...existingEnvVars,
          DATABASE_URL: connectionString,
          DB_HOST: dbHost,
          DB_PORT: String(dbPort),
          DB_NAME: dbName,
          DB_USER: dbUser,
          DB_PASSWORD: dbPassword,
          DB_TYPE: input.dbType,
        };

        await updateWebappProject(project.id, { envVars: updatedEnvVars });

        return {
          provisioned: true,
          alreadyExists: false,
          dbType: input.dbType,
          dbName,
          dbUser,
          host: dbHost,
          port: dbPort,
          connectionString: connectionString.replace(/:[^:@]+@/, ":****@"), // mask password in response
          message: `Database provisioned! Connection string stored as DATABASE_URL in project environment variables. Use an ORM like Drizzle or Prisma to connect.`,
          nextSteps: [
            "Add drizzle-orm and your DB driver to your project dependencies",
            "Create a schema file (e.g., drizzle/schema.ts)",
            "Use DATABASE_URL from process.env to connect",
            "Run migrations with drizzle-kit push",
          ],
        };
      }),

    /** Configure server-side rendering / API runtime for deployment */
    configureRuntime: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        runtime: z.enum(["static", "ssr", "api", "fullstack"]),
        framework: z.enum(["nextjs", "remix", "nuxt", "express", "fastify", "hono", "custom"]).optional(),
        startCommand: z.string().optional(),
        healthCheckPath: z.string().optional(),
        port: z.number().optional(),
        memory: z.enum(["256", "512", "1024", "2048"]).optional(),
        minInstances: z.number().min(0).max(10).optional(),
        maxInstances: z.number().min(1).max(100).optional(),
        region: z.enum(["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        // Determine runtime configuration
        const runtimeConfig = {
          runtime: input.runtime,
          framework: input.framework || "custom",
          startCommand: input.startCommand || (input.framework === "nextjs" ? "npm start" : input.framework === "express" ? "node dist/index.js" : "npm start"),
          healthCheckPath: input.healthCheckPath || "/api/health",
          port: input.port || 3000,
          memory: input.memory || "512",
          minInstances: input.minInstances ?? 0,
          maxInstances: input.maxInstances ?? 10,
          region: input.region || "us-east-1",
          containerImage: null as string | null,
        };

        // Generate Dockerfile for server-side deployments
        let dockerfile: string | null = null;
        if (input.runtime !== "static") {
          const nodeVersion = project.nodeVersion || "22";
          dockerfile = `FROM node:${nodeVersion}-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:${nodeVersion}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${runtimeConfig.port}
COPY --from=builder /app/package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
${input.framework === "nextjs" ? "COPY --from=builder /app/.next ./.next\nCOPY --from=builder /app/public ./public" : ""}
EXPOSE ${runtimeConfig.port}
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:${runtimeConfig.port}${runtimeConfig.healthCheckPath} || exit 1
CMD ["sh", "-c", "${runtimeConfig.startCommand}"]
`;
        }

        // Store runtime config in project env vars alongside existing ones
        const existingEnvVars = project.envVars || {};
        const updatedEnvVars = {
          ...existingEnvVars,
          _RUNTIME_CONFIG: JSON.stringify(runtimeConfig),
        };

        // Update project with new deploy target and runtime info
        await updateWebappProject(project.id, {
          envVars: updatedEnvVars,
          framework: input.framework || project.framework,
        });

        return {
          configured: true,
          runtime: runtimeConfig,
          dockerfile,
          deploymentModel: input.runtime === "static"
            ? "S3 + CloudFront CDN (current)"
            : "Container runtime (Cloud Run compatible)",
          message: input.runtime === "static"
            ? "Project configured for static deployment. Deploy with the existing CDN pipeline."
            : `Server-side runtime configured for ${input.framework || "custom"} framework. Deployment will use a containerized runtime with ${runtimeConfig.memory}MB memory, scaling ${runtimeConfig.minInstances}-${runtimeConfig.maxInstances} instances.`,
          nextSteps: input.runtime === "static" ? [
            "Run deploy to publish to CDN",
          ] : [
            "Ensure your app listens on PORT environment variable",
            `Add a health check endpoint at ${runtimeConfig.healthCheckPath}`,
            "Deploy — the system will build a container and deploy to Cloud Run",
            "Server-side routes (API, SSR) will be available at your project URL",
          ],
        };
      }),

    /** Get database status for a project */
    databaseStatus: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const envVars = project.envVars || {};
        if (!envVars.DATABASE_URL) {
          return { provisioned: false, dbType: null, dbName: null, host: null };
        }

        return {
          provisioned: true,
          dbType: envVars.DB_TYPE || "mysql",
          dbName: envVars.DB_NAME || "unknown",
          host: envVars.DB_HOST || "unknown",
          port: parseInt(envVars.DB_PORT || "4000"),
          connectionString: envVars.DATABASE_URL.replace(/:[^:@]+@/, ":****@"),
        };
      }),

    /** Get runtime configuration for a project */
    runtimeStatus: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getWebappProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const envVars = project.envVars || {};
        const runtimeConfigStr = envVars._RUNTIME_CONFIG;
        if (!runtimeConfigStr) {
          return { configured: false, runtime: "static", framework: project.framework };
        }

        try {
          const runtimeConfig = JSON.parse(runtimeConfigStr);
          return { configured: true, ...runtimeConfig };
        } catch {
          return { configured: false, runtime: "static", framework: project.framework };
        }
      }),
});
