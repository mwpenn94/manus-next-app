import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
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
        // Don't retry auth errors
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
          return false;
        }
        return failureCount < 2; // Max 2 retries for other errors
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Smart auth redirect: only redirect to login if the user was previously
 * authenticated (session expired) — NOT on first visit when they haven't
 * logged in yet. This prevents redirect loops on the homepage.
 */
let hasEverBeenAuthenticated = Boolean(
  localStorage.getItem("manus-runtime-user-info") &&
  localStorage.getItem("manus-runtime-user-info") !== "null"
);

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;

  // Only redirect if user was previously logged in (session expired)
  // First-time visitors should see the homepage, not a redirect loop
  if (!hasEverBeenAuthenticated) return;

  // Clear stale auth data and redirect once
  hasEverBeenAuthenticated = false;
  localStorage.removeItem("manus-runtime-user-info");
  window.location.href = getLoginUrl();
};

// Track when user becomes authenticated
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "success") {
    const queryKey = event.query.queryKey;
    const isAuthMeQuery = Array.isArray(queryKey) && queryKey.some(
      (k: unknown) => Array.isArray(k) && k.includes("auth") && k.includes("me")
    );
    if (isAuthMeQuery && event.query.state.data) {
      hasEverBeenAuthenticated = true;
    }
  }
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    if (error instanceof TRPCClientError && error.message !== UNAUTHED_ERR_MSG) {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    if (error instanceof TRPCClientError && error.message !== UNAUTHED_ERR_MSG) {
      console.error("[API Mutation Error]", error);
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
    // Show a non-blocking notification that an update is available
    // We use a simple custom event that AppLayout/Toaster can pick up
    window.dispatchEvent(
      new CustomEvent("sw-update-available", { detail: { skipWaitingAndReload } })
    );
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
