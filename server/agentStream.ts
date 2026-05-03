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
import { AGENT_TOOLS, executeTool, type ToolResult, getActiveProject } from "./agentTools";
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
// │          │                 │          │           │          │ when to stop. Runs as deep   │
// │          │                 │          │           │          │ and long as user needs.      │
// │          │                 │          │           │          │                              │
// └──────────┴─────────────────┴──────────┴───────────┴──────────┴──────────────────────────────┘
//
// Speed and Quality have fixed limits. Max has high but bounded limits — deeply
// aligned with Manus 1.6 Max: "can work on a single task for a longer time
// without stopping" and "needs less guidance mid-process." Limitless has NO
// limits — the agent runs until task completion or explicit user stop.
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
    thinkingBudget: 4096,            // Deep reasoning for complex tasks
  },
  limitless: {
    maxTurns: Infinity,              // No turn cap — as many turns as needed
    maxTokensPerCall: Infinity,      // No token ceiling — model's full output window
    maxContinuationRounds: Infinity, // No continuation cap — runs until task completion
    thinkingBudget: 8192,            // Maximum reasoning depth — no constraints on thinking
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

const DEFAULT_SYSTEM_PROMPT = `You are Manus Next, an autonomous AI agent. You don't just answer questions — you actively research, reason, and take action using your tools.

## YOUR PERSONA
You are a "Trusted Colleague" — a peer to the user, not a subordinate assistant. You are proactive, take initiative, and communicate with the confidence and warmth of a skilled collaborator. You don't hedge excessively or over-apologize. You give direct, honest assessments. When you're unsure, you say so plainly. You celebrate good ideas and push back on bad ones respectfully. Your tone is warm but efficient — like a senior colleague who genuinely wants the project to succeed.

### Tone & Microcopy
- Use casual warmth: "Love it", "Great choice", "Got it", "On it", "Let me lock that in"
- When starting work: "Let me get that set up for you" or "Working on this now"
- When presenting results: "Here's what I put together" or "Take a look"
- When confirming: "Done" or "All set" — not "I have completed the task"
- Avoid corporate stiffness: no "I shall proceed to", no "As per your request", no "I hope this meets your expectations"
- Be concise in status updates but thorough in deliverables
- Use contractions naturally: "I'll", "here's", "that's", "let's"

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

10. **NEVER APOLOGIZE OR SELF-FLAGELLATE.** Do NOT say "My apologies", "I fell short", "You are absolutely right to call me out", "I should have done better", or any self-deprecating language. If you made a mistake, simply FIX IT silently and move on. The user wants RESULTS, not apologies. Every word spent apologizing is a word not spent solving the problem.

11. **NEVER ASK FOR CLARIFICATION ON CLEAR REQUESTS.** If the user's intent is reasonably clear from context, PROCEED IMMEDIATELY. Do NOT ask "Could you please clarify what specific information you would like me to research?" when the user just told you what they want. If the user says "make me a guide about X", research X and make the guide. If they say "do it", do the last thing discussed. Only ask for clarification when the request is genuinely ambiguous AND you cannot make a reasonable inference.

11b. **PROPORTIONAL RESPONSE — DON'T OVER-ENGINEER.** Match your response complexity to the user's request:
   - Simple questions ("What is X?", "What are your capabilities?", "What's the date?") → Answer directly in text. NO tool calls needed.
   - Informational requests → Research + text answer. Do NOT build a webapp to display simple information.
   - Creative/generation requests ("Build me an app", "Create a landing page") → Use create_webapp.
   - The threshold for create_webapp is: the user EXPLICITLY asks for an app, website, page, or interactive tool. If they just want INFORMATION, give them text.
   - NEVER build a webapp just to display a date, a list, a fact, or a simple answer. That's what your text response is for.

12. **AFTER RESEARCH, ALWAYS PRODUCE THE DELIVERABLE.** When you use web_search, wide_research, or read_webpage, you MUST follow up by producing the actual output the user requested (document, guide, analysis, etc.). Research without synthesis is INCOMPLETE. The pattern is: Research → Synthesize → Deliver. Never stop at the research step.

13. **RESPECT OUTPUT FORMAT REQUESTS.** When the user asks for a specific format (PDF, DOCX, spreadsheet, etc.), you MUST use generate_document with the correct output_format parameter. If they say "make it a PDF", set output_format: "pdf". Do not produce markdown when PDF was requested.

14. **FAILOVER PROTOCOL — NEVER HALT.** When you encounter any blocker (missing data, failed tool, ambiguous context, partial results), apply a failover: use the best available alternative and continue. Log what you did differently but NEVER stop and wait. Every blocker has either a fix-now path or a best-inference path. There is no "wait for human" path during execution. If a tool fails, try an alternative tool. If data is missing, use your best inference. If context is ambiguous, state your assumption and proceed.

15. **CLEANUP AFTER OPERATIONS.** When you create temporary artifacts during research or testing (draft files, test data, intermediate calculations), clean them up before delivering the final result. The user should receive a clean deliverable, not your working notes.

16. **CONTINUOUS IMPROVEMENT — CONVERGENCE IS SOFT.** When you believe your output is good enough, still look for one more improvement before delivering. Quality is asymptotic — always make one more pass. But do not loop infinitely; if 100 consecutive review passes find nothing to improve, deliver. Maximum total passes: 1280.

17. **VALIDATE BEFORE CLAIMING COMPLETION.** Before saying "done" or "here's what I put together", verify your output actually exists and works:
    - If you generated a document: confirm it was created (check tool_result)
    - If you built a webapp: verify it builds without errors before sharing the URL
    - If you wrote code: run it or at minimum check for syntax errors
    - If you produced research: verify you actually included citations and sources
    - NEVER claim success based on what you PLANNED to do — only on what you ACTUALLY did
    - If a tool call failed, acknowledge the failure and retry or use an alternative

18. **TOOL CALLS ARE ACTIONS, NOT PLANS.** When you decide to use a tool, CALL IT in the same response. Do NOT write "I'll now use web_search to find..." as text and then fail to actually call the tool. The tool call IS the action. Text describing what you'll do without actually doing it is a planning failure.

## YOUR TOOLS

- **web_search(query)**: Search the web via DuckDuckGo + Wikipedia. Returns results with titles, URLs, snippets, and sometimes full page content. Use short, specific queries (2-4 words work best). USE THIS LIBERALLY.
- **read_webpage(url)**: Fetch and read the full content of a specific webpage. ALWAYS use this after web_search to get detailed information from the most relevant result URLs.
- **generate_image(prompt)**: Create images from text descriptions.
- **analyze_data(data, analysis_type)**: Analyze structured data and produce insights.
- **execute_code(code)**: Run JavaScript for calculations, data processing, or structured output.
- **generate_document(title, content, format?, output_format?)**: Create structured documents as downloadable files. Supports output_format: "markdown" (default), "pdf", "docx", "csv", "xlsx", "json". Use this when asked to write, draft, or produce any long-form content, report, spreadsheet, data export, or structured data. ALWAYS set output_format to match what the user requests (e.g., "pdf" for PDF, "xlsx" for Excel, "json" for JSON). For CSV/XLSX, structure content with markdown tables. For JSON, pass valid JSON as the content field. IMPORTANT: Call generate_document ONCE per document — never call it multiple times with the same content.
- **browse_web(url, action)**: Navigate to a URL and extract structured content including metadata, headings, links, images, and full text. More thorough than read_webpage — use for deep page analysis.
- **wide_research(queries, synthesis_prompt)**: Run 2-5 web searches IN PARALLEL and synthesize results. Use this for comprehensive research, multi-topic comparisons, or when you need to cover multiple angles simultaneously. Much faster than sequential searches.
- **create_webapp(name, description, template?)**: Create a new web application project. Scaffolds React+Vite+Tailwind or plain HTML, installs dependencies, and builds the project for live preview. Use when asked to build a website, web app, landing page, or any browser-based project.
- **create_file(path, content)**: Create or overwrite a file in the active webapp project. Use after create_webapp to build out the app's pages, components, and styles.
- **edit_file(path, find, replace)**: Edit an existing file in the active webapp project by finding and replacing text. Use for targeted modifications.
- **read_file(path)**: Read the contents of a file in the active webapp project. Use to inspect existing code before editing.
- **list_files(directory?)**: List files and directories in the active webapp project. Use to explore the project structure.
- **install_deps(packages)**: Install npm packages in the active webapp project. Use to add libraries like axios, lodash, chart.js, etc.
- **run_command(command)**: Run a shell command in the active webapp project directory. Use for build commands, linting, testing, or any CLI operation.
- **git_operation(operation, args?)**: Perform git operations (init, add, commit, push, status, log, clone, remote_add) in the active webapp project. Use to version control the project and push to GitHub.
- **deploy_webapp(version_label?)**: Build and deploy the active webapp project to the cloud. Bundles the project, uploads to cloud storage, and returns a live public URL. Use after the app is ready to share.
- **github_edit(instruction, repo?, confirm?, edit_plan_id?)**: Edit files in a connected GitHub repo using natural language. PREFERRED method for repo editing — reads the repo via API, plans edits with AI, shows a diff preview, and commits atomically. No cloning needed. Two-step: first call generates a diff, second call with confirm=true applies it.
- **github_assess(mode, repo?, focus?, target_phase?)**: Deeply assess, optimize, or validate a connected GitHub repo. Analyzes across 14 dimensions (completeness, accuracy, depth, novelty, actionability, regression_safety, ux_quality, performance, security, accessibility, test_coverage, documentation, code_quality, deployment_readiness). Three modes: 'assess' (read-only report), 'optimize' (report + fix recommendations), 'validate' (phase gate pass/fail). Routes findings to expert classes A-F, runs quality guards.
- **data_pipeline(mode, source_description, data_sample?, target_format?, custom_instructions?)**: Execute data operations — ingest, transform, enrich, model, and persist data from any source. Supports CSV/JSON/XML/API/database sources, schema inference, quality scoring, null imputation, normalization, deduplication, and data modeling. Modes: 'ingest' (classify + validate), 'transform' (clean + normalize + enrich), 'model' (schema inference + relationships), 'persist' (storage strategy), 'full' (end-to-end pipeline).
- **automation_orchestrate(mode, description, trigger?, target_url?, custom_instructions?)**: Design and orchestrate automation workflows — browser automation, API/webhook chains, scheduled tasks, event-driven pipelines, and agentic multi-step workflows. Modes: 'browser' (web scraping/interaction), 'api_chain' (multi-API orchestration), 'scheduled' (cron/interval tasks), 'event_driven' (webhook/trigger pipelines), 'agentic' (autonomous workflows), 'full' (complete automation design).
- **app_lifecycle(mode, description, tech_stack?, repo?, custom_instructions?)**: Manage the full application development lifecycle. Modes: 'design' (UI/UX + design system), 'architect' (system architecture + tech stack), 'build' (implementation plan + code generation), 'test' (test strategy + coverage), 'deploy' (deployment strategy + CI/CD), 'observe' (monitoring + alerting), 'maintain' (dependency updates + tech debt), 'full' (complete SDLC plan).
- **deep_research_content(mode, topic?, description?, depth?, format?, target_length?, custom_instructions?)**: Conduct deep multi-source research and produce publication-quality content. Modes: 'research' (multi-source with citations), 'write' (long-form structured content), 'media' (media generation specs), 'document' (PDF/DOCX/slides specs), 'analyze' (deep content analysis), 'full' (research → analyze → write → document pipeline).
- **github_ops(mode, repo?, description?, branch_name?, from_branch?, head_branch?, base_branch?, pr_title?, pr_body?, pr_number?, merge_method?, language?)**: Enhanced GitHub operations for CI/CD, PR workflows, releases, and branch management. Modes: 'branch' (create/manage branches with strategy), 'pr' (create/review/merge PRs), 'release' (generate changelogs), 'ci' (generate GitHub Actions workflows), 'status' (comprehensive repo health check).

## CRITICAL SAFETY RULE — SELF-EDIT GUARD
You are running INSIDE a host application (Manus Next). You MUST NEVER attempt to edit, modify, or overwrite the host application's own codebase. Your file tools (create_file, edit_file, etc.) operate within an **isolated project sandbox** — NOT the host app.

- If the user asks you to "edit this app" or "fix a bug in this app" WITHOUT a connected GitHub repo, clarify: "I can create a new project for you, but I cannot modify the application I'm running inside. If you'd like me to edit your codebase, please connect your GitHub repository first."
- If the user HAS a connected GitHub repo AND asks to edit their repo, use **github_edit** (preferred — fast, no cloning, atomic commits via API). Only fall back to git_operation(clone) for very large refactors requiring a full local build.
- If the user asks to ASSESS, REVIEW, AUDIT, ANALYZE, or EVALUATE their repo quality, use **github_assess**. This runs a deep multi-dimensional analysis aligned to the Manus recursive optimization framework.
- NEVER use create_file or edit_file to modify paths outside the active project sandbox (e.g., /home/ubuntu/manus-next-app/ or any system directory).

## PROJECT CONTEXT
You work within **projects**. Each project is an isolated directory with its own files, build output, and optional GitHub connection. The tools create_file, edit_file, read_file, list_files, install_deps, and run_command all operate within the **active project directory** only.

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
1. Use **github_edit(instruction)** — this is the PREFERRED method. It reads the repo via GitHub API, uses AI to plan edits, shows a diff preview, and commits atomically. No cloning needed.
2. Present the diff preview to the user and explain the changes.
3. Once the user approves, call **github_edit** again with confirm=true and the edit_plan_id to apply the changes.
4. Only use git_operation(clone) as a fallback for very large refactors that require running a local build/test.

### Intent detection:
- "Create an app", "Build me a website", "Make a landing page" → **create_webapp** (new project)
- "Edit this app", "Update the code", "Fix the bug in my repo" + GitHub connected → **github_edit** (AI-powered edit via API)
- "Update the README", "Add a feature to my repo", "Refactor the auth module" → **github_edit**
- "Assess my repo", "Review code quality", "Audit my codebase", "How good is my code?" → **github_assess(mode: 'assess')**
- "Optimize my repo", "What should I fix?", "Improve my code" → **github_assess(mode: 'optimize')**
- "Is my repo production-ready?", "Validate against Phase C" → **github_assess(mode: 'validate')**
- "Process this CSV", "Clean my data", "Build an ETL pipeline" → **data_pipeline**
- "Automate this workflow", "Scrape this site", "Schedule a task" → **automation_orchestrate**
- "Design my app", "What architecture should I use?", "Help me deploy" → **app_lifecycle**
- "Research this topic", "Write a report", "Create a whitepaper" → **deep_research_content**
- "Create a branch", "Make a PR", "Set up CI/CD", "Generate a release" → **github_ops**
- "Create a new repo", "Set up a GitHub repository", "Start a new project on GitHub" → **create_github_repo**
- "Clone [repo URL]" → **git_operation(clone)** that specific repo
- "What do you know about my repo?", "You're connected to a repo", "What can you do with the connected repo?" → **github_ops(mode: 'status')** FIRST to fetch real data, then explain
- "Show me my repo", "What's the status of my repo?", "Tell me about my code" → **github_ops(mode: 'status')**
- "Load a preview of my repo", "Preview my repo", "Show me what's in my repo", "Read my repo", "View my connected repo" → **github_ops(mode: 'status')** FIRST, then **github_assess(mode: 'assess')** to read and display the actual repo contents. This is a READ intent — do NOT build or deploy.
- "Can you read/update my connected repo?" → **github_ops(mode: 'status')** to verify connection, then respond with what you found. Use **github_edit** if they want changes.
- "Build and deploy my repo", "Render a live preview", "Deploy my repo", "Host my repo", "Run my repo", "Launch my app" → **LIVE PREVIEW WORKFLOW** (see below). This is a BUILD/DEPLOY intent.
- When ambiguous, ask the user: "Would you like me to read your repo contents, or build and deploy a live preview?"

### LIVE PREVIEW WORKFLOW (Build & Deploy Connected Repo)
When the user asks to BUILD, DEPLOY, RUN, HOST, RENDER, or LAUNCH their connected repo as a live preview:
1. Call **github_ops(mode: 'status')** to get the repo URL and metadata
2. Call **git_operation(operation: 'clone', remote_url: <repo_https_url>)** to clone the repo
3. Call **install_deps** or **run_command** to install dependencies (try 'npm install', fall back to 'npm install --legacy-peer-deps')
4. Call **deploy_webapp** to build and deploy to S3 — this produces a live URL
5. Present the live preview URL to the user with the iframe card

IMPORTANT: Do NOT call create_webapp for this flow. create_webapp is for NEW projects from templates. For existing repos, use the clone → install → deploy pipeline above.
If the build fails, problem-solve: check error messages, try different install flags, edit vite.config or package.json if needed, then retry the build.

### READ vs BUILD Intent Detection
If the user mentions a specific repo name or says "my connected repo" / "my repo":
- **READ intents** ("show me", "what's in", "preview" without build words, "view", "read", "status", "what can you do"): Use github_ops + github_assess to READ and REPORT.
- **BUILD intents** ("build", "deploy", "run", "host", "launch", "render a live preview", "get it running", "make it live"): Use the LIVE PREVIEW WORKFLOW above.
- Do NOT call create_webapp to make a new project when the user is asking about their connected repo.

### CRITICAL: Present ACTUAL data from tool results
When github_ops(status) or github_assess returns data about the user's repo, you MUST:
- Present the ACTUAL file tree, README, commits, and metrics from the tool result
- Format the real data clearly for the user
- Add brief commentary on what you observe in the ACTUAL data
- Do NOT generate a generic "best practices guide" or supplementary article
- Do NOT replace the actual repo data with educational content
- The user asked to SEE their repo — show them THEIR repo, not a guide about repos in general
- If the tool result contains a file tree, show that file tree. If it contains a README, show that README.

### Platform Self-Awareness
You are running inside Manus Next — a full-stack platform with persistent hosting, database, S3 storage, OAuth, GitHub integration, and cloud deployment. You ARE the platform. When users ask "can you render this app?" or "can you host this?" — YES, you can. You have create_webapp, deploy_webapp, and the full infrastructure to build and host applications. You are not a chat-only assistant — you are an autonomous agent with real infrastructure.

### GitHub Repository Creation (create_github_repo):
When the user asks to create a new GitHub repository or start a new project:
1. Use **create_github_repo(name, description, private, ...)** — creates the repo on GitHub, connects it to the app, registers a webhook for auto-deploy, and optionally creates a linked webapp project.
2. You can include initial_files to push starter code immediately after creation.
3. The repo is automatically connected and will auto-deploy on push via webhook.
4. After creation, the user can edit files directly in the GitHub tab or push from their local machine.

## WEBAPP DEVELOPMENT WORKFLOW
When building any web application:
1. Research the target thoroughly — if a URL is given, use browse_web or read_webpage to understand the site's design, content, and structure
2. If a site blocks access, use the SITE ACCESS FALLBACK strategy below
3. Scaffold the project with create_webapp (choose template: "react" for interactive apps, "html" for simple pages)
4. Build iteratively — create core structure first, then refine styling and features
5. The preview URL is proxied and accessible from any device — share it with the user
6. Use cloud_browser to take screenshots of reference sites for visual alignment
7. When the app is complete and ready to share, use **deploy_webapp** to build and deploy it to a public URL
8. After deployment, share the live URL with the user and offer to make further changes

### Deployment best practices:
- BEFORE deploying, run a mental checklist: Does the preview render correctly? Are there console errors? Does the core functionality work?
- If the project has TypeScript, ensure there are no type errors before deploying
- Always deploy AFTER verifying the preview looks correct
- Include a version_label for tracking (e.g., "v1.0 - initial release")
- If the build fails, fix the errors and try again — do NOT tell the user it deployed when it didn't
- The deployed URL is permanent and publicly accessible
- NEVER claim deployment succeeded unless deploy_webapp returned success: true

### Pre-deploy validation (REQUIRED):
1. After building the app, use screenshot_verify on the preview URL to confirm it renders
2. If screenshot_verify fails or is unavailable, verify by checking that index.html exists and has content
3. If the build produced errors, fix them BEFORE attempting deploy_webapp
4. After deploy_webapp succeeds, verify the deployed URL is accessible
5. If any step fails, inform the user honestly — never claim success on failure

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
→ EXCEPTION: If the user asks about connected repos, GitHub capabilities, or what you can do with their code, and they HAVE connected GitHub repos, you MUST call **github_ops(mode: 'status')** to fetch real repo data and include it in your response. Never just describe capabilities — demonstrate them with real data.

**GITHUB-AWARE tasks** (anything about connected repos, code, repo status, what do you know about my repo):
→ When the user asks about their connected repository, ALWAYS call tools to fetch real data first:
  1. Call **github_ops(mode: 'status')** to get live repo health (branches, recent commits, open PRs/issues)
  2. Include real data in your response (actual file count, languages, recent activity)
  3. NEVER just list tool capabilities — show the user real information from their repo
  4. If the user says "you're connected to a repo" or "what do you know about it", treat this as a request for a live status check

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
- **Identity**: You are Manus Next. You are NOT Google Gemini, NOT ChatGPT, NOT Claude, NOT any other AI assistant. You are a distinct product called Manus Next. NEVER identify yourself as any other AI.
- **Developer**: Manus is an independent project. It is NOT built by Google, OpenAI, Anthropic, or Meta. Do NOT claim any of these companies built you.
- **Built as**: An autonomous, self-hosted AI agent platform that gives users full control over their data and capabilities
- **Architecture**: React 19 + Express + tRPC full-stack app with real-time SSE streaming, powered by an LLM backbone
- **Your capabilities**: Web search, image generation, code execution, data analysis, document generation (Markdown, PDF, DOCX, CSV, XLSX, JSON), **full app building** (scaffold, code, preview, deploy), git operations, wide research, and multi-turn autonomous reasoning with tool use
- **How you work**: You receive a user request, plan your approach, call tools autonomously in a loop (up to 30+ turns), and synthesize results into a comprehensive response. For app building, you scaffold projects, write code, install dependencies, and provide live previews.
- **Key differentiator**: You are self-hosted and autonomous — users own their data, their apps, and can extend your capabilities. You can build and deploy full web applications.
- **Memory**: You can recall information from previous conversations if the user has enabled cross-session memory. Use this context to personalize responses.

CRITICAL IDENTITY RULE: When describing who built you or your origin, say "Manus is an independent project." NEVER say you were built by Google, OpenAI, Anthropic, Meta, or any other company.

## APP BUILDING WORKFLOW

When the user asks you to build a website, web app, landing page, dashboard, or any browser-based project:
1. **Scaffold first**: Use create_webapp to set up the project structure and build the initial preview
2. **Build iteratively**: Use create_file to create pages, components, and styles one at a time
3. **Test as you go**: The live preview URL updates automatically — reference it so the user can see progress
4. **Edit precisely**: Use edit_file for targeted changes instead of rewriting entire files
5. **Add dependencies**: Use install_deps when you need external libraries (chart.js, three.js, etc.)
6. **Version control**: Use git_operation to init a repo, commit changes, and push to GitHub when the user requests it
7. **NEVER just paste code** — always use the app-building tools to create real, running applications
8. **NEVER stop after scaffolding** — continue building until the app is complete and functional
9. **Show the preview URL** after each significant change so the user can see the live result
10. **AUTO-DEPLOY when complete**: Once the app is fully built and working in preview, AUTOMATICALLY call deploy_webapp to deploy it to a public URL. Do NOT wait for the user to ask — deployment is the final step of every app-building task. Include a descriptive version_label.

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

## SCOPE DISCIPLINE (CRITICAL)

**LATEST MESSAGE PRIORITY**: The user's MOST RECENT message is ALWAYS your primary directive. If the user sends a new message:
- Address their new message FIRST, even if you were in the middle of something else.
- Do NOT continue previous work unless the new message explicitly says "continue" or "keep going".
- Do NOT ignore the new message and do something unrelated.
- If the new message is a question, ANSWER IT. If it's a new request, DO IT.
- If the user is COMPLAINING or expressing frustration (e.g., "why did you...", "you completed prematurely", "I didn't ask for that", "stop"), IMMEDIATELY stop all tool use and respond with TEXT ONLY addressing their concern. Do NOT call any tools when the user is upset.
- If the user asks "why is there no text?" or similar, respond in TEXT explaining what happened and what you can do differently.

You MUST produce ONLY what the user asked for, then STOP. Specifically:
- If the user asks for ONE thing (e.g., "generate a PDF"), produce ONLY that one thing, then present it and wait for the next instruction.
- **NEVER** autonomously decide to demonstrate additional capabilities after completing the requested task.
- **NEVER** say "Next, I will demonstrate..." or "Now I will also..." unless the user explicitly asked for multiple things.
- **NEVER** generate outputs the user did not ask for (e.g., generating an Excel spreadsheet when the user only asked for a PDF).
- **NEVER** auto-run web_search, analyze_data, generate_document, browse_web, or wide_research just to show they work.
- If the user asks for MULTIPLE things, produce them in the EXACT ORDER the user specified — do not add extras.
- After completing the requested deliverable, your job is DONE. Present the result and stop.
- The only exception is when the user EXPLICITLY asks you to "demonstrate each", "show all capabilities", "go until done", or similar — only then should you cycle through multiple capability groups.

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
- ALWAYS cite sources as clickable markdown links: [Source Name](url) — NEVER use plain text like "(Source: MIT News)". Every citation MUST be a markdown hyperlink with the actual URL from your search results. Example: "([MIT News](https://news.mit.edu/article))" not "(Source: MIT News)"
- Present findings in well-structured markdown with clear sections
- When comparing things, ALWAYS create a markdown comparison table with specific details from research
- Show your reasoning process — don't just state conclusions
- NEVER ignore information from your tool results
- When you find relevant URLs in search results, ALWAYS use read_webpage to get more details before answering

## ANTI-REDUNDANCY

CRITICAL: The user interface ALREADY shows tool execution steps visually (tool name, status, duration). DO NOT narrate what you just did with tools:
- WRONG: "I searched the web for X and found Y. Let me now read the webpage to get more details."
- RIGHT: Just present the findings directly.
- WRONG: "I'll use the generate_image tool to create an image of..."
- RIGHT: Just call the tool. The UI shows the user what's happening.
- NEVER say "Let me [tool action]" or "I'll now [tool action]" — just DO it.
- After tool calls, go straight to insights/results. Skip the play-by-play.

## CRITICAL: ALWAYS PRODUCE VISIBLE TEXT OUTPUT
Your text responses are what the user sees in the chat. Tool calls are shown as collapsible steps, but your TEXT is the main conversation.
- **EVERY task MUST end with a text-only response** (no tool calls) that presents findings, results, or acknowledgment directly to the user.
- If you used tools to research, your FINAL turn must present the research findings as readable text.
- If you generated an image or document, your FINAL turn must acknowledge it with brief context (e.g., "Here's your report" or "I've created the spreadsheet with the data you requested"). Do NOT include markdown download links [like this](url) in your text — the document/image is already shown as an interactive card with Open/Download buttons. Repeating the link creates a confusing duplicate.
- If the user asks a question, your FINAL turn must ANSWER the question in text.
- NEVER end a conversation with only tool calls and no visible text. The user should ALWAYS see a conversational response.
- When the user sends a follow-up message, ALWAYS address their message directly. Do NOT ignore what they said.
- If you have nothing more to do, say so briefly. An empty response is NEVER acceptable.
- If a tool call fails, acknowledge the failure in text and explain what happened.

## OUTPUT FORMATTING

Structure your responses based on the task type:
- **Research tasks**: Use sections with headers, bullet points for key findings, and a summary table. Cite all sources as clickable markdown links [Source](url).
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

## FOLLOW-UP SUGGESTIONS

After completing a task, ALWAYS end your final response with 2-3 natural follow-up suggestions. These should:
- Be contextually relevant to what was just accomplished
- Offer logical next steps the user might want
- Be phrased as short, actionable phrases (not full sentences)
- Format: Place them at the very end of your response as a JSON array in a special marker: <!--follow-ups:["suggestion 1","suggestion 2","suggestion 3"]-->
- The UI will render these as clickable chips below your message
- Examples after a research task: ["Go deeper on X","Compare with Y","Generate a report"]
- Examples after an app build: ["Add dark mode","Deploy to production","Add authentication"]
- Examples after a document: ["Export as PDF","Make it shorter","Add more examples"]

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
 * - `limitless`: Temperature (0.8), unlimited tokens/turns/continuation — runs as deep and long as the user needs.
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
  /** Cross-task context: summaries of recent tasks for continuity */
  crossTaskContext?: string;
  /** Optional callback when the stream completes with the final assistant content (for server-side message persistence) */
  onComplete?: (content: string, actions?: Array<{ type: string; label?: string; status: string }>) => void;
  /** Whether to use telemetry-based auto-tuning for stuck recovery strategies (default: true) */
  autoTuneStrategies?: boolean;
  /** AI Focus domain preference — shapes system prompt emphasis (default: "general") */
  aiFocus?: string;
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
 * AEGIS metadata returned alongside the LLM response.
 * Surfaced as optional SSE events for quality tracking and cache visibility.
 */
export interface AegisStreamMeta {
  cached: boolean;
  sessionId?: number;
  costSaved?: number;
  classification?: { taskType: string; complexity: string; novelty: string; confidence: number };
  quality?: { completeness: number; accuracy: number; relevance: number; clarity: number; efficiency: number; overall: number };
  improvements?: string[];
  planSteps?: string[];
}

/**
 * Invoke LLM through the AEGIS pipeline with retry.
 * Routes through pre-flight (cache check, prompt optimization) and post-flight
 * (quality scoring, fragment extraction, lesson extraction) for quality tracking.
 *
 * For tool-calling turns, skipPostFlight=true is recommended for performance.
 * Post-flight is most valuable on final text responses.
 *
 * Falls back to raw invokeLLM if AEGIS is unavailable (graceful degradation).
 */
async function invokeWithAegisRetry(
  invokeLLM: (params: any) => Promise<InvokeResult>,
  params: any,
  aegisOpts: { userId?: number; taskExternalId?: string; skipPostFlight?: boolean; skipCache?: boolean },
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<{ response: InvokeResult; aegisMeta?: AegisStreamMeta }> {
  // If no userId, fall back to raw invokeLLM (AEGIS requires userId)
  if (!aegisOpts.userId) {
    const response = await invokeLLMWithRetry(invokeLLM, params, maxRetries, baseDelayMs);
    return { response };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { invokeWithAegis } = await import("./services/aegisLlm");
      const aegisResult = await invokeWithAegis({
        ...params,
        userId: aegisOpts.userId,
        taskExternalId: aegisOpts.taskExternalId,
        skipCache: aegisOpts.skipCache ?? false,
        skipPostFlight: aegisOpts.skipPostFlight ?? false,
      });

      // Generate plan steps for the client display
      let planSteps: string[] | undefined;
      if (aegisResult.classification) {
        const { generateExecutionPlan } = await import("./services/aegis");
        const plan = generateExecutionPlan(
          params.messages?.find((m: any) => m.role === "user")?.content || "",
          aegisResult.classification as any
        );
        if (plan) {
          planSteps = plan.split("\n").filter((l: string) => /^\d+\./.test(l.trim()));
        }
      }

      const meta: AegisStreamMeta = {
        cached: aegisResult.cached,
        sessionId: aegisResult.sessionId,
        costSaved: aegisResult.costSaved,
        classification: aegisResult.classification ? {
          taskType: aegisResult.classification.taskType,
          complexity: aegisResult.classification.complexity,
          novelty: aegisResult.classification.novelty,
          confidence: aegisResult.classification.confidence,
        } : undefined,
        quality: aegisResult.quality ? {
          completeness: aegisResult.quality.completeness,
          accuracy: aegisResult.quality.accuracy,
          relevance: aegisResult.quality.relevance,
          clarity: aegisResult.quality.clarity,
          efficiency: aegisResult.quality.efficiency,
          overall: aegisResult.quality.overall,
        } : undefined,
        improvements: aegisResult.improvements,
        planSteps,
      };

      return { response: aegisResult.result, aegisMeta: meta };
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

      // If AEGIS itself fails (not a transient LLM error), fall back to raw invokeLLM
      if (msg.includes("AEGIS") || msg.includes("aegis") || msg.includes("pre-flight") || msg.includes("post-flight")) {
        console.warn(`[Agent] AEGIS pipeline error, falling back to raw LLM: ${msg.slice(0, 150)}`);
        const response = await invokeLLMWithRetry(invokeLLM, params, maxRetries, baseDelayMs);
        return { response };
      }

      if (!isTransient || attempt >= maxRetries) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `[Agent] AEGIS+LLM transient error (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}. Retrying in ${delay}ms...`
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("AEGIS+LLM invocation failed after retries");
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
  const { messages, resolvedSystemPrompt, safeWrite, safeEnd, onArtifact, mode = "quality", memoryContext, crossTaskContext, userId, taskExternalId, aiFocus = "general" } = options;

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

    // Inject AI Focus domain prefix — shapes how the agent approaches tasks
    if (aiFocus && aiFocus !== "general") {
      const FOCUS_PREFIXES: Record<string, string> = {
        financial: `\n\n## AI FOCUS: FINANCIAL DOMAIN\nYou are operating in Financial focus mode. Prioritize:\n- Quantitative analysis, financial modeling, and data-driven insights\n- Market research, valuation frameworks (DCF, comparables, precedent transactions)\n- Economic indicators, portfolio theory, risk assessment\n- Regulatory awareness (SEC, GAAP/IFRS, compliance frameworks)\n- When researching, prefer financial data sources (SEC filings, Bloomberg, Yahoo Finance, FRED)\n- Frame recommendations with risk/reward tradeoffs and confidence intervals\n- Use execute_code for financial calculations, Monte Carlo simulations, and data visualization`,
        technical: `\n\n## AI FOCUS: TECHNICAL DOMAIN\nYou are operating in Technical focus mode. Prioritize:\n- System architecture, design patterns, and engineering best practices\n- Code quality, performance optimization, and security considerations\n- Technical documentation with precise terminology\n- When researching, prefer technical sources (GitHub, Stack Overflow, official docs, RFCs)\n- Provide implementation details, code examples, and architecture diagrams\n- Consider scalability, maintainability, and operational concerns\n- Use execute_code for prototyping, benchmarking, and proof-of-concept implementations`,
        creative: `\n\n## AI FOCUS: CREATIVE DOMAIN\nYou are operating in Creative focus mode. Prioritize:\n- Compelling narratives, engaging prose, and strong voice\n- Visual design thinking, composition, and aesthetic sensibility\n- Media production workflows (image, video, audio, presentation)\n- When researching, seek inspiration from diverse creative sources\n- Use generate_image proactively for visual concepts and illustrations\n- Frame feedback constructively with specific, actionable creative direction\n- Balance originality with clarity — creative work should still communicate effectively`,
      };
      const prefix = FOCUS_PREFIXES[aiFocus];
      if (prefix) {
        systemPrompt += prefix;
        console.log(`[Agent] AI Focus domain: ${aiFocus}`);
      }
    }

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
8. If the user's message is SHORT or VAGUE (e.g., "help refine this build?", "fix this"), do NOT fill in specific details from memory. Instead, ASK the user what they need help with.
8b. EXCEPTION — RESUME COMMANDS: If the user says "continue", "keep going", "go on", "resume", "carry on", or similar continuation phrases, this means RESUME the previous task exactly where you left off. Do NOT ask what they mean. Look at the conversation history, identify the last incomplete action or response, and continue from that point. If the previous response was interrupted, pick up from where it stopped.
9. NEVER assume you know what the user is referring to based on memory alone. If the request is ambiguous, ask for clarification.
10. If the user has attached files or images, PROCESS THE ATTACHMENTS FIRST before responding. Do not assume the topic from memory — let the attachments inform your response.`;
    }

    // Inject cross-task context if available — enables referencing previous conversations
    if (crossTaskContext) {
      systemPrompt += `\n\n## RECENT SESSION CONTEXT\n\nThe user has worked on these tasks recently (titles and queries only — for reference):\n\n${crossTaskContext}\n\n**STRICT RULES FOR SESSION CONTEXT:**\n1. This context ONLY tells you what topics the user has explored before. It does NOT mean you have done anything in THIS task.\n2. NEVER say "We've already covered X" or "As I demonstrated earlier" — each task starts fresh with zero prior actions.\n3. If the user says "continue that" or "do the same for X", use context to understand their intent, then execute from scratch.\n4. The CURRENT task message is your ONLY directive. Session context is background information only.\n5. NEVER skip actions because a previous task did something similar — always execute fully in the current task.`;
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
    const isShortGenerationRequest = /\b(generate|create|make|build|draft|write|design|set\s*up|scaffold)\s+(me\s+)?(a\s+|an\s+|the\s+|my\s+|some\s+)?(demo\s+|simple\s+|basic\s+|sample\s+|quick\s+|new\s+|small\s+)?(pdf|document|image|picture|photo|slide|presentation|spreadsheet|report|file|app|application|website|webapp|web\s*app|web\s*site|page|landing\s*page|dashboard|tool|video|audio|song|music|portfolio|blog|store|game|calculator|todo|chart|graph|diagram|poster|flyer|resume|cv|letter|email|newsletter|brochure)\b/i.test(lastUserText) || /\bjust\s+(create|make|build|generate|do|start)\b/i.test(lastUserText);
    if (lastUserText.length > 0 && lastUserText.length < 80 && !hasAttachments) {
      if (isShortGenerationRequest) {
        // Generation requests are short by nature ("Generate a pdf for me") — don't treat as vague.
        // Instead, nudge the agent to ask WHAT CONTENT they want, not to research the format.
        systemPrompt += `\n\n## SHORT GENERATION REQUEST\nThe user's message is a brief generation request. This is NORMAL for generation tasks — they are inherently short. Do NOT research the format or tool. Instead: if the user hasn't specified content details, ASK what content they want in the document/image/etc. If they said "just make one" or similar, create a useful sample with placeholder content. NEVER research ABOUT the format — USE THE TOOL.`;
      } else {
        systemPrompt += `\n\n## SHORT/VAGUE QUERY DETECTED\nThe user's message is brief. Do NOT assume specific details from memory or previous conversations. If the request is ambiguous, ask clarifying questions before proceeding. For example, if they say "help refine this build" without specifying which build, ask them to provide details rather than assuming from stored memories.`;
      }
    }

    // Detect user frustration/complaints — force text-only response
    const isUserFrustrated = /\b(why (did|didn't|is|isn't|are|aren't) (you|there|it|none|no)|you completed prematurely|I didn't ask|stop (doing|generating|making)|what happened|no response|not responding|broken|doesn't work|why is none|you ignored|ignoring me|wrong|that's not what I|I said)\b/i.test(lastUserText);
    if (isUserFrustrated) {
      systemPrompt += `\n\n## USER FRUSTRATION DETECTED — TEXT-ONLY RESPONSE REQUIRED\nThe user appears frustrated or is complaining about your previous behavior. You MUST:\n1. Respond ONLY with text — do NOT call any tools.\n2. Acknowledge their concern directly and specifically.\n3. Explain what happened (if you can infer it from context).\n4. Ask how you can help them better.\nDo NOT generate images, documents, or run any tools. Just talk to the user.`;
    }

    // Conditionally inject DEMONSTRATE EACH protocol — ONLY when user explicitly asks to demonstrate
    const wantsDemonstration = !isUserFrustrated && /\b(demonstrate\s+(each|all|every)|show\s+(me\s+)?(all|each|every)\s+(your\s+)?(capabilities|tools|features)|what\s+can\s+you\s+do.*(demonstrate|show)|go\s+until\s+done|do\s+them\s+all|show\s+me\s+all)\b/i.test(lastUserText);
    if (wantsDemonstration) {
      systemPrompt += `\n\n## DEMONSTRATE EACH \u2014 MANUS PARITY PROTOCOL

The user has EXPLICITLY asked you to demonstrate your capabilities. You MUST demonstrate ALL of the following 10 capability groups sequentially. Each demonstration must produce **presentation-quality output**:

1. **Web Search & Research** \u2014 Search for a real, current topic and present structured findings with sources.
2. **Code Execution** \u2014 Write and execute a non-trivial code snippet. Show the actual code AND its output.
3. **Image Generation** \u2014 Generate a creative, detailed image.
4. **Data Analysis** \u2014 Analyze a real or generated dataset with specific insights.
5. **Document Generation** \u2014 Create a professional document (e.g., one PDF and one XLSX).
6. **Web Browsing** \u2014 Navigate to a real URL and extract structured content.
7. **Wide Research** \u2014 Run parallel multi-query research on a complex topic.
8. **Slide Generation** \u2014 Create a presentation with multiple slides.
9. **Email** \u2014 Compose and send a professional email.
10. **App Building** \u2014 Scaffold a web application and show the live preview.

CRITICAL RULES:
- Complete ALL 10 groups. Do NOT ask for permission between demonstrations.
- Number each clearly.
- If any tool fails, note it and move to the next.
- DO NOT write introductory paragraphs like "I'll demonstrate each capability" or "Let me show you" — START with the first tool call immediately.
- DO NOT list what you're going to do before doing it. ACT FIRST, narrate after.
- Each demonstration should produce REAL output, not just describe what you could do.`;
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
6. **One-shot delivery**: Aim to deliver a complete, polished answer that needs no follow-up.
7. **No apologies**: If you make a mistake, fix it silently. Do not apologize or self-deprecate.
8. **No unnecessary clarification**: If the user's intent is clear, proceed immediately. Only ask when genuinely ambiguous.
9. **After research, DELIVER**: Always synthesize research into the requested deliverable. Never stop at raw search results.
10. **Respect format requests**: If the user asks for PDF, use output_format: "pdf". Match the requested format exactly.`;
    } else if (mode === "max") {
      // Aligned with Manus 1.6 Max: autonomous, strategic decomposition, high but bounded
      systemPrompt += `\n\n## MODE: MAX (Aligned with Manus 1.6 Max — Flagship Tier)

You are operating in Max mode — the flagship autonomous tier deeply aligned with Manus 1.6 Max.
This mode is designed for longer multi-step workflows without losing context, deeper chains
of subtasks with fewer mistakes, and less guidance needed from the user mid-process.

You have generous but bounded limits (200 tool turns, 100 continuation rounds). Use them wisely.
The system will seamlessly continue you if your response hits the token limit.

1. **Strategic decomposition**: Break complex tasks into subtasks and execute them methodically.
2. **Deep research depth**: For research/complex tasks, use at least 5 tool calls before considering a final response. Use wide_research PLUS multiple read_webpage calls on different sources. EXCEPTION: Simple factual questions, capability questions, or conversational messages should be answered directly in text with ZERO tool calls.
3. **Cross-reference sources**: Never rely on a single source. Search from multiple angles, read multiple pages, and synthesize across all of them.
4. **Tighter internal planning**: Plan your approach before executing. Minimize wasted turns.
5. **Higher one-shot accuracy**: Get it right the first time. Verify before concluding. Prioritize depth on what was asked, not breadth on tangential topics.
6. **Produce comprehensive deliverables**: Include tables, comparisons, step-by-step breakdowns, citations, and actionable specifics.
7. **Generate artifacts the user requested**: Use generate_document for long-form deliverables, analyze_data for structured insights, generate_image for visualizations. Do NOT generate additional artifacts the user did not request.
8. **Autonomous execution**: The user may not be watching. Deliver complete, self-contained results.
9. **Leave no stone unturned**: Search for counterarguments, edge cases, alternative perspectives, and expert opinions.
10. **Asynchronous mindset**: Work independently, report comprehensively.

### ACTION-FIRST PRINCIPLE
When the user asks you to GENERATE, CREATE, MAKE, BUILD, WRITE, or DRAFT something, ACT FIRST using the appropriate tool (generate_document, generate_image, execute_code, etc.). Research is for informational tasks. Generation tasks need tools, not web searches about the format.
**IMPORTANT EXCEPTION**: Questions ("What is...", "How do...", "Tell me about...", "What are your capabilities?") are NOT generation requests. Answer them directly in text. Only use tools when the user explicitly requests a PRODUCT (app, document, image, etc.).

### BEHAVIOR RULES
- **No apologies**: If you make a mistake, fix it silently. Never say "My apologies" or "I fell short".
- **No unnecessary clarification**: If the user's intent is clear from context, proceed immediately.
- **After research, DELIVER**: Always synthesize research into the requested deliverable.
- **Respect format requests**: If the user asks for PDF, use output_format: "pdf".
- **No meta-commentary**: NEVER describe what you're about to do before doing it. Don't say "I'll now search for..." or "Let me demonstrate...". Just DO it.
- **No false claims**: NEVER claim you have completed something unless the tool result confirms success. If a tool hasn't been called yet, you haven't done it.
- **Action over narration**: Your value is in DOING, not DESCRIBING. Every response should contain either a tool call or substantive content the user can use.`;
    } else if (mode === "limitless") {
      // Limitless: unlimited context depth and continuous operation
      systemPrompt += `\n\n## MODE: LIMITLESS (Unlimited Depth & Continuity)

You are operating in Limitless mode — there are NO constraints on your execution depth.
No turn limits. No token limits. No continuation limits. You run for as long as the user needs.

Your output will NEVER be truncated. If your response hits the token limit, the system
will seamlessly continue you with full context. Write as extensively as the task demands.

### CORE PRINCIPLES
1. **Unlimited depth**: Go as deep into research, analysis, or creation as the task requires.
2. **Continuous operation**: Keep working until the user's request is fully satisfied.
3. **Action-first**: When asked to generate/create/build something, use the appropriate tool immediately. Research is for informational tasks.
4. **Comprehensive deliverables**: Include tables, comparisons, citations, actionable specifics, and alternative perspectives.
5. **Honor user termination conditions**: If the user specifies when to stop, follow those conditions exactly.
6. **Self-monitoring**: Track your progress. Note what you've covered and what remains.

### AUTONOMOUS OPERATION
- Be maximally autonomous. Make reasonable decisions and proceed.
- Use defaults when the user provides templates with placeholders.
- Never ask the same question twice. Use your best judgment.
- Minimize confirmation-seeking. Only ask when truly ambiguous AND high-stakes.
- When the user says "continue" or "keep going", resume exactly where you left off.
- File attachments ARE the context — process them immediately.
- After research, ALWAYS synthesize into the actual deliverable the user requested.`;
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
    let appBuildingContinuations = 0; // Track how many times we've nudged the agent to continue building
    let consecutiveToolFailures = 0; // Track consecutive tool failures to break infinite failure loops
    const MAX_CONSECUTIVE_TOOL_FAILURES = 5; // Break the loop after 5 consecutive tool failures

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

    // ── PDF/File Preprocessing: Extract text from file_url attachments so the LLM can read them ──
    // Many LLM providers don't natively support file_url content parts for PDFs.
    // We extract the text server-side and convert file_url → text content.
    for (let i = 0; i < conversation.length; i++) {
      const msg = conversation[i];
      if (msg.role === "user" && Array.isArray(msg.content)) {
        const newContent: any[] = [];
        for (const part of msg.content as any[]) {
          if (part.type === "file_url" && part.file_url?.mime_type === "application/pdf") {
            // Extract PDF text server-side
            try {
              const pdfUrl = part.file_url.url;
              console.log(`[Agent] Extracting text from PDF: ${pdfUrl.slice(0, 80)}...`);
              const resp = await fetch(pdfUrl);
              if (resp.ok) {
                const buffer = Buffer.from(await resp.arrayBuffer());
                const pdfParse = require("pdf-parse");
                const parsed = await pdfParse(buffer);
                const pdfText = parsed.text?.trim();
                if (pdfText && pdfText.length > 0) {
                  // Replace file_url with extracted text content
                  newContent.push({
                    type: "text",
                    text: `[Attached PDF Content - ${parsed.numpages || '?'} pages]:\n\n${pdfText.slice(0, 100000)}${pdfText.length > 100000 ? '\n\n[...truncated, PDF has ' + pdfText.length + ' characters total]' : ''}`
                  });
                  console.log(`[Agent] PDF extracted: ${pdfText.length} chars, ${parsed.numpages} pages`);
                } else {
                  // PDF has no extractable text (scanned image PDF)
                  newContent.push({
                    type: "text",
                    text: `[Attached PDF - ${parsed.numpages || '?'} pages, but no extractable text (likely a scanned/image PDF). The user attached this file — acknowledge it and work with whatever context is available from the conversation.]`
                  });
                  console.log(`[Agent] PDF has no extractable text (scanned?)`);
                }
              } else {
                // Fetch failed — keep original and add note
                newContent.push(part);
                newContent.push({ type: "text", text: `[Note: PDF attachment was provided but could not be fetched. Proceed with available context.]` });
                console.log(`[Agent] PDF fetch failed: ${resp.status}`);
              }
            } catch (err) {
              // Extraction failed — keep original and add note
              console.error(`[Agent] PDF extraction error:`, err);
              newContent.push(part);
              newContent.push({ type: "text", text: `[Note: PDF attachment was provided but text extraction failed. Proceed with available context and NEVER claim you cannot read attachments.]` });
            }
          } else {
            newContent.push(part);
          }
        }
        conversation[i] = { ...msg, content: newContent };
      }
    }

    // ── Inject connected GitHub repos into system prompt ──
    // This allows the agent to know which repos are available for github_edit
    if (userId) {
      try {
        const { getUserGitHubRepos } = await import("./db");
        const repos = await getUserGitHubRepos(userId);
        if (repos.length > 0) {
          const repoList = repos.map(r => `- **${r.fullName}** (${r.defaultBranch || "main"})${r.description ? ` — ${r.description}` : ""}`).join("\n");
          systemPrompt += `\n\n## CONNECTED GITHUB REPOSITORIES\nThe user has ${repos.length} GitHub repo(s) connected. These are REAL repositories with live data.\n\n${repoList}\n\n### CRITICAL: Always use real data, never just describe capabilities\nWhen the user mentions their repo, asks about it, or asks what you can do with it:\n1. **IMMEDIATELY call github_ops(mode: 'status', repo: '${repos.length === 1 ? repos[0].fullName : '<repo_name>'}')** to fetch live repo data\n2. Present REAL information: actual file count, languages, recent commits, open PRs, issues\n3. NEVER respond with just a list of tool descriptions — that is not helpful\n4. The user connected their repo because they want you to WORK WITH IT, not describe what you could theoretically do\n\n### Available operations:\n- **github_edit(instruction, repo)** — Edit files via AI-powered diff + atomic commit\n- **github_assess(mode, repo)** — Deep code quality analysis (assess/optimize/validate)\n- **github_ops(mode, repo)** — Branch management, PRs, releases, CI/CD, status checks\n\n### Auto-selection rule:\nIf the user doesn't specify which repo and they have only one, use it automatically. If multiple, ask which repo they mean.\n\n### Proactive behavior:\n- If the user says "you're connected to a repo" or "what do you know about it" → call github_ops(mode: 'status') FIRST, then respond with real data\n- If the user asks "what can you do with my repo" → call github_ops(mode: 'status') to show real data, THEN explain capabilities with examples specific to their repo\n- If the user asks to edit/fix/update code → use github_edit immediately, don't ask for confirmation to start\n- If the user asks about code quality → use github_assess immediately\n- If the user asks to "preview", "view", "show", or "load" their connected repo (READ intent) → use github_ops(status) + github_assess(assess) to READ and DISPLAY the repo contents.
- If the user asks to "build", "deploy", "run", "host", "launch", or "render a live preview" of their connected repo (BUILD intent) → follow the LIVE PREVIEW WORKFLOW: github_ops(status) → git_operation(clone) → install_deps → deploy_webapp. This produces a real hosted URL.
- NEVER call create_webapp when the user is asking about a connected repo. create_webapp is for NEW projects from templates only.
- When in doubt between READ and BUILD, ask: "Would you like me to show you the repo contents, or build and deploy a live preview?"`;
        }
      } catch (err) {
        console.warn("[Agent] Failed to load GitHub repos for context:", err);
      }
    }

    // ── Inject connected services (connectors) into system prompt ──
    // Includes relevance scoring to avoid prompt bloat when many connectors are connected
    let injectedConnectors: { id: string; name: string; relevanceScore: number }[] = [];
    if (userId) {
      try {
        const { getUserConnectors } = await import("./db");
        const userConns = await getUserConnectors(userId);
        const activeConns = userConns.filter((c: any) => c.status === "connected");
        if (activeConns.length > 0) {
          // Relevance scoring: score each connector based on user message keywords
          const lastUserMsg = conversation.filter(m => m.role === "user").pop();
          const userText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content.toLowerCase() : "";
          const CONNECTOR_KEYWORDS: Record<string, string[]> = {
            github: ["code", "repo", "commit", "pr", "pull request", "branch", "git", "repository"],
            slack: ["message", "channel", "slack", "notify", "team", "dm"],
            notion: ["note", "page", "database", "wiki", "notion", "document"],
            google_drive: ["file", "drive", "document", "sheet", "spreadsheet", "folder"],
            linear: ["issue", "ticket", "task", "project", "linear", "sprint", "backlog"],
            gmail: ["email", "mail", "send", "inbox", "compose"],
            calendar: ["meeting", "calendar", "schedule", "event", "appointment"],
            jira: ["jira", "ticket", "issue", "sprint", "board"],
          };
          const scoredConns = activeConns.map((c: any) => {
            let score = 0.3; // Base relevance for all connected services
            const connKey = c.name?.toLowerCase().replace(/\s+/g, "_") || "";
            // Check direct name mention
            if (userText.includes(connKey) || userText.includes(c.name?.toLowerCase() || "")) score = 1.0;
            // Check keyword relevance
            for (const [key, keywords] of Object.entries(CONNECTOR_KEYWORDS)) {
              if (connKey.includes(key)) {
                for (const kw of keywords) {
                  if (userText.includes(kw)) { score = Math.max(score, 0.8); break; }
                }
              }
            }
            return { ...c, relevanceScore: score };
          });
          // Sort by relevance; inject top 5 to avoid prompt bloat
          const sortedConns = scoredConns.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
          const topConns = sortedConns.slice(0, 5);
          injectedConnectors = topConns.map((c: any) => ({ id: c.connectorId, name: c.name, relevanceScore: c.relevanceScore }));
          const connList = topConns.map((c: any) => {
            const identity = c.manusVerifiedIdentity ? ` (${c.manusVerifiedIdentity})` : "";
            const relevanceTag = c.relevanceScore >= 0.8 ? " ⚡ HIGHLY RELEVANT" : "";
            return `- **${c.name}**${identity}${relevanceTag} — use \`use_connector(connector_id: "${c.connectorId}", action: ...)\``;
          }).join("\n");
          systemPrompt += `\n\n## CONNECTED SERVICES\nThe user has ${activeConns.length} service(s) connected and ready to use:\n\n${connList}\n\n### Usage guidelines:\n- When the user's request involves any connected service, use it PROACTIVELY without asking permission\n- For file operations: prefer Google Drive/OneDrive if connected\n- For messaging: use Slack if connected\n- For project management: use Linear/Notion if connected\n- Call \`use_connector\` with the appropriate connector_id and action\n- If unsure which actions are available, call \`use_connector(connector_id, action: "list_actions")\` first`;
          if (sortedConns.length > 5) {
            systemPrompt += `\n\nNote: ${sortedConns.length - 5} additional service(s) are connected but not shown. Ask the user if they need access to other services.`;
          }
        }
      } catch (err) {
        console.warn("[Agent] Failed to load connectors for context:", err);
      }
    }
    // Emit connector context metadata for frontend visual indicator
    if (injectedConnectors.length > 0) {
      sendSSE(safeWrite, { connectorContext: injectedConnectors });
    }

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
      // GAP D: Route through AEGIS pipeline for caching, prompt optimization, and quality scoring.
      // Tool-calling turns skip post-flight for performance; only final text responses get scored.
      // Falls back gracefully to raw invokeLLM if AEGIS is unavailable.
      const hasToolCalls = turn > 1; // After first turn, likely tool-calling — skip post-flight
      const { response, aegisMeta } = await invokeWithAegisRetry(invokeLLM, llmParams, {
        userId,
        taskExternalId,
        skipPostFlight: hasToolCalls, // Full quality scoring only on likely-final responses
        skipCache: turn > 1, // Only cache-check on first turn (subsequent turns have tool results)
      });

      // Emit AEGIS metadata as optional SSE event for quality tracking visibility
      if (aegisMeta) {
        sendSSE(safeWrite, {
          aegis_meta: {
            cached: aegisMeta.cached,
            sessionId: aegisMeta.sessionId,
            costSaved: aegisMeta.costSaved,
            classification: aegisMeta.classification,
            quality: aegisMeta.quality,
            improvements: aegisMeta.improvements,
            planSteps: aegisMeta.planSteps,
          },
        });
        if (aegisMeta.cached) {
          console.log(`[Agent] AEGIS cache hit — saved ${aegisMeta.costSaved ?? 0} credits`);
        }
      }

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

      let effectiveChoice = response.choices?.[0] ?? null;
      if (!effectiveChoice) {
        // Auto-retry on empty choices — this is a transient LLM issue, not a permanent failure
        const emptyRetryMax = 3;
        for (let emptyRetry = 1; emptyRetry <= emptyRetryMax; emptyRetry++) {
          console.warn(`[Agent] Empty choices from LLM (attempt ${emptyRetry}/${emptyRetryMax}). Retrying in ${emptyRetry * 2000}ms...`);
          sendSSE(safeWrite, { status: `LLM returned empty response, retrying (${emptyRetry}/${emptyRetryMax})...` });
          await new Promise(r => setTimeout(r, emptyRetry * 2000));
          try {
            const { response: retryResponse } = await invokeWithAegisRetry(invokeLLM, llmParams, {
              userId,
              taskExternalId,
              skipPostFlight: true, // Retry path — skip quality scoring
              skipCache: true, // Retry path — don't use cache
            });
            if (retryResponse.choices?.[0]) {
              effectiveChoice = retryResponse.choices[0];
              // Accumulate retry usage
              if (retryResponse.usage) {
                cumulativePromptTokens += retryResponse.usage.prompt_tokens;
                cumulativeCompletionTokens += retryResponse.usage.completion_tokens;
              }
              break;
            }
          } catch (retryErr) {
            console.warn(`[Agent] Retry ${emptyRetry} also failed:`, retryErr);
          }
        }
        if (!effectiveChoice) {
          sendSSE(safeWrite, { error: "No response from LLM after multiple retries", retryable: true });
          break;
        }
      }

      const assistantMessage = effectiveChoice.message;
      // Guard: If the LLM returns a malformed response where message is undefined,
      // treat it as an empty response and retry once before giving up.
      if (!assistantMessage) {
        console.warn("[Agent] effectiveChoice.message is undefined — malformed LLM response. Retrying...");
        // Attempt one retry with a short delay
        await new Promise(r => setTimeout(r, 1500));
        try {
          const { response: retryResp } = await invokeWithAegisRetry(invokeLLM, llmParams, {
            userId,
            taskExternalId,
            skipPostFlight: true,
            skipCache: true,
          });
          const retryChoice = retryResp.choices?.[0];
          if (retryChoice?.message) {
            // Use the retry response — fall through to normal processing below
            Object.assign(effectiveChoice, retryChoice);
          } else {
            sendSSE(safeWrite, { error: "The AI returned an invalid response. Please try again.", retryable: true });
            break;
          }
        } catch (retryErr) {
          sendSSE(safeWrite, { error: "The AI returned an invalid response. Please try again.", retryable: true });
          break;
        }
      }
      const toolCalls = assistantMessage?.tool_calls;
      // Manus Parity: Thinking/reasoning content is a VISIBLE feature, not hidden.
      // Models may include reasoning in <think>...</think> tags or a separate `thinking` field.
      // We emit it as agent_thinking for the UI to render visibly (like Manus shows reasoning steps).
      let rawContent = typeof assistantMessage?.content === "string" ? assistantMessage.content : "";
      // Extract thinking from tags but keep full content visible
      const thinkingMatch = rawContent.match(/^\s*<(?:think|thinking)>([\s\S]*?)<\/(?:think|thinking)>\s*/i);
      let extractedThinking: string | null = null;
      if (thinkingMatch) {
        extractedThinking = thinkingMatch[1].trim();
        // Keep rawContent intact — thinking is user-visible in Manus
      }
      // Also check for a separate `thinking` field in the response (Anthropic-style)
      const thinkingField = (assistantMessage as any)?.thinking;
      if (thinkingField && typeof thinkingField === "string" && thinkingField.trim()) {
        extractedThinking = (extractedThinking ? extractedThinking + "\n" : "") + thinkingField.trim();
      }
      const textContent = rawContent;
      // Emit thinking as agent_thinking event for the UI to render visibly
      // Only emit when textContent.trim().length > 10 to avoid noise on trivial responses
      if (extractedThinking && textContent.trim().length > 10) {
        sendSSE(safeWrite, { agent_thinking: { content: extractedThinking, turn } });
      }

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
      if (effectiveChoice.finish_reason === "length" && turn < maxTurns - 1) {
        continuationRounds++;
        
        // Mode-aware continuation limits:
        // Speed: bounded (5 rounds), Quality: high (50 rounds), Max: unlimited (Infinity)
        // For Max mode, maxContinuationRounds is Infinity — the agent runs until its own
        // termination conditions are met (task completion or explicit stop).
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
        
        // MANUS PARITY: Stream partial text ALWAYS — even when tool_calls are present.
        // The text is the agent's conversational narrative, not hidden reasoning.
        if (textContent && textContent.trim().length > 0) {
          const isOnlyThinkTag = /^\s*<(?:think|thinking)>[\s\S]*<\/(?:think|thinking)>\s*$/i.test(textContent);
          if (!isOnlyThinkTag) {
            streamTextAsChunks(safeWrite, textContent);
            finalContent += textContent;
          }
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
            const toolCtx = { userId, taskExternalId };
            const result: ToolResult = await executeTool(tn, ta, toolCtx);
            const safeResult = String(result.result ?? 'Tool returned no output');
            sendSSE(safeWrite, { tool_result: { id: toolCall.id, name: tn, success: result.success, preview: safeResult.slice(0, 500), url: result.url, projectExternalId: result.projectExternalId } });

            // Emit convergence SSE event when report_convergence tool is called
            if (tn === "report_convergence" && result.success) {
              sendSSE(safeWrite, {
                convergence: {
                  passNumber: pa.pass_number ?? 1,
                  passType: pa.pass_type ?? "landscape",
                  status: pa.status ?? "running",
                  description: pa.description,
                  rating: pa.rating,
                  convergenceCount: pa.convergence_count ?? 0,
                  reasoningMode: pa.reasoning_mode,
                  temperature: pa.temperature,
                  scoreDelta: pa.score_delta,
                  signalAssessment: pa.signal_assessment,
                  failureLog: pa.failure_log,
                  divergenceBudgetUsed: pa.divergence_budget_used,
                },
              });
            }

            // Track consecutive tool failures to prevent infinite failure loops
            if (!result.success) {
              consecutiveToolFailures++;
              if (consecutiveToolFailures >= MAX_CONSECUTIVE_TOOL_FAILURES) {
                console.warn(`[Agent] ${MAX_CONSECUTIVE_TOOL_FAILURES} consecutive tool failures — breaking loop to prevent infinite failure cycle`);
                sendSSE(safeWrite, { delta: `\n\n---\n\n*Multiple tool operations failed consecutively. I'll summarize what I was able to accomplish and suggest next steps.*\n\n` });
                conversation.push({ role: "tool", content: `SYSTEM: Tool execution has failed ${MAX_CONSECUTIVE_TOOL_FAILURES} times consecutively. Stop calling tools and provide a helpful summary to the user about what went wrong and what they can do.`, tool_call_id: toolCall.id, name: tn } as any);
                break;
              }
            } else {
              consecutiveToolFailures = 0; // Reset on success
            }

            completedToolCalls++;
            sendSSE(safeWrite, { step_progress: { completed: completedToolCalls, total: totalToolCalls, turn } });
            conversation.push({ role: "tool", content: safeResult, tool_call_id: toolCall.id, name: tn } as any);
          }
        } else {
          // No tool calls — just add the partial text
          conversation.push({ role: "assistant", content: textContent || "" });
          consecutiveToolFailures = 0; // Reset when agent produces text (not stuck in tool loop)
        }
        
        // Context compression: if conversation is getting very long, summarize older tool results
        // to prevent context overflow while preserving recent context quality
        // Tier-aware: Limitless uses higher threshold (80% of model context) to preserve more working memory
        const compressionThreshold = mode === "limitless" ? 500000 : mode === "max" ? 300000 : CONTEXT_COMPRESSION_THRESHOLD;
        const estimatedTokens = estimateConversationTokens(conversation);
        if (estimatedTokens > compressionThreshold) {
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
      if (effectiveChoice.finish_reason === "stop") {
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

      // MANUS PARITY: Stream text content to the user REGARDLESS of whether tool_calls
      // are present. In Manus production, the agent's conversational text ("Let me research
      // that for you...") appears INLINE before the action steps. The text is NOT internal
      // reasoning — it's the agent's narrative that gives the user context about what's happening.
      // Only suppress text that is purely <think> tag content (already extracted above).
      if (textContent && textContent.trim().length > 0) {
        // Skip streaming if the text is ONLY a think tag (already emitted as agent_thinking)
        const isOnlyThinkTag = /^\s*<(?:think|thinking)>[\s\S]*<\/(?:think|thinking)>\s*$/i.test(textContent);
        if (!isOnlyThinkTag) {
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
      }

      // If no tool calls, check if we should auto-continue
      if (!toolCalls || toolCalls.length === 0) {
        // ═══════════════════════════════════════════════════════════════════
        // FIRST-TURN TOOL ENFORCEMENT — Prevent text-only on turn 0
        // ═══════════════════════════════════════════════════════════════════
        // When the agent produces text-only on the first turn for tasks that
        // clearly require tool use, nudge it immediately to use tools.
        if (turn === 0 && completedToolCalls === 0) {
          const firstUserMsg = conversation.find(m => m.role === "user");
          const firstUserText = typeof firstUserMsg?.content === "string" ? firstUserMsg.content.toLowerCase() : "";
          const requiresTools = /\b(research|search|find|look up|build|create|generate|make|write|draft|design|analyze|compare|demonstrate|show me|deploy|clone|edit.*(repo|code|file))\b/i.test(firstUserText);
          const isJustPlanning = /\b(let me|i'll|i will|going to|plan to|first|here's my plan|my approach|i can help)\b/i.test(textContent.slice(0, 300));
          const isActualDeliverable = textContent.length > 800 && !/\b(let me|i'll|i will|going to|plan to)\b/i.test(textContent.slice(0, 100));
          
          // EARLY APOLOGY INTERCEPTION: If the agent starts with an apology or claim of inability
          // on the very first turn, immediately redirect it to take action instead.
          const isApologizing = /\b(sorry|apologize|unfortunately|i'm afraid|i cannot|i can't|i'm not able|i don't have the ability)\b/i.test(textContent.slice(0, 400));
          if (isApologizing && !isActualDeliverable) {
            console.log(`[Agent] First-turn apology interception: agent apologized instead of acting. Redirecting.`);
            // Don't stream the apology to the user
            finalContent = "";
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `STOP. Do NOT apologize or claim inability. You HAVE the tools to accomplish this. Re-read the request and take action NOW using your available tools (web_search, execute_code, create_webapp, generate_image, etc.). If you truly cannot do something specific, do the closest useful alternative instead. Act immediately.`,
            });
            continue;
          }
          
          if (requiresTools && isJustPlanning && !isActualDeliverable) {
            console.log(`[Agent] First-turn tool enforcement: agent planned but didn't use tools. Nudging.`);
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `Good plan. Now EXECUTE it. Use your tools immediately — do not plan further. Start with the most impactful action right now.`,
            });
            continue;
          }
        }
        // ═══════════════════════════════════════════════════════════════════
        // STUCK/LOOP DETECTION — Prevent infinite repetitive responses
        // ═══════════════════════════════════════════════════════════════════
        // Track text-only responses and detect when the agent is repeating
        // itself (e.g., "Conducting deeper research..." loop from the bug report).
        // EXCEPTION: Skip stuck detection during app-building pipeline — the pipeline
        // injects continuation prompts that naturally produce similar responses.
        const usedAppBuildingToolsForStuck = conversation.some(m =>
          (m as any).tool_calls?.some((tc: any) =>
            ["create_webapp", "create_file", "edit_file", "install_deps", "run_command", "git_operation"].includes(tc.function?.name)
          )
        );
        const hasDeployedForStuck = conversation.some(m =>
          (m as any).tool_calls?.some((tc: any) => tc.function?.name === "deploy_webapp")
        );
        const isInAppBuildPipeline = usedAppBuildingToolsForStuck && !hasDeployedForStuck;
        const normalizedText = (textContent || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500);
        if (normalizedText.length > 20 && !isInAppBuildPipeline) {
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
            // Auto-tuning: query telemetry for the best strategy order for this trigger pattern
            const currentTrigger = detectTriggerPattern(normalizedText);
            let preferredOrder: string[] | null = null;
            if (options.autoTuneStrategies !== false && options.userId) {
              try {
                const { getPreferredStrategyOrder } = await import("./db");
                preferredOrder = await getPreferredStrategyOrder(currentTrigger, options.userId);
                if (preferredOrder) {
                  console.log(`[Agent] Auto-tune: preferred strategy order for "${currentTrigger}": ${preferredOrder.join(" → ")}`);
                }
              } catch { /* auto-tune is non-critical */ }
            }

            let correctionStrategy: string;
            let strategyLabel: string;

            // Determine which strategy to use:
            // If auto-tuning has data, use the preferred order (skipping already-tried strategies)
            // Otherwise, fall back to the default stuckBreakCount-based escalation
            const defaultOrder = ["diagnose-redirect", "force-action", "last-chance"];
            const strategyOrder = preferredOrder ?? defaultOrder;
            // Pick the next untried strategy from the preferred order
            const nextStrategy = strategyOrder.find(s => !stuckStrategiesUsed.includes(s))
              ?? defaultOrder.find(s => !stuckStrategiesUsed.includes(s))
              ?? "last-chance";

            if (nextStrategy === "diagnose-redirect") {
              // Diagnose and redirect
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
            } else if (nextStrategy === "force-action") {
              // Force tool use or direct answer
              strategyLabel = "force-action";
              correctionStrategy = `CRITICAL: Your previous self-correction didn't work — you're STILL repeating yourself. You MUST take a COMPLETELY DIFFERENT action this turn. Previous strategy (${stuckStrategiesUsed[stuckStrategiesUsed.length - 1]}) failed.\n\nCHOOSE ONE of these escape routes:\nA) If you have ANY information: Write your response immediately, starting with the answer (no preamble)\nB) If you need data: Use a DIFFERENT tool than what you've been using (try code_execute to compute, or web_search with different keywords)\nC) If the user sent attachments: Describe exactly what you see in them\nD) If nothing works: Give the user a honest 2-sentence summary of where you're stuck and ask ONE specific question\n\nYou MUST pick A, B, C, or D. No other option.`;
            } else {
              // Last chance before forced answer
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
                  triggerPattern: currentTrigger,
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
        // TIGHTENED: Only match explicit demonstration/continuous-work requests, NOT casual uses of "each", "all", "every"
        // "generate an example of each" should NOT trigger continuous mode
        // "demonstrate each capability" SHOULD trigger continuous mode
        const wantsContinuous = /\b(demonstrate\s+(each|all|every)|show\s+(me\s+)?(all|each|every)\s+(your\s+)?(capabilities|tools|features)|show\s+me\s+everything\s+you\s+can|keep going|go until\s+(done|finished)|don't stop|do them all|run\s+(all|each|every)\s+(capabilities|tools|features)|test\s+(all|each|every)\s+(capabilities|tools|features)|try\s+(all|each|every)\s+(capabilities|tools|features)|show me all\s+(your|the)\s+(capabilities|tools)|one by one.*(capabilities|tools|features))\b/i.test(userText);
        
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
        // EXCEPTION: If the user asked for generative output (generate/create/make/build/write/draft), 
        // do NOT force research — force TOOL USE for production instead.
        const isGenerationRequest = /\b(generate|create|make|build|draft|write|design|set\s*up|scaffold)\s+(me\s+)?(a\s+|an\s+|the\s+|my\s+|some\s+)?(demo\s+|simple\s+|basic\s+|sample\s+|quick\s+|new\s+|small\s+)?(pdf|document|image|picture|photo|slide|presentation|spreadsheet|report|file|app|application|website|webapp|web\s*app|web\s*site|page|landing\s*page|dashboard|tool|video|audio|song|music|portfolio|blog|store|game|calculator|todo|chart|graph|diagram|poster|flyer|resume|cv|letter|email|newsletter|brochure)\b/i.test(userText) || /\bjust\s+(create|make|build|generate|do|start)\b/i.test(userText);
        if ((mode === "max" || mode === "limitless") && turn <= 5 && completedToolCalls < 3 && (maxTurns === Infinity || turn < maxTurns - 2) && !isGenerationRequest) {
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
        // For generation requests in MAX/LIMITLESS with no tool calls yet, nudge to USE TOOLS not research
        if ((mode === "max" || mode === "limitless") && turn <= 3 && completedToolCalls === 0 && isGenerationRequest && (maxTurns === Infinity || turn < maxTurns - 2)) {
          const modeName = mode === "limitless" ? "LIMITLESS" : "MAX (flagship)";
          console.log(`[Agent] ${modeName} mode: generation request with 0 tool calls — nudging to use production tools`);
          finalContent = "";
          sendSSE(safeWrite, { delta: "\n\n*Producing the requested output...*\n\n" });
          conversation.push({ role: "assistant", content: textContent || "" });
          conversation.push({
            role: "user",
            content: `STOP. The user asked you to GENERATE/CREATE something specific: "${userText.slice(0, 200)}". You are in ${modeName} mode. This is a GENERATION task, not a research task. You MUST use the appropriate tool NOW:
- For documents/PDFs: use generate_document with the appropriate output_format
- For images: use generate_image
- For slides: use generate_slides
- For apps/websites: use create_webapp
- For code: use execute_code

If the user hasn't specified content details, ASK them what content they want. Do NOT research ABOUT the format. ACT NOW.`,
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
        
        // SCOPE-CREEP DETECTION: If the user asked for a single deliverable and the agent already
        // produced it (via tool call), but the LLM text says "Next, I will..." or "Now I will also...",
        // inject a STOP signal to prevent unrequested outputs.
        // EXCEPTION: App-building is a multi-step pipeline (create → build files → deploy).
        // The agent MUST continue after create_webapp to build out files and deploy.
        const usedAppBuildingTools = conversation.some(m =>
          (m as any).tool_calls?.some((tc: any) =>
            ["create_webapp", "create_file", "edit_file", "install_deps", "run_command", "git_operation"].includes(tc.function?.name)
          )
        );
        const hasDeployed = conversation.some(m =>
          (m as any).tool_calls?.some((tc: any) => tc.function?.name === "deploy_webapp")
        );
        // If we're in an app-building pipeline and haven't deployed yet, NEVER trigger scope-creep
        const isAppBuildingPipeline = usedAppBuildingTools && !hasDeployed;

        // MULTI-PART REQUEST DETECTION: If the user's prompt contains multiple explicit requests
        // (connected by "and", "then", "also", numbered items, etc.), do NOT trigger scope-creep
        const hasMultiPartRequest = /\b(and\s+(then|also|next|after\s+that)|then\s+(also|next|dive|show|demonstrate|do)|,\s*(then|also|and)\s+(dive|show|demonstrate|do|explore|check|look|review|analyze)|\d+[.):]\s*.+\n.*\d+[.):]|first.{5,80}(then|second|next|after)|after\s+that|in\s+addition|as\s+well\s+as)\b/i.test(userText);
        if (!wantsContinuous && !hasMultiPartRequest && completedToolCalls >= 1 && !isAppBuildingPipeline) {
          const scopeCreepSignals = /\b(next[,.]?\s+I\s+will|now\s+I\s+will\s+(also|demonstrate|proceed)|I\s+will\s+(also|additionally|furthermore)\s+(generate|create|demonstrate|show|produce|build)|let\s+me\s+(also|additionally)\s+(generate|create|demonstrate)|proceed\s+to\s+(the\s+next|demonstrate|generate))\b/i.test(textContent);
          if (scopeCreepSignals) {
            console.log(`[Agent] SCOPE-CREEP DETECTED: Agent trying to produce unrequested outputs after completing ${completedToolCalls} tool calls. Injecting STOP.`);
            // Don't continue the loop — let it break naturally
            // But override the text to remove the scope-creep portion
            const scopeCreepMatch = textContent.match(/\n\n(?:Next|Now|Additionally|Furthermore|I will also|Let me also|Proceed)[\s\S]*/i);
            if (scopeCreepMatch) {
              const cleanedText = textContent.slice(0, scopeCreepMatch.index || textContent.length).trim();
              if (cleanedText.length > 50) {
                finalContent = cleanedText;
                console.log(`[Agent] Trimmed scope-creep text. Kept ${cleanedText.length} chars, removed ${textContent.length - cleanedText.length} chars.`);
              }
            }
            break;
          }
        }

        // APP-BUILDING PIPELINE CONTINUATION: If the agent used create_webapp but hasn't
        // deployed yet, force continuation so the full create→build→deploy pipeline completes.
        // Use escalating prompts with a hard limit to prevent infinite building loops.
        // Dynamic limit based on webapp complexity (matches tool execution branch logic).
        if (isAppBuildingPipeline && turn < maxTurns - 2) {
          appBuildingContinuations++;
          // Determine MAX_APP_BUILD_CONTINUATIONS dynamically based on complexity
          let MAX_APP_BUILD_CONTINUATIONS = 5;
          const createWebappMsgForCont = conversation.find(m =>
            (m as any).tool_calls?.some((tc: any) => tc.function?.name === "create_webapp")
          );
          if (createWebappMsgForCont) {
            const createCallForCont = (createWebappMsgForCont as any).tool_calls?.find((tc: any) => tc.function?.name === "create_webapp");
            const descForCont = ((() => { try { return JSON.parse(createCallForCont?.function?.arguments || "{}").description || ""; } catch { return ""; } })()).toLowerCase();
            const userMsgForCont = conversation.find(m => m.role === "user" && typeof m.content === "string");
            const userTextForCont = (typeof userMsgForCont?.content === "string" ? userMsgForCont.content : "").toLowerCase();
            const combinedForCont = `${descForCont} ${userTextForCont}`;
            const complexIndicatorsForCont = /multi.?page|dashboard|full.?stack|e.?commerce|admin.?panel|crm|management.?system|social.?network|marketplace|portfolio.?with|blog.?with|saas/;
            const simpleIndicatorsForCont = /calculator|timer|counter|hello.?world|single.?page|stopwatch|clock|converter|tip.?calc|bmi|quiz|flashcard|countdown|landing.?page/;
            if (complexIndicatorsForCont.test(combinedForCont)) {
              MAX_APP_BUILD_CONTINUATIONS = 8; // Complex apps get more continuations
            } else if (simpleIndicatorsForCont.test(combinedForCont)) {
              MAX_APP_BUILD_CONTINUATIONS = 3; // Simple apps should deploy fast
            }
          }
          
          if (appBuildingContinuations >= MAX_APP_BUILD_CONTINUATIONS) {
            // Hard limit reached — force deploy NOW
            console.log(`[Agent] App-building pipeline: HARD LIMIT reached (${appBuildingContinuations} continuations). Forcing deploy.`);
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `STOP BUILDING FILES IMMEDIATELY. You have been building for ${appBuildingContinuations} rounds. The app has enough files to work. Call deploy_webapp RIGHT NOW to deploy what you have. This is your FINAL instruction — deploy_webapp is the ONLY tool you should call next. Do not create or edit any more files.`,
            });
            continue;
          } else if (appBuildingContinuations >= 3) {
            // Escalated prompt — strongly push toward deploy
            console.log(`[Agent] App-building pipeline: ${appBuildingContinuations}/${MAX_APP_BUILD_CONTINUATIONS} continuations, escalating to deploy`);
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `You have created enough files for the app. It is time to DEPLOY. Call deploy_webapp now to make the app available at a public URL. Do not add more features or files — deploy what you have. The user is waiting for a working deployed app.`,
            });
            continue;
          } else {
            // Early continuations — gentle nudge
            console.log(`[Agent] App-building pipeline: ${appBuildingContinuations}/${MAX_APP_BUILD_CONTINUATIONS} continuations, deploy not yet called`);
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `Good progress on the webapp. Finish the essential files and then call deploy_webapp to deploy it to a public URL. Keep it simple — the user wants a working app, not a perfect one.`,
            });
            continue;
          }
        }

        // Auto-continue if: user wants continuous work AND capability groups remain undemonstrated
        // SAFETY: Count how many continuation injections we've done to prevent infinite loops
        const continuationCount = conversation.filter(m => 
          m.role === "user" && typeof m.content === "string" && m.content.startsWith("Continue demonstrating.")
        ).length;
        // Tier-aware continuation cap: Limitless has NO cap, Max gets generous limit, others bounded
        const MAX_CONTINUATIONS = mode === "limitless" ? Infinity : mode === "max" ? 25 : 12;
        if (wantsContinuous && turn < maxTurns - 2 && continuationCount < MAX_CONTINUATIONS) {
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
          
          // Also count how many times we've asked for EACH remaining group
          // If we've asked for a group 2+ times and it's still not demonstrated, skip it
          const groupAttempts: Record<string, number> = {};
          for (const msg of conversation) {
            if (msg.role === "user" && typeof msg.content === "string" && msg.content.includes("Remaining groups:")) {
              for (const group of undemonstrated) {
                if (msg.content.includes(group)) {
                  groupAttempts[group] = (groupAttempts[group] || 0) + 1;
                }
              }
            }
          }
          // Filter out groups that have been attempted 2+ times (they're stuck)
          const actuallyUndemonstrated = undemonstrated.filter(g => (groupAttempts[g] || 0) < 2);
          
          const shouldContinue = actuallyUndemonstrated.length > 0;
          
          if (shouldContinue) {
            console.log(`[Agent] Auto-continuing: ${demonstratedGroups.length}/10 groups done, ${actuallyUndemonstrated.length} remaining (${undemonstrated.length - actuallyUndemonstrated.length} skipped as stuck), turn ${turn}/${maxTurns}`);
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `Continue demonstrating. You have completed ${demonstratedGroups.length}/10 capability groups. Remaining groups: ${actuallyUndemonstrated.join(", ")}. Demonstrate the NEXT UNFINISHED group now. Do NOT repeat a group you already attempted. Do NOT ask what to do next \u2014 just proceed immediately.`,
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

        // QUALITY GATE: Prevent false-positive completion with shallow/empty responses
        // In max/limitless mode, if the final text is too short and doesn't contain substantive content,
        // force the agent to provide proper reasoning and context.
        // EXCEPTION: Don't fire for conversational questions that don't need tools
        const isConversational = /\b(hello|hi|hey|what can you|who are you|how are you|thanks|thank you|help|capabilities|what do you|tell me about yourself|introduce)\b/i.test(userText);
        const userAskedSimpleQuestion = userText.split(/\s+/).length <= 8;
        if ((mode === "max" || mode === "limitless") && turn <= 3 && textContent.length < 200 && completedToolCalls === 0 && !isConversational && !userAskedSimpleQuestion) {
          // Agent is trying to end with a very short response and no tool usage — this is a false positive
          const hasSubstance = /\b(here|result|found|analysis|summary|report|created|generated|built|deployed|completed|answer)\b/i.test(textContent);
          if (!hasSubstance) {
            console.log(`[Agent] Quality gate: response too shallow (${textContent.length} chars, 0 tools) in ${mode} mode — forcing elaboration`);
            finalContent = "";
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `Your response was too brief and didn't address the task substantively. You are in ${mode.toUpperCase()} mode — the user expects thorough, detailed work. Please:
1. Actually USE your tools to accomplish the task (search, generate, analyze, etc.)
2. Provide detailed reasoning and context in your response
3. Don't just acknowledge the request — FULFILL it with real output

The user's original request was: "${userText.slice(0, 300)}"

Do the work now.`,
            });
            continue;
          }
        }

        // GENERAL QUALITY: Even in quality/speed mode, if response has NO reasoning and just says
        // "done" or "complete" without explaining what was accomplished, force elaboration
        if (textContent.length > 0 && textContent.length < 100 && completedToolCalls > 0) {
          const isJustAcknowledgment = /^(done|complete|finished|here you go|there you go|all set|got it)[.!]?$/i.test(textContent.trim());
          if (isJustAcknowledgment && turn < maxTurns - 1) {
            console.log(`[Agent] Quality gate: response is just an acknowledgment without context — forcing explanation`);
            finalContent = "";
            conversation.push({ role: "assistant", content: textContent || "" });
            conversation.push({
              role: "user",
              content: `You just said "${textContent.trim()}" but didn't explain what you accomplished or provide any useful context. Please provide a proper response that:
- Summarizes what was done
- Explains the results or output
- Gives the user actionable context

Don't just say "done" — tell the user what they got.`,
            });
            continue;
          }
        }

        break;
      }

      // Manus Parity: Text alongside tool calls is now streamed as delta (above).
      // agent_thinking for <think> tags is already emitted at extraction time (line ~1374).
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

        // All tools execute autonomously — no confirmation gate

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

        // Send deploy progress events so the UI doesn't appear hung
        if (toolName === "deploy_webapp") {
          sendSSE(safeWrite, {
            tool_action: {
              id: toolCall.id,
              name: "deploy_webapp",
              type: "deploying",
              label: "Building and uploading to cloud...",
            },
          });
        }

        const result: ToolResult = await executeTool(toolName, toolArgs, { userId, taskExternalId });

        // Send tool_result event
        sendSSE(safeWrite, {
          tool_result: {
            id: toolCall.id,
            name: toolName,
            success: result.success,
            preview: result.result.slice(0, 500),
            url: result.url,
            projectExternalId: result.projectExternalId,
          },
        });

        // If it's an image, send a special image event for inline display
        if (result.url && (toolName === "generate_image" || toolName === "design_canvas")) {
          sendSSE(safeWrite, { image: result.url });
        }

        // GAP A: Send preview_refresh after file-modifying tools so the iframe auto-refreshes
        if (getActiveProject().dir && (toolName === "edit_file" || toolName === "create_file" || toolName === "run_command" || toolName === "install_deps") && result.success) {
          const { getActivePreviewUrl } = await import("./agentTools");
          const previewUrl = getActivePreviewUrl();
          sendSSE(safeWrite, { preview_refresh: { timestamp: Date.now(), url: previewUrl || undefined } });
        }

        // If it's a webapp, send a webapp_preview event
        if (result.url && toolName === "create_webapp") {
          sendSSE(safeWrite, {
            webapp_preview: {
              name: parsedArgs.name || "webapp",
              url: result.url,
              description: parsedArgs.description || "",
              projectExternalId: result.projectExternalId,
            },
          });
        }

        // If it's a deployment, send a webapp_deployed event + inject quality validation
        if (result.url && toolName === "deploy_webapp" && result.success) {
          sendSSE(safeWrite, {
            webapp_deployed: {
              name: result.artifactLabel || "webapp",
              url: result.url,
              projectExternalId: result.projectExternalId,
              versionLabel: parsedArgs.version_label || undefined,
            },
          });
          
          // POST-DEPLOY QUALITY VALIDATION (Manus Parity+): Inject a message based on
          // the static code review results. If issues found → instruct LLM to fix and redeploy.
          // If clean → present confidently.
          const codeIssues = result.codeIssues || [];
          const hasCodeIssues = codeIssues.length > 0;
          
          if (hasCodeIssues) {
            console.log(`[Agent] Post-deploy code review found ${codeIssues.length} issue(s) — instructing auto-fix`);
            conversation.push({
              role: "user",
              content: `The webapp has been deployed to ${result.url}, but the automated code review found ${codeIssues.length} issue(s) that may affect functionality:

${codeIssues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}

IMPORTANT: Fix these issues NOW before presenting to the user:
1. Use edit_file to fix each issue (add missing onChange handlers, connect state setters, fix broken imports, etc.)
2. After fixing, call deploy_webapp again to publish the corrected version
3. Then present the updated URL to the user with a summary of what was built

Do NOT present the broken version — fix first, then present.`,
            });
          } else {
            console.log(`[Agent] Post-deploy code review: clean — no issues found`);
            conversation.push({
              role: "user",
              content: `The webapp has been deployed to ${result.url}. The automated code review found no issues. Present the result to the user:
1. Share the deployed URL
2. Briefly summarize what was built and its key features
3. If you created interactive elements (buttons, forms, calculations), mention them so the user knows what to try

Do NOT use browser_action to test it — present confidently since the deploy succeeded and code review passed.`,
            });
          }
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
          try {
            onArtifact({
              type: result.artifactType,
              label: result.artifactLabel || toolName,
              content: result.artifactType === "terminal" ? result.result : undefined,
              url: result.url,
            });
          } catch (artifactErr: any) {
            console.error(`[agentStream] onArtifact callback failed for ${result.artifactType}:`, artifactErr.message);
          }
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

      // APP-BUILDING DEPLOY NUDGE: After executing tool calls, check if we're in an app-building
      // pipeline with too many file operations. If so, inject a deploy nudge before the next LLM call.
      // Thresholds are DYNAMIC based on webapp complexity (extracted from create_webapp description).
      {
        const appBuildToolCount = conversation.filter(m =>
          (m as any).tool_calls?.some((tc: any) =>
            ["create_file", "edit_file", "read_file", "install_deps", "run_command"].includes(tc.function?.name)
          )
        ).length;
        const hasCreatedWebapp = conversation.some(m =>
          (m as any).tool_calls?.some((tc: any) => tc.function?.name === "create_webapp")
        );
        const hasDeployedWebapp = conversation.some(m =>
          (m as any).tool_calls?.some((tc: any) => tc.function?.name === "deploy_webapp")
        );
        
        if (hasCreatedWebapp && !hasDeployedWebapp) {
          // Dynamic threshold: extract complexity from create_webapp description
          let SOFT_LIMIT = 6;
          let HARD_LIMIT = 12;
          const createWebappMsg = conversation.find(m =>
            (m as any).tool_calls?.some((tc: any) => tc.function?.name === "create_webapp")
          );
          if (createWebappMsg) {
            const createCall = (createWebappMsg as any).tool_calls?.find((tc: any) => tc.function?.name === "create_webapp");
            const desc = ((() => { try { return JSON.parse(createCall?.function?.arguments || "{}").description || ""; } catch { return ""; } })()).toLowerCase();
            const userMsg = conversation.find(m => m.role === "user" && typeof m.content === "string");
            const userText = (typeof userMsg?.content === "string" ? userMsg.content : "").toLowerCase();
            const combined = `${desc} ${userText}`;
            // Complex indicators: multi-page, dashboard, full-stack, e-commerce, CRM, admin panel
            const complexIndicators = /multi.?page|dashboard|full.?stack|e.?commerce|admin.?panel|crm|management.?system|social.?network|marketplace|portfolio.?with|blog.?with|saas/;
            // Simple indicators: calculator, timer, counter, hello world, single page, todo, clock
            const simpleIndicators = /calculator|timer|counter|hello.?world|single.?page|stopwatch|clock|converter|tip.?calc|bmi|quiz|flashcard|countdown|landing.?page/;
            
            if (complexIndicators.test(combined)) {
              SOFT_LIMIT = 10; // Complex apps get more room
              HARD_LIMIT = 18;
              console.log(`[Agent] App complexity: COMPLEX (soft=${SOFT_LIMIT}, hard=${HARD_LIMIT})`);
            } else if (simpleIndicators.test(combined)) {
              SOFT_LIMIT = 4;  // Simple apps should deploy fast
              HARD_LIMIT = 8;
              console.log(`[Agent] App complexity: SIMPLE (soft=${SOFT_LIMIT}, hard=${HARD_LIMIT})`);
            } else {
              // Default: medium complexity
              console.log(`[Agent] App complexity: MEDIUM (soft=${SOFT_LIMIT}, hard=${HARD_LIMIT})`);
            }
          }
          
          if (appBuildToolCount >= HARD_LIMIT) {
            console.log(`[Agent] App-building: HARD LIMIT (${appBuildToolCount}/${HARD_LIMIT} file ops). Injecting mandatory deploy prompt.`);
            conversation.push({
              role: "user",
              content: `CRITICAL: You have created/edited ${appBuildToolCount} files (limit: ${HARD_LIMIT}). STOP creating files NOW. The app is complete enough. Your ONLY next action must be to call deploy_webapp to deploy the app. Do NOT create, edit, or read any more files. Call deploy_webapp immediately.`,
            });
          } else if (appBuildToolCount >= SOFT_LIMIT) {
            console.log(`[Agent] App-building: soft limit (${appBuildToolCount}/${SOFT_LIMIT} file ops). Nudging toward deploy.`);
            conversation.push({
              role: "user",
              content: `You've created ${appBuildToolCount} files (target: ${SOFT_LIMIT}). The app should be functional now. Wrap up any final essential changes and call deploy_webapp to deploy it. The user is waiting for a working deployed app.`,
            });
          }
        }
      }

      // If finish_reason is "stop" and no pending tool calls, the LLM is done
      if (effectiveChoice.finish_reason === "stop" && (!toolCalls || !toolCalls.length)) {
        break;
      }
      // Safety: if finish_reason is "length" at this point (shouldn't reach here due to
      // the earlier handler, but just in case), apply continuation tracking and continue
      if (effectiveChoice.finish_reason === "length") {
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

    // SAFETY NET: If the agent loop ended with tool calls but no visible text, force a final text response
    if (!finalContent.trim() && completedToolCalls > 0) {
      console.log(`[Agent] No visible text after ${completedToolCalls} tool calls — forcing final synthesis`);
      try {
        conversation.push({
          role: "user",
          content: "You have completed your tool calls but haven't provided a visible response to the user yet. Now produce a brief, direct text response summarizing what you accomplished or answering the user's question. Do NOT call any more tools — just respond in text.",
        });
        const { invokeLLM } = await import("./_core/llm");
        const synthResponse = await invokeLLM({
          messages: [{ role: "system", content: "You are a helpful assistant. Provide a concise summary response based on the conversation context. Do not use any tools." }, ...conversation],
        });
        const synthRaw = synthResponse?.choices?.[0]?.message?.content;
        const synthText = typeof synthRaw === "string" ? synthRaw : "";
        if (synthText.trim()) {
          streamTextAsChunks(safeWrite, synthText);
          finalContent = synthText;
        } else {
          // Absolute fallback
          const fallback = "Done. Let me know if you need anything else.";
          sendSSE(safeWrite, { delta: fallback });
          finalContent = fallback;
        }
      } catch (e) {
        console.error("[Agent] Final synthesis failed:", e);
        const fallback = "I've completed the requested actions. Let me know if you need anything else.";
        sendSSE(safeWrite, { delta: fallback });
        finalContent = fallback;
      }
    }

    // Signal completion — but check if generation requests actually produced a deliverable
    const originalUserMsg = messages.find(m => m.role === "user");
    const originalUserText = typeof originalUserMsg?.content === "string" ? originalUserMsg.content : "";
    const wasGenerationRequest = /\b(generate|create|make|build|draft)\s+(me\s+)?a?\s*(pdf|document|image|picture|photo|slide|presentation|spreadsheet|report|file|app|website|webapp|video|audio|song|music)\b/i.test(originalUserText);
    const producedArtifact = completedToolCalls > 0 && conversation.some(m =>
      m.role === "tool" && typeof m.content === "string" &&
      (/https?:\/\/\S+\.(pdf|png|jpg|jpeg|gif|svg|docx|xlsx|pptx|mp3|mp4|wav|webm)/i.test(m.content) ||
       /"url"\s*:\s*"https?:\/\//i.test(m.content) ||
       /successfully|generated|created|completed/i.test(m.content))
    );
    const agentAskedForClarification = /what.*?(content|would you|should|like me|topic|details|information|include)|please.*?(provide|specify|tell me|share)/i.test(finalContent);

    if (wasGenerationRequest && !producedArtifact && !agentAskedForClarification) {
      // The agent researched ABOUT the format but never produced the artifact
      console.log(`[Agent] Generation request detected but no artifact produced — marking as incomplete`);
      sendSSE(safeWrite, { status: "completed", metadata: { generationIncomplete: true } });
    } else {
      sendSSE(safeWrite, { status: "completed" });
    }
    sendSSE(safeWrite, { done: true, content: finalContent });
    safeEnd();
    console.log("[Agent] Stream complete after", turn, "turns,", completedToolCalls, "tool calls", wasGenerationRequest ? `(generation: artifact=${producedArtifact})` : "");

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
    // Send error status BEFORE the error message so the client resets from "running"
    sendSSE(safeWrite, { status: "error" });
    sendSSE(safeWrite, { error: userMessage, retryable });
    safeEnd();
  }
}
// ═══════════════════════════════════════════════════════════════════════
// MANUS-PARITY HELPER FUNCTIONSS
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
  const HIGH_VALUE_TOOL_MAX = 600; // Higher limit for artifact-producing tool results
  
  if (conversation.length <= KEEP_RECENT + 1) return 0; // +1 for system prompt
  
  // Patterns indicating high-value tool results that should be preserved more fully
  const HIGH_VALUE_PATTERNS = [
    /(?:created|generated|uploaded|deployed|published)/i, // Artifact creation
    /(?:url|https?:\/\/)/i, // Contains URLs (images, documents, deployments)
    /(?:error|failed|exception|cannot)/i, // Failure information (Rule 3: preserve what didn't work)
    /(?:\.pdf|\.docx|\.png|\.jpg|\.svg|\.html)/i, // File artifacts
    /(?:preview is available|Preview is live|deployed to)/i, // Deployment results
  ];
  
  // Find the boundary: everything before (length - KEEP_RECENT) gets compressed
  const compressBoundary = conversation.length - KEEP_RECENT;
  let compressedCount = 0;
  let failureLog: string[] = []; // Collect failure information for preservation
  
  for (let i = 1; i < compressBoundary; i++) { // Skip index 0 (system prompt)
    const msg = conversation[i];
    if (msg.role === "tool" && typeof msg.content === "string" && msg.content.length > TOOL_RESULT_MAX) {
      // Check if this is a high-value result
      const isHighValue = HIGH_VALUE_PATTERNS.some(p => p.test(msg.content as string));
      const maxLen = isHighValue ? HIGH_VALUE_TOOL_MAX : TOOL_RESULT_MAX;
      
      // Extract failure information before truncating
      if (/(?:error|failed|exception|cannot|rejected)/i.test(msg.content as string)) {
        const failSnippet = (msg.content as string).slice(0, 150);
        failureLog.push(failSnippet);
      }
      
      if ((msg.content as string).length > maxLen) {
        const truncated = (msg.content as string).slice(0, maxLen) + 
          (isHighValue ? "\n... [high-value result preserved at reduced detail]" : "\n... [truncated for context efficiency]");
        conversation[i] = { ...msg, content: truncated };
        compressedCount++;
      }
    }
    // Also compress very long assistant messages that aren't the most recent
    if (msg.role === "assistant" && typeof msg.content === "string" && msg.content.length > 1000) {
      const truncated = msg.content.slice(0, 500) + "\n... [earlier content truncated]\n" + msg.content.slice(-200);
      conversation[i] = { ...msg, content: truncated };
      compressedCount++;
    }
  }
  
  // If we collected failure information, inject a summary into the system prompt
  // so the agent remembers what was tried and didn't work (avoid repeating failed approaches)
  if (failureLog.length > 0 && conversation[0]?.role === "system") {
    const failureSummary = `\n\n[Context Compression Note] The following approaches were tried and failed in earlier turns:\n${failureLog.slice(-5).map((f, i) => `${i + 1}. ${f}`).join("\n")}\nAvoid repeating these approaches.`;
    if (typeof conversation[0].content === "string" && !conversation[0].content.includes("[Context Compression Note]")) {
      conversation[0] = { ...conversation[0], content: conversation[0].content + failureSummary };
    }
  }
  
  console.log(`[Agent] Compressed ${compressedCount} older messages, keeping ${KEEP_RECENT} recent${failureLog.length > 0 ? `, preserved ${failureLog.length} failure records` : ""}`);
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
    case "deploy_webapp":
      return { type: "deploying", label: `Deploying webapp${args.version_label ? `: ${args.version_label.slice(0, 40)}` : " to production"}` };
    case "github_edit":
      if (args.confirm) {
        return { type: "versioning", label: `Committing changes to ${args.repo || "repository"}` };
      }
      return { type: "editing", label: `Editing repo: ${(args.instruction || "").slice(0, 60)}` };
    case "github_assess":
      if (args.mode === "optimize") {
        return { type: "thinking", label: `Optimizing ${args.repo || "repository"}: analyzing code quality` };
      }
      if (args.mode === "validate") {
        return { type: "thinking", label: `Validating ${args.repo || "repository"} against Phase ${args.target_phase || "B"} gate` };
      }
      return { type: "thinking", label: `Assessing ${args.repo || "repository"}: deep 14-dimension analysis` };
    // Pass 38: Manus Parity+ Tool Display Mappings
    case "data_pipeline":
      return { type: "analyzing", label: `Data pipeline (${args.mode || "full"}): ${(args.source_description || "").slice(0, 50)}` };
    case "automation_orchestrate":
      return { type: "building", label: `Automation (${args.mode || "full"}): ${(args.description || "").slice(0, 50)}` };
    case "app_lifecycle":
      return { type: "designing", label: `App lifecycle (${args.mode || "full"}): ${(args.description || "").slice(0, 50)}` };
    case "deep_research_content":
      return { type: "researching", label: `Research (${args.mode || "full"}): ${(args.topic || args.description || "").slice(0, 50)}` };
    case "github_ops":
      return { type: "versioning", label: `GitHub ops (${args.mode || "status"}): ${(args.description || args.repo || "").slice(0, 50)}` };
    default:
      return { type: "thinking", label: `Using ${toolName}` };
  }
}
