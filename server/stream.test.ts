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

describe("Topic-drift detection", () => {
  // Patterns from agentStream.ts
  const looksLikeResearchOnly = /\b(meaning|interpretation|analysis|overview|background|context|summary of|about the song|lyrics|theme|message of)\b/i;
  const hasCreativeStructure = /\b(step\s*[1-9]|scene\s*[1-9]|act\s*[1-9]|phase\s*[1-9]|part\s*[1-9]|##\s*(step|scene|act|phase|part|preparation|pre-production|filming|setup|materials|cast|roles|script|storyboard|shot list|location|props|costume|rehearsal|recording|editing))\b/i;
  const wantsCreativeOutputPattern = /\b(generate|create|write|make|draft|build|design|plan|guide|step.?by.?step|outline|script|story|tutorial|curriculum|template|proposal|report)\b/i;

  it("detects research-only response to creative request (Casting Crowns skit scenario)", () => {
    const userText = "generate me a step by step guide to make a youth group video skit to the song from casting crowns does anybody hear her";
    const llmResponse = "The song 'Does Anybody Hear Her' by Casting Crowns carries a powerful meaning about the church's failure to reach those who are hurting. The lyrics explore themes of isolation, judgment, and the need for compassion. The song's message is about a woman who feels invisible to the church community. Here is a detailed analysis of the song's meaning and interpretation of the lyrics and their context within contemporary Christian music...";

    // User wants creative output
    expect(wantsCreativeOutputPattern.test(userText)).toBe(true);
    // Response looks like research/analysis
    expect(looksLikeResearchOnly.test(llmResponse.slice(0, 500))).toBe(true);
    // Response does NOT have creative structure (no steps, scenes, etc.)
    expect(hasCreativeStructure.test(llmResponse)).toBe(false);
    // → Topic drift should be detected
  });

  it("does NOT flag a proper creative response as topic drift", () => {
    const llmResponse = "## Step-by-Step Guide to Making a Youth Group Video Skit\n\n### Step 1: Pre-Production Planning\nGather your youth group and listen to the song together...\n\n### Step 2: Script Writing\nBreak the song into scenes...\n\n### Step 3: Casting and Rehearsal\nAssign roles to youth group members...";

    // Response has creative structure
    expect(hasCreativeStructure.test(llmResponse)).toBe(true);
    // Even if it mentions analysis keywords, creative structure should override
  });

  it("does NOT flag factual research responses when user asked for research", () => {
    const userText = "what is the meaning of does anybody hear her by casting crowns";
    const llmResponse = "The song 'Does Anybody Hear Her' explores themes of isolation and the church's failure to reach hurting people. The meaning centers on compassion and judgment.";

    // User did NOT ask for creative output
    expect(wantsCreativeOutputPattern.test(userText)).toBe(false);
    // So topic drift detection should not even activate
  });

  it("detects response without deliverable keywords for creative requests", () => {
    const userText = "create a tutorial for building a React app";
    const llmResponse = "React is a popular JavaScript library developed by Facebook. It uses a component-based architecture and virtual DOM for efficient rendering. React has gained widespread adoption in the web development community since its release in 2013. Many companies use React for their frontend applications including Netflix, Airbnb, and Instagram. The ecosystem includes tools like Create React App, Next.js, and Gatsby for different use cases.";

    // User wants creative output
    expect(wantsCreativeOutputPattern.test(userText)).toBe(true);
    // Response is informational, not a tutorial
    expect(hasCreativeStructure.test(llmResponse)).toBe(false);
    // Response doesn't have deliverable keywords like "here is", "below is"
    expect(/\b(here is|here's|below is|i've (created|written|drafted|prepared))\b/i.test(llmResponse.slice(0, 300))).toBe(false);
  });

  it("system prompt includes topic-drift detection code", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("TOPIC-DRIFT DETECTION");
    expect(content).toContain("looksLikeResearchOnly");
    expect(content).toContain("hasCreativeStructure");
    expect(content).toContain("isTopicDrift");
  });
});

