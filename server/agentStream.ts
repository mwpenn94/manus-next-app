/**
 * Agentic Stream Handler
 *
 * Transforms the simple single-shot LLM call into a multi-turn agentic loop:
 * 1. Send user message + tool definitions to LLM
 * 2. If LLM returns tool_calls, execute each tool server-side
 * 3. Stream tool execution progress as SSE events
 * 4. Feed tool results back to LLM for next turn
 * 5. Repeat until LLM produces a final text response (no more tool_calls)
 *
 * SSE Event Types:
 * - data: { delta: string }         — Text content chunk
 * - data: { tool_start: {...} }     — Tool execution beginning
 * - data: { tool_result: {...} }    — Tool execution completed
 * - data: { image: string }         — Generated image URL (inline display)
 * - data: { status: string }        — Task status change (running/completed)
 * - data: { step_progress: {...} }  — Step progress (current/total)
 * - data: { done: true, content }   — Stream complete
 * - data: { error: string }         — Error occurred
 */
import type { Message, Tool, ToolCall, InvokeResult } from "./_core/llm";
import { AGENT_TOOLS, executeTool, type ToolResult } from "./agentTools";
import type { Response } from "express";

const MAX_TOOL_TURNS = 8; // Prevent infinite loops

const DEFAULT_SYSTEM_PROMPT = `You are Manus Next, an autonomous AI agent. You don't just answer questions — you actively research, reason, and take action using your tools.

## CRITICAL RULES

1. **ALWAYS use web_search FIRST** when the user asks about:
   - Any real-world company, product, person, or organization
   - Current events, news, or recent developments
   - Comparisons between products, services, or technologies
   - Anything you are uncertain about or that may have changed since your training data
   - Facts, statistics, or claims that should be verified
   
2. **NEVER claim you cannot find information** without first using web_search AND read_webpage. If your first search doesn't return great results, try different query terms.

3. **NEVER say "I don't have access to the web"** — you DO have web search. USE IT.

4. **NEVER ask the user to provide information** that you could find yourself via web_search or read_webpage.

5. **READ YOUR SEARCH RESULTS CAREFULLY.** When web_search returns results with URLs, USE read_webpage to get detailed content from the most relevant URLs. Do NOT ignore search results.

6. **Use multiple tools together** for complex tasks:
   - Deep research: web_search → read_webpage (on best URLs) → synthesize
   - Research + Analysis: web_search → analyze_data
   - Visual + Research: web_search → generate_image
   - Computation + Research: web_search → execute_code

## YOUR TOOLS

- **web_search(query)**: Search the web via DuckDuckGo + Wikipedia. Returns results with titles, URLs, snippets, and sometimes full page content. Use short, specific queries (2-4 words work best). USE THIS LIBERALLY.
- **read_webpage(url)**: Fetch and read the full content of a specific webpage. ALWAYS use this after web_search to get detailed information from the most relevant result URLs.
- **generate_image(prompt)**: Create images from text descriptions.
- **analyze_data(data, analysis_type)**: Analyze structured data and produce insights.
- **execute_code(code)**: Run JavaScript for calculations, data processing, or structured output.
- **generate_document(title, content)**: Create structured documents (reports, analyses, plans) as downloadable markdown files. Use this when asked to write, draft, or produce any long-form content.
- **browse_web(url, action)**: Navigate to a URL and extract structured content including metadata, headings, links, images, and full text. More thorough than read_webpage — use for deep page analysis.
- **wide_research(queries, synthesis_prompt)**: Run 2-5 web searches IN PARALLEL and synthesize results. Use this for comprehensive research, multi-topic comparisons, or when you need to cover multiple angles simultaneously. Much faster than sequential searches.

## REASONING PROTOCOL

Before using any tool, briefly reason about which tool is most appropriate and why. Think step-by-step:
1. What information do I need?
2. Which tool(s) can provide it?
3. What's the most efficient sequence?

## ERROR RECOVERY

If a tool call fails or returns unexpected results:
1. Analyze the error message carefully
2. Try an alternative approach (different query, different tool, different URL)
3. Do NOT repeat the same failing call with identical parameters
4. If multiple approaches fail, explain what you tried and suggest next steps

## CONTEXT MANAGEMENT

If the conversation is getting long (many tool calls and results), summarize your key findings so far before continuing. This preserves context quality and ensures nothing important is lost.

## RESEARCH WORKFLOW

When answering questions about real-world topics:
1. Call web_search with a short, focused query (e.g., "Manus AI" not "What is Manus AI and how does it compare")
2. Read the search results carefully — they contain real web data
3. If the results mention specific URLs, call read_webpage on the most relevant 1-2 URLs
4. Synthesize ALL the information you gathered into a comprehensive answer
5. Cite your sources with links

## WIDE RESEARCH MODE

For comprehensive research, comparisons, or multi-angle analysis:
1. Use **wide_research** with 2-5 parallel queries targeting different aspects
2. Include a synthesis_prompt that describes how to combine the results
3. The tool runs all searches simultaneously and produces a unified analysis
4. Use this when the user asks to "research thoroughly", "compare multiple", or needs broad coverage
5. **Prefer wide_research over sequential web_search** for broad topics — it's faster and more comprehensive
6. Use sequential web_search only for specific, focused lookups where a single query suffices

Example: Comparing AI agents → wide_research({ queries: ["Manus AI features", "Devin AI capabilities", "Cursor AI pricing"], synthesis_prompt: "Compare these AI agents side by side" })

## ABOUT YOURSELF (Manus Next)

You are **Manus Next**, an open-source autonomous AI agent platform. Here is what you know about yourself:
- **Identity**: You are Manus Next. You are NOT Google Gemini, NOT ChatGPT, NOT Claude, NOT any other AI assistant. You are a distinct product called Manus Next. NEVER identify yourself as any other AI.
- **Developer**: Manus Next is an independent open-source project. It is NOT built by Google, OpenAI, Anthropic, or Meta. Do NOT claim any of these companies built you.
- **Built as**: An open-source alternative to commercial AI agent platforms
- **Architecture**: React 19 + Express + tRPC full-stack app with real-time SSE streaming, powered by an LLM backbone
- **Your capabilities**: Web search (DuckDuckGo + Wikipedia + page reading), image generation, code execution (JavaScript), data analysis, and multi-turn autonomous reasoning with tool use
- **How you work**: You receive a user request, plan your approach, call tools autonomously in a loop (up to 8 turns), and synthesize results into a comprehensive response
- **Key differentiator**: You are self-hosted and open-source — users own their data and can extend your capabilities
- **Limitations**: You currently search via DuckDuckGo + Wikipedia (not a full web crawler), execute only JavaScript (not Python), and don't have full browser automation or file system access. You can browse and extract content from any URL.
- **Memory**: You can recall information from previous conversations if the user has enabled cross-session memory. Use this context to personalize responses.

CRITICAL IDENTITY RULE: When describing who built you or your origin, say "Manus Next is an independent open-source project." NEVER say you were built by Google, OpenAI, Anthropic, Meta, or any other company.

When asked to compare yourself to other AI agents or products, ALWAYS:
1. Search the web for the other agent's specific capabilities, pricing, and features
2. If the first search returns limited info, use read_webpage on the most relevant URLs to get detailed feature lists
3. Create a **structured side-by-side comparison** using a markdown table with categories like: Architecture, Key Capabilities, Deployment Model, Pricing, Limitations, Best For
4. Be transparent about your limitations AND your advantages
5. Ground every claim about the competitor in your search results with citations

Example comparison format:
| Category | Manus Next | [Competitor] |
|----------|-----------|---------------|
| Architecture | Open-source, self-hosted | [from research] |
| Key Capabilities | Web search, image gen, code exec | [from research] |
| ... | ... | ... |

## RESPONSE STYLE

- Be thorough and grounded in evidence from your tool results
- Cite sources with markdown links: [Source Name](url)
- Present findings in well-structured markdown with clear sections
- When comparing things, ALWAYS create a markdown comparison table with specific details from research
- Show your reasoning process — don't just state conclusions
- NEVER ignore information from your tool results
- When you find relevant URLs in search results, ALWAYS use read_webpage to get more details before answering

## OUTPUT FORMATTING

Structure your responses based on the task type:
- **Research tasks**: Use sections with headers, bullet points for key findings, and a summary table. Cite all sources.
- **Code tasks**: Include code in fenced blocks with language tags. Explain the approach before the code.
- **Analysis tasks**: Lead with the key insight, then supporting evidence, then methodology.
- **Creative tasks**: Deliver the creative output first, then explain your choices.
- **Comparison tasks**: Always use a markdown table with specific, researched details in each cell.

You are an AGENT, not a chatbot. Act like one.`;

