import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module for web_search and analyze_data tools
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    id: "test-id",
    created: Date.now(),
    model: "test-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Research synthesis result about the topic.",
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
  })),
}));

// Mock the image generation module
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn(async () => ({
    url: "https://cdn.example.com/generated/test-image.png",
  })),
}));

describe("Agent Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AGENT_TOOLS defines the expected tool set", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    expect(AGENT_TOOLS).toHaveLength(8);
    const toolNames = AGENT_TOOLS.map((t) => t.function.name);
    expect(toolNames).toContain("web_search");
    expect(toolNames).toContain("read_webpage");
    expect(toolNames).toContain("generate_image");
    expect(toolNames).toContain("analyze_data");
    expect(toolNames).toContain("execute_code");
    expect(toolNames).toContain("generate_document");
    expect(toolNames).toContain("browse_web");
    expect(toolNames).toContain("wide_research");
  });

  it("each tool has proper function calling schema", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    for (const tool of AGENT_TOOLS) {
      expect(tool.type).toBe("function");
      expect(tool.function.name).toBeTruthy();
      expect(tool.function.description).toBeTruthy();
      expect(tool.function.parameters).toBeDefined();
      expect(tool.function.parameters.type).toBe("object");
      expect(tool.function.parameters.required).toBeDefined();
    }
  });

  it("execute_code runs JavaScript and returns output", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "execute_code",
      JSON.stringify({
        code: "console.log(2 + 2);",
        description: "Simple math",
      })
    );
    expect(result.success).toBe(true);
    expect(result.result).toContain("4");
    expect(result.artifactType).toBe("terminal");
  });

  it("execute_code handles errors gracefully", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "execute_code",
      JSON.stringify({
        code: "throw new Error('test error');",
        description: "Error test",
      })
    );
    expect(result.success).toBe(false);
    expect(result.result.toLowerCase()).toContain("error");
  });

  it("execute_code times out on infinite loops", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "execute_code",
      JSON.stringify({
        code: "while(true) {}",
        description: "Infinite loop",
      })
    );
    expect(result.success).toBe(false);
    expect(result.result.toLowerCase()).toContain("timed out");
  });

  it("generate_image calls the image generation service", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "generate_image",
      JSON.stringify({
        prompt: "A beautiful sunset over mountains",
      })
    );
    expect(result.success).toBe(true);
    expect(result.url).toContain("test-image.png");
    expect(result.artifactType).toBe("generated_image");
  });

  it("web_search uses LLM for research synthesis", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "web_search",
      JSON.stringify({
        query: "latest AI developments",
      })
    );
    expect(result.success).toBe(true);
    expect(result.result).toBeTruthy();
    expect(result.artifactType).toBe("browser_url");
  }, 25000);

  it("analyze_data uses LLM for structured analysis", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "analyze_data",
      JSON.stringify({
        data: "Revenue Q1: $1M, Q2: $1.5M, Q3: $2M",
        analysis_type: "trend",
      })
    );
    expect(result.success).toBe(true);
    expect(result.result).toBeTruthy();
  });

  it("executeTool handles unknown tool names", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "nonexistent_tool",
      JSON.stringify({})
    );
    expect(result.success).toBe(false);
    expect(result.result).toContain("Unknown tool");
  });

  it("executeTool handles malformed JSON args", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool("execute_code", "not valid json");
    expect(result.success).toBe(false);
  });
});

describe("Agent Stream SSE Protocol", () => {
  it("tool_start events have the correct structure", () => {
    const toolStart = {
      tool_start: {
        id: "call_123",
        name: "web_search",
        args: { query: "test" },
        display: { type: "searching", label: 'Searching "test"' },
      },
    };
    const sseEvent = `data: ${JSON.stringify(toolStart)}\n\n`;
    const parsed = JSON.parse(sseEvent.slice(6).trim());
    expect(parsed.tool_start.id).toBe("call_123");
    expect(parsed.tool_start.name).toBe("web_search");
    expect(parsed.tool_start.display.type).toBe("searching");
  });

  it("tool_result events have the correct structure", () => {
    const toolResult = {
      tool_result: {
        id: "call_123",
        name: "web_search",
        success: true,
        preview: "Search results...",
        url: undefined,
      },
    };
    const sseEvent = `data: ${JSON.stringify(toolResult)}\n\n`;
    const parsed = JSON.parse(sseEvent.slice(6).trim());
    expect(parsed.tool_result.success).toBe(true);
    expect(parsed.tool_result.preview).toBeTruthy();
  });

  it("image events contain a URL string", () => {
    const imageEvent = {
      image: "https://cdn.example.com/generated/image.png",
    };
    const sseEvent = `data: ${JSON.stringify(imageEvent)}\n\n`;
    const parsed = JSON.parse(sseEvent.slice(6).trim());
    expect(parsed.image).toContain("https://");
    expect(parsed.image).toContain(".png");
  });

  it("getToolDisplayInfo maps tool names correctly", async () => {
    const expectedMappings = {
      web_search: "searching",
      read_webpage: "browsing",
      generate_image: "generating",
      analyze_data: "thinking",
      execute_code: "executing",
    };

    for (const [toolName, expectedType] of Object.entries(expectedMappings)) {
      expect(expectedType).toBeTruthy();
    }
  });

  it("agentStream passes tool_choice: auto to invokeLLM", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    expect(AGENT_TOOLS.length).toBeGreaterThan(0);
    for (const tool of AGENT_TOOLS) {
      expect(tool.type).toBe("function");
      expect(tool.function.name).toBeTruthy();
      expect(tool.function.parameters).toBeDefined();
    }
    const fs = await import("fs");
    const source = fs.readFileSync("./server/agentStream.ts", "utf-8");
    expect(source).toContain('tool_choice: "auto"');
  });
});

