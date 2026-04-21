import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Prevent platform debug-collector.js from crashing when it calls
 * JSON.stringify on the tRPC proxy. The proxy's internal `apply` trap
 * receives "toJSON" as a utilName which doesn't exist in contextMap.
 *
 * We patch both the top-level trpc object and intercept JSON.stringify
 * globally to catch any tRPC proxy that gets serialized.
 */
(trpc as Record<string, unknown>).toJSON = () => "[tRPC client]";

// Patch JSON.stringify to gracefully handle tRPC proxy serialization errors
const _origStringify = JSON.stringify;
JSON.stringify = function patchedStringify(value: unknown, replacer?: unknown, space?: unknown) {
  try {
    return _origStringify.call(
      JSON,
      value,
      replacer as Parameters<typeof JSON.stringify>[1],
      space as Parameters<typeof JSON.stringify>[2],
    );
  } catch (err) {
    if (
      err instanceof TypeError &&
      typeof (err as Error).message === "string" &&
      (err as Error).message.includes("is not a function")
    ) {
      // Likely a tRPC proxy serialization error — return safe fallback
      return _origStringify.call(JSON, "[unserializable proxy]");
    }
    throw err;
  }
};
