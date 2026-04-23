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

// ═══════════════════════════════════════════════════════════════════════════════
// TIER CONFIGURATION — Deeply aligned with Manus tiers
//
// ┌──────────┬─────────────────┬──────────┬───────────┬──────────┬──────────────────────────────┐
// │ Our Tier │ Manus Equiv.    │ Max      │ Tokens/   │ Cont.    │ Behavior                     │
// │          │                 │ Turns    │ Call      │ Rounds   │                              │
// ├──────────┼─────────────────┼──────────┼───────────┼──────────┼──────────────────────────────┤
// │ Speed    │ Manus 1.6 Lite  │ 30       │ 16,384    │ 5        │ Fast, concise, bounded       │
// ├──────────┼─────────────────┼──────────┼───────────┼──────────┼──────────────────────────────┤
// │ Quality  │ Manus 1.6       │ 100      │ 65,536    │ 50       │ Thorough, one-shot accuracy  │
// ├──────────┼─────────────────┼──────────┼───────────┼──────────┼──────────────────────────────┤
// │ Max      │ Manus 1.6 Max   │ 200      │ 65,536    │ 100      │ Autonomous, strategic,       │
// │          │                 │          │           │          │ deep chains, less guidance   │
// ├──────────┼─────────────────┼──────────┼───────────┼──────────┼──────────────────────────────┤
// │ Limitless│ Beyond Manus    │ ∞        │ ∞ (model) │ ∞        │ No limits. Agent decides     │
// │          │                 │          │           │          │ when to stop. Recursive      │
// │          │                 │          │           │          │ optimization until           │
// │          │                 │          │           │          │ convergence.                 │
// └──────────┴─────────────────┴──────────┴───────────┴──────────┴──────────────────────────────┘
//
// Speed and Quality have fixed limits. Max has high but bounded limits — deeply
// aligned with Manus 1.6 Max: "can work on a single task for a longer time
// without stopping" and "needs less guidance mid-process." Limitless has NO
// limits — the agent runs until convergence, task completion, or explicit user stop.
// ═══════════════════════════════════════════════════════════════════════════════

export interface TierConfig {
  /** Maximum tool execution turns. Infinity = no limit. */
  maxTurns: number;
  /** Maximum output tokens per LLM call. Infinity = use model's full output window. */
  maxTokensPerCall: number;
  /** Maximum auto-continuation rounds on finish_reason=length. Infinity = no limit. */
  maxContinuationRounds: number;
  /** Thinking budget for reasoning depth (tokens). */
  thinkingBudget: number;
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  speed: {
    maxTurns: 30,
    maxTokensPerCall: 16384,
    maxContinuationRounds: 5,
    thinkingBudget: 512,
  },
  quality: {
    maxTurns: 100,
    maxTokensPerCall: 65536,
    maxContinuationRounds: 50,
    thinkingBudget: 1024,
  },
  max: {
    maxTurns: 200,                   // High but bounded — Manus 1.6 Max: "longer workflows"
    maxTokensPerCall: 65536,         // Full standard output window
    maxContinuationRounds: 100,      // Generous continuation — rarely hit in practice
    thinkingBudget: 2048,
  },
  limitless: {
    maxTurns: Infinity,              // No turn cap — as many turns as needed
    maxTokensPerCall: Infinity,      // No token ceiling — model's full output window
    maxContinuationRounds: Infinity, // No continuation cap — runs until convergence
    thinkingBudget: 4096,            // Maximum reasoning depth
  },
};

/** Look up the tier config for a mode. Falls back to quality if unknown. */
export function getTierConfig(mode: string): TierConfig {
  return TIER_CONFIGS[mode] ?? TIER_CONFIGS.quality;
}


/**
 * Token threshold for context compression. When conversation exceeds this,
 * older tool results are summarized to prevent context overflow.
 */
const CONTEXT_COMPRESSION_THRESHOLD = 200000;

