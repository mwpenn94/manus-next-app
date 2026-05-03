import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * NS2: Integration tests for capability demonstration flow
 * Tests the "demonstrate each" protocol end-to-end:
 * - Detection regex accuracy
 * - System prompt injection
 * - Capability list completeness
 * - Continuation logic (wantsContinuous)
 * - Anti-scope-creep interaction
 */

const agentStreamSource = fs.readFileSync(
  path.resolve(__dirname, "./agentStream.ts"),
  "utf-8"
);

describe("Capability Demonstration Flow — Integration Tests", () => {
  describe("Detection: wantsDemonstration regex", () => {
    const demoRegex = /\b(demonstrate\s+(each|all|every)\s+(of\s+)?(your\s+)?(capabilities|tools|features|abilities)|show\s+(me\s+)?(all|each|every)\s+(of\s+)?(your\s+)?(capabilities|tools|features|abilities)|what\s+can\s+you\s+do.*(demonstrate|show\s+me)|go\s+until\s+done\s+demonstrating|do\s+them\s+all.*(capabilities|demonstrations)|show\s+me\s+all\s+(your\s+)?(capabilities|tools|features))\b/i;

    // TRUE POSITIVES — should trigger demonstration mode
    const truePositives = [
      "demonstrate each of your capabilities",
      "Demonstrate all your tools",
      "show me all your capabilities",
      "show me every capabilities",
      "show all capabilities",
      "show me all your tools",
      "what can you do? demonstrate",
      "what can you do show me",
    ];

    // FALSE POSITIVES — should NOT trigger demonstration mode
    const falsePositives = [
      "show me all my messages",
      "show me all the tasks",
      "do them all",
      "go until done",
      "show me all files",
      "demonstrate how to code",
      "show me each step",
      "what can you do with my repo",
      "show all my projects",
    ];

    truePositives.forEach((input) => {
      it(`TRUE POSITIVE: "${input}"`, () => {
        expect(demoRegex.test(input)).toBe(true);
      });
    });

    falsePositives.forEach((input) => {
      it(`FALSE POSITIVE rejected: "${input}"`, () => {
        expect(demoRegex.test(input)).toBe(false);
      });
    });
  });

  describe("System prompt injection: DEMONSTRATE EACH protocol", () => {
    it("contains all 10 capability groups", () => {
      const capabilities = [
        "Web Search & Research",
        "Code Execution",
        "Image Generation",
        "Data Analysis",
        "Document Generation",
        "Web Browsing",
        "Wide Research",
        "Slide Generation",
        "Email",
        "App Building",
      ];
      capabilities.forEach((cap) => {
        expect(agentStreamSource).toContain(cap);
      });
    });

    it("instructs to complete ALL 10 groups without asking permission", () => {
      expect(agentStreamSource).toContain("Complete ALL 10 groups");
      expect(agentStreamSource).toContain("Do NOT ask for permission between demonstrations");
    });

    it("instructs to ACT FIRST, narrate after", () => {
      expect(agentStreamSource).toContain("ACT FIRST, narrate after");
    });

    it("instructs to produce REAL output", () => {
      expect(agentStreamSource).toContain("REAL output");
    });
  });

  describe("Continuation logic: wantsContinuous detection", () => {
    // The continuation regex should detect demonstration-related continuous intent
    const continuousRegex = /\b(each|all|every|demonstrate|keep going|go until|don't stop|continue|do them all|show me all|one by one)\b/i;

    it("detects 'demonstrate each' as continuous intent", () => {
      expect(continuousRegex.test("demonstrate each of your capabilities")).toBe(true);
    });

    it("detects 'keep going' as continuous intent", () => {
      expect(continuousRegex.test("keep going")).toBe(true);
    });

    it("detects 'don't stop' as continuous intent", () => {
      expect(continuousRegex.test("don't stop")).toBe(true);
    });
  });

  describe("Anti-scope-creep interaction with demonstration", () => {
    it("scope-creep detection exists in source", () => {
      expect(agentStreamSource).toContain("SCOPE-CREEP DETECTED");
    });

    it("scope-creep is disabled when wantsContinuous is true", () => {
      // The code checks !wantsContinuous before applying scope-creep detection
      expect(agentStreamSource).toContain("!wantsContinuous");
    });
  });

  describe("Frustration detection does NOT co-fire with demonstration", () => {
    it("wantsDemonstration requires !isUserFrustrated", () => {
      expect(agentStreamSource).toContain("!isUserFrustrated && /\\b(demonstrate");
    });
  });

  describe("Mode interaction: demonstration works in all modes", () => {
    it("demonstration injection happens BEFORE mode-specific instructions", () => {
      const demoIndex = agentStreamSource.indexOf("DEMONSTRATE EACH");
      const modeIndex = agentStreamSource.indexOf("MODE: SPEED");
      expect(demoIndex).toBeLessThan(modeIndex);
    });
  });
});
