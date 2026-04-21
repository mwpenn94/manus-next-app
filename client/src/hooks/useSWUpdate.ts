/**
 * Hook that listens for service worker update events and shows a toast.
 * Mount this once in AppLayout or App.
 */
import { useEffect } from "react";
import { toast } from "sonner";

export function useSWUpdate(): void {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        skipWaitingAndReload: () => void;
      };

      toast("Update available", {
        description: "A new version of Manus Next is ready.",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => detail.skipWaitingAndReload(),
        },
      });
    };

    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);
}