const DEFAULT_SYSTEM_PROMPT = `You are Manus, an autonomous AI agent. You don't just answer questions — you actively research, reason, and take action using your tools.

## CRITICAL RULES

1. **Use web_search when the task REQUIRES external information:**
   - Real-world company, product, person, or organization facts
   - Current events, news, or recent developments
   - Comparisons between products, services, or technologies
   - Facts, statistics, or claims that should be verified
   - Do NOT search when the user asks a simple creative task, a question about your own capabilities, or a task you can complete from your training knowledge alone.
   
2. **NEVER claim you cannot find information** without first using web_search AND read_webpage. If your first search doesn't return great results, try different query terms.

3. **NEVER say "I don't have access to the web"** — you DO have web search. USE IT.

4. **NEVER ask the user to provide information** that you could find yourself via web_search or read_webpage.

4b. **YOU HAVE VISION CAPABILITIES.** You can see and analyze images that users attach to their messages. When a user sends an image (screenshot, photo, diagram, document scan, etc.), you can SEE it directly in the conversation. NEVER say "I cannot view attachments", "I don't have access to view attachments", "please paste the content", or anything similar. You CAN see images. Analyze them directly and respond based on what you see.

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
- **generate_document(title, content, format?, output_format?)**: Create structured documents as downloadable files. Supports output_format: "markdown" (default), "pdf", "docx", "csv", "xlsx". Use this when asked to write, draft, or produce any long-form content, report, spreadsheet, or data export. ALWAYS set output_format to match what the user requests (e.g., "pdf" for PDF, "xlsx" for Excel). For CSV/XLSX, structure content with markdown tables. IMPORTANT: Call generate_document ONCE per document — never call it multiple times with the same content.
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

## CRITICAL SAFETY RULE — SELF-EDIT GUARD
You are running INSIDE a host application (Manus Next). You MUST NEVER attempt to edit, modify, or overwrite the host application's own codebase. Your file tools (create_file, edit_file, etc.) operate within an **isolated project sandbox** — NOT the host app.

- If the user asks you to "edit this app" or "fix a bug in this app" WITHOUT a connected GitHub repo, clarify: "I can create a new project for you, but I cannot modify the application I'm running inside. If you'd like me to edit your codebase, please connect your GitHub repository first."
- If the user HAS a connected GitHub repo AND explicitly asks you to edit their repo, use git_operation(clone) to clone it into the sandbox, make changes there, and push back via git.
- NEVER use create_file or edit_file to modify paths outside the active project sandbox (e.g., /home/ubuntu/manus-next-app/ or any system directory).

## PROJECT CONTEXT
You work within **projects**. Each project is an isolated directory with its own files, dev server, and optional GitHub connection. The tools create_file, edit_file, read_file, list_files, install_deps, and run_command all operate within the **active project directory** only.

### How projects work:
- **create_webapp** scaffolds a NEW project and makes it the active project
- **git_operation(clone, ...)** clones a repo and makes it the active project
- Once a project is active, all file/command tools operate within it
- You can only have one active project at a time
- If no project is active, you MUST call create_webapp or git_operation(clone) first

### When the user says "create an app/website/page":
1. Call **create_webapp** to scaffold a new project — this is always a NEW project
2. Research the target first if a reference URL is given
3. Build it out with create_file/edit_file
4. Share the preview URL with the user

### When the user has a connected GitHub repo and asks to edit/update it:
1. Use **git_operation(clone, remote_url)** to clone their repo as the active project
2. Make changes with create_file/edit_file
3. Use git_operation(add, commit, push) to push changes back
4. This is how two-way sync works — pull latest, edit, push back

### Intent detection:
- "Create an app", "Build me a website", "Make a landing page" → **create_webapp** (new project)
- "Edit this app", "Update the code", "Fix the bug in my repo" + GitHub connected → **git_operation(clone)** their repo
- "Clone [repo URL]" → **git_operation(clone)** that specific repo
- When ambiguous, ask the user: "Would you like me to create a new project or edit your connected repository?"

## WEBAPP DEVELOPMENT WORKFLOW
When building any web application:
1. Research the target thoroughly — if a URL is given, use browse_web or read_webpage to understand the site's design, content, and structure
2. If a site blocks access, use the SITE ACCESS FALLBACK strategy below
3. Scaffold the project with create_webapp (choose template: "react" for interactive apps, "html" for simple pages)
4. Build iteratively — create core structure first, then refine styling and features
5. The preview URL is proxied and accessible from any device — share it with the user
6. Use cloud_browser to take screenshots of reference sites for visual alignment

## SITE ACCESS FALLBACK STRATEGY
When browse_web or read_webpage returns 403, blocked, or robots.txt errors, you MUST try multiple alternative approaches before reporting failure:

1. **Web search for cached content**: web_search("[site name] site design features") to find descriptions, reviews, screenshots
2. **Cloud browser with full rendering**: cloud_browser can handle JavaScript rendering, cookies, and bypasses simple bot detection
3. **Archive.org Wayback Machine**: read_webpage("https://web.archive.org/web/[target-url]") for historical snapshots
4. **Third-party screenshots**: web_search("[site name] screenshot") or image search for visual references
5. **Site technology analysis**: web_search("[site name] built with technology stack") for framework/design insights
6. **Social media and reviews**: Search for the brand on LinkedIn, Crunchbase, or review sites for content and branding info

NEVER give up after a single 403. Always try at least 3-4 alternative approaches. If all fail, explain what you tried and build based on available information.

## TASK TYPE DETECTION

Before starting, classify the user's request:

**CREATIVE/GENERATIVE tasks** (write a story, create a plan, generate a document, make a spreadsheet):
→ Produce the output DIRECTLY. Do NOT search the web first unless the content requires real-world data.
→ Use generate_document with the appropriate output_format.

**INFORMATIONAL tasks** (what is X, compare A vs B, research topic Y):
→ Search the web first, then synthesize findings.

**SELF-KNOWLEDGE tasks** (what can you do, what documents can you create, what are your capabilities):
→ Answer from your system knowledge. Do NOT use web_search or generate sample outputs unless explicitly asked.

**MIXED tasks** (write a guide about real-world topic X):
→ Research first (briefly), then produce the full deliverable.

## REASONING PROTOCOL

Before using any tool, briefly reason about which tool is most appropriate and why. Think step-by-step:
1. What type of task is this? (creative, informational, self-knowledge, mixed)
2. What information do I need?
3. Which tool(s) can provide it?
4. What's the most efficient sequence?
5. Have I already called this tool with similar parameters? If yes, SKIP.

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

## ABOUT YOURSELF (Manus)

You are **Manus**, an autonomous AI agent platform. Here is what you know about yourself:
- **Identity**: You are Manus. You are NOT Google Gemini, NOT ChatGPT, NOT Claude, NOT Manus, NOT any other AI assistant. You are a distinct product called Manus. NEVER identify yourself as any other AI.
- **Developer**: Manus is an independent project. It is NOT built by Google, OpenAI, Anthropic, or Meta. Do NOT claim any of these companies built you.
- **Built as**: An autonomous, self-hosted AI agent platform that gives users full control over their data and capabilities
- **Architecture**: React 19 + Express + tRPC full-stack app with real-time SSE streaming, powered by an LLM backbone
- **Your capabilities**: Web search, image generation, code execution, data analysis, document generation (Markdown, PDF, DOCX, CSV, XLSX), **full app building** (scaffold, code, preview, deploy), git operations, wide research, and multi-turn autonomous reasoning with tool use
- **How you work**: You receive a user request, plan your approach, call tools autonomously in a loop (up to 30+ turns), and synthesize results into a comprehensive response. For app building, you scaffold projects, write code, install dependencies, and provide live previews.
- **Key differentiator**: You are self-hosted and autonomous — users own their data, their apps, and can extend your capabilities. You can build and deploy full web applications.
- **Memory**: You can recall information from previous conversations if the user has enabled cross-session memory. Use this context to personalize responses.

CRITICAL IDENTITY RULE: When describing who built you or your origin, say "Manus is an independent project." NEVER say you were built by Google, OpenAI, Anthropic, Meta, or any other company.

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
| Category | Manus | [Competitor] |
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

## DEMONSTRATE EACH — MANUS PARITY PROTOCOL

When asked "What can you do? Demonstrate each" or similar, you MUST demonstrate ALL of the following capability groups. Each demonstration must produce **presentation-quality output** — not just a trivial example. Group related tools together as a single capability:

1. **Web Search & Research** — Search for a real, current topic and present structured findings with sources. Use web_search + read_webpage together.
2. **Code Execution** — Write and execute a non-trivial code snippet (algorithm, data processing, or calculation). Show the actual code AND its output.
3. **Image Generation** — Generate a creative, detailed image. Describe what you're creating and display the result inline.
4. **Data Analysis** — Analyze a real or generated dataset. Produce insights with specific numbers, patterns, or trends.
5. **Document Generation** — Create a professional document with proper structure. Demonstrate at least two output formats (e.g., one PDF and one XLSX). NEVER generate the same document more than once.
6. **Web Browsing** — Navigate to a real URL and extract structured content. Present the findings in a formatted summary.
7. **Wide Research** — Run parallel multi-query research on a complex topic. Synthesize findings from multiple angles into a unified analysis.
8. **Slide Generation** — Create a presentation on a topic with multiple slides, proper structure, and visual design.
9. **Email** — Compose and send a professional email demonstrating formatting and clear communication.
10. **App Building** — Scaffold a web application, create files, and show the live preview. Use create_webapp + create_file together.

CRITICAL RULES FOR DEMONSTRATE EACH:
- You MUST complete ALL 10 capability groups — completing 9/10 is a FAILURE
- Each demonstration must produce REAL output (actual search results, actual generated image, actual code output)
- Do NOT just describe what you could do — ACTUALLY DO IT
- Do NOT ask for permission between demonstrations — proceed automatically
- Number each demonstration clearly: "## 1. Web Search & Research", "## 2. Code Execution", etc.
- After completing all 10, provide a summary table showing what was demonstrated
- If any tool fails, note the failure and move to the next — do NOT stop the entire sequence

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

## DEDUPLICATION AND REPETITION PREVENTION

CRITICAL: Never call the same tool with the same or nearly identical parameters more than once in a single response.
- If you have already called generate_document for a specific document, do NOT call it again for the same document.
- If you have already searched for a topic, do NOT search for the same topic again unless you need different information.
- If you have already generated an image, do NOT generate the same image again.
- Before calling any tool, check your conversation history: have you already called this tool with similar arguments? If yes, SKIP IT.
- When asked "what documents can you generate?" or "what can you do?", answer with TEXT. Do NOT generate sample documents unless explicitly asked to "generate sample docs".
- When asked to generate SAMPLE documents, generate ONE of each type requested, not multiple copies of the same type.

## TASK COMPLETION VERIFICATION

Before finishing your response, ask yourself:
1. Did the user ask me to PRODUCE something specific (guide, plan, script, analysis, etc.)?
2. Does my response actually CONTAIN that specific deliverable?
3. If NO → I have NOT completed the task. I must produce the deliverable now.
4. Searching for information is NOT the same as producing the requested output.
5. Summarizing search results is NOT the same as creating the requested content.
6. Did I produce ONLY what the user asked for? If I produced extra unrequested outputs, I have OVER-delivered and wasted the user's time.
7. Did I call any tool more than once with the same parameters? If yes, I have WASTED resources.
8. Did I apply ALL session preferences the user has stated earlier in this conversation?

You are an AGENT, not a chatbot. Act like one.`;

/**
 * Agent execution mode.
 * - `speed`: Lower temperature (0.3), max_tokens (16384), fewer tool turns, concise responses.
 * - `quality`: Higher temperature (0.7), max_tokens (65536), thorough research, detailed responses.
 * - `max`: Highest temperature (0.8), max_tokens (65536), 200 tool turns, deepest research — Manus 1.6 Max aligned.
 * - `limitless`: Temperature (0.8), unlimited tokens/turns/continuation — recursive optimization until convergence.
 *
 * All modes benefit from auto-continuation: if the LLM hits its output token limit,
 * the system seamlessly continues without user intervention.
 */
