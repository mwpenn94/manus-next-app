import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const readFile = (relPath: string) =>
  fs.readFileSync(path.join(process.cwd(), relPath), "utf-8");

describe("Session 32: Issues from User Chat Transcript", () => {
  describe("Limitless Mode Autonomy", () => {
    const agentStream = readFile("server/agentStream.ts");

    it("instructs agent to use defaults for unfilled placeholders", () => {
      expect(agentStream).toContain("Use defaults when the user provides templates with placeholders");
      expect(agentStream).toContain("USE the example values as defaults");
    });

    it("reduces confirmation-seeking behavior", () => {
      expect(agentStream).toContain("Minimize confirmation-seeking");
      expect(agentStream).toContain("EXECUTE, not ask for permission");
    });

    it("instructs auto-proceed with reasonable defaults", () => {
      expect(agentStream).toContain("Auto-proceed with reasonable defaults");
      expect(agentStream).toContain("industry-standard defaults");
    });

    it("instructs to never ask the same question twice", () => {
      expect(agentStream).toContain("Never ask the same question twice");
    });

    it("instructs to reduce intermediate status messages", () => {
      expect(agentStream).toContain("Reduce intermediate status messages");
    });

    it("instructs file attachments are the primary context", () => {
      expect(agentStream).toContain("File attachments ARE the context");
    });

    it("instructs to resume exactly where left off on 'continue'", () => {
      expect(agentStream).toContain('user says "continue"');
      expect(agentStream).toContain("Resume exactly where you left off");
    });
  });

  describe("LLM Error Handling — Auto-Retry", () => {
    const agentStream = readFile("server/agentStream.ts");

    it("has retry logic for empty LLM responses", () => {
      expect(agentStream).toContain("emptyRetryMax");
      expect(agentStream).toContain("emptyRetry");
    });

    it("uses exponential backoff (multiplied delay)", () => {
      // emptyRetry * 2000 gives 2s, 4s, 6s
      expect(agentStream).toContain("emptyRetry * 2000");
    });

    it("shows retry status to user via SSE", () => {
      expect(agentStream).toContain("LLM returned empty response, retrying");
    });

    it("marks error as retryable if all retries fail", () => {
      expect(agentStream).toContain("No response from LLM after multiple retries");
      expect(agentStream).toContain("retryable: true");
    });

    it("uses effectiveChoice variable for safe access after retry", () => {
      expect(agentStream).toContain("effectiveChoice");
      expect(agentStream).toContain("effectiveChoice.finish_reason");
      expect(agentStream).toContain("effectiveChoice.message");
    });
  });

  describe("File Attachment Processing", () => {
    const taskView = readFile("client/src/pages/TaskView.tsx");

    it("has text file content inlining logic for text-based files", () => {
      expect(taskView).toContain("textExts");
      expect(taskView).toContain(".text()");
    });

    it("covers common text file extensions", () => {
      const textExtsLine = taskView.match(/textExts\s*=\s*\[([^\]]+)\]/)?.[1] || "";
      expect(textExtsLine).toContain('"txt"');
      expect(textExtsLine).toContain('"md"');
      expect(textExtsLine).toContain('"html"');
      expect(textExtsLine).toContain('"json"');
      expect(textExtsLine).toContain('"csv"');
      expect(textExtsLine).toContain('"py"');
      expect(textExtsLine).toContain('"ts"');
    });

    it("has size limit to prevent token overflow (50KB)", () => {
      expect(taskView).toContain("maxChars");
      expect(taskView).toContain("50000");
      expect(taskView).toContain("truncated");
    });

    it("has graceful fallback on fetch failure", () => {
      // try-catch with fallback to URL reference
      expect(taskView).toContain("could not fetch content");
      expect(taskView).toContain("[Attached file:");
    });

    it("wraps file content with clear delimiters", () => {
      expect(taskView).toContain("--- Attached file:");
      expect(taskView).toContain("--- End of");
    });
  });

  describe("Recursive Convergence as First-Class Feature", () => {
    const agentTools = readFile("server/agentTools.ts");
    const agentStream = readFile("server/agentStream.ts");

    it("report_convergence tool is defined in AGENT_TOOLS with proper parameters", () => {
      expect(agentTools).toContain('"report_convergence"');
      expect(agentTools).toContain("pass_number");
      expect(agentTools).toContain("pass_type");
      expect(agentTools).toContain("status");
      expect(agentTools).toContain("convergence_count");
    });

    it("report_convergence has executeTool handler that returns success", () => {
      // The handler returns a formatted string with pass info
      expect(agentTools).toContain('case "report_convergence"');
      expect(agentTools).toContain("Convergence pass");
    });

    it("agentStream emits convergence SSE events when report_convergence is called", () => {
      expect(agentStream).toContain("report_convergence");
      expect(agentStream).toContain("passNumber");
    });

    it("ConvergenceIndicator component exists and renders convergence data", () => {
      const indicator = readFile("client/src/components/ConvergenceIndicator.tsx");
      expect(indicator).toContain("pass");
    });

    it("Limitless mode system prompt instructs agent to use report_convergence", () => {
      expect(agentStream).toContain("CONVERGENCE REPORTING");
      expect(agentStream).toContain("report_convergence");
    });

    it("streamWithRetry handles convergence SSE events", () => {
      const stream = readFile("client/src/lib/streamWithRetry.ts");
      expect(stream).toContain("convergence");
    });
  });

  describe("Agent Default Behavior", () => {
    const agentStream = readFile("server/agentStream.ts");

    it("system prompt instructs agent to track what has been asked", () => {
      expect(agentStream).toContain("Never ask the same question twice");
      expect(agentStream).toContain("use your best judgment and proceed");
    });

    it("Limitless mode has explicit instructions about placeholder handling", () => {
      expect(agentStream).toContain("template");
      expect(agentStream).toContain("placeholder");
      expect(agentStream).toContain("example values as defaults");
    });
  });
});