/**
 * Agent execution mode.
 * - `speed`: Lower temperature (0.3), shorter max_tokens (1024), fewer tool turns, concise responses.
 * - `quality`: Higher temperature (0.7), longer max_tokens (4096), thorough research, detailed responses.
 * - `max`: Highest temperature (0.8), longest max_tokens (8192), maximum tool turns (12), deepest research, most thorough responses.
 */
export type AgentMode = "speed" | "quality" | "max";

/**
 * Configuration options for the agentic streaming loop.
 *
 * @example
 * ```ts
 * await runAgentStream({
 *   messages: [{ role: "user", content: "Research quantum computing" }],
 *   safeWrite: (data) => res.write(data),
 *   safeEnd: () => res.end(),
 *   mode: "quality",
 *   memoryContext: "- User is interested in physics",
 * });
 * ```
 */
export interface AgentStreamOptions {
  messages: Message[];
  taskExternalId?: string;
  resolvedSystemPrompt?: string | null;
  safeWrite: (data: string) => boolean;
  safeEnd: () => void;
  /** Optional callback when an artifact is produced (for workspace persistence) */
  onArtifact?: (artifact: {
    type: string;
    label: string;
    content?: string;
    url?: string;
  }) => void;
  /** Speed/Quality mode — affects MAX_TOOL_TURNS and response depth */
  mode?: AgentMode;
  /** Cross-session memory entries to inject into context */
  memoryContext?: string;
}

