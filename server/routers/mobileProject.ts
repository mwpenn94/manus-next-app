import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { 
  createMobileProject,
  deleteMobileProject,
  getMobileProjectByExternalId,
  getUserMobileProjects,
  updateMobileProject,
 } from "../db";

export const mobileProjectRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserMobileProjects(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string().max(500) }))
      .query(async ({ ctx, input }) => {
        const project = await getMobileProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) return null;
        return project;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        framework: z.enum(["pwa", "capacitor", "expo"]),
        platforms: z.array(z.enum(["ios", "android", "web"])).min(1),
        bundleId: z.string().max(500).optional(),
        displayName: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const bundleId = input.bundleId || `com.manus.${input.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        return createMobileProject({
          userId: ctx.user.id,
          name: input.name,
          framework: input.framework,
          platforms: input.platforms,
          bundleId,
          displayName: input.displayName || input.name,
          status: "draft",
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().max(1000).optional(),
        bundleId: z.string().max(500).optional(),
        displayName: z.string().max(1000).optional(),
        version: z.string().max(10000).optional(),
        iconUrl: z.string().max(2048).optional(),
        splashUrl: z.string().max(2048).optional(),
        pwaManifest: z.record(z.string().max(10000), z.unknown()).optional(),
        capacitorConfig: z.record(z.string().max(10000), z.unknown()).optional(),
        expoConfig: z.record(z.string().max(10000), z.unknown()).optional(),
        status: z.enum(["draft", "configured", "building", "ready"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await updateMobileProject(id, ctx.user.id, updates as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMobileProject(input.id, ctx.user.id);
        return { success: true };
      }),
    /** Generate PWA manifest JSON */
    generatePwaManifest: protectedProcedure
      .input(z.object({
        projectId: z.string().max(500),
        name: z.string().max(1000),
        shortName: z.string().max(1000).optional(),
        description: z.string().max(50000).optional(),
        themeColor: z.string().max(10000).optional(),
        backgroundColor: z.string().max(10000).optional(),
        display: z.enum(["standalone", "fullscreen", "minimal-ui", "browser"]).optional(),
        orientation: z.enum(["portrait", "landscape", "any"]).optional(),
        startUrl: z.string().max(2048).optional(),
        iconUrl: z.string().max(2048).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const manifest = {
          name: input.name,
          short_name: input.shortName || input.name.slice(0, 12),
          description: input.description || "",
          start_url: input.startUrl || "/",
          display: input.display || "standalone",
          orientation: input.orientation || "any",
          theme_color: input.themeColor || "#000000",
          background_color: input.backgroundColor || "#ffffff",
          icons: input.iconUrl ? [
            { src: input.iconUrl, sizes: "192x192", type: "image/png" },
            { src: input.iconUrl, sizes: "512x512", type: "image/png" },
          ] : [],
        };
        // Update the project with the manifest
        const project = await getMobileProjectByExternalId(input.projectId);
        if (project && project.userId === ctx.user.id) {
          await updateMobileProject(project.id, ctx.user.id, { pwaManifest: manifest as any, status: "configured" });
        }
        return manifest;
      }),
    /** Generate Capacitor config */
    generateCapacitorConfig: protectedProcedure
      .input(z.object({
        projectId: z.string().max(500),
        appId: z.string().max(500),
        appName: z.string().max(1000),
        webDir: z.string().max(10000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const config = {
          appId: input.appId,
          appName: input.appName,
          webDir: input.webDir || "dist",
          plugins: {
            SplashScreen: { launchShowDuration: 2000, backgroundColor: "#000000" },
            StatusBar: { style: "dark" },
          },
        };
        const project = await getMobileProjectByExternalId(input.projectId);
        if (project && project.userId === ctx.user.id) {
          await updateMobileProject(project.id, ctx.user.id, { capacitorConfig: config as any, status: "configured" });
        }
        return config;
      }),
    /** Generate Expo config */
    generateExpoConfig: protectedProcedure
      .input(z.object({
        projectId: z.string().max(500),
        slug: z.string().max(500),
        sdkVersion: z.string().max(10000).optional(),
        iosBundleId: z.string().max(500).optional(),
        androidPackage: z.string().max(10000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const config = {
          slug: input.slug,
          sdkVersion: input.sdkVersion || "52.0.0",
          ios: { bundleIdentifier: input.iosBundleId || `com.manus.${input.slug}`, buildNumber: "1" },
          android: { package: input.androidPackage || `com.manus.${input.slug}`, versionCode: 1 },
        };
        const project = await getMobileProjectByExternalId(input.projectId);
        if (project && project.userId === ctx.user.id) {
          await updateMobileProject(project.id, ctx.user.id, { expoConfig: config as any, status: "configured" });
        }
        return config;
      }),
    /** Generate service worker for PWA */
    generateServiceWorker: protectedProcedure
      .input(z.object({ cacheName: z.string().max(1000).optional(), offlinePage: z.string().max(1000).optional() }))
      .query(async ({ input }) => {
        const cacheName = input.cacheName || "manus-pwa-v1";
        const offlinePage = input.offlinePage || "/offline.html";
        return {
          code: `// Service Worker — Generated by Manus\nconst CACHE_NAME = '${cacheName}';\nconst OFFLINE_URL = '${offlinePage}';\n\nself.addEventListener('install', (event) => {\n  event.waitUntil(\n    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', OFFLINE_URL]))\n  );\n  self.skipWaiting();\n});\n\nself.addEventListener('activate', (event) => {\n  event.waitUntil(\n    caches.keys().then((keys) => Promise.all(\n      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))\n    ))\n  );\n  self.clients.claim();\n});\n\nself.addEventListener('fetch', (event) => {\n  if (event.request.mode === 'navigate') {\n    event.respondWith(\n      fetch(event.request).catch(() => caches.match(OFFLINE_URL))\n    );\n    return;\n  }\n  event.respondWith(\n    caches.match(event.request).then((cached) => cached || fetch(event.request))\n  );\n});`,
          filename: "sw.js",
        };
      }),
  });
