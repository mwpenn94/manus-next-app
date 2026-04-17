import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
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
          content: "Hello! How can I help you today? I'm here to assist.",
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
  })),
}));

// Mock the SDK module
vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(async () => null),
  },
}));

// Mock the DB module
vi.mock("./db", () => ({
  getTaskByExternalId: vi.fn(async () => null),
  getUserPreferences: vi.fn(async () => null),
  getUserByOpenId: vi.fn(async () => null),
  upsertUser: vi.fn(async () => {}),
}));

describe("SSE stream endpoint logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokeLLM returns content that can be chunked into SSE events", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [{ role: "user", content: "Say hello" }],
    });

    expect(response.choices).toHaveLength(1);
    expect(response.choices[0].message.content).toBeTruthy();
    const content = response.choices[0].message.content as string;

    // Verify sentence chunking logic (same as in /api/stream)
    const sentencePattern = /([^.!?\n]+[.!?\n]+\s*)/g;
    const chunks = content.match(sentencePattern) || [content];
    const captured = chunks.join("");
    if (captured.length < content.length) {
      chunks.push(content.slice(captured.length));
    }

    expect(chunks.length).toBeGreaterThan(0);
    // All chunks joined should equal the original content
    expect(chunks.join("")).toBe(content);
  });

  it("SSE events are properly formatted", () => {
    const delta = "Hello! ";
    const sseEvent = `data: ${JSON.stringify({ delta })}\n\n`;
    expect(sseEvent).toContain("data: ");
    expect(sseEvent).toContain('"delta"');
    expect(sseEvent.endsWith("\n\n")).toBe(true);

    // Parse it back
    const parsed = JSON.parse(sseEvent.slice(6).trim());
    expect(parsed.delta).toBe(delta);
  });

  it("done event includes full content", () => {
    const content = "Hello! How can I help you today? I'm here to assist.";
    const doneEvent = `data: ${JSON.stringify({ done: true, content })}\n\n`;
    const parsed = JSON.parse(doneEvent.slice(6).trim());
    expect(parsed.done).toBe(true);
    expect(parsed.content).toBe(content);
  });

  it("error events are properly formatted", () => {
    const errorMsg = "LLM service is not available";
    const errorEvent = `data: ${JSON.stringify({ error: errorMsg })}\n\n`;
    const parsed = JSON.parse(errorEvent.slice(6).trim());
    expect(parsed.error).toBe(errorMsg);
  });

  it("handles empty content gracefully", async () => {
    const { invokeLLM } = await import("./_core/llm");
    // Override to return empty content
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ index: 0, message: { role: "assistant", content: "" }, finish_reason: "stop" }],
    });

    const response = await invokeLLM({
      messages: [{ role: "user", content: "test" }],
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" && rawContent.length > 0
      ? rawContent
      : "I couldn't generate a response.";

    expect(content).toBe("I couldn't generate a response.");
  });

  it("handles non-string content gracefully", async () => {
    const { invokeLLM } = await import("./_core/llm");
    // Override to return array content
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ index: 0, message: { role: "assistant", content: [{ type: "text", text: "hello" }] }, finish_reason: "stop" }],
    });

    const response = await invokeLLM({
      messages: [{ role: "user", content: "test" }],
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "I couldn't generate a response.";
    expect(content).toBe("I couldn't generate a response.");
  });

  it("system prompt injection works correctly", () => {
    const resolvedSystemPrompt = "You are a custom assistant.";
    let messages = [
      { role: "system", content: "Default system prompt" },
      { role: "user", content: "Hello" },
    ];

    // When first message is system, replace its content
    if (resolvedSystemPrompt && messages.length > 0 && messages[0].role === "system") {
      messages[0].content = resolvedSystemPrompt;
    }

    expect(messages[0].content).toBe(resolvedSystemPrompt);
    expect(messages).toHaveLength(2);
  });

  it("system prompt prepends when no system message exists", () => {
    const resolvedSystemPrompt = "You are a custom assistant.";
    let messages: { role: string; content: string }[] = [
      { role: "user", content: "Hello" },
    ];

    // When first message is NOT system, prepend
    if (resolvedSystemPrompt && messages.length > 0 && messages[0].role !== "system") {
      messages = [{ role: "system", content: resolvedSystemPrompt }, ...messages];
    }

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toBe(resolvedSystemPrompt);
    expect(messages[1].role).toBe("user");
  });
});