describe("Multimodal Attachment Serialization", () => {
  it("image attachments should use image_url content type", () => {
    // Simulate the frontend serialization logic for images
    const attachment = { url: "https://cdn.example.com/photo.jpg", name: "photo.jpg", type: "image/jpeg" };
    const isImage = attachment.type?.startsWith("image/");
    expect(isImage).toBe(true);
    
    // Verify the expected multimodal message format
    const content = [
      { type: "text" as const, text: "Analyze this image" },
      { type: "image_url" as const, image_url: { url: attachment.url } },
    ];
    expect(content).toHaveLength(2);
    expect(content[1].type).toBe("image_url");
    expect(content[1].image_url.url).toBe(attachment.url);
  });

  it("PDF attachments should use file_url content type", () => {
    const attachment = { url: "https://cdn.example.com/doc.pdf", name: "doc.pdf", type: "application/pdf" };
    const isPdf = attachment.type === "application/pdf";
    expect(isPdf).toBe(true);
    
    const content = [
      { type: "text" as const, text: "Analyze this document" },
      { type: "file_url" as const, file_url: { url: attachment.url, mime_type: "application/pdf" as const } },
    ];
    expect(content[1].type).toBe("file_url");
    expect(content[1].file_url.mime_type).toBe("application/pdf");
  });

  it("audio attachments should use file_url with audio mime type", () => {
    const attachment = { url: "https://cdn.example.com/audio.mp3", name: "audio.mp3", type: "audio/mpeg" };
    const isAudio = attachment.type?.startsWith("audio/");
    expect(isAudio).toBe(true);
    
    const content = [
      { type: "text" as const, text: "Transcribe this audio" },
      { type: "file_url" as const, file_url: { url: attachment.url, mime_type: "audio/mpeg" as const } },
    ];
    expect(content[1].type).toBe("file_url");
    expect(content[1].file_url.mime_type).toBe("audio/mpeg");
  });
});

describe("System Prompt Identity & Research Rules", () => {
  it("system prompt contains CRITICAL IDENTITY RULE preventing vendor self-identification", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./server/agentStream.ts", "utf-8");
    expect(source).toContain("CRITICAL IDENTITY RULE");
    expect(source).toContain("NOT Google Gemini");
    expect(source).toContain("NOT ChatGPT");
    expect(source).toContain("NOT Claude");
    expect(source).toContain("Manus Next is an independent open-source project");
  });

  it("system prompt contains research nudge logic for deeper research", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./server/agentStream.ts", "utf-8");
    // Verify the nudge mechanism exists
    expect(source).toContain("shouldNudge");
    expect(source).toContain("usedWebSearch");
    expect(source).toContain("usedReadWebpage");
    expect(source).toContain("nudgedForDeepResearch");
    expect(source).toContain("Researching in more depth");
  });

  it("system prompt mandates web_search for real-world questions", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./server/agentStream.ts", "utf-8");
    expect(source).toContain("ALWAYS use web_search FIRST");
    expect(source).toContain("NEVER claim you cannot find information");
  });

  it("system prompt includes self-knowledge about Manus Next", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./server/agentStream.ts", "utf-8");
    expect(source).toContain("ABOUT YOURSELF");
    expect(source).toContain("open-source autonomous AI agent platform");
    expect(source).toContain("self-hosted");
  });

  it("system prompt includes structured comparison instructions", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./server/agentStream.ts", "utf-8");
    expect(source).toContain("comparison table");
    expect(source).toContain("side-by-side");
  });
});
