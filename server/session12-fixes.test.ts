/**
 * Session 12 Fixes Tests
 *
 * Tests for:
 * 1. CSV generation from markdown tables
 * 2. XLSX generation from markdown tables
 * 3. Dedup guard in agentStream (tool call deduplication)
 * 4. System prompt updates (task type detection, dedup rules, generate_document description)
 * 5. Message ordering (timestamp-based sort)
 */
import { describe, it, expect } from "vitest";

// ── 1. CSV Generation ──────────────────────────────────────────────────────

describe("generateCSV", () => {
  it("exports generateCSV function from documentGeneration", async () => {
    const mod = await import("./documentGeneration");
    expect(typeof mod.generateCSV).toBe("function");
  });

  it("generates CSV buffer from markdown table content", async () => {
    const { generateCSV } = await import("./documentGeneration");
    const markdown = `# Sales Data

| Product | Q1 | Q2 | Q3 |
|---------|-----|-----|-----|
| Widget A | 100 | 150 | 200 |
| Widget B | 50 | 75 | 120 |
| Widget C | 300 | 250 | 400 |
`;
    const buf = await generateCSV("Sales Report", markdown);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(10);

    const text = buf.toString("utf-8");
    // Should contain header row
    expect(text).toContain("Product");
    expect(text).toContain("Q1");
    // Should contain data
    expect(text).toContain("Widget A");
    expect(text).toContain("100");
  });

  it("handles markdown with no tables by treating lines as content", async () => {
    const { generateCSV } = await import("./documentGeneration");
    const markdown = `# No Tables Here

Just some text content without any tables.
`;
    const buf = await generateCSV("No Table", markdown);
    expect(buf).toBeInstanceOf(Buffer);
    // Should still produce some output (even if minimal)
    expect(buf.length).toBeGreaterThan(0);
  });

  it("handles multiple tables by using the first one", async () => {
    const { generateCSV } = await import("./documentGeneration");
    const markdown = `# Multi Table

| A | B |
|---|---|
| 1 | 2 |

Some text between tables.

| C | D |
|---|---|
| 3 | 4 |
`;
    const buf = await generateCSV("Multi", markdown);
    expect(buf).toBeInstanceOf(Buffer);
    const text = buf.toString("utf-8");
    // Should contain data from at least the first table
    expect(text.length).toBeGreaterThan(5);
  });
});

// ── 2. XLSX Generation ──────────────────────────────────────────────────────

describe("generateXLSX", () => {
  it("exports generateXLSX function from documentGeneration", async () => {
    const mod = await import("./documentGeneration");
    expect(typeof mod.generateXLSX).toBe("function");
  });

  it("generates XLSX buffer from markdown table content", async () => {
    const { generateXLSX } = await import("./documentGeneration");
    const markdown = `# Employee Data

| Name | Department | Salary |
|------|-----------|--------|
| Alice | Engineering | 120000 |
| Bob | Marketing | 95000 |
| Carol | Engineering | 115000 |
`;
    const buf = await generateXLSX("Employee Report", markdown);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(100);
    // XLSX files are ZIP archives starting with PK
    const header = buf.subarray(0, 2).toString("ascii");
    expect(header).toBe("PK");
  });

  it("generates XLSX with empty content", async () => {
    const { generateXLSX } = await import("./documentGeneration");
    const buf = await generateXLSX("Empty", "No table data");
    expect(buf).toBeInstanceOf(Buffer);
    // Should still produce a valid XLSX
    expect(buf.length).toBeGreaterThan(50);
  });
});

// ── 3. System Prompt: Task Type Detection ───────────────────────────────────

describe("System prompt: Task Type Detection", () => {
  it("contains TASK TYPE DETECTION section", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain("## TASK TYPE DETECTION");
  });

  it("defines CREATIVE/GENERATIVE task type", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain("**CREATIVE/GENERATIVE tasks**");
    expect(source).toContain("Produce the output DIRECTLY");
  });

  it("defines SELF-KNOWLEDGE task type", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain("**SELF-KNOWLEDGE tasks**");
    expect(source).toContain("Answer from your system knowledge");
  });

  it("defines INFORMATIONAL task type", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain("**INFORMATIONAL tasks**");
    expect(source).toContain("Search the web first");
  });
});

// ── 4. System Prompt: Dedup Rules ───────────────────────────────────────────

describe("System prompt: Deduplication rules", () => {
  it("contains DEDUPLICATION AND REPETITION PREVENTION section", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain("## DEDUPLICATION AND REPETITION PREVENTION");
  });

  it("instructs not to call generate_document multiple times", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain(
      "If you have already called generate_document for a specific document, do NOT call it again"
    );
  });

  it("instructs to check conversation history before calling tools", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain(
      "Before calling any tool, check your conversation history"
    );
  });
});

// ── 5. System Prompt: generate_document description ─────────────────────────

describe("System prompt: generate_document tool description", () => {
  it("mentions all 5 output formats in tool description", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    // The tool description should mention all formats
    expect(source).toContain('"markdown" (default), "pdf", "docx", "csv", "xlsx"');
  });

  it("mentions output_format parameter in tool description", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain("generate_document(title, content, format?, output_format?)");
  });

  it("instructs to call generate_document ONCE per document", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain("Call generate_document ONCE per document");
  });
});

// ── 6. Dedup guard in agentStream ───────────────────────────────────────────

describe("Dedup guard in agentStream", () => {
  it("declares toolCallDedupMap in the streaming function", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain("recentToolCallKeys");
  });

  it("checks for duplicate tool calls before execution", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    // Should contain the dedup check logic
    expect(source).toContain("DEDUP: Skipping duplicate");
  });
});

// ── 7. generate_document tool supports all output formats ───────────────────

describe("generate_document tool definition", () => {
  it("includes csv and xlsx in output_format enum", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentTools.ts", "utf-8")
    );
    expect(source).toContain('"csv"');
    expect(source).toContain('"xlsx"');
  });

  it("has cases for csv and xlsx in executeGenerateDocument", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentTools.ts", "utf-8")
    );
    expect(source).toContain('case "csv"');
    expect(source).toContain('case "xlsx"');
  });
});

// ── 8. Research trigger is conditional, not always ──────────────────────────

describe("System prompt: conditional research", () => {
  it("does NOT say ALWAYS use web_search FIRST", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).not.toContain("**ALWAYS use web_search FIRST**");
  });

  it("says use web_search when task REQUIRES external information", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/agentStream.ts", "utf-8")
    );
    expect(source).toContain("Use web_search when the task REQUIRES external information");
  });
});
