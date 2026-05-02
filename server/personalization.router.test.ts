import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-pz",
    email: "pz@example.com",
    name: "Personalization Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("personalization router", () => {
  const caller = appRouter.createCaller(createAuthContext());

  it("getPreferences returns an array", async () => {
    const prefs = await caller.personalization.getPreferences();
    expect(Array.isArray(prefs)).toBe(true);
  });

  it("upsertPreference creates and returns a preference", async () => {
    const result = await caller.personalization.upsertPreference({
      category: "ui",
      label: "theme",
      value: 80,
      confidence: 90,
      source: "explicit",
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("getRules returns an array", async () => {
    const rules = await caller.personalization.getRules();
    expect(Array.isArray(rules)).toBe(true);
  });

  it("createRule creates and returns a rule", async () => {
    const result = await caller.personalization.createRule({
      name: "Auto-dark mode",
      condition: "time > 18:00",
      action: "set theme dark",
      impact: "high",
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("toggleRule toggles a rule's enabled state", async () => {
    const rule = await caller.personalization.createRule({
      name: "Toggle Test",
      condition: "always",
      action: "noop",
      impact: "low",
    });
    const toggled = await caller.personalization.toggleRule({ id: rule.id, active: false });
    expect(toggled.success).toBe(true);
  });

  it("deletePreference removes a preference", async () => {
    const pref = await caller.personalization.upsertPreference({
      category: "test",
      label: "to_delete",
      value: 50,
    });
    const result = await caller.personalization.deletePreference({ id: pref.id });
    expect(result.success).toBe(true);
  });

  it("getLearningLog returns paginated results", async () => {
    const log = await caller.personalization.getLearningLog({ limit: 10, offset: 0 });
    expect(Array.isArray(log)).toBe(true);
  });

  it("addLearningEntry creates a learning entry", async () => {
    const result = await caller.personalization.addLearningEntry({
      eventType: "preference_learned",
      description: "User switched to dark mode",
      confidence: 90,
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("resetPreferences clears all preferences", async () => {
    // Create a preference first
    await caller.personalization.upsertPreference({
      category: "test",
      label: "reset_test",
      value: 50,
    });
    const result = await caller.personalization.resetPreferences();
    expect(result.success).toBe(true);
    // After reset, preferences should be empty
    const prefs = await caller.personalization.getPreferences();
    expect(prefs.length).toBe(0);
  });
});