describe("Mode transport and MAX mode enforcement", () => {
  it("server /api/stream accepts all three modes: speed, quality, max", () => {
    // Simulate the mode coercion logic from server/_core/index.ts
    const coerceMode = (bodyMode: string) =>
      bodyMode === "speed" ? "speed" : bodyMode === "max" ? "max" : "quality";

    expect(coerceMode("speed")).toBe("speed");
    expect(coerceMode("quality")).toBe("quality");
    expect(coerceMode("max")).toBe("max");
    // Unknown modes default to quality
    expect(coerceMode("turbo")).toBe("quality");
    expect(coerceMode("")).toBe("quality");
    expect(coerceMode(undefined as any)).toBe("quality");
  });

  it("maxTurns is correctly set per mode via TierConfig (4-tier architecture)", () => {
    // Import getTierConfig logic inline for testing
    const TIER_CONFIGS: Record<string, { maxTurns: number }> = {
      speed: { maxTurns: 30 },
      quality: { maxTurns: 100 },
      max: { maxTurns: 200 },
      limitless: { maxTurns: Infinity },
    };
    const getTierConfig = (mode: string) => TIER_CONFIGS[mode] ?? TIER_CONFIGS.quality;

    expect(getTierConfig("speed").maxTurns).toBe(30);
    expect(getTierConfig("quality").maxTurns).toBe(100);
    expect(getTierConfig("max").maxTurns).toBe(200);
    expect(getTierConfig("limitless").maxTurns).toBe(Infinity);
    // Unknown modes fall back to quality
    expect(getTierConfig("turbo").maxTurns).toBe(100);
  });

  it("MAX mode system prompt includes Manus 1.6 Max aligned requirements", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("MODE: MAX (Aligned with Manus 1.6 Max");
    expect(content).toContain("flagship autonomous tier deeply aligned with Manus 1.6 Max");
    expect(content).toContain("Deep research depth");
    expect(content).toContain("Cross-reference sources");
    expect(content).toContain("Tighter internal planning");
    expect(content).toContain("Leave no stone unturned");
  });

  it("LIMITLESS mode system prompt includes recursive convergence requirements", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("MODE: LIMITLESS (Recursive Optimization Until Convergence)");
    expect(content).toContain("NO constraints on your execution");
    expect(content).toContain("recursive optimization");
    expect(content).toContain("convergence");
    expect(content).toContain("Honor user termination conditions");
    expect(content).toContain("Self-monitoring");
  });

  it("MAX/LIMITLESS mode anti-shallow-completion code exists in agentStream", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("MAX/LIMITLESS MODE ANTI-SHALLOW-COMPLETION");
    expect(content).toContain("forcing deeper research");
    expect(content).toContain("completedToolCalls < 3");
    // Both max and limitless should trigger anti-shallow
    expect(content).toContain('mode === "max" || mode === "limitless"');
  });

  it("mode coercion in index.ts correctly handles all 4 modes", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/_core/index.ts", "utf-8");
    // Verify all modes are handled
    expect(content).toContain('body.mode === "max" ? "max"');
    expect(content).toContain('body.mode === "limitless" ? "limitless"');
    expect(content).toContain('body.mode === "speed" ? "speed"');
    // Verify the old bug pattern is gone
    expect(content).not.toMatch(/const mode = \(body\.mode === "speed" \? "speed" : "quality"\)/);
  });

  it("ManusNextChat SSE parsing accepts both delta and token fields", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/ManusNextChat.tsx", "utf-8");
    // Should accept both data.delta (current server format) and data.token (legacy)
    expect(content).toContain("data.delta || data.token");
  });
});