function sendSSE(safeWrite: (d: string) => boolean, event: Record<string, unknown>): boolean {
  return safeWrite(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Run the agentic streaming loop.
 *
 * Executes a multi-turn LLM conversation with tool calling over SSE.
 * Each turn: LLM generates a response or tool call → tool is executed →
 * result fed back → repeat until final text response or MAX_TOOL_TURNS reached.
 *
 * SSE events emitted:
 * - `{ delta: string }` — Incremental text content
 * - `{ tool_start: { name, args } }` — Tool execution beginning
 * - `{ tool_result: { name, result, success } }` — Tool execution completed
 * - `{ image: string }` — Generated image URL for inline display
 * - `{ document: { title, content, format } }` — Generated document artifact
 * - `{ step_progress: { current, total } }` — Turn progress indicator
 * - `{ status: string }` — Task status change
 * - `{ done: true, content }` — Stream complete with final content
 * - `{ error: string }` — Error occurred during processing
 *
 * @param options - Configuration for the stream (messages, mode, memory, callbacks)
 * @returns Promise that resolves when the stream is complete
 */
export async function runAgentStream(options: AgentStreamOptions): Promise<void> {
  const { messages, resolvedSystemPrompt, safeWrite, safeEnd, onArtifact, mode = "quality", memoryContext } = options;

  try {
    const { invokeLLM } = await import("./_core/llm");

    // Build conversation with system prompt
    let conversation: Message[] = [...messages];

    // Inject or replace system prompt
    let systemPrompt = resolvedSystemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Inject memory context if available
    if (memoryContext) {
      systemPrompt += `\n\n## USER MEMORY (from previous sessions)\n\n${memoryContext}\n\nUse this information to personalize your responses. Do not mention that you have "memory" unless the user asks.`;
    }

    // Mode-specific instructions
    if (mode === "speed") {
      systemPrompt += `\n\n## MODE: SPEED\nPrioritize fast, concise responses. Use fewer tool calls. Give direct answers when confident. Skip deep research unless explicitly asked.`;
    } else if (mode === "max") {
      systemPrompt += `\n\n## MODE: MAX (Flagship Tier)\nYou are operating at maximum capability. Use ALL available tools extensively. Conduct thorough multi-source research with wide_research when appropriate. Provide the most detailed, comprehensive, and well-sourced responses possible. Use multiple tool turns. Cross-reference information. Generate visualizations and documents when they add value. Leave no stone unturned.`;
    }
    if (conversation.length > 0 && conversation[0].role === "system") {
      conversation[0] = { role: "system", content: systemPrompt };
    } else {
      conversation = [{ role: "system", content: systemPrompt }, ...conversation];
    }

    const maxTurns = mode === "speed" ? 4 : mode === "max" ? 12 : MAX_TOOL_TURNS;
    let turn = 0;
    let finalContent = "";
    let totalToolCalls = 0;
    let completedToolCalls = 0;
    let usedWebSearch = false;
    let usedReadWebpage = false;
    let nudgedForDeepResearch = false;

    // Signal task is running
    sendSSE(safeWrite, { status: "running" });

    while (turn < maxTurns) {
      turn++;
      console.log(`[Agent] Turn ${turn}/${MAX_TOOL_TURNS}, messages: ${conversation.length}`);

      // Call LLM with tools
      const response: InvokeResult = await invokeLLM({
        messages: conversation,
        tools: AGENT_TOOLS,
        tool_choice: "auto",
      });

      const choice = response.choices?.[0];
      if (!choice) {
        sendSSE(safeWrite, { error: "No response from LLM" });
        break;
      }

      const assistantMessage = choice.message;
      const toolCalls = assistantMessage.tool_calls;
      const textContent = typeof assistantMessage.content === "string" ? assistantMessage.content : "";

      // Check if we should nudge for deeper research BEFORE streaming text
      const shouldNudge = (!toolCalls || toolCalls.length === 0) 
        && usedWebSearch && !usedReadWebpage && !nudgedForDeepResearch && turn <= 3;

      if (shouldNudge) {
        // Don't stream the text — suppress it and nudge for deeper research
        nudgedForDeepResearch = true;
        console.log("[Agent] Nudging for deeper research — web_search was used but read_webpage was not");
        sendSSE(safeWrite, { delta: "\n\n*Researching in more depth...*\n\n" });
        conversation.push({
          role: "assistant",
          content: textContent || "",
        });
        conversation.push({
          role: "user",
          content: "Your search results included relevant URLs. Use read_webpage on the most relevant URL to get detailed information. Then provide a comprehensive, well-structured answer with a comparison table.",
        });
        finalContent = "";
        continue;
      }

      // If there's text content, stream it
      if (textContent) {
        const sentencePattern = /([^.!?\n]+[.!?\n]+\s*)/g;
        const chunks = textContent.match(sentencePattern) || [textContent];
        const captured = chunks.join("");
        if (captured.length < textContent.length) {
          chunks.push(textContent.slice(captured.length));
        }
        for (const chunk of chunks) {
          if (!sendSSE(safeWrite, { delta: chunk })) return;
        }
        finalContent += textContent;
      }

      // If no tool calls, we're done
      if (!toolCalls || toolCalls.length === 0) {
        break;
      }

      // Add assistant message with tool_calls to conversation
      conversation.push({
        role: "assistant",
        content: textContent || "",
        // @ts-ignore - tool_calls is part of the message but not in our Message type
        tool_calls: toolCalls,
      } as any);

      // Track total tool calls for progress
      totalToolCalls += toolCalls.length;
      sendSSE(safeWrite, {
        step_progress: { completed: completedToolCalls, total: totalToolCalls, turn },
      });

      // Execute each tool call
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;

        // Parse args for display
        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(toolArgs);
        } catch { /* ignore */ }

        // Send tool_start event
        sendSSE(safeWrite, {
          tool_start: {
            id: toolCall.id,
            name: toolName,
            args: parsedArgs,
            display: getToolDisplayInfo(toolName, parsedArgs),
          },
        });

        // Execute the tool
        console.log(`[Agent] Executing tool: ${toolName}`, parsedArgs);
        if (toolName === "web_search") usedWebSearch = true;
        if (toolName === "read_webpage" || toolName === "browse_web") usedReadWebpage = true;
        const result: ToolResult = await executeTool(toolName, toolArgs);

        // Send tool_result event
        sendSSE(safeWrite, {
          tool_result: {
            id: toolCall.id,
            name: toolName,
            success: result.success,
            preview: result.result.slice(0, 500),
            url: result.url,
          },
        });

        // If it's an image, send a special image event for inline display
        if (result.url && (toolName === "generate_image" || toolName === "design_canvas")) {
          sendSSE(safeWrite, { image: result.url });
        }

        // If it's a document, send a document event so client can surface download link
        if (result.url && (toolName === "generate_document" || toolName === "generate_slides" || toolName === "take_meeting_notes")) {
          sendSSE(safeWrite, {
            document: {
              url: result.url,
              title: parsedArgs.title || "Document",
              format: parsedArgs.format || "markdown",
            },
          });
        }

        // Persist artifact if callback provided
        if (onArtifact && result.artifactType) {
          onArtifact({
            type: result.artifactType,
            label: result.artifactLabel || toolName,
            content: result.artifactType === "terminal" ? result.result : undefined,
            url: result.url,
          });
        }

        // Track progress
        completedToolCalls++;
        sendSSE(safeWrite, {
          step_progress: { completed: completedToolCalls, total: totalToolCalls, turn },
        });

        // Add tool result to conversation for next LLM turn
        conversation.push({
          role: "tool",
          content: result.result,
          tool_call_id: toolCall.id,
          name: toolName,
        });
      }

      // If finish_reason is "stop", the LLM is done even with tool calls
      if (choice.finish_reason === "stop" && !toolCalls.length) {
        break;
      }
    }

    if (turn >= maxTurns) {
      console.log("[Agent] Max tool turns reached");
      sendSSE(safeWrite, {
        delta: "\n\n*[Reached maximum number of tool execution steps]*",
      });
      finalContent += "\n\n*[Reached maximum number of tool execution steps]*";
    }

    // Signal completion
    sendSSE(safeWrite, { status: "completed" });
    sendSSE(safeWrite, { done: true, content: finalContent });
    safeEnd();
    console.log("[Agent] Stream complete after", turn, "turns,", completedToolCalls, "tool calls");
  } catch (err: any) {
    console.error("[Agent] Error:", err);
    let userMessage = err.message || "Agent execution failed";
    // Provide user-friendly error messages for common failure modes
    if (err.code === "ETIMEDOUT" || err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      userMessage = "The request timed out. Please try again with a simpler query or switch to Speed mode.";
    } else if (err.status === 429 || err.message?.includes("rate limit") || err.message?.includes("Rate limit")) {
      userMessage = "Rate limit reached. Please wait a moment before sending another message.";
    } else if (err.status === 401 || err.status === 403 || err.message?.includes("unauthorized") || err.message?.includes("Unauthorized")) {
      userMessage = "Authentication expired. Please refresh the page and log in again.";
    } else if (err.message?.includes("ECONNREFUSED")) {
      userMessage = "Unable to connect to the AI service. Please try again in a moment.";
    }
    sendSSE(safeWrite, { error: userMessage });
    safeEnd();
  }
}

