import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom";
import { registerServiceWorker, skipWaitingAndReload } from "@/lib/registerSW";

// axe-core accessibility auditing in development
if (import.meta.env.DEV) {
  import("@axe-core/react").then((axe) => {
    // Delay set to 5000ms to avoid false positives from framer-motion
    // entrance animations (opacity 0->1 transitions). axe-core checks
    // computed styles mid-animation, reporting transient low-contrast
    // states that don't reflect the final rendered UI. 5s gives enough
    // margin for page load + auth queries + animation completion.
    axe.default(React, ReactDOM, 5000);
    console.log("[a11y] axe-core enabled for development (5s debounce)");
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry if the server returned HTML instead of JSON
        // (proxy/CDN fallback, server restart, etc.)
        if (error instanceof TRPCClientError && error.message?.includes('is not valid JSON')) {
          return false;
        }
        // Don't retry auth errors — prevents hammering the server
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
          return false;
        }
        // Retry network failures ("Failed to fetch") up to 3 times with backoff
        if (error instanceof TRPCClientError && error.message === 'Failed to fetch') {
          return failureCount < 3;
        }
        return failureCount < 2; // Max 2 retries for other errors
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
      // Suppress error state for transient network failures during refetch
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Error logging for tRPC queries/mutations.
 *
 * AUTH REDIRECT POLICY: We intentionally do NOT redirect to login here.
 * Auth redirects are handled per-page via useAuth({ redirectOnUnauthenticated: true })
 * which gives each page control over whether unauthenticated access is allowed.
 * A global redirect here caused auth loops on the deployed site because:
 *   1. The error subscriber fires before useAuth updates localStorage
 *   2. Stale localStorage data triggers redirect even for legitimately unauthenticated pages
 *   3. The redirect cycle repeats when the session cookie is missing/expired
 */
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    // Suppress logging for transient network errors (retries will handle them)
    if (error instanceof TRPCClientError && error.message === 'Failed to fetch') {
      console.warn("[API] Network unavailable — retrying...");
      return;
    }
     if (error instanceof TRPCClientError && error.message !== UNAUTHED_ERR_MSG) {
      console.error("[API Query Error]", error);
      // Global error toast for non-auth query failures (covers all pages)
      toast.error(error.message || "Something went wrong", { id: 'query-error', duration: 4000 });
    }
  }
});
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (error instanceof TRPCClientError && error.message !== UNAUTHED_ERR_MSG) {
      console.error("[API Mutation Error]", error);
      // Global error toast for mutation failures
      toast.error(error.message || "Action failed", { id: 'mutation-error', duration: 4000 });
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        const response = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
        // Guard against proxy/CDN returning HTML (SPA fallback) instead of JSON.
        // This happens when the server restarts, the proxy times out, or the
        // CDN edge serves a cached HTML page for an API route.
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && !contentType.includes('application/json')) {
          throw new Error(
            `Expected JSON response from ${typeof input === 'string' ? input : input.toString()}, got ${contentType || 'unknown content-type'}. The server may be restarting.`
          );
        }
        return response;
      },
    }),
  ],
});

// ── Service Worker Registration ──
registerServiceWorker({
  onUpdate: () => {
    // Auto-update immediately to prevent stale bundles causing auth loops
    console.log("[SW] New version detected — auto-updating...");
    skipWaitingAndReload();
  },
  onSuccess: () => {
    console.log("[SW] Content cached for offline use.");
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </trpc.Provider>
  </QueryClientProvider>
);