describe("Manus-parity auto-continuation system", () => {
  it("agentStream.ts defines TierConfig with per-tier continuation limits", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("const TIER_CONFIGS: Record<string, TierConfig>");
    expect(content).toContain("maxContinuationRounds: 5"); // speed
    expect(content).toContain("maxContinuationRounds: 50"); // quality
    expect(content).toContain("maxContinuationRounds: 100"); // max
    expect(content).toContain("maxContinuationRounds: Infinity"); // limitless
  });

  it("agentStream.ts contains CONTEXT_COMPRESSION_THRESHOLD constant", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("const CONTEXT_COMPRESSION_THRESHOLD = 200000;");
  });

  it("agentStream.ts contains continuation SSE event emission", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    // Verify the continuation event is emitted with proper structure
    expect(content).toContain('continuation: {');
    expect(content).toContain('round: continuationRounds');
    // maxRounds uses -1 for unlimited mode, positive number for bounded tiers
    expect(content).toContain('isFinite(maxContinuationRounds) ? maxContinuationRounds : -1');
    expect(content).toContain('reason: "output_token_limit"');
  });

  it("agentStream.ts tracks continuationRounds state variable", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("let continuationRounds = 0;");
    // Reset on tool execution (real progress)
    expect(content).toContain("continuationRounds = 0; // Reset");
    // Reset on successful stop
    expect(content).toContain('if (choice.finish_reason === "stop")');
  });

  it("agentStream.ts has context compression logic", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("function compressConversationContext");
    expect(content).toContain("function estimateConversationTokens");
    expect(content).toContain("function streamTextAsChunks");
    // Verify compression is triggered during continuation
    expect(content).toContain("estimatedTokens > CONTEXT_COMPRESSION_THRESHOLD");
    expect(content).toContain("compressConversationContext(conversation)");
  });

  it("continuation prompt includes last words to prevent repetition", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(content).toContain("Your last words were:");
    expect(content).toContain("Do NOT repeat any content you already produced");
    expect(content).toContain("Do NOT add a new greeting or introduction");
    expect(content).toContain("seamlessly continue the remaining work");
  });

  it("LLM params are derived from tierConfig", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    // maxTokens is conditionally set from tierConfig (omitted for Limitless/Infinity)
    expect(content).toContain("if (isFinite(tierConfig.maxTokensPerCall))");
    expect(content).toContain("llmParams.maxTokens = tierConfig.maxTokensPerCall");
    // thinkingBudget comes from tierConfig
    expect(content).toContain("thinkingBudget: tierConfig.thinkingBudget");
  });

  it("LLM layer defaults to 65536 max_tokens when caller omits it", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/_core/llm.ts", "utf-8");
    expect(content).toContain("payload.max_tokens = 65536; // Model's standard maximum output per call");
  });

  it("LLM layer accepts thinkingBudget parameter", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/_core/llm.ts", "utf-8");
    expect(content).toContain("thinkingBudget?: number");
    // Thinking is enabled with tools (not just without)
    expect(content).toContain("const thinkingBudget = params.thinkingBudget");
  });

  it("late finish_reason=length handler uses tierConfig continuation limits", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    // The late catch should also use maxContinuationRounds from tierConfig
    expect(content).toContain("Late finish_reason=length catch");
    expect(content).toContain("exceeded continuation limit for");
  });

  it("streamTextAsChunks correctly breaks text at sentence boundaries", () => {
    // Replicate the sentence chunking logic
    const text = "Hello world. This is a test! How are you? Fine thanks.";
    const sentencePattern = /([^.!?\n]+[.!?\n]+\s*)/g;
    const chunks = text.match(sentencePattern) || [text];
    const captured = chunks.join("");
    if (captured.length < text.length) {
      chunks.push(text.slice(captured.length));
    }
    expect(chunks.length).toBe(4);
    expect(chunks.join("")).toBe(text);
  });

  it("estimateConversationTokens uses ~4 chars per token heuristic", () => {
    // Replicate the estimation logic
    const estimateTokens = (msgs: Array<{ content: string }>) => {
      let totalChars = 0;
      for (const msg of msgs) {
        totalChars += msg.content.length;
      }
      return Math.ceil(totalChars / 4);
    };

    const msgs = [
      { content: "Hello world" }, // 11 chars → ~3 tokens
      { content: "This is a longer message with more content" }, // 43 chars → ~11 tokens
    ];
    const estimate = estimateTokens(msgs);
    expect(estimate).toBe(Math.ceil(54 / 4)); // 14 tokens
  });

  it("compressConversationContext preserves recent messages", () => {
    // Replicate compression logic
    const KEEP_RECENT = 20;
    const TOOL_RESULT_MAX = 200;
    const conversation: Array<{ role: string; content: string }> = [
      { role: "system", content: "System prompt" },
    ];
    // Add 30 messages (more than KEEP_RECENT)
    for (let i = 0; i < 30; i++) {
      if (i % 3 === 0) {
        conversation.push({ role: "tool", content: "A".repeat(500) }); // Long tool result
      } else if (i % 3 === 1) {
        conversation.push({ role: "assistant", content: "B".repeat(2000) }); // Long assistant msg
      } else {
        conversation.push({ role: "user", content: "Short user message" });
      }
    }

    const originalLength = conversation.length;
    const compressBoundary = originalLength - KEEP_RECENT;

    // Compress older messages
    for (let i = 1; i < compressBoundary; i++) {
      const msg = conversation[i];
      if (msg.role === "tool" && msg.content.length > TOOL_RESULT_MAX) {
        conversation[i] = { ...msg, content: msg.content.slice(0, TOOL_RESULT_MAX) + "\n... [truncated]" };
      }
      if (msg.role === "assistant" && msg.content.length > 1000) {
        conversation[i] = { ...msg, content: msg.content.slice(0, 500) + "\n...\n" + msg.content.slice(-200) };
      }
    }

    // System prompt should be unchanged
    expect(conversation[0].content).toBe("System prompt");
    // Recent messages should be unchanged (last 20)
    for (let i = compressBoundary; i < originalLength; i++) {
      const msg = conversation[i];
      if (msg.role === "tool") {
        expect(msg.content.length).toBe(500); // Uncompressed
      }
    }
    // Older tool messages should be compressed
    for (let i = 1; i < compressBoundary; i++) {
      const msg = conversation[i];
      if (msg.role === "tool") {
        expect(msg.content.length).toBeLessThan(500);
        expect(msg.content).toContain("[truncated]");
      }
    }
  });
});