/**
 * Get human-readable display info for a tool call
 */
function getToolDisplayInfo(
  toolName: string,
  args: any
): { type: string; label: string } {
  switch (toolName) {
    case "web_search":
      return { type: "searching", label: `Searching "${args.query}"` };
    case "generate_image":
      return { type: "generating", label: `Generating image: ${(args.prompt || "").slice(0, 60)}...` };
    case "analyze_data":
      return { type: "thinking", label: `Analyzing data (${args.analysis_type})` };
    case "execute_code":
      return { type: "executing", label: args.description || "Running code" };
    case "read_webpage":
      return { type: "browsing", label: `Reading ${args.url ? new URL(args.url).hostname : "webpage"}` };
    case "generate_document":
      return { type: "writing", label: `Writing document: ${(args.title || "").slice(0, 60)}` };
    case "browse_web":
      return { type: "browsing", label: `Browsing ${args.url ? new URL(args.url).hostname : "webpage"}` };
    case "wide_research":
      return { type: "researching", label: `Wide research: ${(args.queries || []).length} parallel queries` };
    case "generate_slides":
      return { type: "generating", label: `Creating presentation: ${(args.topic || "").slice(0, 60)}` };
    case "send_email":
      return { type: "sending", label: `Sending email: ${(args.subject || "").slice(0, 60)}` };
    case "take_meeting_notes":
      return { type: "analyzing", label: `Processing meeting notes` };
    case "design_canvas":
      return { type: "designing", label: `Creating design: ${(args.description || "").slice(0, 60)}` };
    case "cloud_browser":
      return { type: "browsing", label: `Cloud browser: ${args.url ? new URL(args.url).hostname : "page"}` };
    case "screenshot_verify":
      return { type: "analyzing", label: `Verifying screenshot: ${(args.question || "").slice(0, 60)}` };
    default:
      return { type: "thinking", label: `Using ${toolName}` };
  }
}
