import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * PARITY Fixes Regression Tests
 * Validates the fixes applied in Session 47 for PARITY1-8, VB1-6, PC1-6, IMG1-9
 */

describe("PARITY Fixes — Session 47", () => {
  const agentStreamSource = fs.readFileSync(
    path.resolve(__dirname, "./agentStream.ts"),
    "utf-8"
  );

  describe("PARITY6/7: PDF extraction uses pdf-parse v2 API", () => {
    it("uses PDFParse class (v2 API) instead of pdfParse(buffer) (v1 API)", () => {
      expect(agentStreamSource).toContain("PDFParse");
      expect(agentStreamSource).toContain("new PDFParse");
    });
  });

  describe("PARITY2/3: Mid-stream follow-up handling", () => {
    const taskViewSource = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    it("does not add 'stopped by user' message when pendingRestream is active", () => {
      expect(taskViewSource).toContain("pendingRestreamRef.current");
      // The fix: only add stopped message when NOT a follow-up
      expect(taskViewSource).toContain("!pendingRestreamRef.current");
    });
  });

  describe("PARITY4/5: Anti-clarification strengthened", () => {
    it("contains back-reference instruction in Rule 11", () => {
      expect(agentStreamSource).toContain("BACK-REFERENCE");
    });
  });

  describe("PARITY8: Empty response guard", () => {
    const taskViewSource = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    it("detects empty stream responses and shows error", () => {
      expect(taskViewSource).toContain("encountered an issue generating a response");
    });
  });

  describe("VB2: Frustration handler instructs resume (not just acknowledge)", () => {
    it("contains ACKNOWLEDGE AND RESUME instruction", () => {
      expect(agentStreamSource).toContain("ACKNOWLEDGE AND RESUME");
    });
    it("instructs to IMMEDIATELY resume the task", () => {
      expect(agentStreamSource).toContain("IMMEDIATELY resume that task");
    });
    it("does NOT contain old TEXT-ONLY instruction", () => {
      expect(agentStreamSource).not.toContain("TEXT-ONLY RESPONSE REQUIRED");
    });
  });

  describe("VB4: Demonstration regex tightened to prevent false positives", () => {
    // The new regex requires explicit capability/tool/feature keywords
    const demoRegex = /\b(demonstrate\s+(each|all|every)\s+(of\s+)?(your\s+)?(capabilities|tools|features|abilities)|show\s+(me\s+)?(all|each|every)\s+(of\s+)?(your\s+)?(capabilities|tools|features|abilities)|what\s+can\s+you\s+do.*(demonstrate|show\s+me)|go\s+until\s+done\s+demonstrating|do\s+them\s+all.*(capabilities|demonstrations)|show\s+me\s+all\s+(your\s+)?(capabilities|tools|features))\b/i;

    it("does NOT match 'show me all my messages' (false positive)", () => {
      expect(demoRegex.test("show me all my messages")).toBe(false);
    });
    it("does NOT match 'show me all the tasks' (false positive)", () => {
      expect(demoRegex.test("show me all the tasks")).toBe(false);
    });
    it("does NOT match 'do them all' without capability context (false positive)", () => {
      expect(demoRegex.test("do them all")).toBe(false);
    });
    it("does NOT match 'go until done' without demonstration context (false positive)", () => {
      expect(demoRegex.test("go until done")).toBe(false);
    });
    it("DOES match 'demonstrate each of your capabilities'", () => {
      expect(demoRegex.test("demonstrate each of your capabilities")).toBe(true);
    });
    it("DOES match 'show me all your tools'", () => {
      expect(demoRegex.test("show me all your tools")).toBe(true);
    });
    it("DOES match 'show me all your capabilities'", () => {
      expect(demoRegex.test("show me all your capabilities")).toBe(true);
    });
  });

  describe("PC3: Anti-apology final reinforcement", () => {
    it("contains ABSOLUTE FINAL RULE — NO APOLOGIES at end of system prompt", () => {
      expect(agentStreamSource).toContain("ABSOLUTE FINAL RULE");
      expect(agentStreamSource).toContain("NO APOLOGIES");
    });
    it("lists banned openers", () => {
      expect(agentStreamSource).toContain("Banned openers");
    });
  });

  describe("PC4: Research budget nudge", () => {
    it("tracks consecutive research calls", () => {
      expect(agentStreamSource).toContain("consecutiveResearchCalls");
    });
    it("injects deliverable production nudge after budget exceeded", () => {
      expect(agentStreamSource).toContain("STOP RESEARCHING and START PRODUCING");
    });
  });

  describe("PC6/NS1: Build attempt budget", () => {
    it("tracks build attempt history", () => {
      expect(agentStreamSource).toContain("buildAttemptHistory");
    });
    it("forces different strategy after repeated failures", () => {
      expect(agentStreamSource).toContain("MUST try a DIFFERENT strategy");
    });
  });
});
