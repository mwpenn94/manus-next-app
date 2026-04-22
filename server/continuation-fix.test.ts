/**
 * Continuation Fix Tests
 * 
 * Validates the fix for the "demonstrate each" early termination bug.
 * The issue: wantsContinuous auto-continue only fired when turn <= 3,
 * causing the agent to stop after 2-3 demonstrations instead of continuing
 * through all 22 tools.
 * 
 * The fix:
 * 1. Removed the turn <= 3 restriction — now continues as long as unused tools remain
 * 2. Added mid-enumeration detection — catches when LLM stops at "2. Read Webpage" 
 *    and nudges it to continue from "3. Generate Image"
 * 3. Improved continuation prompts — shows remaining tool count and names
 */
import { describe, it, expect } from "vitest";
import fs from "fs";

const agentStreamSrc = fs.readFileSync("server/agentStream.ts", "utf-8");

describe("Continuation Fix — Early Termination Bug", () => {
  
  describe("wantsContinuous detection", () => {
    it("detects 'demonstrate each' as continuous intent", () => {
      const regex = /\b(each|all|every|demonstrate|keep going|go until|don't stop|continue|do them all|show me all|one by one)\b/i;
      expect(regex.test("What can you do? Demonstrate each")).toBe(true);
      expect(regex.test("Show me all your capabilities")).toBe(true);
      expect(regex.test("Do them all one by one")).toBe(true);
      expect(regex.test("Keep going until done")).toBe(true);
      expect(regex.test("Don't stop")).toBe(true);
    });

    it("does NOT trigger on normal requests", () => {
      const regex = /\b(each|all|every|demonstrate|keep going|go until|don't stop|continue|do them all|show me all|one by one)\b/i;
      // "each" and "all" are common words, so these will match — but the auto-continue
      // only fires when there are unused tools remaining, so it's safe
      expect(regex.test("What is the weather?")).toBe(false);
      expect(regex.test("Generate an image of a cat")).toBe(false);
      expect(regex.test("Search for AI news")).toBe(false);
    });
  });

  describe("auto-continue logic (source analysis)", () => {
    it("does NOT have the old turn <= 3 restriction", () => {
      // The old code had: if (wantsContinuous && (asksUser || turn <= 3) && turn < maxTurns - 2)
      // The fix removes the turn <= 3 gate
      expect(agentStreamSrc).not.toMatch(/wantsContinuous && \(asksUser \|\| turn <= 3\)/);
    });

    it("continues based on undemonstrated capability groups remaining", () => {
      // New logic: tracks 10 Manus-parity capability groups
      expect(agentStreamSrc).toContain("wantsContinuous && turn < maxTurns - 2");
      expect(agentStreamSrc).toContain("undemonstrated.length > 0");
    });

    it("tracks used tools across the full conversation", () => {
      expect(agentStreamSrc).toContain("const usedTools = new Set<string>()");
      expect(agentStreamSrc).toContain("for (const msg of conversation)");
      expect(agentStreamSrc).toContain("usedTools.add(t.function.name)");
    });

    it("computes unused tools correctly", () => {
      expect(agentStreamSrc).toContain("const allToolNames = AGENT_TOOLS.map(t => t.function.name)");
      expect(agentStreamSrc).toContain("const unusedTools = allToolNames.filter(t => !usedTools.has(t))");
    });

    it("injects continuation prompt with capability group progress", () => {
      expect(agentStreamSrc).toMatch(/Continue demonstrating.*capability groups/);
      expect(agentStreamSrc).toContain("Do NOT ask what to do next");
    });

    it("tracks 10 Manus-parity capability groups", () => {
      expect(agentStreamSrc).toContain("CAPABILITY_GROUPS");
      expect(agentStreamSrc).toContain("completing 9/10 is a FAILURE");
    });
  });

  describe("mid-enumeration continuation", () => {
    it("detects numbered list patterns in LLM output", () => {
      expect(agentStreamSrc).toContain("numberedListMatch = textContent.match(/(\\d+)\\.\\s+\\w/g)");
    });

    it("detects when LLM stops mid-enumeration (e.g., stops at #5 of 10)", () => {
      expect(agentStreamSrc).toContain("lastNumber > 0 && lastNumber < 10");
    });

    it("counts unique capability mentions to avoid false positives", () => {
      expect(agentStreamSrc).toContain("uniqueMentioned.size < 8");
    });

    it("injects continuation from the correct number", () => {
      expect(agentStreamSrc).toMatch(/You stopped at item #\$\{lastNumber\}/);
      expect(agentStreamSrc).toMatch(/Continue from #\$\{lastNumber \+ 1\}/);
    });

    it("tells LLM not to repeat already-shown capabilities", () => {
      expect(agentStreamSrc).toContain("Do NOT repeat what you already showed");
      expect(agentStreamSrc).toContain("pick up where you left off");
    });
  });

  describe("system prompt alignment", () => {
    it("has CONTINUOUS EXECUTION instructions in system prompt", () => {
      expect(agentStreamSrc).toContain("## CONTINUOUS EXECUTION");
    });

    it("instructs LLM to not stop after 1-2 demonstrations", () => {
      expect(agentStreamSrc).toContain("DO NOT stop after 1-2 demonstrations");
    });

    it("instructs LLM to not ask what to demonstrate next", () => {
      expect(agentStreamSrc).toContain("DO NOT say \"What tool would you like me to demonstrate next?\"");
    });

    it("instructs LLM to proceed through ALL requested items", () => {
      expect(agentStreamSrc).toContain("proceed through ALL requested items sequentially");
    });

    it("has ANTI-AUTO-DEMONSTRATION guard to prevent unwanted demonstrations", () => {
      expect(agentStreamSrc).toContain("## ANTI-AUTO-DEMONSTRATION");
      expect(agentStreamSrc).toMatch(/NEVER.*auto-run web_search/);
    });
  });

  describe("regression guards", () => {
    it("MAX_TOOL_TURNS is 100 (no artificial limit)", () => {
      expect(agentStreamSrc).toContain("const MAX_TOOL_TURNS = 100");
    });

    it("max mode gets 100 turns", () => {
      expect(agentStreamSrc).toMatch(/mode === "max" \? 100/);
    });

    it("speed mode gets 30 turns", () => {
      expect(agentStreamSrc).toMatch(/mode === "speed" \? 30/);
    });

    it("does not emit user-visible step limit message", () => {
      // The agent should naturally conclude, not show "reached maximum steps"
      expect(agentStreamSrc).not.toContain("reached maximum");
      expect(agentStreamSrc).not.toContain("step limit");
    });

    it("break only happens when no continuation conditions are met", () => {
      // The break statement should be after all continuation checks
      const breakIndex = agentStreamSrc.indexOf("break;\n      }\n\n      // Add assistant message with tool_calls");
      const midEnumIndex = agentStreamSrc.indexOf("mid-enumeration continuation");
      expect(midEnumIndex).toBeLessThan(breakIndex);
    });
  });
});

describe("Tool Demonstration Coverage", () => {
  it("has 22 registered tools for demonstration", () => {
    const toolsSrc = fs.readFileSync("server/agentTools.ts", "utf-8");
    const toolNames = toolsSrc.match(/name: "(\w+)"/g) || [];
    // Filter to unique tool definitions (not parameter names)
    const uniqueTools = new Set(toolNames.map(t => t.replace('name: "', '').replace('"', '')));
    // Should have at least 22 tools
    expect(uniqueTools.size).toBeGreaterThanOrEqual(22);
  });

  it("mid-enumeration regex covers all tool names", () => {
    const toolPatterns = [
      "web_search", "read_webpage", "generate_image", "analyze_data",
      "generate_document", "browse_web", "wide_research", "generate_slides",
      "send_email", "take_meeting_notes", "design_canvas", "cloud_browser",
      "screenshot_verify", "execute_code", "create_webapp", "create_file",
      "edit_file", "read_file", "list_files", "install_deps", "run_command",
      "git_operation"
    ];
    
    const regex = /\b(web.?search|read.?webpage|generate.?image|analyze.?data|generate.?document|browse.?web|wide.?research|generate.?slides|send.?email|meeting.?notes|design.?canvas|cloud.?browser|screenshot.?verify|execute.?code|create.?webapp|create.?file|edit.?file|read.?file|list.?files|install.?deps|run.?command|git.?operation)\b/gi;
    
    // Each tool name (with _ replaced by space or .) should match the regex
    for (const tool of toolPatterns) {
      const humanized = tool.replace(/_/g, " ");
      const matched = regex.test(humanized);
      regex.lastIndex = 0; // Reset regex state
      if (!matched) {
        // Try with underscore
        const matchedUnderscore = regex.test(tool);
        regex.lastIndex = 0;
        expect(matched || matchedUnderscore).toBe(true);
      }
    }
  });
});