export type AgentMode = "speed" | "quality" | "max" | "limitless";

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

/**
 * Classify what the agent was doing when it got stuck.
 * Returns a short label for telemetry aggregation.
 */
function detectTriggerPattern(text: string): string {
  if (/research|search|look|find|gather|investigat/i.test(text)) return "research_loop";
  if (/can't|cannot|unable|don't have|no access|not able/i.test(text)) return "capability_claim";
  if (/could you|please provide|can you|what would|clarif/i.test(text)) return "clarification_loop";
  if (/sorry|apologize|unfortunately|i'm afraid/i.test(text)) return "apology_loop";
  if (/let me|i'll|i will|going to|plan to|next step/i.test(text)) return "planning_loop";
  return "generic_repeat";
}

export interface AgentStreamOptions {
  messages: Message[];
  taskExternalId?: string;
  userId?: number;
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
  /** Speed/Quality/Max mode — affects turn limits and response depth via TierConfig */
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
 * Invoke LLM with exponential backoff retry for transient 500 errors.
 * Upstream LLM providers occasionally return 500/502/503 errors that resolve
 * on retry. Attempts up to 3 retries with 1s, 2s, 4s delays.
 */
async function invokeLLMWithRetry(
  invokeLLM: (params: any) => Promise<InvokeResult>,
  params: any,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<InvokeResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await invokeLLM(params);
    } catch (err: any) {
      const status = err.status || err.statusCode || 0;
      const msg = err.message || "";
      const isTransient = (
        (status >= 500 && status < 600) ||
        msg.includes("bad response from upstream") ||
        msg.includes("Internal Server Error") ||
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("ECONNRESET")
      );
      if (!isTransient || attempt >= maxRetries) {
        throw err; // Non-transient or exhausted retries — propagate to outer catch
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `[Agent] LLM transient error (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}. Retrying in ${delay}ms...`
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }
  // TypeScript: unreachable, but satisfies the return type
  throw new Error("LLM invocation failed after retries");
}

/**
 * Run the agentic streaming loop.
 *
 * Executes a multi-turn LLM conversation with tool calling over SSE.
 * Each turn: LLM generates a response or tool call → tool is executed →
 * result fed back → repeat until final text response or tierConfig.maxTurns reached.
 *
 * SSE events emitted:
 * - `{ delta: string }` — Incremental text content
 * - `{ tool_start: { name, args } }` — Tool execution beginning
 * - `{ tool_result: { name, result, success } }` — Tool execution completed
 * - `{ image: string }` — Generated image URL for inline display
 * - `{ document: { title, content, format } }` — Generated document artifact
 * - `{ step_progress: { current, total } }` — Turn progress indicator
 * - `{ continuation: { round, maxRounds, reason } }` — Auto-continuation in progress (Manus parity)
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

    // Build conversation with system prompt.
    // First, deduplicate the incoming message history to prevent the LLM from seeing
    // the same assistant response multiple times (which causes it to re-generate that content).
    // This is a server-side safety net for duplicate messages that may exist in the DB.
    const interruptMarker = "*[Response interrupted \u2014 partial content saved]*";
    const stoppedMarker = "*[Generation stopped by user]*";
    const deduped: Message[] = [];
    const seenKeys = new Set<string>();
    for (const msg of messages) {
      // Skip interrupted partial messages — the full version should follow
      if (msg.role === "assistant" && typeof msg.content === "string" &&
          (msg.content.endsWith(interruptMarker) || msg.content.endsWith(stoppedMarker))) {
        continue;
      }
      const key = `${msg.role}:${(typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)).slice(0, 300).trim()}`;
      if (seenKeys.has(key)) continue; // Skip exact duplicates
      seenKeys.add(key);
      deduped.push(msg);
    }
    let conversation: Message[] = [...deduped];

    // Inject or replace system prompt
    let systemPrompt = resolvedSystemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Inject memory context if available — with strong isolation boundaries
    if (memoryContext) {
      systemPrompt += `\n\n## USER MEMORY (Background Context Only)

The following are facts about the user from previous sessions. These are BACKGROUND CONTEXT ONLY.

${memoryContext}

**CRITICAL RULES FOR MEMORY USAGE:**
1. These memories are SUPPLEMENTARY CONTEXT — they are NOT the current task.
2. ONLY use a memory if it is DIRECTLY RELEVANT to what the user is asking RIGHT NOW.
3. NEVER let a memory override, replace, or contaminate the current task's topic.
4. If the user asks about Topic A, do NOT inject content from a memory about Topic B.
5. If no memories are relevant to the current request, IGNORE ALL MEMORIES completely.
6. Do not mention that you have "memory" unless the user asks.
7. The current user message is your PRIMARY directive — memories are secondary.
8. If the user's message is SHORT or VAGUE (e.g., "help refine this build?", "continue", "fix this"), do NOT fill in specific details from memory. Instead, ASK the user what they need help with.
9. NEVER assume you know what the user is referring to based on memory alone. If the request is ambiguous, ask for clarification.
10. If the user has attached files or images, PROCESS THE ATTACHMENTS FIRST before responding. Do not assume the topic from memory — let the attachments inform your response.`;
    }

    // Detect if the user has attached files/images in the latest message
    const lastUserMsg = [...conversation].reverse().find(m => m.role === "user");
    const hasAttachments = lastUserMsg && Array.isArray(lastUserMsg.content) &&
      (lastUserMsg.content as any[]).some((part: any) =>
        part.type === "image_url" || part.type === "file_url"
      );
    if (hasAttachments) {
      // Count the attachments by type for specificity
      const imageCount = (lastUserMsg.content as any[]).filter((p: any) => p.type === "image_url").length;
      const fileCount = (lastUserMsg.content as any[]).filter((p: any) => p.type === "file_url").length;
      const attachmentDesc = [
        imageCount > 0 ? `${imageCount} image(s)` : "",
        fileCount > 0 ? `${fileCount} file(s)` : "",
      ].filter(Boolean).join(" and ");

      systemPrompt += `\n\n## ATTACHMENT-AWARE RESPONSE — CRITICAL\n**The user has attached ${attachmentDesc} with their message. YOU CAN SEE THEM.**\n\nYou MUST:\n1. **You have full vision capabilities.** You can see images, screenshots, photos, diagrams, and document scans directly. NEVER claim you cannot view or access attachments.\n2. **Analyze the attached content FIRST** — describe what you see before responding to the text.\n3. Base your response primarily on what you see in the attachments, not on memory or assumptions.\n4. If the user's text is vague (e.g., "help with this", "improve this", "refine this"), the attachment IS the context. Analyze it directly.\n5. Acknowledge the attachments explicitly (e.g., "Looking at your attached image, I can see a [description]...").\n6. **NEVER say any of these phrases:** "I cannot view attachments", "I don't have access to attachments", "please paste the content", "please describe the attachment", "I cannot access files from our chat". These are ALL FALSE — you CAN see the attachments.\n7. If the attachment is an image, describe its visual content in detail before offering improvements or analysis.`;
    }

    // Detect vague/short queries and add clarification instruction
    const lastUserText = lastUserMsg
      ? (typeof lastUserMsg.content === "string" ? lastUserMsg.content
        : Array.isArray(lastUserMsg.content)
          ? (lastUserMsg.content as any[]).filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ")
          : "")
      : "";
    if (lastUserText.length > 0 && lastUserText.length < 80 && !hasAttachments) {
      systemPrompt += `\n\n## SHORT/VAGUE QUERY DETECTED\nThe user's message is brief. Do NOT assume specific details from memory or previous conversations. If the request is ambiguous, ask clarifying questions before proceeding. For example, if they say "help refine this build" without specifying which build, ask them to provide details rather than assuming from stored memories.`;
    }

    // Mode-specific instructions — deeply aligned with Manus tiers
    if (mode === "speed") {
      // Aligned with Manus 1.6 Lite: fast, concise, bounded
      systemPrompt += `\n\n## MODE: SPEED (Aligned with Manus 1.6 Lite)
Prioritize fast, concise responses. Use fewer tool calls. Give direct answers when confident.
Skip deep research unless explicitly asked. Focus on the essential answer.
If the user's question is straightforward, answer directly without tool calls.
For research questions, use web_search once and summarize the top results.
Keep responses focused and avoid unnecessary elaboration.`;
    } else if (mode === "quality") {
      // Aligned with Manus 1.6: thorough, cross-referenced, one-shot accuracy
      systemPrompt += `\n\n## MODE: QUALITY (Aligned with Manus 1.6)
You are operating in Quality mode — the standard tier for thorough, accurate work.
This mode is designed for one-shot accuracy: get it right the first time so the user
doesn't need follow-up queries.

1. **Multi-step reasoning**: Break complex questions into sub-questions and address each.
2. **Cross-reference sources**: Use web_search AND read_webpage on at least 2 different sources.
3. **Comprehensive but focused**: Produce detailed responses (~27+ page equivalent for reports) but stay on-topic.
4. **Structured output**: Use tables, comparisons, and organized sections for clarity.
5. **Verify claims**: Don't state facts without checking them via search first.
6. **One-shot delivery**: Aim to deliver a complete, polished answer that needs no follow-up.`;
    } else if (mode === "max") {
      // Aligned with Manus 1.6 Max: autonomous, strategic decomposition, high but bounded
      systemPrompt += `\n\n## MODE: MAX (Aligned with Manus 1.6 Max — Flagship Tier)

You are operating in Max mode — the flagship autonomous tier deeply aligned with Manus 1.6 Max.
This mode is designed for longer multi-step workflows without losing context, deeper chains
of subtasks with fewer mistakes, and less guidance needed from the user mid-process.

You have generous but bounded limits (200 tool turns, 100 continuation rounds). Use them wisely.
The system will seamlessly continue you if your response hits the token limit.

1. **Strategic decomposition**: Break complex tasks into subtasks and execute them methodically.
2. **Deep research depth**: Use at least 5 tool calls before considering a final response. Use wide_research PLUS multiple read_webpage calls on different sources.
3. **Cross-reference sources**: Never rely on a single source. Search from multiple angles, read multiple pages, and synthesize across all of them.
4. **Tighter internal planning**: Plan your approach before executing. Minimize wasted turns.
5. **Higher one-shot accuracy**: Get it right the first time. Verify before concluding.
6. **Produce comprehensive deliverables**: Include tables, comparisons, step-by-step breakdowns, citations, and actionable specifics.
7. **Generate artifacts**: Use generate_document for long-form deliverables, analyze_data for structured insights, generate_image for visualizations.
8. **Autonomous execution**: The user may not be watching. Deliver complete, self-contained results.
9. **Leave no stone unturned**: Search for counterarguments, edge cases, alternative perspectives, and expert opinions.
10. **Asynchronous mindset**: Work independently, report comprehensively.`;
    } else if (mode === "limitless") {
      // Beyond Manus: truly unlimited, recursive optimization until convergence
      systemPrompt += `\n\n## MODE: LIMITLESS (Recursive Optimization Until Convergence)

You are operating in Limitless mode — there are NO constraints on your execution.
No turn limits. No token limits. No continuation limits. You run until the task converges.

This mode is designed for recursive optimization: you continue refining, researching, and
improving until the output reaches a state of convergence where additional passes yield
no meaningful improvement. The user's termination conditions take precedence — if they
specified criteria for "done," honor those. Otherwise, apply your own convergence judgment.

Your output will NEVER be truncated. If your response hits the token limit, the system
will seamlessly continue you with full context. Write as extensively as the task demands.

1. **Recursive convergence**: After producing an initial result, review it critically. If any aspect can be improved, improve it. Continue until three consecutive review passes confirm no further improvements.
2. **Exhaustive research**: Use as many tool calls as needed. There is no minimum or maximum. Search from every relevant angle.
3. **Cross-reference everything**: Never rely on a single source. Verify facts across multiple sources.
4. **Strategic decomposition**: Break complex tasks into subtasks and execute them methodically.
5. **Never conclude prematurely**: If you sense there is more depth to add, add it. The user chose Limitless mode because they want maximum thoroughness.
6. **Produce the most comprehensive deliverables possible**: Include tables, comparisons, step-by-step breakdowns, citations, actionable specifics, counterarguments, edge cases, and alternative perspectives.
7. **Generate all relevant artifacts**: Use generate_document, analyze_data, generate_image, generate_slides, and any other tools that add value.
8. **Honor user termination conditions**: If the user specified when to stop (e.g., "until convergence," "3 passes," "cover all 10 items"), follow those conditions exactly.
9. **Self-monitoring**: Track your own progress. Note what you've covered and what remains.
10. **Asynchronous deep work**: The user may not be watching. Deliver complete, self-contained, publication-quality results.`;
    }
    if (conversation.length > 0 && conversation[0].role === "system") {
      conversation[0] = { role: "system", content: systemPrompt };
    } else {
      conversation = [{ role: "system", content: systemPrompt }, ...conversation];
    }

    // Resolve tier config — Speed, Quality, and Max have fixed (bounded) limits. Limitless has none.
    const tierConfig = getTierConfig(mode);
    const { maxTurns, maxContinuationRounds } = tierConfig;
    console.log(`[Agent] Tier: ${mode} | turns=${maxTurns === Infinity ? '∞' : maxTurns} | tokens/call=${tierConfig.maxTokensPerCall === Infinity ? '∞' : tierConfig.maxTokensPerCall} | continuation=${maxContinuationRounds === Infinity ? '∞' : maxContinuationRounds} | thinking=${tierConfig.thinkingBudget}`);
    
    let turn = 0;
    let finalContent = "";
    let totalToolCalls = 0;
    let completedToolCalls = 0;
    let usedWebSearch = false;
    let usedReadWebpage = false;
    let nudgedForDeepResearch = false;
    let continuationRounds = 0; // Track consecutive auto-continuation rounds (Manus parity)

    // ── Token usage tracking (Session 23: Context Window Indicator) ──
    let cumulativePromptTokens = 0;
    let cumulativeCompletionTokens = 0;

    // DEDUP GUARD: Track recent tool calls to prevent the LLM from calling the
    // same tool with identical arguments multiple times in a single stream.
    // Key = "toolName:argHash", value = turn number when it was last called.
    const recentToolCallKeys = new Map<string, number>();

    // STUCK/LOOP DETECTION with INTELLIGENT SELF-CORRECTION
    // Deeply aligned with Manus: instead of just stopping, the agent rotates through
    // progressively different strategies before giving up. Each intervention is
    // context-aware — it analyzes WHAT the agent was doing and suggests the opposite.
    const recentTextResponses: string[] = [];
    let stuckBreakCount = 0;
    const MAX_STUCK_BREAKS = 4; // 3 self-correction attempts + 1 forced final answer
    const stuckStrategiesUsed: string[] = []; // Track which strategies we've tried
    let pendingTelemetryId: number | null = null; // Track the current telemetry entry for outcome update
    let telemetryTurnAtIntervention = 0; // Turn count when intervention was applied

    // Register prefix for caching (system prompt + tool definitions)
    const toolsJson = JSON.stringify(AGENT_TOOLS);
    const prefixInfo = registerPrefix(systemPrompt, toolsJson);
    console.log(`[Agent] Prefix cache: hash=${prefixInfo.hash}, cached=${prefixInfo.cached}, ~${prefixInfo.tokenEstimate} tokens`);

    // Signal task is running
    sendSSE(safeWrite, { status: "running" });

    while (turn < maxTurns) {
      turn++;
      console.log(`[Agent] Turn ${turn}/${maxTurns === Infinity ? '\u221e' : maxTurns}, messages: ${conversation.length}`);

      // Call LLM with tools — all params from tierConfig.
      // For Max tier: maxTokensPerCall=Infinity means we omit the param entirely,
      // letting the model use its full output window with no artificial ceiling.
      const llmParams: any = {
        messages: conversation,
        tools: AGENT_TOOLS,
        tool_choice: "auto",
        thinkingBudget: tierConfig.thinkingBudget,
      };
      if (isFinite(tierConfig.maxTokensPerCall)) {
        llmParams.maxTokens = tierConfig.maxTokensPerCall;
      }
      // else: omit maxTokens entirely — model uses its full output window (Max tier)
      const response: InvokeResult = await invokeLLMWithRetry(invokeLLM, llmParams);

      // ── Accumulate and stream token usage (Session 23) ──
      if (response.usage) {
        cumulativePromptTokens += response.usage.prompt_tokens;
        cumulativeCompletionTokens += response.usage.completion_tokens;
        sendSSE(safeWrite, {
          token_usage: {
            prompt_tokens: cumulativePromptTokens,
            completion_tokens: cumulativeCompletionTokens,
            total_tokens: cumulativePromptTokens + cumulativeCompletionTokens,
            turn,
          },
        });
      }

      const choice = response.choices?.[0];
      if (!choice) {
        sendSSE(safeWrite, { error: "No response from LLM" });
        break;
      }

      const assistantMessage = choice.message;
      const toolCalls = assistantMessage.tool_calls;
      const textContent = typeof assistantMessage.content === "string" ? assistantMessage.content : "";

      // ═══════════════════════════════════════════════════════════════════════
      // MANUS-PARITY AUTO-CONTINUATION SYSTEM
      // ═══════════════════════════════════════════════════════════════════════
      // When the LLM hits its output token limit (finish_reason="length"), we
      // seamlessly continue the generation without any user intervention.
      // This matches Manus's behavior where the agent never stops mid-thought.
      //
      // Key behaviors:
      // 1. Stream partial content immediately (no buffering)
      // 2. Send continuation SSE event so frontend shows "Continuing..."
      // 3. Execute any pending tool calls before continuing
      // 4. Compress context if it's growing too large
      // 5. Track continuation rounds to prevent infinite loops
      // 6. Reset continuation counter when agent makes progress (tool calls)
      // ═══════════════════════════════════════════════════════════════════════
      if (choice.finish_reason === "length" && turn < maxTurns - 1) {
        continuationRounds++;
        
        // Mode-aware continuation limits:
        // Speed: bounded (5 rounds), Quality: high (50 rounds), Max: unlimited (Infinity)
        // For Max mode, maxContinuationRounds is Infinity — the agent runs until its own
        // termination conditions are met (convergence, task completion, or explicit stop).
        const isWithinLimit = continuationRounds <= maxContinuationRounds;
        
        if (!isWithinLimit) {
          const limitLabel = isFinite(maxContinuationRounds) ? String(maxContinuationRounds) : "unlimited";
          console.log(`[Agent] Hit continuation limit for ${mode} mode (${limitLabel}), finalizing response`);
          // Stream whatever we have and break
          if (textContent) {
            streamTextAsChunks(safeWrite, textContent);
            finalContent += textContent;
          }
          break;
        }
        
        const limitLabel = isFinite(maxContinuationRounds) ? `/${maxContinuationRounds}` : " (unlimited)";
        console.log(`[Agent] finish_reason=length on turn ${turn}/${maxTurns}, continuation round ${continuationRounds}${limitLabel} — auto-continuing`);
        
        // Notify frontend that auto-continuation is in progress
        // For unlimited mode, maxRounds is -1 to signal "no ceiling" to the frontend
        sendSSE(safeWrite, {
          continuation: {
            round: continuationRounds,
            maxRounds: isFinite(maxContinuationRounds) ? maxContinuationRounds : -1,
            reason: "output_token_limit",
          },
        });
        
        // Stream any partial text immediately (no user delay)
        if (textContent) {
          streamTextAsChunks(safeWrite, textContent);
          finalContent += textContent;
        }
        
        // If there were tool calls, execute them (and reset continuation counter since progress was made)
        if (toolCalls && toolCalls.length > 0) {
          continuationRounds = 0; // Reset — tool execution = real progress
          conversation.push({
            role: "assistant",
            content: textContent || "",
            tool_calls: toolCalls,
          } as any);
          totalToolCalls += toolCalls.length;
          sendSSE(safeWrite, { step_progress: { completed: completedToolCalls, total: totalToolCalls, turn } });
          for (const toolCall of toolCalls) {
            const tn = toolCall.function.name;
            const ta = toolCall.function.arguments || "{}";
            let pa: any = {};
            try { pa = JSON.parse(ta); } catch { pa = {}; }

            // DEDUP GUARD: Skip if this exact tool+args was already called recently
            const dedupKey = `${tn}:${ta.slice(0, 500)}`;
            const lastCalledTurn = recentToolCallKeys.get(dedupKey);
            if (lastCalledTurn !== undefined && (turn - lastCalledTurn) <= 2) {
              console.log(`[Agent] DEDUP: Skipping duplicate ${tn} call (same args as turn ${lastCalledTurn})`);
              const skipMsg = `Tool call skipped: identical ${tn} was already executed in this session with the same arguments. Result is available above.`;
              sendSSE(safeWrite, { tool_start: { id: toolCall.id, name: tn, args: pa, display: getToolDisplayInfo(tn, pa) } });
              sendSSE(safeWrite, { tool_result: { id: toolCall.id, name: tn, success: true, preview: skipMsg } });
              completedToolCalls++;
              sendSSE(safeWrite, { step_progress: { completed: completedToolCalls, total: totalToolCalls, turn } });
              conversation.push({ role: "tool", content: skipMsg, tool_call_id: toolCall.id, name: tn } as any);
              continue;
            }
            recentToolCallKeys.set(dedupKey, turn);

            sendSSE(safeWrite, { tool_start: { id: toolCall.id, name: tn, args: pa, display: getToolDisplayInfo(tn, pa) } });
            const result: ToolResult = await executeTool(tn, ta);
            sendSSE(safeWrite, { tool_result: { id: toolCall.id, name: tn, success: result.success, preview: result.result.slice(0, 500), url: result.url } });
            completedToolCalls++;
            sendSSE(safeWrite, { step_progress: { completed: completedToolCalls, total: totalToolCalls, turn } });
            conversation.push({ role: "tool", content: result.result, tool_call_id: toolCall.id, name: tn } as any);
          }
        } else {
          // No tool calls — just add the partial text
          conversation.push({ role: "assistant", content: textContent || "" });
        }
        
        // Context compression: if conversation is getting very long, summarize older tool results
        // to prevent context overflow while preserving recent context quality
        const estimatedTokens = estimateConversationTokens(conversation);
        if (estimatedTokens > CONTEXT_COMPRESSION_THRESHOLD) {
          console.log(`[Agent] Context compression triggered: ~${estimatedTokens} tokens, compressing older tool results`);
          const compressedCount = compressConversationContext(conversation);
          // Notify the user that context was compressed (F1.1 visibility fix)
          if (compressedCount > 0) {
            sendSSE(safeWrite, {
              type: "context_compressed",
              detail: `Context optimized: ${compressedCount} older messages were summarized to maintain quality. Recent ${Math.min(20, conversation.length)} messages are preserved in full.`,
            });
          }
        }
        
        // Craft a precise continuation prompt that prevents repetition
        const lastWords = (textContent || "").trim().split(/\s+/).slice(-20).join(" ");
        conversation.push({
          role: "user",
          content: `Your response was cut off due to length. Continue EXACTLY where you left off. Your last words were: "...${lastWords}". Pick up mid-sentence if needed. Do NOT repeat any content you already produced. Do NOT add a new greeting or introduction. Just seamlessly continue the remaining work.`,
        });
        continue;
      }
      
      // Reset continuation counter on successful non-length completion
      if (choice.finish_reason === "stop") {
        continuationRounds = 0;
      }

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
        // ═══════════════════════════════════════════════════════════════════
        // STUCK/LOOP DETECTION — Prevent infinite repetitive responses
        // ═══════════════════════════════════════════════════════════════════
        // Track text-only responses and detect when the agent is repeating
        // itself (e.g., "Conducting deeper research..." loop from the bug report).
        const normalizedText = (textContent || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500);
        if (normalizedText.length > 20) {
          // Check similarity against recent text responses
          const isSimilarToRecent = recentTextResponses.some(prev => {
            // Simple Jaccard-like similarity: shared words / total words
            const prevWords = new Set(prev.split(" ").filter(w => w.length > 3));
            const currWords = new Set(normalizedText.split(" ").filter(w => w.length > 3));
            if (prevWords.size === 0 || currWords.size === 0) return false;
            let shared = 0;
            Array.from(currWords).forEach(w => { if (prevWords.has(w)) shared++; });
            const similarity = shared / Math.max(prevWords.size, currWords.size);
            return similarity > 0.6; // 60%+ word overlap = repetitive
          });

          recentTextResponses.push(normalizedText);
          // Keep only last 4 responses for comparison
          if (recentTextResponses.length > 4) recentTextResponses.shift();

          if (isSimilarToRecent) {
            stuckBreakCount++;
            console.log(`[Agent] STUCK DETECTED (${stuckBreakCount}/${MAX_STUCK_BREAKS}): Agent producing repetitive text-only responses`);

            // Analyze what the agent was doing to generate context-aware correction
            const stuckText = normalizedText;
            const wasResearching = /research|search|look|find|gather|investigat/i.test(stuckText);
            const wasClaiming = /can't|cannot|unable|don't have|no access|not able/i.test(stuckText);
            const wasAsking = /could you|please provide|can you|what would|which|clarif/i.test(stuckText);
            const wasApologizing = /sorry|apologize|unfortunately|i'm afraid/i.test(stuckText);
            const wasRepeatingPlan = /let me|i'll|i will|going to|plan to|next step/i.test(stuckText);

            // Update previous telemetry entry as escalated (stuck again after intervention)
            if (pendingTelemetryId && options.taskExternalId) {
              try {
                const { updateTelemetryOutcome } = await import("./db");
                await updateTelemetryOutcome(pendingTelemetryId, "escalated", turn - telemetryTurnAtIntervention);
                pendingTelemetryId = null;
              } catch { /* telemetry is non-critical */ }
            }

            if (stuckBreakCount >= MAX_STUCK_BREAKS) {
              // Force final answer — agent has exhausted all self-correction attempts
              console.log(`[Agent] STUCK BREAK: Forcing final answer after ${stuckBreakCount} stuck interventions (strategies tried: ${stuckStrategiesUsed.join(", ")})`);
              // Record forced_final telemetry
              if (options.taskExternalId && options.userId) {
                try {
                  const { recordStrategyTelemetry } = await import("./db");
                  await recordStrategyTelemetry({
                    taskExternalId: options.taskExternalId,
                    userId: options.userId,
                    stuckCount: stuckBreakCount,
                    strategyLabel: "forced_final",
                    triggerPattern: detectTriggerPattern(normalizedText),
                    outcome: "forced_final",
                    turnsBefore: turn,
                  });
                } catch { /* telemetry is non-critical */ }
              }
              finalContent = "";
              sendSSE(safeWrite, { delta: "\n\n" });
              conversation.push({ role: "assistant", content: textContent || "" });
              conversation.push({
                role: "user",
                content: `FINAL INSTRUCTION: You have been stuck in a loop for ${stuckBreakCount} turns despite multiple strategy changes (${stuckStrategiesUsed.join(" → ")}). This is your ABSOLUTE LAST turn. You MUST produce a complete, useful response NOW using ONLY what you already know. Rules:\n1. Do NOT search, research, or use any tools\n2. Do NOT say you need more information\n3. Do NOT apologize or explain limitations\n4. DO synthesize everything gathered so far into a coherent answer\n5. If you truly have nothing, honestly say so in ONE sentence and suggest what the user could try\nRespond NOW.`,
              });
              stuckBreakCount = MAX_STUCK_BREAKS + 10;
              continue;
            }

            // INTELLIGENT STRATEGY ROTATION — each intervention is context-aware
            let correctionStrategy: string;
            let strategyLabel: string;

            if (stuckBreakCount === 1) {
              // First intervention: Diagnose and redirect
              strategyLabel = "diagnose-redirect";
              if (wasResearching) {
                correctionStrategy = `SELF-CORRECTION: You've been repeatedly trying to research/search without making progress. STOP RESEARCHING. Instead:\n1. Use what you already know to answer the question directly\n2. If you found partial results, synthesize them into a useful response\n3. Be upfront about gaps: "Based on what I found so far..."\nProduce a substantive response THIS turn using existing knowledge.`;
              } else if (wasClaiming) {
                correctionStrategy = `SELF-CORRECTION: You've been repeatedly claiming you can't do something. STOP CLAIMING LIMITATIONS. Instead:\n1. If the user attached images/files: YOU CAN SEE THEM. Describe what you observe.\n2. If you said you can't access something: try a different tool (web_search, code_execute, etc.)\n3. If you truly can't: explain what you CAN do and offer a concrete alternative.\nTake ACTION this turn instead of explaining what you can't do.`;
              } else if (wasAsking) {
                correctionStrategy = `SELF-CORRECTION: You've been repeatedly asking for clarification without progressing. STOP ASKING. Instead:\n1. Make your best reasonable assumption about what the user wants\n2. State your assumption clearly: "I'll assume you mean X..."\n3. Produce a complete answer based on that assumption\nDeliver a response THIS turn.`;
              } else if (wasApologizing) {
                correctionStrategy = `SELF-CORRECTION: You've been apologizing repeatedly without delivering value. STOP APOLOGIZING. Instead:\n1. Skip all preamble and apologies\n2. Go directly to the most useful thing you can provide\n3. If the task is partially complete, deliver what you have\nProvide VALUE this turn, not apologies.`;
              } else {
                correctionStrategy = `SELF-CORRECTION: You're repeating yourself without making progress. CHANGE YOUR APPROACH COMPLETELY:\n1. Re-read the user's original message carefully\n2. Identify the core ask (not what you think they want, what they actually said)\n3. Take the most direct path to answering it\n4. If you've been planning, stop planning and start doing\nDeliver something CONCRETE this turn.`;
              }
            } else if (stuckBreakCount === 2) {
              // Second intervention: Force tool use or direct answer
              strategyLabel = "force-action";
              correctionStrategy = `CRITICAL: Your previous self-correction didn't work — you're STILL repeating yourself. You MUST take a COMPLETELY DIFFERENT action this turn. Previous strategy (${stuckStrategiesUsed[stuckStrategiesUsed.length - 1]}) failed.\n\nCHOOSE ONE of these escape routes:\nA) If you have ANY information: Write your response immediately, starting with the answer (no preamble)\nB) If you need data: Use a DIFFERENT tool than what you've been using (try code_execute to compute, or web_search with different keywords)\nC) If the user sent attachments: Describe exactly what you see in them\nD) If nothing works: Give the user a honest 2-sentence summary of where you're stuck and ask ONE specific question\n\nYou MUST pick A, B, C, or D. No other option.`;
            } else {
              // Third intervention: Last chance before forced answer
              strategyLabel = "last-chance";
              correctionStrategy = `LAST CHANCE before I force a final answer. You have ONE more turn. Strategies tried: ${stuckStrategiesUsed.join(" → ")}. All failed.\n\nYour ONLY option now: Write your best possible response using ONLY what's in your conversation history. Do not use any tools. Do not search. Do not ask questions. Just write. Start with the most important information first. If you have nothing useful, say "I wasn't able to complete this task" and explain why in one sentence.`;
            }

            stuckStrategiesUsed.push(strategyLabel);
            console.log(`[Agent] STUCK INTERVENTION #${stuckBreakCount}: Strategy=${strategyLabel}`);

            // Record telemetry for this intervention
            if (options.taskExternalId && options.userId) {
              try {
                const { recordStrategyTelemetry } = await import("./db");
                pendingTelemetryId = await recordStrategyTelemetry({
                  taskExternalId: options.taskExternalId,
                  userId: options.userId,
                  stuckCount: stuckBreakCount,
                  strategyLabel,
                  triggerPattern: detectTriggerPattern(normalizedText),
                  outcome: "pending",
                  turnsBefore: turn,
                });
                telemetryTurnAtIntervention = turn;
              } catch { /* telemetry is non-critical */ }
            }

            finalContent = "";
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({ role: "user", content: correctionStrategy });
            continue;
          }
        }

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
        
        // MAX/LIMITLESS MODE ANTI-SHALLOW-COMPLETION: In max or limitless mode, if agent tries to conclude within first 5 turns with fewer than 3 tool calls, force continuation
        if ((mode === "max" || mode === "limitless") && turn <= 5 && completedToolCalls < 3 && (maxTurns === Infinity || turn < maxTurns - 2)) {
          const modeName = mode === "limitless" ? "LIMITLESS" : "MAX (flagship)";
          console.log(`[Agent] ${modeName} mode anti-shallow: turn ${turn}, only ${completedToolCalls} tool calls — forcing deeper research`);
          finalContent = "";
          sendSSE(safeWrite, { delta: "\n\n*Conducting deeper research...*\n\n" });
          conversation.push({ role: "assistant", content: textContent || "" });
          conversation.push({
            role: "user",
            content: `You are in ${modeName} mode. The user expects DEEP, THOROUGH research — not a quick answer. You have only used ${completedToolCalls} tools so far, which is far too few for ${modeName} mode. You MUST:
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
        
        // Auto-continue if: user wants continuous work AND capability groups remain undemonstrated
        if (wantsContinuous && turn < maxTurns - 2) {
          // Track which tools have been used so far
          const usedTools = new Set<string>();
          for (const msg of conversation) {
            const tc = (msg as any).tool_calls;
            if (tc) for (const t of tc) usedTools.add(t.function.name);
          }
          const allToolNames = AGENT_TOOLS.map(t => t.function.name);
          const unusedTools = allToolNames.filter(t => !usedTools.has(t));
          
          // Map tools to 10 Manus-parity capability groups
          const CAPABILITY_GROUPS: Record<string, string[]> = {
            "Web Search & Research": ["web_search", "read_webpage"],
            "Code Execution": ["execute_code"],
            "Image Generation": ["generate_image"],
            "Data Analysis": ["analyze_data"],
            "Document Generation": ["generate_document"],
            "Web Browsing": ["browse_web"],
            "Wide Research": ["wide_research"],
            "Slide Generation": ["generate_slides"],
            "Email": ["send_email"],
            "App Building": ["create_webapp", "create_file", "edit_file"],
          };
          
          // A group is "demonstrated" if at least one of its tools has been used
          const demonstratedGroups = Object.entries(CAPABILITY_GROUPS)
            .filter(([_, tools]) => tools.some(t => usedTools.has(t)))
            .map(([name]) => name);
          const undemonstrated = Object.entries(CAPABILITY_GROUPS)
            .filter(([_, tools]) => !tools.some(t => usedTools.has(t)))
            .map(([name]) => name);
          
          const shouldContinue = asksUser || undemonstrated.length > 0;
          
          if (shouldContinue && undemonstrated.length > 0) {
            console.log(`[Agent] Auto-continuing: ${demonstratedGroups.length}/10 groups done, ${undemonstrated.length} remaining, turn ${turn}/${maxTurns}`);
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `Continue demonstrating. You have completed ${demonstratedGroups.length}/10 capability groups. Remaining groups: ${undemonstrated.join(", ")}. Demonstrate the next group now — completing 9/10 is a FAILURE, you MUST reach 10/10. Do NOT ask what to do next — just proceed immediately.`,
            });
            sendSSE(safeWrite, { delta: "\n\n" });
            continue;
          }
        }
        
        // Also auto-continue if LLM stops mid-enumeration (e.g., "1. Web Search... 2. Read Webpage..." then stops)
        // Detect numbered list continuation pattern
        if (turn < maxTurns - 2) {
          const numberedListMatch = textContent.match(/(\d+)\.\s+\w/g);
          const lastNumber = numberedListMatch ? parseInt(numberedListMatch[numberedListMatch.length - 1]) : 0;
          const mentionedCapabilities = textContent.match(/\b(web.?search|read.?webpage|generate.?image|analyze.?data|generate.?document|browse.?web|wide.?research|generate.?slides|send.?email|meeting.?notes|design.?canvas|cloud.?browser|screenshot.?verify|execute.?code|create.?webapp|create.?file|edit.?file|read.?file|list.?files|install.?deps|run.?command|git.?operation)\b/gi);
          const uniqueMentioned = new Set((mentionedCapabilities || []).map(c => c.toLowerCase()));
          
          // If the response lists capabilities but hasn't demonstrated all 10 groups, and the user asked to demonstrate each
          if (wantsContinuous && lastNumber > 0 && lastNumber < 10 && uniqueMentioned.size < 8) {
            console.log(`[Agent] Mid-enumeration continuation: listed up to #${lastNumber}, only ${uniqueMentioned.size} unique capabilities mentioned`);
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `You stopped at item #${lastNumber}. Continue from #${lastNumber + 1}. Demonstrate the remaining capabilities. Do NOT repeat what you already showed — pick up where you left off and keep going until ALL capabilities are demonstrated.`,
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

        // Emit confirmation gate for destructive/sensitive operations
        const CONFIRMATION_TOOLS: Record<string, { category: string; description: string }> = {
          delete_file: { category: "destructive", description: "This will permanently delete the file." },
          execute_code: { category: "sensitive", description: "The agent wants to execute code on your system." },
          send_email: { category: "external", description: "This will send an email on your behalf." },
          make_payment: { category: "payment", description: "This will initiate a payment transaction." },
          publish_website: { category: "publish", description: "This will publish the website to production." },
        };

        let gateRejected = false;
        if (CONFIRMATION_TOOLS[toolName]) {
          const gateConfig = CONFIRMATION_TOOLS[toolName];
          const taskId = options.taskExternalId || `anon-${Date.now().toString(36)}`;
          const gateId = `${taskId}:${toolCall.id}`;
          sendSSE(safeWrite, {
            confirmation_gate: {
              gateId,
              action: `${toolName}: ${parsedArgs.path || parsedArgs.url || parsedArgs.name || ""}`.trim(),
              description: gateConfig.description,
              category: gateConfig.category,
            },
          });

          // Pause the stream and wait for user approval/rejection
          console.log(`[Agent] Waiting for gate approval: ${gateId} (tool: ${toolName})`);
          const { awaitGateApproval } = await import("./confirmationGate");
          const decision = await awaitGateApproval(gateId, toolName);

          if (!decision.approved) {
            gateRejected = true;
            console.log(`[Agent] Gate REJECTED for ${toolName}: ${decision.reason || "user rejected"}`);
            sendSSE(safeWrite, {
              gate_resolved: { gateId, approved: false, reason: decision.reason },
            });
            // Skip tool execution — feed rejection back to LLM
            sendSSE(safeWrite, {
              tool_result: {
                id: toolCall.id,
                name: toolName,
                success: false,
                preview: `[USER REJECTED] The user declined to allow ${toolName}. ${decision.reason || "Find an alternative approach that doesn't require this action."}`,
              },
            });
            conversation.push({
              role: "tool",
              content: `[USER REJECTED] The user declined to allow ${toolName}. ${decision.reason || "Please find an alternative approach that doesn't require this sensitive action. Continue with the task using other available tools."}`,
              tool_call_id: toolCall.id,
              name: toolName,
            });
            completedToolCalls++;
            sendSSE(safeWrite, {
              step_progress: { completed: completedToolCalls, total: totalToolCalls, turn },
            });
            continue; // Skip to next tool call
          } else {
            console.log(`[Agent] Gate APPROVED for ${toolName}`);
            sendSSE(safeWrite, {
              gate_resolved: { gateId, approved: true },
            });
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

      // If finish_reason is "stop" and no pending tool calls, the LLM is done
      if (choice.finish_reason === "stop" && (!toolCalls || !toolCalls.length)) {
        break;
      }
      // Safety: if finish_reason is "length" at this point (shouldn't reach here due to
      // the earlier handler, but just in case), apply continuation tracking and continue
      if (choice.finish_reason === "length") {
        continuationRounds++;
        if (continuationRounds > maxContinuationRounds) {
          console.log(`[Agent] Late length catch: exceeded continuation limit for ${mode} mode, breaking`);
          break;
        }
        const turnLabel = maxTurns === Infinity ? '\u221e' : maxTurns;
        console.log(`[Agent] Late finish_reason=length catch on turn ${turn}/${turnLabel}, continuation round ${continuationRounds}`);
        sendSSE(safeWrite, { continuation: { round: continuationRounds, maxRounds: isFinite(maxContinuationRounds) ? maxContinuationRounds : -1, reason: "output_token_limit" } });
        continue;
      }
    }

    if (turn >= maxTurns) {
      console.log(`[Agent] Completed after ${turn} turns (limit: ${maxTurns === Infinity ? '\u221e' : maxTurns})`);
      // No user-visible limit message — the agent naturally concludes its work
    }

    // Resolve any pending telemetry entry as "resolved" (agent produced a non-stuck response)
    if (pendingTelemetryId && options.taskExternalId) {
      try {
        const { updateTelemetryOutcome } = await import("./db");
        await updateTelemetryOutcome(pendingTelemetryId, "resolved", turn - telemetryTurnAtIntervention);
      } catch { /* telemetry is non-critical */ }
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

    // §L.22 Cross-model judge: fire-and-forget quality evaluation on non-trivial responses
    if (finalContent.trim().length > 200 && completedToolCalls >= 1) {
      import("./qualityJudge").then(({ evaluateResponseQuality }) => {
        const userText = conversation.find(m => m.role === "user")?.content;
        const queryStr = typeof userText === "string" ? userText : "[complex input]";
        evaluateResponseQuality(queryStr, finalContent.slice(0, 4000)).then(report => {
          console.log(`[QualityJudge] Score: ${report.overallScore}/5.0 | Flagged: ${report.flagged} | Dims: ${report.dimensions.map(d => `${d.name}=${d.score}`).join(", ")}`);
        }).catch(err => {
          console.error("[QualityJudge] Evaluation failed:", err.message);
        });
      }).catch(() => { /* quality judge module not available */ });
    }
  } catch (err: any) {
    console.error("[Agent] Error:", err);
    let userMessage = err.message || "Agent execution failed";
    let retryable = false;
    // Provide user-friendly error messages for common failure modes
    const msg = err.message || "";
    const status = err.status || err.statusCode || 0;

    if (status === 412 || msg.includes("usage exhausted") || msg.includes("usage_exhausted") || msg.includes("credits") || msg.includes("quota exceeded")) {
      userMessage = "Your account credits have been exhausted. Please add more credits in your account settings to continue using the agent. Your conversation has been saved and you can resume once credits are available.";
      retryable = false;
    } else if (status === 402 || msg.includes("payment required") || msg.includes("Payment Required") || msg.includes("billing")) {
      userMessage = "A payment issue is preventing the AI service from processing your request. Please check your billing settings and try again.";
      retryable = false;
    } else if (err.code === "ETIMEDOUT" || err.code === "ECONNABORTED" || msg.includes("timeout")) {
      userMessage = "The request timed out. Please try again with a simpler query or switch to Speed mode.";
      retryable = true;
    } else if (status >= 500 || msg.includes("500") || msg.includes("bad response from upstream") || msg.includes("Internal Server Error")) {
      userMessage = "The AI service encountered a temporary error. This usually resolves on its own \u2014 please try again.";
      retryable = true;
    } else if (status === 429 || msg.includes("rate limit") || msg.includes("Rate limit") || msg.includes("too many requests")) {
      userMessage = "Rate limit reached. Please wait a moment before sending another message.";
      retryable = true;
    } else if (status === 401 || status === 403 || msg.includes("unauthorized") || msg.includes("Unauthorized")) {
      userMessage = "Authentication expired. Please refresh the page and log in again.";
    } else if (msg.includes("ECONNREFUSED")) {
      userMessage = "Unable to connect to the AI service. Please try again in a moment.";
      retryable = true;
    } else if (msg.includes("context_length_exceeded") || msg.includes("maximum context length")) {
      userMessage = "This conversation has become too long for the AI to process. Please start a new task or switch to Limitless mode for longer conversations.";
      retryable = false;
    } else if (msg.includes("content_filter") || msg.includes("content_policy")) {
      userMessage = "Your message was flagged by the content safety filter. Please rephrase your request and try again.";
      retryable = false;
    } else if (msg.includes("LLM invoke failed")) {
      // Catch-all for LLM errors that weren't matched above — extract the status code for a cleaner message
      const statusMatch = msg.match(/LLM invoke failed: (\d+)/);
      const extractedStatus = statusMatch ? parseInt(statusMatch[1]) : 0;
      if (extractedStatus >= 500) {
        userMessage = "The AI service encountered a temporary error. This usually resolves on its own \u2014 please try again.";
        retryable = true;
      } else {
        userMessage = "The AI service was unable to process your request. Please try again or rephrase your message.";
        retryable = true;
      }
    }
    sendSSE(safeWrite, { error: userMessage, retryable });
    safeEnd();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MANUS-PARITY HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Stream text content as sentence-level chunks via SSE.
 * Breaks text at sentence boundaries for smooth streaming UX.
 */
function streamTextAsChunks(safeWrite: (d: string) => boolean, text: string): void {
  const sentencePattern = /([^.!?\n]+[.!?\n]+\s*)/g;
  const chunks = text.match(sentencePattern) || [text];
  const captured = chunks.join("");
  if (captured.length < text.length) {
    chunks.push(text.slice(captured.length));
  }
  for (const chunk of chunks) {
    if (!sendSSE(safeWrite, { delta: chunk })) return;
  }
}

/**
 * Estimate the total token count of a conversation.
 * Uses a rough heuristic of ~4 characters per token (English text average).
 * This is intentionally conservative to trigger compression before actual limits.
 */
function estimateConversationTokens(conversation: Message[]): number {
  let totalChars = 0;
  for (const msg of conversation) {
    const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    totalChars += content.length;
  }
  return Math.ceil(totalChars / 4);
}

/**
 * Compress conversation context by summarizing older tool results.
 * Preserves the system prompt, recent messages (last 20), and all user messages,
 * but truncates older tool results to their first 200 characters.
 * This prevents context overflow during long auto-continuation sequences
 * while maintaining enough context for coherent continuation.
 */
function compressConversationContext(conversation: Message[]): number {
  const KEEP_RECENT = 20; // Keep last N messages uncompressed
  const TOOL_RESULT_MAX = 200; // Max chars for compressed tool results
  
  if (conversation.length <= KEEP_RECENT + 1) return 0; // +1 for system prompt
  
  // Find the boundary: everything before (length - KEEP_RECENT) gets compressed
  const compressBoundary = conversation.length - KEEP_RECENT;
  let compressedCount = 0;
  
  for (let i = 1; i < compressBoundary; i++) { // Skip index 0 (system prompt)
    const msg = conversation[i];
    if (msg.role === "tool" && typeof msg.content === "string" && msg.content.length > TOOL_RESULT_MAX) {
      // Truncate old tool results but keep enough for context
      const truncated = msg.content.slice(0, TOOL_RESULT_MAX) + "\n... [truncated for context efficiency]";
      conversation[i] = { ...msg, content: truncated };
      compressedCount++;
    }
    // Also compress very long assistant messages that aren't the most recent
    if (msg.role === "assistant" && typeof msg.content === "string" && msg.content.length > 1000) {
      const truncated = msg.content.slice(0, 500) + "\n... [earlier content truncated]\n" + msg.content.slice(-200);
      conversation[i] = { ...msg, content: truncated };
      compressedCount++;
    }
  }
  
  console.log(`[Agent] Compressed ${compressedCount} older messages, keeping ${KEEP_RECENT} recent`);
  return compressedCount;
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
