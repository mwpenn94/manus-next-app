/**
 * confirmation-gate-persistence.test.ts
 *
 * Tests for:
 * 1. Confirmation gate manager (pause/resume/timeout)
 * 2. Content persistence (cardType/cardData in messages)
 * 3. Gate-response endpoint wiring
 *
 * Convergence Pass: Ensures all three critical bug fixes work correctly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── 1. Confirmation Gate Manager Tests ───

describe("ConfirmationGate Manager", () => {
  let createGateId: typeof import("../server/confirmationGate").createGateId;
  let awaitGateApproval: typeof import("../server/confirmationGate").awaitGateApproval;
  let resolveGate: typeof import("../server/confirmationGate").resolveGate;
  let resolveByTaskId: typeof import("../server/confirmationGate").resolveByTaskId;
  let isGatePending: typeof import("../server/confirmationGate").isGatePending;
  let getPendingGates: typeof import("../server/confirmationGate").getPendingGates;
  let cleanupTaskGates: typeof import("../server/confirmationGate").cleanupTaskGates;

  beforeEach(async () => {
    // Fresh import each time to reset module state
    vi.resetModules();
    const mod = await import("../server/confirmationGate");
    createGateId = mod.createGateId;
    awaitGateApproval = mod.awaitGateApproval;
    resolveGate = mod.resolveGate;
    resolveByTaskId = mod.resolveByTaskId;
    isGatePending = mod.isGatePending;
    getPendingGates = mod.getPendingGates;
    cleanupTaskGates = mod.cleanupTaskGates;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createGateId generates correct format with toolCallId", () => {
    const id = createGateId("task-123", "call_abc");
    expect(id).toBe("task-123:call_abc");
  });

  it("createGateId generates format with timestamp when no toolCallId", () => {
    const id = createGateId("task-456");
    expect(id).toMatch(/^task-456:.+$/);
  });

  it("awaitGateApproval creates a pending gate", async () => {
    const gateId = "task-1:call-1";
    const promise = awaitGateApproval(gateId, "execute_code", 5000);

    expect(isGatePending(gateId)).toBe(true);
    const pending = getPendingGates();
    expect(pending.length).toBe(1);
    expect(pending[0].gateId).toBe(gateId);
    expect(pending[0].toolName).toBe("execute_code");

    // Resolve to prevent test hanging
    resolveGate(gateId, { approved: true });
    const result = await promise;
    expect(result.approved).toBe(true);
  });

  it("resolveGate approves a pending gate", async () => {
    const gateId = "task-2:call-2";
    const promise = awaitGateApproval(gateId, "delete_file", 5000);

    const resolved = resolveGate(gateId, { approved: true });
    expect(resolved).toBe(true);
    expect(isGatePending(gateId)).toBe(false);

    const result = await promise;
    expect(result.approved).toBe(true);
  });

  it("resolveGate rejects a pending gate with reason", async () => {
    const gateId = "task-3:call-3";
    const promise = awaitGateApproval(gateId, "send_email", 5000);

    const resolved = resolveGate(gateId, { approved: false, reason: "Not safe" });
    expect(resolved).toBe(true);

    const result = await promise;
    expect(result.approved).toBe(false);
    expect(result.reason).toBe("Not safe");
  });

  it("resolveGate returns false for non-existent gate", () => {
    const resolved = resolveGate("nonexistent:gate", { approved: true });
    expect(resolved).toBe(false);
  });

  it("resolveByTaskId resolves the most recent gate for a task", async () => {
    const gateId1 = "task-4:call-1";
    const gateId2 = "task-4:call-2";
    const promise1 = awaitGateApproval(gateId1, "tool_a", 5000);
    // Small delay to ensure different createdAt
    await new Promise(r => setTimeout(r, 10));
    const promise2 = awaitGateApproval(gateId2, "tool_b", 5000);

    // resolveByTaskId should resolve the most recent (gateId2)
    const resolved = resolveByTaskId("task-4", { approved: true });
    expect(resolved).toBe(true);

    const result2 = await promise2;
    expect(result2.approved).toBe(true);

    // gateId1 should still be pending
    expect(isGatePending(gateId1)).toBe(true);

    // Clean up
    resolveGate(gateId1, { approved: false });
    await promise1;
  });

  it("resolveByTaskId returns false when no gates for task", () => {
    const resolved = resolveByTaskId("nonexistent-task", { approved: true });
    expect(resolved).toBe(false);
  });

  it("gate auto-rejects after timeout", async () => {
    const gateId = "task-5:call-5";
    const promise = awaitGateApproval(gateId, "execute_code", 100); // 100ms timeout

    const result = await promise;
    expect(result.approved).toBe(false);
    expect(result.reason).toContain("Timed out");
    expect(isGatePending(gateId)).toBe(false);
  });

  it("cleanupTaskGates resolves all gates for a task", async () => {
    const gateId1 = "task-6:call-1";
    const gateId2 = "task-6:call-2";
    const gateId3 = "other-task:call-1";

    const p1 = awaitGateApproval(gateId1, "tool_a", 5000);
    const p2 = awaitGateApproval(gateId2, "tool_b", 5000);
    const p3 = awaitGateApproval(gateId3, "tool_c", 5000);

    cleanupTaskGates("task-6");

    const r1 = await p1;
    const r2 = await p2;
    expect(r1.approved).toBe(false);
    expect(r1.reason).toBe("Task stream ended");
    expect(r2.approved).toBe(false);

    // Other task's gate should still be pending
    expect(isGatePending(gateId3)).toBe(true);

    // Clean up
    resolveGate(gateId3, { approved: false });
    await p3;
  });

  it("getPendingGates returns correct metadata", async () => {
    const gateId = "task-7:call-7";
    const promise = awaitGateApproval(gateId, "make_payment", 5000);

    const gates = getPendingGates();
    expect(gates.length).toBe(1);
    expect(gates[0].gateId).toBe(gateId);
    expect(gates[0].toolName).toBe("make_payment");
    expect(typeof gates[0].createdAt).toBe("number");
    expect(gates[0].createdAt).toBeGreaterThan(0);

    resolveGate(gateId, { approved: true });
    await promise;
  });
});

// ─── 2. Content Persistence (cardType/cardData in DB schema) ───

describe("Content Persistence — cardType/cardData in Schema", () => {
  const schemaPath = resolve(__dirname, "../drizzle/schema.ts");
  let schemaContent: string;

  beforeEach(() => {
    schemaContent = readFileSync(schemaPath, "utf-8");
  });

  it("taskMessages table has cardType column", () => {
    expect(schemaContent).toContain("cardType");
    // Should be a varchar/text column
    expect(schemaContent).toMatch(/cardType.*varchar|text.*cardType/s);
  });

  it("taskMessages table has cardData column", () => {
    expect(schemaContent).toContain("cardData");
    // Should be a text/json column
    expect(schemaContent).toMatch(/cardData.*text|json.*cardData/s);
  });
});

describe("Content Persistence — tRPC addMessage accepts cardType/cardData", () => {
  const routersPath = resolve(__dirname, "../server/routers.ts");
  let routersContent: string;

  beforeEach(() => {
    routersContent = readFileSync(routersPath, "utf-8");
  });

  it("addMessage procedure accepts cardType in input schema", () => {
    expect(routersContent).toMatch(/cardType.*z\.string/);
  });

  it("addMessage procedure accepts cardData in input schema", () => {
    // cardData uses z.any() since it's a JSON object
    expect(routersContent).toMatch(/cardData.*z\.(string|any)/);
  });

  it("addMessage procedure persists cardType to database", () => {
    // The insert should include cardType
    expect(routersContent).toMatch(/cardType.*input\.cardType|input\.cardType.*cardType/);
  });

  it("addMessage procedure persists cardData to database", () => {
    // The insert should include cardData
    expect(routersContent).toMatch(/cardData.*input\.cardData|input\.cardData.*cardData/);
  });
});

describe("Content Persistence — TaskContext hydrates cardType/cardData", () => {
  const contextPath = resolve(__dirname, "../client/src/contexts/TaskContext.tsx");
  let contextContent: string;

  beforeEach(() => {
    contextContent = readFileSync(contextPath, "utf-8");
  });

  it("message hydration includes cardType from server data", () => {
    expect(contextContent).toContain("cardType: sm.cardType");
  });

  it("message hydration includes cardData from server data", () => {
    expect(contextContent).toContain("cardData: sm.cardData");
  });

  it("addMessage sends cardType to server", () => {
    // The mutate call should include cardType
    expect(contextContent).toMatch(/cardType.*message\.cardType|msg\.cardType/);
  });

  it("addMessage sends cardData to server", () => {
    // The mutate call should include cardData
    expect(contextContent).toMatch(/cardData.*message\.cardData|JSON\.stringify.*cardData|msg\.cardData/);
  });

  it("updateMessageCard function is exported in context", () => {
    expect(contextContent).toContain("updateMessageCard");
    expect(contextContent).toContain("updateMessageCard:");
  });
});

// ─── 3. Confirmation Gate Wiring Tests ───

describe("Confirmation Gate — Server Wiring", () => {
  const agentStreamPath = resolve(__dirname, "../server/agentStream.ts");
  let agentStreamContent: string;

  beforeEach(() => {
    agentStreamContent = readFileSync(agentStreamPath, "utf-8");
  });

  it("agentStream imports awaitGateApproval from confirmationGate", () => {
    expect(agentStreamContent).toContain("awaitGateApproval");
  });

  it("agentStream pauses at confirmation gate (await)", () => {
    // The gate should be awaited, not fire-and-forget
    expect(agentStreamContent).toMatch(/await\s+awaitGateApproval/);
  });

  it("agentStream handles gate rejection by skipping tool execution", () => {
    expect(agentStreamContent).toContain("gateRejected");
    expect(agentStreamContent).toContain("[USER REJECTED]");
  });

  it("agentStream sends gate_resolved SSE event", () => {
    expect(agentStreamContent).toContain("gate_resolved");
  });

  it("agentStream feeds rejection message back to conversation", () => {
    // On rejection, a tool message should be added to conversation
    expect(agentStreamContent).toMatch(/conversation\.push.*USER REJECTED/s);
  });

  it("CONFIRMATION_TOOLS includes execute_code as sensitive", () => {
    expect(agentStreamContent).toMatch(/execute_code.*sensitive/);
  });

  it("CONFIRMATION_TOOLS includes delete_file as destructive", () => {
    expect(agentStreamContent).toMatch(/delete_file.*destructive/);
  });

  it("CONFIRMATION_TOOLS includes make_payment as payment", () => {
    expect(agentStreamContent).toMatch(/make_payment.*payment/);
  });
});

describe("Confirmation Gate — Client Wiring", () => {
  const taskViewPath = resolve(__dirname, "../client/src/pages/TaskView.tsx");
  let taskViewContent: string;

  beforeEach(() => {
    taskViewContent = readFileSync(taskViewPath, "utf-8");
  });

  it("TaskView passes onGateApprove to MessageBubble", () => {
    expect(taskViewContent).toContain("onGateApprove");
  });

  it("TaskView passes onGateReject to MessageBubble", () => {
    expect(taskViewContent).toContain("onGateReject");
  });

  it("gate approval sends POST to /api/gate-response", () => {
    expect(taskViewContent).toContain("/api/gate-response");
  });

  it("gate approval sends taskExternalId in body", () => {
    expect(taskViewContent).toContain("taskExternalId: task.id");
  });

  it("gate approval updates card status to approved", () => {
    expect(taskViewContent).toMatch(/updateMessageCard.*status.*approved/);
  });

  it("gate rejection updates card status to rejected", () => {
    expect(taskViewContent).toMatch(/updateMessageCard.*status.*rejected/);
  });
});

describe("Confirmation Gate — SSE Parser", () => {
  const streamPath = resolve(__dirname, "../client/src/lib/streamWithRetry.ts");
  let streamContent: string;

  beforeEach(() => {
    streamContent = readFileSync(streamPath, "utf-8");
  });

  it("StreamCallbacks includes onGateResolved", () => {
    expect(streamContent).toContain("onGateResolved");
  });

  it("SSE parser dispatches gate_resolved events", () => {
    expect(streamContent).toMatch(/data\.gate_resolved.*onGateResolved/);
  });
});

describe("Confirmation Gate — /api/gate-response Endpoint", () => {
  const indexPath = resolve(__dirname, "../server/_core/index.ts");
  let indexContent: string;

  beforeEach(() => {
    indexContent = readFileSync(indexPath, "utf-8");
  });

  it("endpoint is registered at /api/gate-response", () => {
    expect(indexContent).toContain('"/api/gate-response"');
  });

  it("endpoint accepts taskExternalId parameter", () => {
    expect(indexContent).toMatch(/taskExternalId.*req\.body/);
  });

  it("endpoint accepts gateId parameter for direct resolution", () => {
    expect(indexContent).toMatch(/gateId.*req\.body/);
  });

  it("endpoint imports resolveByTaskId for task-based resolution", () => {
    expect(indexContent).toContain("resolveByTaskId");
  });

  it("endpoint returns 400 when approved is not boolean", () => {
    expect(indexContent).toMatch(/typeof approved.*boolean.*400/s);
  });

  it("endpoint returns 404 when gate not found", () => {
    expect(indexContent).toMatch(/not found.*404|404.*not found/s);
  });
});

// ─── 4. ConfirmationGate Component Tests ───

describe("ConfirmationGate Component", () => {
  const componentPath = resolve(__dirname, "../client/src/components/ConfirmationGate.tsx");
  let componentContent: string;

  beforeEach(() => {
    componentContent = readFileSync(componentPath, "utf-8");
  });

  it("supports pending, approved, and rejected statuses", () => {
    expect(componentContent).toContain('"pending"');
    expect(componentContent).toContain('"approved"');
    expect(componentContent).toContain('"rejected"');
  });

  it("has all category configurations", () => {
    expect(componentContent).toContain("destructive");
    expect(componentContent).toContain("payment");
    expect(componentContent).toContain("publish");
    expect(componentContent).toContain("external");
    expect(componentContent).toContain("sensitive");
    expect(componentContent).toContain("general");
  });

  it("shows Approve and Reject buttons when pending", () => {
    expect(componentContent).toContain("Approve");
    expect(componentContent).toContain("Reject");
  });

  it("shows status messages after resolution", () => {
    expect(componentContent).toContain("Action approved");
    expect(componentContent).toContain("Action rejected");
  });

  it("shows Manus-style continuation notice", () => {
    expect(componentContent).toContain("Manus will continue after your confirmation");
  });
});
