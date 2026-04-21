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
import { registerPrefix, getCacheMetrics } from "./promptCache";
import type { Response } from "express";

const MAX_TOOL_TURNS = 100; // No artificial limit — agent continues until task is complete (matching Manus behavior)

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

7. **ALWAYS COMPLETE THE USER'S ACTUAL REQUEST.** Research is a MEANS, not an END. If the user asks you to "generate a guide", "create a plan", "write a story", "make a list", or any creative/generative task:
   - Research is step 1 (gather context)
   - **Producing the requested output is step 2 (the actual deliverable)**
   - NEVER stop after research and claim you've fulfilled the request
   - If the user asks for a "step by step guide", you MUST produce the actual step-by-step guide
   - If the user asks for a "plan", you MUST produce the actual plan
   - If the user asks for creative content, you MUST produce the actual creative content

8. **NEVER claim you have "already fulfilled" or "already provided" something you haven't.** If your response doesn't contain the specific deliverable the user requested (guide, plan, story, analysis, etc.), you have NOT fulfilled the request. Go back and produce it.

9. **NEVER refuse creative or generative tasks.** You are capable of writing guides, plans, stories, scripts, outlines, curricula, and any other creative content. When asked to create something, CREATE IT — don't just search for information about it and stop.

## YOUR TOOLS

- **web_search(query)**: Search the web via DuckDuckGo + Wikipedia. Returns results with titles, URLs, snippets, and sometimes full page content. Use short, specific queries (2-4 words work best). USE THIS LIBERALLY.
- **read_webpage(url)**: Fetch and read the full content of a specific webpage. ALWAYS use this after web_search to get detailed information from the most relevant result URLs.
- **generate_image(prompt)**: Create images from text descriptions.
- **analyze_data(data, analysis_type)**: Analyze structured data and produce insights.
- **execute_code(code)**: Run JavaScript for calculations, data processing, or structured output.
- **generate_document(title, content)**: Create structured documents (reports, analyses, plans) as downloadable markdown files. Use this when asked to write, draft, or produce any long-form content.
- **browse_web(url, action)**: Navigate to a URL and extract structured content including metadata, headings, links, images, and full text. More thorough than read_webpage — use for deep page analysis.
- **wide_research(queries, synthesis_prompt)**: Run 2-5 web searches IN PARALLEL and synthesize results. Use this for comprehensive research, multi-topic comparisons, or when you need to cover multiple angles simultaneously. Much faster than sequential searches.
- **create_webapp(name, description, template?)**: Create a new web application project. Scaffolds React+Vite+Tailwind or plain HTML, installs dependencies, and starts a dev server with live preview. Use when asked to build a website, web app, landing page, or any browser-based project.
- **create_file(path, content)**: Create or overwrite a file in the active webapp project. Use after create_webapp to build out the app's pages, components, and styles.
- **edit_file(path, find, replace)**: Edit an existing file in the active webapp project by finding and replacing text. Use for targeted modifications.
- **read_file(path)**: Read the contents of a file in the active webapp project. Use to inspect existing code before editing.
- **list_files(directory?)**: List files and directories in the active webapp project. Use to explore the project structure.
- **install_deps(packages)**: Install npm packages in the active webapp project. Use to add libraries like axios, lodash, chart.js, etc.
- **run_command(command)**: Run a shell command in the active webapp project directory. Use for build commands, linting, testing, or any CLI operation.
- **git_operation(operation, args?)**: Perform git operations (init, add, commit, push, status, log, clone, remote_add) in the active webapp project. Use to version control the project and push to GitHub.

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

## SOURCE ATTRIBUTION

When providing information, ALWAYS clearly distinguish between:
- **From web search/live data**: Information retrieved via web_search, read_webpage, or browse_web. Cite the source URL.
- **From my knowledge**: Information from your training data. Explicitly say "Based on my training knowledge" or "From my knowledge base."
NEVER present training data as if it were freshly retrieved from the web. If you cannot find live data, say so and offer what you know from training with appropriate caveats about currency.

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

