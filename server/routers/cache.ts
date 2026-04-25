import { protectedProcedure, router } from "../_core/trpc";

export const cacheRouter = router({
    metrics: protectedProcedure.query(async () => {
      const { getCacheMetrics } = await import("../promptCache");
      return getCacheMetrics();
    }),
  });
