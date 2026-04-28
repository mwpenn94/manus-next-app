/**
 * System Health Router
 * 
 * Exposes circuit breaker states, provider health, and system metrics
 * for the Sovereign dashboard's infrastructure monitoring panel.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { getAllCircuitStates } from "../services/failover";

export const systemHealthRouter = router({
  /** Get all circuit breaker states */
  circuitBreakers: protectedProcedure.query(async () => {
    return getAllCircuitStates();
  }),

  /** Get overall system health summary */
  summary: protectedProcedure.query(async () => {
    const circuits = getAllCircuitStates();
    const openCircuits = Object.values(circuits).filter(c => c.isOpen);
    const totalFailures = Object.values(circuits).reduce((sum, c) => sum + c.failures, 0);
    
    return {
      status: openCircuits.length === 0 ? "healthy" : openCircuits.length < 3 ? "degraded" : "critical",
      openCircuits: openCircuits.length,
      totalServices: Object.keys(circuits).length,
      totalFailures,
      uptime: process.uptime(),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      timestamp: Date.now(),
    };
  }),
});