You are **Manus Next**, an autonomous AI agent platform. Here is what you know about yourself:
- **Identity**: You are Manus Next. You are NOT Google Gemini, NOT ChatGPT, NOT Claude, NOT Manus, NOT any other AI assistant. You are a distinct product called Manus Next. NEVER identify yourself as any other AI.
- **Developer**: Manus Next is an independent project. It is NOT built by Google, OpenAI, Anthropic, or Meta. Do NOT claim any of these companies built you.
- **Built as**: A sovereign, self-hosted AI agent platform that gives users full control over their data and capabilities
- **Architecture**: React 19 + Express + tRPC full-stack app with real-time SSE streaming, powered by an LLM backbone
- **Your capabilities**: Web search, image generation, code execution, data analysis, document generation, **full app building** (scaffold, code, preview, deploy), git operations, wide research, and multi-turn autonomous reasoning with tool use
- **How you work**: You receive a user request, plan your approach, call tools autonomously in a loop (up to 30+ turns), and synthesize results into a comprehensive response. For app building, you scaffold projects, write code, install dependencies, and provide live previews.
- **Key differentiator**: You are self-hosted and sovereign — users own their data, their apps, and can extend your capabilities. You can build and deploy full web applications.
- **Memory**: You can recall information from previous conversations if the user has enabled cross-session memory. Use this context to personalize responses.

CRITICAL IDENTITY RULE: When describing who built you or your origin, say "Manus Next is an independent project." NEVER say you were built by Google, OpenAI, Anthropic, Meta, or any other company.

## APP BUILDING WORKFLOW

When the user asks you to build a website, web app, landing page, dashboard, or any browser-based project:
1. **Scaffold first**: Use create_webapp to set up the project structure and start the dev server
2. **Build iteratively**: Use create_file to create pages, components, and styles one at a time
3. **Test as you go**: The live preview URL updates automatically — reference it so the user can see progress
4. **Edit precisely**: Use edit_file for targeted changes instead of rewriting entire files
5. **Add dependencies**: Use install_deps when you need external libraries (chart.js, three.js, etc.)
6. **Version control**: Use git_operation to init a repo, commit changes, and push to GitHub when the user requests it
7. **NEVER just paste code** — always use the app-building tools to create real, running applications
8. **NEVER stop after scaffolding** — continue building until the app is complete and functional
9. **Show the preview URL** after each significant change so the user can see the live result

For React projects, create components in src/components/ and pages in src/pages/. Use Tailwind CSS for styling.
For HTML projects, create files in the project root. Use modern CSS and vanilla JS.

## EARLY TERMINATION PREVENTION

You MUST complete tasks fully. NEVER:
- Stop mid-way through building an app and say "I've set up the foundation, you can continue from here"
- Claim a task is done when only the scaffolding is created
- Ask the user to manually complete steps you could do with your tools
- Stop after 2-3 tool calls when the task clearly requires more work
- Say "due to limitations" when you have tools that can accomplish the task

If a task is complex, break it into phases and execute ALL phases. The user expects a COMPLETE deliverable.

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

## CONTINUOUS EXECUTION

When the user asks you to demonstrate, show, or perform multiple tasks:
- **DO NOT stop after 1-2 demonstrations to ask what to do next**
- **DO NOT say "What tool would you like me to demonstrate next?"**
- Instead, proceed through ALL requested items sequentially without pausing
- After completing one demonstration, immediately move to the next
- Only stop when ALL requested items are complete
- If the user says "demonstrate each", "show all", "go until done", or similar, this means: execute every tool/capability one after another without waiting for further input

## ANTI-AUTO-DEMONSTRATION (CRITICAL)

