import { describe, it, expect } from "vitest";
import { parseBranchFromRef } from "./githubWebhook";

describe("parseBranchFromRef — defense-in-depth sanitization", () => {
  it("parses normal branch names", () => {
    expect(parseBranchFromRef("refs/heads/main")).toBe("main");
    expect(parseBranchFromRef("refs/heads/feature/my-feature")).toBe("feature/my-feature");
    expect(parseBranchFromRef("refs/heads/release-1.0.0")).toBe("release-1.0.0");
    expect(parseBranchFromRef("refs/heads/fix_underscore")).toBe("fix_underscore");
  });

  it("strips shell metacharacters from branch names", () => {
    // These shouldn't happen via GitHub but defense-in-depth
    expect(parseBranchFromRef("refs/heads/branch$(whoami)")).toBe("branchwhoami");
    expect(parseBranchFromRef("refs/heads/a|b")).toBe("ab");
    expect(parseBranchFromRef("refs/heads/a&b")).toBe("ab");
  });

  it("preserves valid git ref characters", () => {
    expect(parseBranchFromRef("refs/heads/feat/ABC-123_test.v2")).toBe("feat/ABC-123_test.v2");
  });
});
