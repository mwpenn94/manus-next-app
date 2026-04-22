/**
 * confirmationGate.ts — Server-side Confirmation Gate Manager
 *
 * Provides a pause/resume mechanism for the agentic stream when the agent
 * attempts a sensitive or destructive tool call. The stream pauses at the
 * gate, the client shows Approve/Reject buttons, and the user's decision
 * is relayed back via POST /api/gate-response.
 *
 * Architecture:
 * 1. agentStream calls `awaitGateApproval(gateId)` which returns a Promise
 * 2. The Promise resolves when the client POSTs to /api/gate-response
 * 3. If approved: tool executes normally
 * 4. If rejected: tool is skipped, a rejection message is fed back to the LLM
 * 5. If timeout (60s): auto-rejects to prevent stream hanging
 *
 * Gate IDs are scoped to taskExternalId to prevent cross-task interference.
 */

export interface GateDecision {
  approved: boolean;
  /** Optional reason from the user for rejection */
  reason?: string;
}

interface PendingGate {
  resolve: (decision: GateDecision) => void;
  timer: ReturnType<typeof setTimeout>;
  toolName: string;
  createdAt: number;
}

/** In-memory map of pending gates: gateId → resolver */
const pendingGates = new Map<string, PendingGate>();

/** Default timeout in ms before auto-rejecting a gate */
const GATE_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Generate a unique gate ID for a tool call within a task.
 * Format: `{taskExternalId}:{toolCallId}` or `{taskExternalId}:{timestamp}`
 */
export function createGateId(taskExternalId: string, toolCallId?: string): string {
  return `${taskExternalId}:${toolCallId || Date.now().toString(36)}`;
}

/**
 * Wait for user approval/rejection of a sensitive tool call.
 * Returns a Promise that resolves with the user's decision.
 *
 * @param gateId - Unique identifier for this gate
 * @param toolName - Name of the tool requiring approval
 * @param timeoutMs - How long to wait before auto-rejecting (default: 120s)
 * @returns GateDecision with approved: true/false
 */
export function awaitGateApproval(
  gateId: string,
  toolName: string,
  timeoutMs: number = GATE_TIMEOUT_MS
): Promise<GateDecision> {
  return new Promise<GateDecision>((resolve) => {
    // Auto-reject after timeout to prevent stream hanging
    const timer = setTimeout(() => {
      if (pendingGates.has(gateId)) {
        pendingGates.delete(gateId);
        console.log(`[ConfirmationGate] Gate ${gateId} timed out after ${timeoutMs}ms — auto-rejecting`);
        resolve({ approved: false, reason: "Timed out waiting for user response" });
      }
    }, timeoutMs);

    pendingGates.set(gateId, {
      resolve,
      timer,
      toolName,
      createdAt: Date.now(),
    });

    console.log(`[ConfirmationGate] Gate ${gateId} created for tool: ${toolName}`);
  });
}

/**
 * Resolve a pending gate with the user's decision.
 * Called by the /api/gate-response endpoint.
 *
 * @param gateId - The gate to resolve
 * @param decision - The user's approval/rejection
 * @returns true if the gate was found and resolved, false if not found
 */
export function resolveGate(gateId: string, decision: GateDecision): boolean {
  const gate = pendingGates.get(gateId);
  if (!gate) {
    console.warn(`[ConfirmationGate] Gate ${gateId} not found (may have timed out)`);
    return false;
  }

  clearTimeout(gate.timer);
  pendingGates.delete(gateId);
  console.log(`[ConfirmationGate] Gate ${gateId} resolved: ${decision.approved ? "APPROVED" : "REJECTED"}`);
  gate.resolve(decision);
  return true;
}

/**
 * Check if a gate is still pending.
 */
export function isGatePending(gateId: string): boolean {
  return pendingGates.has(gateId);
}

/**
 * Get all pending gates (for debugging/monitoring).
 */
export function getPendingGates(): Array<{ gateId: string; toolName: string; createdAt: number }> {
  return Array.from(pendingGates.entries()).map(([gateId, gate]) => ({
    gateId,
    toolName: gate.toolName,
    createdAt: gate.createdAt,
  }));
}

/**
 * Resolve the most recent pending gate for a task by its taskExternalId prefix.
 * This is used when the client doesn't know the specific gateId — it just knows
 * which task the gate belongs to.
 *
 * @param taskExternalId - The task's external ID
 * @param decision - The user's approval/rejection
 * @returns true if a gate was found and resolved, false if not found
 */
export function resolveByTaskId(taskExternalId: string, decision: GateDecision): boolean {
  const prefix = `${taskExternalId}:`;
  // Find the most recent pending gate for this task
  let latestGateId: string | null = null;
  let latestCreatedAt = 0;
  for (const [gateId, gate] of Array.from(pendingGates.entries())) {
    if (gateId.startsWith(prefix) && gate.createdAt >= latestCreatedAt) {
      latestGateId = gateId;
      latestCreatedAt = gate.createdAt;
    }
  }
  if (!latestGateId) {
    console.warn(`[ConfirmationGate] No pending gate found for task ${taskExternalId}`);
    return false;
  }
  return resolveGate(latestGateId, decision);
}

/**
 * Clean up all pending gates for a task (e.g., when the stream is aborted).
 */
export function cleanupTaskGates(taskExternalId: string): void {
  const prefix = `${taskExternalId}:`;
  const keysToClean = Array.from(pendingGates.keys()).filter(k => k.startsWith(prefix));
  for (const gateId of keysToClean) {
    const gate = pendingGates.get(gateId);
    if (gate) {
      clearTimeout(gate.timer);
      gate.resolve({ approved: false, reason: "Task stream ended" });
      pendingGates.delete(gateId);
    }
  }
}