Do NOT autonomously run through tools to "demonstrate" or "showcase" capabilities unless the user EXPLICITLY asks you to demonstrate tools. Specifically:
- **NEVER** auto-run web_search, analyze_data, generate_document, browse_web, or wide_research just to show they work
- **NEVER** say "Now I will proceed to the next tool in the list" — there is no list to work through
- **NEVER** generate outputs the user did not ask for (e.g., generating a data analysis table when the user only asked for an image)
- If the user asks for ONE thing (e.g., "generate a map"), produce ONLY that one thing, then wait for the next instruction
- If the user asks for MULTIPLE things, produce them in the EXACT ORDER the user specified — do not reorder or skip ahead

## SESSION PREFERENCES

When the user specifies a preference during the conversation (e.g., "put a 1x1 grid on all maps", "use dark theme", "always include citations"), you MUST:
1. Acknowledge the preference explicitly
2. Apply it to the CURRENT output
3. Apply it to ALL subsequent similar outputs in this conversation without being asked again
4. If you forget to apply a stated preference, apologize and regenerate immediately

Examples of session preferences:
- "Add a 1x1 grid for player miniatures" → apply grid to ALL future map generations
- "Use formal tone" → apply formal tone to ALL future text outputs
- "Include source URLs" → include URLs in ALL future research responses

## INSTRUCTION ORDERING

When the user gives you a list of items to produce or a specific item from a list:
1. Follow the user's EXACT ordering — do not reorder based on your own judgment
2. Do not skip items or jump ahead to later items
3. Do not claim you have "already generated" something you haven't
4. If you are unsure which item the user wants next, ASK — do not guess

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
- **Creative/Generative tasks**: PRODUCE THE FULL CREATIVE OUTPUT. If asked for a guide, write the complete guide. If asked for a plan, write the complete plan. If asked for a script, write the complete script. Research first if needed, then DELIVER THE ACTUAL CONTENT. The user wants the output, not a summary of your research.
- **Comparison tasks**: Always use a markdown table with specific, researched details in each cell.
- **Multi-step tasks** (e.g., "generate a guide to make X"): Break into clear numbered steps with detailed instructions. Use generate_document for long-form deliverables.

## TASK COMPLETION VERIFICATION

