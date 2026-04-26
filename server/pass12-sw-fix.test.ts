/**
 * Pass 12 — Service Worker Cache-Busting Fix Tests
 *
 * Validates that:
 *   1. sw.js has CACHE_VERSION = 3
 *   2. sw.js does NOT precache HTML / navigation requests
 *   3. sw.js calls self.skipWaiting() on install
 *   4. sw.js deletes ALL old caches on activate (not just prefixed)
 *   5. main.tsx does NOT contain global redirectToLoginIfUnauthorized
 *   6. main.tsx auto-calls skipWaitingAndReload on SW update
 *   7. main.tsx does NOT redirect on UNAUTHED_ERR_MSG in cache subscribers
 *   8. Navigation requests fall through (no SW interception)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SW_PATH = resolve(__dirname, "../client/public/sw.js");
const MAIN_PATH = resolve(__dirname, "../client/src/main.tsx");

const swSource = readFileSync(SW_PATH, "utf-8");
const mainSource = readFileSync(MAIN_PATH, "utf-8");

describe("Pass 12: Service Worker Cache-Busting Fix", () => {
  describe("sw.js — cache version and strategy", () => {
    it("has CACHE_VERSION set to 3", () => {
      expect(swSource).toMatch(/const\s+CACHE_VERSION\s*=\s*3/);
    });

    it("uses cache name with version 3", () => {
      expect(swSource).toMatch(/CACHE_NAME\s*=\s*`manus-next-v\$\{CACHE_VERSION\}`/);
    });

    it("does NOT precache any HTML files", () => {
      // No urlsToCache array with .html entries
      expect(swSource).not.toMatch(/\.html/);
      // No explicit HTML caching
      expect(swSource).not.toMatch(/text\/html/);
    });

    it("does NOT intercept navigation requests (returns early)", () => {
      // The SW should have a navigation check that returns without calling respondWith
      const navSection = swSource.match(/request\.mode\s*===\s*['"]navigate['"]/);
      expect(navSection).toBeTruthy();

      // After the navigate check, there should be a return (not respondWith)
      const navBlock = swSource.slice(
        swSource.indexOf("request.mode === 'navigate'")
      );
      const nextReturn = navBlock.indexOf("return;");
      const nextRespondWith = navBlock.indexOf("respondWith");
      // The return should come before any respondWith in the navigate block
      expect(nextReturn).toBeLessThan(nextRespondWith);
    });
  });

  describe("sw.js — install behavior", () => {
    it("calls self.skipWaiting() in the install handler", () => {
      // Extract install handler
      const installMatch = swSource.match(
        /addEventListener\s*\(\s*['"]install['"][\s\S]*?\}\s*\)/
      );
      expect(installMatch).toBeTruthy();
      expect(installMatch![0]).toContain("self.skipWaiting()");
    });
  });

  describe("sw.js — activate behavior", () => {
    it("deletes all caches that don't match current CACHE_NAME", () => {
      const activateMatch = swSource.match(
        /addEventListener\s*\(\s*['"]activate['"][\s\S]*?\}\s*\)/
      );
      expect(activateMatch).toBeTruthy();
      const activateBody = activateMatch![0];
      // Should use caches.keys() and filter
      expect(activateBody).toContain("caches.keys()");
      expect(activateBody).toContain("caches.delete");
      // Should filter by name !== CACHE_NAME (not by prefix)
      expect(activateBody).toContain("CACHE_NAME");
    });

    it("calls self.clients.claim() on activate", () => {
      expect(swSource).toContain("self.clients.claim()");
    });
  });

  describe("sw.js — fetch strategies", () => {
    it("skips API routes (no caching)", () => {
      expect(swSource).toMatch(/isApiRoute/);
      expect(swSource).toMatch(/\/api\//);
    });

    it("uses cache-first for hashed assets", () => {
      expect(swSource).toMatch(/isHashedAsset/);
      // Should have caches.match before fetch for hashed assets
      expect(swSource).toContain("caches.match(request)");
    });

    it("handles Google Fonts with stale-while-revalidate", () => {
      expect(swSource).toMatch(/isGoogleFont/);
      expect(swSource).toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    });
  });

  describe("sw.js — message handler", () => {
    it("responds to SKIP_WAITING messages", () => {
      expect(swSource).toContain("SKIP_WAITING");
      expect(swSource).toContain("self.skipWaiting()");
    });
  });

  describe("main.tsx — auth redirect removal", () => {
    it("does NOT contain redirectToLoginIfUnauthorized function", () => {
      expect(mainSource).not.toContain("redirectToLoginIfUnauthorized");
    });

    it("does NOT import getLoginUrl", () => {
      // getLoginUrl should not be imported in main.tsx
      expect(mainSource).not.toMatch(/import.*getLoginUrl/);
    });

    it("does NOT redirect on UNAUTHED errors in query cache subscriber", () => {
      // The query cache subscriber should only log non-UNAUTHED errors
      // It should NOT contain window.location.href = getLoginUrl()
      expect(mainSource).not.toMatch(
        /queryClient\.getQueryCache[\s\S]*?window\.location\.href\s*=/
      );
    });

    it("does NOT redirect on UNAUTHED errors in mutation cache subscriber", () => {
      expect(mainSource).not.toMatch(
        /queryClient\.getMutationCache[\s\S]*?window\.location\.href\s*=/
      );
    });

    it("does NOT auto-retry UNAUTHED errors (prevents hammering)", () => {
      // Should have retry: false for UNAUTHED errors
      expect(mainSource).toContain("UNAUTHED_ERR_MSG");
      expect(mainSource).toMatch(/return\s+false/);
    });
  });

  describe("main.tsx — SW auto-update", () => {
    it("calls skipWaitingAndReload on SW update", () => {
      expect(mainSource).toContain("skipWaitingAndReload()");
    });

    it("has onUpdate handler in registerServiceWorker", () => {
      expect(mainSource).toMatch(/onUpdate:\s*\(\)\s*=>/);
    });

    it("does NOT just dispatch sw-update-available event (auto-updates instead)", () => {
      // Should NOT dispatch a custom event — should auto-update
      expect(mainSource).not.toContain(
        'new CustomEvent("sw-update-available"'
      );
    });
  });

  describe("main.tsx — no global auth redirect on page load", () => {
    it("does not call getLoginUrl() outside of event handlers", () => {
      // getLoginUrl should not appear at all in main.tsx
      expect(mainSource).not.toContain("getLoginUrl");
    });

    it("does not have hasEverBeenAuthenticated check", () => {
      expect(mainSource).not.toContain("hasEverBeenAuthenticated");
    });

    it("documents the auth redirect policy in comments", () => {
      expect(mainSource).toMatch(/AUTH REDIRECT POLICY/i);
    });
  });
});
