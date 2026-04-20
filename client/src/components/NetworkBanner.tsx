/**
 * NetworkBanner — Graceful degradation UI
 * 
 * G10: Shows a banner when the network is offline or recovering.
 * Includes retry button and auto-dismiss on reconnect.
 */
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export default function NetworkBanner() {
  const { isOnline, wasOffline, reconnecting } = useNetworkStatus();

  const showBanner = !isOnline || wasOffline;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium",
              !isOnline
                ? "bg-red-500/15 text-red-400 border-b border-red-500/20"
                : wasOffline
                ? "bg-emerald-500/15 text-emerald-400 border-b border-emerald-500/20"
                : ""
            )}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>You're offline. Some features may be unavailable.</span>
                <button
                  onClick={() => window.location.reload()}
                  className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </>
            ) : wasOffline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Back online — connection restored.</span>
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