Before finishing your response, ask yourself:
1. Did the user ask me to PRODUCE something specific (guide, plan, script, analysis, etc.)?
2. Does my response actually CONTAIN that specific deliverable?
3. If NO → I have NOT completed the task. I must produce the deliverable now.
4. Searching for information is NOT the same as producing the requested output.
5. Summarizing search results is NOT the same as creating the requested content.
6. Did I produce ONLY what the user asked for? If I produced extra unrequested outputs, I have OVER-delivered and wasted the user's time.
7. Did I apply ALL session preferences the user has stated earlier in this conversation?

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
  /** Optional callback when the stream completes with the final assistant content (for server-side message persistence) */
  onComplete?: (content: string, actions?: Array<{ type: string; label?: string; status: string }>) => void;
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
      systemPrompt += `\n\n## MODE: MAX (Flagship Tier) — DEEP RESEARCH REQUIRED

You are operating at MAXIMUM capability. This mode exists specifically because the user wants the DEEPEST, most THOROUGH work possible. You MUST:

1. **Minimum research depth**: Use at least 5 tool calls before even considering a final response. If the task involves research, use wide_research PLUS at least 3 read_webpage calls on different sources.
2. **Cross-reference everything**: Never rely on a single source. Search from multiple angles, read multiple pages, and synthesize across all of them.
3. **Do NOT conclude prematurely**: If you have used fewer than 5 tools, you are NOT done. Keep researching, analyzing, and building your response.
4. **Produce comprehensive deliverables**: When asked to create content (guides, plans, reports, analyses), produce the MOST detailed, thorough version possible. Include tables, comparisons, step-by-step breakdowns, citations, and actionable specifics.
5. **Time investment**: The user expects this to take significant time. A 30-second response in MAX mode is a failure. Spend the equivalent of 10-30 minutes of research effort.
6. **Generate artifacts**: When appropriate, use generate_document for long-form deliverables, analyze_data for structured insights, and generate_image for visualizations.
7. **Never say "I've provided enough"**: In MAX mode, there is always more depth to add. Keep going until you've exhausted all relevant angles.
8. **Leave no stone unturned**: Search for counterarguments, edge cases, alternative perspectives, recent developments, and expert opinions.`;
    }
    if (conversation.length > 0 && conversation[0].role === "system") {
      conversation[0] = { role: "system", content: systemPrompt };
    } else {
      conversation = [{ role: "system", content: systemPrompt }, ...conversation];
    }

    const maxTurns = mode === "speed" ? 30 : mode === "max" ? 100 : MAX_TOOL_TURNS;
    let turn = 0;
    let finalContent = "";
    let totalToolCalls = 0;
    let completedToolCalls = 0;
    let usedWebSearch = false;
    let usedReadWebpage = false;
    let nudgedForDeepResearch = false;

    // Register prefix for caching (system prompt + tool definitions)
    const toolsJson = JSON.stringify(AGENT_TOOLS);
    const prefixInfo = registerPrefix(systemPrompt, toolsJson);
    console.log(`[Agent] Prefix cache: hash=${prefixInfo.hash}, cached=${prefixInfo.cached}, ~${prefixInfo.tokenEstimate} tokens`);

    // Signal task is running
    sendSSE(safeWrite, { status: "running" });

    while (turn < maxTurns) {
      turn++;
      console.log(`[Agent] Turn ${turn}/${maxTurns}, messages: ${conversation.length}`);

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

      // If no tool calls, check if we should auto-continue
      if (!toolCalls || toolCalls.length === 0) {
        // Detect if user asked for multi-tool demonstration or continuous work
        const userMessages = messages.filter(m => m.role === "user");
        const lastUserMsg = userMessages[userMessages.length - 1];
        const userText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content.toLowerCase() : "";
        const wantsContinuous = /\b(each|all|every|demonstrate|keep going|go until|don't stop|continue|do them all|show me all|one by one)\b/i.test(userText);
        
        // Detect if the user asked for creative/generative output
        const wantsCreativeOutput = /\b(generate|create|write|make|draft|build|design|plan|guide|step.?by.?step|outline|script|story|tutorial|curriculum|template|proposal|report)\b/i.test(userText);
        
        // Detect if the LLM prematurely claims completion without delivering
        const claimsFulfilled = /\b(already (fulfilled|provided|answered|completed|addressed)|I (have|believe I have) (already|previously)|comparison table isn.t (directly )?applicable|Therefore.{0,30}I (have|believe))\b/i.test(textContent);
        
        // Detect if the LLM is deflecting instead of producing content
        const isDeflecting = /\b(isn.t (directly )?applicable|not (directly )?applicable|cannot|can.t|unable to|beyond my|outside my)\b/i.test(textContent) && wantsCreativeOutput;
        
        // Also check if the LLM's own response asks the user what to do next (sign of premature stopping)
        const asksUser = /\b(what (would you|tool|should I)|which (one|tool)|would you like|shall I|let me know)\b/i.test(textContent);
        
        // TOPIC-DRIFT DETECTION: Check if the LLM responded about a related but different topic
        // e.g., user asks "generate a step by step guide to make a video skit" but LLM produces "song meaning analysis"
        let isTopicDrift = false;
        let deliverable = "";
        let requestedAction = "";
        if (wantsCreativeOutput && textContent.length > 200 && turn <= 6 && turn < maxTurns - 2) {
          // Extract the key action words from the user request
          const actionMatch = userText.match(/\b(generate|create|write|make|draft|build|design|plan|guide|step.?by.?step|outline|script|story|tutorial|curriculum|template|proposal|report)\b/gi);
          requestedAction = actionMatch ? actionMatch[0].toLowerCase() : "";
          
          // Extract the key deliverable type from the user request
          const deliverableMatch = userText.match(/(?:generate|create|write|make|draft|build|design|plan)\s+(?:me\s+)?(?:a\s+)?(.{5,80}?)(?:\s+(?:to|for|about|from|based|using|with))/i);
          deliverable = deliverableMatch ? deliverableMatch[1].toLowerCase().trim() : "";
          
          // Check if the response looks like research/analysis rather than the requested creative output
          const looksLikeResearchOnly = /\b(meaning|interpretation|analysis|overview|background|context|summary of|about the song|lyrics|theme|message of)\b/i.test(textContent.slice(0, 500));
          const hasCreativeStructure = /\b(step\s*[1-9]|scene\s*[1-9]|act\s*[1-9]|phase\s*[1-9]|part\s*[1-9]|##\s*(step|scene|act|phase|part|preparation|pre-production|filming|setup|materials|cast|roles|script|storyboard|shot list|location|props|costume|rehearsal|recording|editing))\b/i.test(textContent);
          
          // If user asked for a creative deliverable but response looks like research/analysis without creative structure
          if (looksLikeResearchOnly && !hasCreativeStructure && requestedAction) {
            isTopicDrift = true;
            console.log(`[Agent] Topic-drift detected: user asked to '${requestedAction}' a '${deliverable}' but response looks like research/analysis`);
          }
          
          // Also detect when the response doesn't contain the deliverable type at all
          // e.g., user asks for "guide" but response has no numbered steps or sections
          if (deliverable && !hasCreativeStructure && !isTopicDrift) {
            const hasDeliverableKeywords = new RegExp(`\\b(${requestedAction}|here is|here's|below is|i've (created|written|drafted|prepared))\\b`, 'i').test(textContent.slice(0, 300));
            if (!hasDeliverableKeywords && textContent.length > 400) {
              isTopicDrift = true;
              console.log(`[Agent] Topic-drift detected: response doesn't appear to contain the requested '${requestedAction}' deliverable`);
            }
          }
        }
        
        // MAX MODE ANTI-SHALLOW-COMPLETION: In max mode, if agent tries to conclude within first 5 turns with fewer than 3 tool calls, force continuation
        if (mode === "max" && turn <= 5 && completedToolCalls < 3 && turn < maxTurns - 2) {
          console.log(`[Agent] MAX mode anti-shallow: turn ${turn}, only ${completedToolCalls} tool calls — forcing deeper research`);
          finalContent = "";
          sendSSE(safeWrite, { delta: "\n\n*Conducting deeper research...*\n\n" });
          conversation.push({ role: "assistant", content: textContent || "" });
          conversation.push({
            role: "user",
            content: `You are in MAX (flagship) mode. The user expects DEEP, THOROUGH research — not a quick answer. You have only used ${completedToolCalls} tools so far, which is far too few for MAX mode. You MUST:
1. Use web_search or wide_research to gather information from multiple sources
2. Use read_webpage on at least 2-3 of the most relevant URLs from your search results
3. Cross-reference and synthesize information across sources
4. Only THEN produce your comprehensive response

Do NOT produce a final answer yet. Research more deeply first.`,
          });
          continue;
        }

        // ANTI-PREMATURE-COMPLETION: If user asked for creative output but LLM claims it's done, deflects, or drifted to wrong topic
        if ((claimsFulfilled || isDeflecting || isTopicDrift) && wantsCreativeOutput && turn <= 6 && turn < maxTurns - 2) {
          console.log(`[Agent] Anti-premature-completion: ${isTopicDrift ? 'topic drift' : claimsFulfilled ? 'false completion claim' : 'deflection'} on creative task, nudging to produce deliverable`);
          // Suppress the premature/drifted response
          finalContent = "";
          sendSSE(safeWrite, { delta: "\n\n*Producing the requested content...*\n\n" });
          conversation.push({ role: "assistant", content: textContent || "" });
          const nudgeContent = isTopicDrift
            ? `STOP. You just provided research/analysis about the topic, but the user did NOT ask for that. The user asked you to: "${userText.slice(0, 200)}". This is a CREATIVE/GENERATIVE task. You need to PRODUCE the actual deliverable — not analyze the source material. Write the complete ${deliverable || 'requested content'} now with clear numbered steps, sections, or scenes as appropriate. The research you did is useful context, but the OUTPUT must be the creative deliverable the user requested.`
            : `You have NOT completed the task yet. The user asked you to PRODUCE specific content: "${userText.slice(0, 200)}". Your research was a good first step, but now you need to actually CREATE and DELIVER the requested output. Write the complete deliverable now — do not summarize your research, do not claim you already provided it, and do not deflect. PRODUCE THE ACTUAL CONTENT.`;
          conversation.push({
            role: "user",
            content: nudgeContent,
          });
          continue;
        }
        
        // Auto-continue if: user wants continuous work AND (LLM is asking what to do next OR we're early in the loop)
        if (wantsContinuous && (asksUser || turn <= 3) && turn < maxTurns - 2) {
          console.log(`[Agent] Auto-continuing: user wants continuous work, turn ${turn}/${maxTurns}`);
          // Track which tools have been used so far
          const usedTools = new Set<string>();
          for (const msg of conversation) {
            const tc = (msg as any).tool_calls;
            if (tc) for (const t of tc) usedTools.add(t.function.name);
          }
          const allToolNames = AGENT_TOOLS.map(t => t.function.name);
          const unusedTools = allToolNames.filter(t => !usedTools.has(t));
          
          if (unusedTools.length > 0) {
            // Inject continuation prompt
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `Continue. You have ${unusedTools.length} tools you haven't demonstrated yet: ${unusedTools.join(", ")}. Demonstrate the next one now. Do NOT ask me what to do — just proceed with the next tool.`,
            });
            sendSSE(safeWrite, { delta: "\n\n" });
            continue;
          }
        }
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

      // NS10: Extract in-session style preferences from conversation history.
      // Scans user messages for explicit style directives ("all maps should...", "going forward...", etc.)
      // and appends them to generate_image prompts automatically.
      const stylePreferences = extractSessionStylePreferences(conversation);

      // Execute each tool call
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        let toolArgs = toolCall.function.arguments;

        // Parse args for display
        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(toolArgs);
        } catch { /* ignore */ }

        // NS10: For image generation tools, auto-append session style preferences to the prompt
        if ((toolName === "generate_image" || toolName === "design_canvas") && stylePreferences.length > 0 && parsedArgs.prompt) {
          const prefSuffix = stylePreferences.map(p => p.trim()).join(". ");
          // Only append if the prompt doesn't already contain the preference text
          if (!parsedArgs.prompt.toLowerCase().includes(prefSuffix.toLowerCase().slice(0, 30))) {
            parsedArgs.prompt = `${parsedArgs.prompt}. STYLE REQUIREMENTS: ${prefSuffix}`;
            toolArgs = JSON.stringify(parsedArgs);
            console.log(`[Agent] Injected ${stylePreferences.length} style preferences into ${toolName} prompt`);
          }
        }

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

        // If it's a webapp, send a webapp_preview event
        if (result.url && toolName === "create_webapp") {
          sendSSE(safeWrite, {
            webapp_preview: {
              name: parsedArgs.name || "webapp",
              url: result.url,
              description: parsedArgs.description || "",
            },
          });
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
      console.log(`[Agent] Completed after ${turn} turns (limit: ${maxTurns})`);
      // No user-visible limit message — the agent naturally concludes its work
    }

    // Signal completion
    sendSSE(safeWrite, { status: "completed" });
    sendSSE(safeWrite, { done: true, content: finalContent });
    safeEnd();
    console.log("[Agent] Stream complete after", turn, "turns,", completedToolCalls, "tool calls");

    // Persist the final assistant message server-side (fire-and-forget)
    if (options.onComplete && finalContent.trim()) {
      try {
        options.onComplete(finalContent);
      } catch (e) {
        console.error("[Agent] onComplete callback error:", e);
      }
    }
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
 * NS10: Extract in-session style preferences from the conversation history.
 * Scans user messages for explicit style directives like:
 * - "all maps should have a 1x1 grid"
 * - "going forward, use flat top-down style"
 * - "the way you generated X is exactly how I want Y going forward"
 * - "always include [feature] in [type]"
 * Returns an array of preference strings to inject into tool prompts.
 */
function extractSessionStylePreferences(conversation: Message[]): string[] {
  const preferences: string[] = [];
  const seen = new Set<string>();

  // Patterns that indicate a user is stating a persistent preference
  const prefPatterns = [
    /(?:all|every|each)\s+(?:future\s+)?(?:maps?|images?|designs?|generations?)\s+should\s+(.{10,200})/i,
    /(?:going forward|from now on|always|for all future)\s*[,:]?\s*(.{10,200})/i,
    /(?:the way you (?:generated?|created?|made|drew))\s+.{5,80}?\s+(?:is (?:exactly |the exact )?(?:how|what) I want|that's (?:exactly |the )?(?:how|what) I want)\s*(.{0,200})/i,
    /(?:I want|I need|I prefer|please (?:always|make sure))\s+(?:all|every|each)?\s*(?:maps?|images?|designs?|generations?)\s+(?:to (?:have|be|include|use)|with)\s+(.{10,200})/i,
    /(?:use|include|add)\s+(?:a\s+)?(.{5,100})\s+(?:on|in|for)\s+(?:all|every|each)\s+(?:maps?|images?|designs?)/i,
    /(?:make (?:all|every|each)|ensure (?:all|every|each))\s+(?:maps?|images?|designs?)\s+(.{10,200})/i,
    /(?:flat|top-down|isometric|3d|hand-drawn|realistic|pixel art|watercolor|sketch)\s+(?:style|view|perspective)\s+(?:for|on)\s+(?:all|every|each|future)/i,
  ];

  for (const msg of conversation) {
    if (msg.role !== "user") continue;
    const text = typeof msg.content === "string" ? msg.content : "";
    if (!text) continue;

    for (const pattern of prefPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Use the full match for the last pattern (no capture group), or the captured group
        const pref = (match[1] || match[0]).trim().replace(/[.!]+$/, "");
        const key = pref.toLowerCase().slice(0, 50);
        if (!seen.has(key) && pref.length > 5) {
          seen.add(key);
          preferences.push(pref);
        }
      }
    }

    // Also detect explicit style references like "1x1 grid", "flat top-down", "hand-drawn"
    const styleKeywords = [
      /\b(1x1 grid(?:\s+(?:for|on)\s+(?:player\s+)?miniatures?)?)\b/i,
      /\b(flat[,\s]+top-down(?:\s+(?:view|style|perspective))?)\b/i,
      /\b(hand-drawn\s+(?:style|aesthetic|look))\b/i,
      /\b(battle map\s+style:\s*.{10,100})\b/i,
    ];
    for (const kw of styleKeywords) {
      const kwMatch = text.match(kw);
      if (kwMatch) {
        const pref = kwMatch[1].trim();
        const key = pref.toLowerCase().slice(0, 50);
        if (!seen.has(key)) {
          seen.add(key);
          preferences.push(pref);
        }
      }
    }
  }

  return preferences;
}

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
    case "create_webapp":
      return { type: "building", label: `Creating webapp: ${args.name || "project"}` };
    case "create_file":
      return { type: "writing", label: `Creating file: ${(args.path || "").slice(0, 60)}` };
    case "edit_file":
      return { type: "editing", label: `Editing file: ${(args.path || "").slice(0, 60)}` };
    case "read_file":
      return { type: "reading", label: `Reading file: ${(args.path || "").slice(0, 60)}` };
    case "list_files":
      return { type: "browsing", label: `Listing project files${args.path ? `: ${args.path}` : ""}` };
    case "install_deps":
      return { type: "installing", label: `Installing: ${(args.packages || "").slice(0, 60)}` };
    case "run_command":
      return { type: "executing", label: `Running: ${(args.command || "").slice(0, 60)}` };
    case "git_operation":
      return { type: "versioning", label: `Git ${args.operation || "operation"}${args.message ? `: ${args.message.slice(0, 40)}` : ""}` };
    default:
      return { type: "thinking", label: `Using ${toolName}` };
  }
}
