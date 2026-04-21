/**
 * Service Worker Registration with Update Notification
 *
 * Registers /sw.js, listens for updates, and calls onUpdate()
 * when a new version is waiting to activate.
 */

export interface SWRegistrationOptions {
  /** Called when a new SW version is waiting. Caller should show a toast. */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  /** Called when SW is registered for the first time (content cached). */
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
}

export function registerServiceWorker(options: SWRegistrationOptions = {}): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Wait for page load to avoid competing with critical resources
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      // Check for updates every 60 minutes
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 60 * 1000);

      // Handle update found
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          // New SW is installed and waiting
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // There's an existing SW — this is an update
            options.onUpdate?.(registration);
          } else if (
            newWorker.state === "activated" &&
            !navigator.serviceWorker.controller
          ) {
            // First-time install — content is cached
            options.onSuccess?.(registration);
          }
        });
      });
    } catch (error) {
      console.warn("[SW] Registration failed:", error);
    }
  });
}

/**
 * Tell the waiting SW to skip waiting and take over.
 * After calling this, the page should reload to use the new SW.
 */
export function skipWaitingAndReload(): void {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  });
  // Reload after a brief delay to let the new SW activate
  setTimeout(() => window.location.reload(), 300);
}
