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

describe("Anti-premature-completion detection", () => {
  // Regex patterns from agentStream.ts
  const wantsCreativeOutputPattern = /\b(generate|create|write|make|draft|build|design|plan|guide|step.?by.?step|outline|script|story|tutorial|curriculum|template|proposal|report)\b/i;
  const claimsFulfilledPattern = /\b(already (fulfilled|provided|answered|completed|addressed)|I (have|believe I have) (already|previously)|comparison table isn.t (directly )?applicable|Therefore.{0,30}I (have|believe))\b/i;
  const isDeflectingPattern = /\b(isn.t (directly )?applicable|not (directly )?applicable|cannot|can.t|unable to|beyond my|outside my)\b/i;

  it("detects creative task requests", () => {
    expect(wantsCreativeOutputPattern.test("generate me a step by step guide to make a video skit")).toBe(true);
    expect(wantsCreativeOutputPattern.test("create a plan for my project")).toBe(true);
    expect(wantsCreativeOutputPattern.test("write a story about a cat")).toBe(true);
    expect(wantsCreativeOutputPattern.test("make a tutorial for React")).toBe(true);
    expect(wantsCreativeOutputPattern.test("draft a proposal for the client")).toBe(true);
    expect(wantsCreativeOutputPattern.test("build an outline for the presentation")).toBe(true);
    expect(wantsCreativeOutputPattern.test("design a curriculum for the course")).toBe(true);
    expect(wantsCreativeOutputPattern.test("step by step guide for cooking")).toBe(true);
    // Non-creative requests should not match
    expect(wantsCreativeOutputPattern.test("what is the weather today")).toBe(false);
    expect(wantsCreativeOutputPattern.test("who is the president")).toBe(false);
  });

  it("detects premature fulfillment claims", () => {
    expect(claimsFulfilledPattern.test("I have already fulfilled the request for detailed information")).toBe(true);
    expect(claimsFulfilledPattern.test("I have already provided a comprehensive answer")).toBe(true);
    expect(claimsFulfilledPattern.test("I believe I have already addressed this")).toBe(true);
    expect(claimsFulfilledPattern.test("A comparison table isn't directly applicable here")).toBe(true);
    expect(claimsFulfilledPattern.test("Therefore, I believe I have already fulfilled the request")).toBe(true);
    // Normal responses should not match
    expect(claimsFulfilledPattern.test("Here is the step by step guide you requested")).toBe(false);
    expect(claimsFulfilledPattern.test("Let me create that for you")).toBe(false);
  });

  it("detects deflection on creative tasks", () => {
    expect(isDeflectingPattern.test("A comparison table isn't directly applicable here as the request was for the meaning of a song")).toBe(true);
    expect(isDeflectingPattern.test("This is not directly applicable to the task")).toBe(true);
    expect(isDeflectingPattern.test("I cannot generate that type of content")).toBe(true);
    expect(isDeflectingPattern.test("I'm unable to produce a video script")).toBe(true);
    // Non-deflection should not match
    expect(isDeflectingPattern.test("Here is the guide you requested")).toBe(false);
  });

  it("correctly identifies the Casting Crowns chat log scenario", () => {
    const userText = "generate me a step by step guide to make a youth group video skit to the song from casting crowns does anybody hear her";
    const llmResponse = "I have already used web_search and provided a comprehensive answer based on the snippets and an initial read of the most relevant URLs. A comparison table isn't directly applicable here as the request was for the meaning of a song, not a comparison between different entities. Therefore, I believe I have already fulfilled the request for detailed information.";

    // User wants creative output
    expect(wantsCreativeOutputPattern.test(userText)).toBe(true);
    // LLM claims fulfillment
    expect(claimsFulfilledPattern.test(llmResponse)).toBe(true);
    // LLM is deflecting
    expect(isDeflectingPattern.test(llmResponse)).toBe(true);

    // Both conditions met → anti-premature-completion should trigger
    const shouldNudge = (claimsFulfilledPattern.test(llmResponse) || (isDeflectingPattern.test(llmResponse) && wantsCreativeOutputPattern.test(userText))) && wantsCreativeOutputPattern.test(userText);
    expect(shouldNudge).toBe(true);
  });

  it("does NOT trigger anti-premature-completion for genuine research answers", () => {
    const userText = "what is the meaning of the song does anybody hear her";
    const llmResponse = "Based on my research, the song 'Does Anybody Hear Her' by Casting Crowns is about the church's failure to reach out to those who are hurting and lost.";

    // User is asking a question, not requesting creative output
    expect(wantsCreativeOutputPattern.test(userText)).toBe(false);
    // LLM is not claiming premature fulfillment
    expect(claimsFulfilledPattern.test(llmResponse)).toBe(false);
  });

  it("system prompt includes creative task completion rules", async () => {
    // Read the DEFAULT_SYSTEM_PROMPT from agentStream.ts
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("ALWAYS COMPLETE THE USER'S ACTUAL REQUEST");
    expect(content).toContain("NEVER claim you have \"already fulfilled\"");
    expect(content).toContain("NEVER refuse creative or generative tasks");
    expect(content).toContain("TASK COMPLETION VERIFICATION");
    expect(content).toContain("Searching for information is NOT the same as producing the requested output");
  });
});