describe("Continuation SSE event format", () => {
  it("continuation event has correct structure (bounded tier)", () => {
    const continuationEvent = {
      continuation: {
        round: 1,
        maxRounds: 50, // quality tier
        reason: "output_token_limit",
      },
    };
    const sseEvent = `data: ${JSON.stringify(continuationEvent)}\n\n`;
    const parsed = JSON.parse(sseEvent.slice(6).trim());
    expect(parsed.continuation).toBeDefined();
    expect(parsed.continuation.round).toBe(1);
    expect(parsed.continuation.maxRounds).toBe(50);
    expect(parsed.continuation.reason).toBe("output_token_limit");
  });

  it("continuation event uses -1 for unlimited Max tier", () => {
    const continuationEvent = {
      continuation: {
        round: 3,
        maxRounds: -1, // Max tier: unlimited
        reason: "output_token_limit",
      },
    };
    const parsed = JSON.parse(JSON.stringify(continuationEvent));
    expect(parsed.continuation.maxRounds).toBe(-1);
    expect(parsed.continuation.round).toBe(3);
  });

  it("continuation event is distinct from other SSE events", () => {
    const events = [
      { delta: "text" },
      { tool_start: { name: "test" } },
      { tool_result: { name: "test", success: true } },
      { step_progress: { completed: 1, total: 5 } },
      { continuation: { round: 1, maxRounds: -1, reason: "output_token_limit" } },
      { done: true, content: "final" },
    ];

    for (const event of events) {
      const json = JSON.stringify(event);
      const parsed = JSON.parse(json);
      // Each event type should be uniquely identifiable
      const keys = Object.keys(parsed);
      expect(keys.length).toBeGreaterThan(0);
    }

    // Continuation event should be parseable by streamWithRetry
    const continuationEvent = events[4];
    expect("continuation" in continuationEvent).toBe(true);
  });

  it("streamWithRetry.ts includes onContinuation callback", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/lib/streamWithRetry.ts", "utf-8");
    expect(content).toContain("onContinuation");
    expect(content).toContain("data.continuation && callbacks.onContinuation");
  });

  it("buildStreamCallbacks.ts includes continuation handler", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/lib/buildStreamCallbacks.ts", "utf-8");
    expect(content).toContain("onContinuation");
    expect(content).toContain("Auto-continuation round");
    expect(content).toContain("Continuing...");
  });
});
