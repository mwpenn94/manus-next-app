import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Prevent platform debug-collector.js from crashing when it calls
 * JSON.stringify on the tRPC proxy. The proxy's internal `apply` trap
 * receives "toJSON" as a utilName which doesn't exist in contextMap.
 * By defining toJSON on the trpc object itself, JSON.stringify will
 * call this method instead of traversing the proxy.
 */
(trpc as Record<string, unknown>).toJSON = () => "[tRPC client]";
