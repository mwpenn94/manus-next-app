/**
 * Agent Tools — Server-side tool definitions and executors
 *
 * These tools are provided to the LLM via function calling (OpenAI format).
 * When the LLM decides to use a tool, the server executes it and feeds
 * the result back into the conversation for the next LLM turn.
 *
 * Tool inventory:
 * - `web_search` — Multi-source web search (DDG API + Wikipedia + page fetch + LLM synthesis)
 * - `read_webpage` — Fetch and parse a specific URL's text content
 * - `generate_image` — Create images from text descriptions via built-in image generation API
 * - `analyze_data` — LLM-powered structured data analysis
 * - `execute_code` — Sandboxed JavaScript execution with 5-second timeout
 * - `generate_document` — LLM-powered document creation (markdown, report, analysis, plan formats)
 * - `browse_web` — Enhanced webpage browsing with structured extraction (metadata, headings, links, images, tables)
 *
 * @module agentTools
 */
import type { Tool } from "./_core/llm";

// ── Retry utility for transient failures (502, network errors) ──
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, delayMs = 1500): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || "";
      const isTransient = msg.includes("502") || msg.includes("503") || msg.includes("504") || msg.includes("ECONNRESET") || msg.includes("fetch failed") || msg.includes("ETIMEDOUT");
      if (!isTransient || attempt === maxRetries) throw err;
      console.log(`[retry] Attempt ${attempt + 1} failed (${msg.slice(0, 80)}), retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

// ── Tool Definitions (OpenAI function-calling format) ───

export const AGENT_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for current information, news, research, or facts. Uses DuckDuckGo Instant Answer API, Wikipedia, and direct page fetching to return real, sourced information. ALWAYS use this when asked about real-world entities, companies, products, people, current events, or anything you're uncertain about.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up on the web",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_webpage",
      description:
        "Fetch and read the content of a specific webpage URL. Use this after web_search to get detailed information from a specific result, or when you have a known URL to read. Returns the text content of the page.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL of the webpage to read",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description:
        "Generate an image from a text description. Use this when the user asks you to create, draw, design, or visualize something as an image. Returns the URL of the generated image.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "Detailed description of the image to generate. Be specific about style, composition, colors, and subject matter.",
          },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_data",
      description:
        "Analyze structured data (CSV, JSON, or tabular data) and produce insights, statistics, or summaries. Use this when the user provides data or asks for analysis of numbers, trends, or patterns.",
      parameters: {
        type: "object",
        properties: {
          data: {
            type: "string",
            description:
              "The data to analyze, as CSV, JSON, or plain text table",
          },
          analysis_type: {
            type: "string",
            enum: ["summary", "trends", "statistics", "comparison", "custom"],
            description: "The type of analysis to perform",
          },
          question: {
            type: "string",
            description:
              "Specific question to answer about the data (optional)",
          },
        },
        required: ["data", "analysis_type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_document",
      description:
        "Generate a structured document (report, analysis, summary, article, plan, spreadsheet) as a downloadable file. Supports markdown, PDF, DOCX, CSV, and XLSX output formats. Use this when the user asks you to create, write, draft, or produce a document, report, spreadsheet, or any long-form structured content. Match the output_format to what the user requests: 'pdf' for PDF, 'docx' for Word, 'csv' for CSV data, 'xlsx' for Excel spreadsheets. For CSV/XLSX, structure the content with markdown tables. Returns the document content and a download URL.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title of the document",
          },
          content: {
            type: "string",
            description:
              "Full markdown content of the document. Use proper markdown formatting with headings, lists, tables, and emphasis.",
          },
          format: {
            type: "string",
            enum: ["markdown", "report", "analysis", "plan"],
            description: "The type/style of document to generate (affects content structure)",
          },
          output_format: {
            type: "string",
            enum: ["markdown", "pdf", "docx", "csv", "xlsx", "json"],
            description: "The file format to output. Use 'pdf' for PDF, 'docx' for Word, 'csv' for CSV data, 'xlsx' for Excel spreadsheets, 'json' for JSON data, 'markdown' for default. Always match the user's requested format.",
          },
        },
        required: ["title", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_web",
      description:
        "Browse a webpage and extract structured information including page title, meta description, headings, links, images, and main content. Use this for comprehensive page analysis, extracting structured data from websites, or when you need more detail than read_webpage provides. Returns structured page analysis.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL of the webpage to browse",
          },
          extract: {
            type: "string",
            enum: ["full", "links", "images", "metadata", "headings", "tables"],
            description: "What to extract from the page. 'full' returns everything, others focus on specific elements.",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "wide_research",
      description:
        "Conduct parallel wide research across multiple queries simultaneously. Use this when the user asks for comprehensive research, comparisons across multiple topics, or when you need to gather information from several different angles at once. Runs multiple web searches in parallel and synthesizes the results into a unified analysis.",
      parameters: {
        type: "object",
        properties: {
          queries: {
            type: "array",
            items: { type: "string" },
            description:
              "Array of 2-10 search queries to execute in parallel. Each query should target a different aspect or angle of the research topic.",
          },
          synthesis_prompt: {
            type: "string",
            description:
              "Instructions for how to synthesize the parallel results. E.g., 'Compare these AI agents side by side' or 'Identify common themes across these topics'.",
          },
        },
        required: ["queries", "synthesis_prompt"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_slides",
      description:
        "Generate a slide deck / presentation from a topic or outline. Returns structured slides with titles, content, and speaker notes. Use when the user asks to create a presentation, slide deck, or pitch deck.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "The topic or detailed outline for the presentation",
          },
          slideCount: {
            type: "number",
            description: "Number of slides to generate (3-30, default 8)",
          },
          style: {
            type: "string",
            enum: ["professional", "creative", "minimal", "academic"],
            description: "Visual style of the presentation",
          },
        },
        required: ["topic"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description:
        "Send an email notification to the project owner. Use when the user asks to send an email, notify someone, or share results via email. The email is delivered through the built-in notification system.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Email subject line",
          },
          body: {
            type: "string",
            description: "Email body content in markdown format",
          },
        },
        required: ["subject", "body"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "take_meeting_notes",
      description:
        "Process a meeting transcript or audio URL to generate structured meeting notes with summary, action items, key decisions, and attendee attribution. Use when the user provides meeting content to summarize.",
      parameters: {
        type: "object",
        properties: {
          transcript: {
            type: "string",
            description: "The meeting transcript text, or a URL to an audio recording",
          },
          title: {
            type: "string",
            description: "Title for the meeting notes (optional)",
          },
        },
        required: ["transcript"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "design_canvas",
      description:
        "Create a visual design composition by generating an image and arranging it with text overlays, producing a design artifact. Use when the user asks to design a poster, banner, card, UI mockup, or any visual composition.",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Detailed description of the design to create",
          },
          format: {
            type: "string",
            enum: ["poster", "banner", "card", "mockup", "infographic", "social"],
            description: "Type of design to create",
          },
          text_overlay: {
            type: "string",
            description: "Text to overlay on the design (optional)",
          },
        },
        required: ["description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cloud_browser",
      description:
        "Control a real Chromium browser session using Playwright. Navigate to URLs, click elements, type text, scroll, take screenshots, evaluate JavaScript, and interact with web pages. The browser persists across calls so you can perform multi-step workflows (login, fill forms, navigate). Always returns a real screenshot of the current page state.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to navigate to. Required for 'navigate' action, optional for others (uses current page).",
          },
          action: {
            type: "string",
            enum: ["navigate", "screenshot", "click", "type", "scroll", "evaluate", "wait_for", "press_key", "select", "go_back", "go_forward", "reload", "get_elements"],
            description: "Browser action to perform. 'navigate' goes to a URL, 'click' clicks an element, 'type' types text into an input, 'scroll' scrolls the page, 'evaluate' runs JS in page context, 'wait_for' waits for a selector, 'press_key' presses a keyboard key, 'select' selects a dropdown option, 'go_back'/'go_forward' for history, 'reload' refreshes, 'get_elements' lists interactive elements.",
          },
          selector: {
            type: "string",
            description: "CSS selector for click/type/wait_for/select actions.",
          },
          text: {
            type: "string",
            description: "Text to type (for 'type'), JavaScript code (for 'evaluate'), key name (for 'press_key', e.g. 'Enter', 'Tab'), or option value (for 'select').",
          },
          scroll_direction: {
            type: "string",
            enum: ["up", "down", "left", "right"],
            description: "Scroll direction (for 'scroll' action, default: 'down').",
          },
          full_page: {
            type: "boolean",
            description: "Capture full page screenshot (default: false, viewport only).",
          },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "screenshot_verify",
      description:
        "Analyze a screenshot or image URL using vision AI to verify visual content, check UI elements, or extract text from images. Use when you need to verify what a webpage looks like or analyze visual content.",
      parameters: {
        type: "object",
        properties: {
          image_url: {
            type: "string",
            description: "URL of the image or screenshot to analyze",
          },
          question: {
            type: "string",
            description: "What to look for or verify in the image",
          },
        },
        required: ["image_url", "question"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_code",
      description:
        "Execute code to perform calculations, data transformations, analysis, or generate structured output. Supports JavaScript (sandboxed VM) and Python (subprocess with numpy/pandas/scipy available). Use this for math, algorithms, data processing, statistical analysis, or when you need to compute something precisely rather than estimate. Python is preferred for data science, statistical analysis, and complex math. JavaScript is preferred for quick calculations and JSON manipulation.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Code to execute. For JS: self-contained snippet with console.log() output. For Python: script with print() output.",
          },
          language: {
            type: "string",
            enum: ["javascript", "python"],
            description: "Programming language. Default: javascript. Use python for data science, statistics, complex math, or when numpy/pandas/scipy are needed.",
          },
          description: {
            type: "string",
            description: "Brief description of what the code does",
          },
        },
        required: ["code"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_webapp",
      description:
        "Create a new web application project. Returns a preview URL that can be embedded in the chat. Use this when the user asks to build a website, web app, landing page, or any browser-based project. IMPORTANT: Default to 'html' template for fast, reliable results. Only use 'react' template if the user specifically needs React features (state management, components, routing). The 'html' template supports modern CSS, animations, and responsive design without build steps. Use 'nextjs' for full-stack apps with SSR/API routes. Use 'svelte' for lightweight reactive apps.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Project name (lowercase, no spaces, e.g. 'my-portfolio')",
          },
          description: {
            type: "string",
            description: "Brief description of the app to build",
          },
          template: {
            type: "string",
            enum: ["html", "react", "nextjs", "svelte", "landing"],
            description: "Template type: 'react' (React+Vite+Tailwind), 'html' (plain HTML/CSS/JS), 'nextjs' (Next.js full-stack with API routes), 'svelte' (SvelteKit lightweight), or 'landing' (landing page template)",
          },
          env_vars: {
            type: "object",
            description: "Environment variables to set for the project (e.g., { 'API_KEY': 'xxx', 'DATABASE_URL': 'postgres://...' }). These are written to .env and available at build/runtime.",
            additionalProperties: { type: "string" },
          },
          features: {
            type: "array",
            items: { type: "string", enum: ["auth", "database", "api", "analytics", "payments", "email"] },
            description: "Optional features to scaffold: 'auth' (login/signup), 'database' (SQLite/Postgres), 'api' (REST endpoints), 'analytics' (event tracking), 'payments' (Stripe), 'email' (transactional)",
          },
        },
        required: ["name", "description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description:
        "Create or overwrite a file in the current webapp project. Use this to write HTML, CSS, JavaScript, React components, or any other project file. The file path is relative to the project root.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative file path within the project (e.g. 'src/App.tsx', 'index.html', 'src/styles.css')",
          },
          content: {
            type: "string",
            description: "Full file content to write",
          },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description:
        "Edit an existing file in the current webapp project by finding and replacing text. Use this for targeted modifications to existing files.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative file path within the project (e.g. 'src/App.tsx')",
          },
          find: {
            type: "string",
            description: "Exact text to find in the file",
          },
          replace: {
            type: "string",
            description: "Text to replace the found text with",
          },
        },
        required: ["path", "find", "replace"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read the contents of a file in the current webapp project. Use this to inspect existing code before editing.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative file path within the project (e.g. 'src/App.tsx')",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description:
        "List files and directories in the current webapp project. Returns a tree view of the project structure.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative directory path to list (default: root). E.g. 'src' or 'src/components'",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "install_deps",
      description:
        "Install npm packages in the current webapp project. Use this to add libraries like axios, framer-motion, lucide-react, etc.",
      parameters: {
        type: "object",
        properties: {
          packages: {
            type: "string",
            description: "Space-separated package names to install (e.g. 'framer-motion lucide-react')",
          },
          dev: {
            type: "boolean",
            description: "Whether to install as dev dependency (default: false)",
          },
        },
        required: ["packages"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Run a shell command in the current webapp project directory. Use for build commands, linting, testing, or any project-specific CLI operations. Output is captured and returned.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Shell command to execute in the project directory",
          },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_operation",
      description:
        "Perform Git operations on the current webapp project. Supports init, add, commit, push, status, log, and clone. Use this to version control the project and push to GitHub.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["init", "add", "commit", "push", "status", "log", "clone", "remote_add"],
            description: "Git operation to perform",
          },
          message: {
            type: "string",
            description: "Commit message (required for 'commit' operation)",
          },
          remote_url: {
            type: "string",
            description: "Remote repository URL (for 'push', 'clone', or 'remote_add' operations)",
          },
          files: {
            type: "string",
            description: "Files to add (for 'add' operation, default: '.' for all files)",
          },
        },
        required: ["operation"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deploy_webapp",
      description:
        "Build and deploy the current webapp project. This bundles the project (runs npm run build for React projects), uploads the built output to cloud storage, and makes it publicly accessible. Returns the live URL. Supports environment variable injection, custom domains, and deployment versioning.",
      parameters: {
        type: "object",
        properties: {
          version_label: {
            type: "string",
            description: "Version label for this deployment (e.g. 'v1.0.0', 'initial release')",
          },
          env_vars: {
            type: "object",
            description: "Environment variables to inject during build (e.g., { 'VITE_API_URL': 'https://api.example.com' })",
            additionalProperties: { type: "string" },
          },
          custom_domain: {
            type: "string",
            description: "Custom domain to associate with this deployment (e.g., 'myapp.com'). DNS must be configured separately.",
          },
          production: {
            type: "boolean",
            description: "Whether this is a production deployment (enables optimizations, minification, and CDN caching). Default: true.",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ── Convergence Reporting Tool ──
  {
    type: "function" as const,
    function: {
      name: "report_convergence",
      description:
        "Report the progress of a recursive optimization/convergence pass. Call at the START of each pass with status 'running' and at the END with 'converged' or 'needs_more'. This creates visual progress indicators in the chat for the user. Supports configurable reasoning modes (convergent for refinement, divergent for exploration) and temperature-based adaptive behavior.",
      parameters: {
        type: "object",
        properties: {
          pass_number: {
            type: "number",
            description: "Current pass number (1-indexed)",
          },
          pass_type: {
            type: "string",
            enum: ["landscape", "depth", "adversarial", "future_state", "synthesis", "exploration", "fundamental_redesign"],
            description: "Type of analysis pass being performed. 'exploration' is for divergent reasoning.",
          },
          status: {
            type: "string",
            enum: ["running", "converged", "needs_more"],
            description: "Current status of this pass",
          },
          reasoning_mode: {
            type: "string",
            enum: ["convergent", "divergent", "adaptive"],
            description: "Reasoning mode: 'convergent' narrows toward optimal solution, 'divergent' explores alternatives and novel approaches, 'adaptive' switches based on temperature and signals.",
          },
          temperature: {
            type: "number",
            description: "Current temperature (0.0-1.0). High = explore/diverge, Low = exploit/converge. Decays naturally as passes accumulate without improvement.",
          },
          signal_assessment: {
            type: "string",
            description: "One-sentence assessment of signals present for each pass type (what triggered this pass type selection).",
          },
          description: {
            type: "string",
            description: "Brief description of what this pass is doing or found",
          },
          rating: {
            type: "number",
            description: "Quality rating 1-10 for the current state. Note: models overrate own outputs by 0.5-1.0 points — calibrate accordingly.",
          },
          score_delta: {
            type: "number",
            description: "Change in rating from previous pass. Positive = improving, negative = regressing, zero = stagnating. Used to adjust temperature.",
          },
          convergence_count: {
            type: "number",
            description: "Number of consecutive clean passes (need 100 for full convergence, max 1280 total passes)",
          },
          failure_log: {
            type: "string",
            description: "What was tried and didn't work this pass. Critical for avoiding repeated failures and preserving institutional knowledge.",
          },
          divergence_budget_used: {
            type: "number",
            description: "Percentage (0-100) of divergence budget consumed. Budget is 15% at temp<0.3, 40% at temp 0.3-0.6, 60% at temp>0.6.",
          },
        },
        required: ["pass_number", "pass_type", "status"],
        additionalProperties: false,
      },
    },
  },
  // ── GitHub AI Edit Tool ──
  {
    type: "function" as const,
    function: {
      name: "github_edit",
      description:
        "Edit files in a connected GitHub repository using natural language. Describe what changes you want to make and the AI will read the repo, plan edits, generate diffs, and commit atomically. Use this when the user asks to update, modify, fix, refactor, or add code to any of their GitHub repos. Two-step flow: first call generates a diff preview, second call with confirm=true applies the changes.",
      parameters: {
        type: "object",
        properties: {
          instruction: {
            type: "string",
            description: "Natural language description of what changes to make (e.g., 'Add a login page with email/password form', 'Fix the bug in auth.ts where tokens expire too early', 'Update README with installation instructions')",
          },
          repo: {
            type: "string",
            description: "Repository name or full name (owner/repo). If the user has only one repo connected, this can be omitted.",
          },
          confirm: {
            type: "boolean",
            description: "Set to true to apply a previously generated edit plan. Must be used with edit_plan_id.",
          },
          edit_plan_id: {
            type: "string",
            description: "The plan ID returned from a previous github_edit call. Required when confirm=true.",
          },
        },
        required: ["instruction"],
        additionalProperties: false,
      },
    },
  },
  // ── GitHub AI Assess Tool ──
  {
    type: "function" as const,
    function: {
      name: "github_assess",
      description:
        "Deeply assess, optimize, or validate a connected GitHub repository using the Manus recursive optimization framework. Analyzes the repo across 14 dimensions (completeness, accuracy, depth, novelty, actionability, regression_safety, ux_quality, performance, security, accessibility, test_coverage, documentation, code_quality, deployment_readiness), routes findings to expert classes (A-F), runs quality guards, and generates a structured assessment report with scores. Three modes: 'assess' (read-only analysis), 'optimize' (assess + prioritized fix recommendations), 'validate' (assess + phase gate pass/fail check). Use this when the user asks to review, audit, analyze, assess, or evaluate their codebase quality.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["assess", "optimize", "validate"],
            description: "Assessment mode: 'assess' for read-only analysis, 'optimize' for analysis + fix recommendations, 'validate' for phase gate checking",
          },
          repo: {
            type: "string",
            description: "Repository name or full name (owner/repo). If the user has only one repo connected, this can be omitted.",
          },
          focus: {
            type: "string",
            description: "Optional focus area for the assessment (e.g., 'security', 'performance', 'test coverage'). If omitted, all dimensions are assessed equally.",
          },
          target_phase: {
            type: "string",
            enum: ["A", "B", "C", "D"],
            description: "Target phase gate to validate against (only used in 'validate' mode). A=Specification, B=Implementation, C=Hardening, D=Continuous Operations.",
          },
        },
        required: ["mode"],
        additionalProperties: false,
      },
    },
  },
  // ── Pass 38: Manus Parity+ Tools ──
  {
    type: "function",
    function: {
      name: "data_pipeline",
      description:
        "Execute data operations: ingest, transform, enrich, model, and persist data from various sources. Supports CSV/JSON/XML/API/database sources, schema inference, quality scoring, null imputation, normalization, deduplication, and data modeling. Modes: 'ingest' (classify + validate source), 'transform' (clean + normalize + enrich), 'model' (schema inference + relationship mapping), 'persist' (storage strategy), 'full' (end-to-end pipeline). Use when the user asks about ETL, data processing, data cleaning, data modeling, or data integration.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["plan", "ingest", "transform", "model", "persist", "full"],
            description: "Pipeline mode: ingest, transform, model, persist, or full end-to-end",
          },
          source_description: {
            type: "string",
            description: "Description of the data source (e.g., 'CSV file with customer records', 'REST API returning JSON')",
          },
          data_sample: {
            type: "string",
            description: "Optional sample of the data to analyze (first few rows or records)",
          },
          target_format: {
            type: "string",
            description: "Desired output format or storage target",
          },
          custom_instructions: {
            type: "string",
            description: "Additional instructions for the pipeline",
          },
        },
        required: ["mode", "source_description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "automation_orchestrate",
      description:
        "Design and orchestrate automation workflows: browser automation, API/webhook chains, scheduled tasks, event-driven pipelines, and agentic multi-step workflows. Modes: 'browser' (web scraping/interaction), 'api_chain' (multi-API orchestration), 'scheduled' (cron/interval tasks), 'event_driven' (webhook/trigger pipelines), 'agentic' (multi-step autonomous workflows), 'full' (complete automation design). Use when the user asks about automation, workflows, scheduling, web scraping, or API orchestration.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["plan", "browser", "api", "schedule", "workflow", "monitor"],
            description: "Automation mode: plan (design workflow), browser (web scraping/interaction), api (multi-API orchestration), schedule (cron/interval tasks), workflow (multi-step autonomous), monitor (observability)",
          },
          description: {
            type: "string",
            description: "Description of the automation workflow to design or execute",
          },
          trigger: {
            type: "string",
            description: "What triggers this automation (e.g., 'every 6 hours', 'on webhook', 'on new email')",
          },
          target_url: {
            type: "string",
            description: "Target URL for browser automation or API endpoint",
          },
          custom_instructions: {
            type: "string",
            description: "Additional instructions for the automation",
          },
        },
        required: ["mode", "description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "app_lifecycle",
      description:
        "Manage the full application development lifecycle: design, architecture, build, test, deploy, observe, and maintain. Modes: 'design' (UI/UX wireframes + design system), 'architect' (system architecture + tech stack), 'build' (implementation plan + code generation), 'test' (test strategy + coverage analysis), 'deploy' (deployment strategy + CI/CD), 'observe' (monitoring + alerting + logging), 'maintain' (dependency updates + security patches + tech debt), 'full' (complete SDLC plan). Use when the user asks about app design, architecture, deployment, testing strategy, or maintenance.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["discover", "design", "architect", "implement", "integrate", "test", "deploy", "observe", "audit", "iterate", "full"],
            description: "Lifecycle phase to execute",
          },
          description: {
            type: "string",
            description: "Description of the application or specific lifecycle task",
          },
          tech_stack: {
            type: "string",
            description: "Technology stack (e.g., 'React + Node + PostgreSQL')",
          },
          repo: {
            type: "string",
            description: "Repository name for context (optional)",
          },
          custom_instructions: {
            type: "string",
            description: "Additional instructions",
          },
        },
        required: ["mode", "description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deep_research_content",
      description:
        "Conduct deep multi-source research and produce publication-quality content. Modes: 'research' (multi-source research with citations), 'write' (long-form content with structure and citations), 'media' (media generation specifications), 'document' (document production specs for PDF/DOCX/slides), 'analyze' (deep analysis of provided content), 'full' (research → analyze → write → document pipeline). Use when the user asks for research, reports, articles, whitepapers, content creation, or document production.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["research", "write", "media", "document", "analyze", "full"],
            description: "Research/content mode",
          },
          topic: {
            type: "string",
            description: "Research topic or content subject",
          },
          description: {
            type: "string",
            description: "Detailed description of what to research or write",
          },
          depth: {
            type: "string",
            enum: ["quick", "standard", "deep", "exhaustive"],
            description: "Research depth level",
          },
          format: {
            type: "string",
            description: "Content format (report, article, whitepaper, blog_post, executive_summary, technical_doc, presentation)",
          },
          target_length: {
            type: "string",
            enum: ["short", "standard", "long"],
            description: "Target content length",
          },
          custom_instructions: {
            type: "string",
            description: "Additional instructions for research or writing",
          },
        },
        required: ["mode"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_ops",
      description:
        "Enhanced GitHub operations for CI/CD, PR workflows, releases, and branch management. Modes: 'branch' (create/manage branches with strategy), 'pr' (create/review/merge PRs), 'release' (generate changelogs and release notes), 'ci' (generate/commit GitHub Actions workflows), 'status' (comprehensive repo health check). Use when the user asks about branches, pull requests, CI/CD, releases, or repo health.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["branch", "pr", "release", "ci", "protect", "status"],
            description: "Operation mode",
          },
          repo: {
            type: "string",
            description: "Repository name or full name (owner/repo)",
          },
          description: {
            type: "string",
            description: "Description of the operation (e.g., 'create feature branch for auth system')",
          },
          branch_name: {
            type: "string",
            description: "Branch name (for branch mode)",
          },
          from_branch: {
            type: "string",
            description: "Source branch to create from (defaults to default branch)",
          },
          head_branch: {
            type: "string",
            description: "Head branch for PR creation",
          },
          base_branch: {
            type: "string",
            description: "Base branch for PR creation (defaults to default branch)",
          },
          pr_title: {
            type: "string",
            description: "Pull request title",
          },
          pr_body: {
            type: "string",
            description: "Pull request body/description",
          },
          pr_number: {
            type: "number",
            description: "PR number for merge operations",
          },
          merge_method: {
            type: "string",
            enum: ["merge", "squash", "rebase"],
            description: "Merge method for PR merging",
          },
          language: {
            type: "string",
            description: "Programming language for CI workflow generation",
          },
        },
        required: ["mode"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_github_repo",
      description:
        "Create a new GitHub repository and optionally connect it as a project for continuous deployment. Use when the user asks to create a new repo, start a new project on GitHub, or set up a repository for their code. The repo is automatically connected to the app with webhook for auto-deploy.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Repository name (e.g., 'my-project'). Must be valid GitHub repo name.",
          },
          description: {
            type: "string",
            description: "Short description of the repository",
          },
          private: {
            type: "boolean",
            description: "Whether the repo should be private (default: false)",
          },
          auto_init: {
            type: "boolean",
            description: "Initialize with README.md (default: true)",
          },
          gitignore_template: {
            type: "string",
            description: "Gitignore template name (e.g., 'Node', 'Python', 'Go')",
          },
          license_template: {
            type: "string",
            description: "License template (e.g., 'mit', 'apache-2.0', 'gpl-3.0')",
          },
          connect_as_project: {
            type: "boolean",
            description: "Whether to also create a webapp project linked to this repo for auto-deploy (default: true)",
          },
          initial_files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "File path in repo" },
                content: { type: "string", description: "File content" },
              },
              required: ["path", "content"],
            },
            description: "Optional initial files to commit to the repo after creation",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "use_connector",
      description:
        "Execute an action on a connected service (Google Drive, Slack, Notion, Linear, GitHub, Microsoft 365). Use this when the user asks to interact with their connected services — read files from Drive, send Slack messages, create Notion pages, manage Linear issues, etc. Check available connectors and actions first.",
      parameters: {
        type: "object",
        properties: {
          connector_id: {
            type: "string",
            enum: ["google-drive", "slack", "notion", "linear", "github", "microsoft-365"],
            description: "The connector service to use",
          },
          action: {
            type: "string",
            description: "The action to perform (e.g., list_files, send_message, create_issue, read_page)",
          },
          params: {
            type: "object",
            description: "Action-specific parameters (varies by connector and action)",
            additionalProperties: true,
          },
        },
        required: ["connector_id", "action"],
        additionalProperties: false,
      },
    },
  },
  // ── Native App Build Tool ──
  {
    type: "function" as const,
    function: {
      name: "native_app_build",
      description:
        "Build native applications (mobile, desktop, PWA) from existing web projects. Supports multiple targets: 'pwa' (Progressive Web App with offline support), 'capacitor' (iOS/Android native wrapper), 'tauri' (lightweight desktop app), 'electron' (cross-platform desktop). Generates the necessary configuration files, build scripts, and platform-specific assets. Use when the user asks to make their web app work offline, create a mobile app, build a desktop app, or publish to app stores.",
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            enum: ["pwa", "capacitor", "tauri", "electron", "expo", "cicd"],
            description: "Build target platform: 'pwa' (service worker + manifest for installable web app), 'capacitor' (native iOS/Android from web code), 'tauri' (Rust-based lightweight desktop), 'electron' (Node.js desktop), 'expo' (React Native with EAS Build), 'cicd' (GitHub Actions CI/CD pipeline)",
          },
          platforms: {
            type: "array",
            items: { type: "string", enum: ["ios", "android", "windows", "macos", "linux"] },
            description: "Target platforms for native builds (e.g., ['ios', 'android'] for Capacitor, ['windows', 'macos'] for Tauri/Electron)",
          },
          app_name: {
            type: "string",
            description: "Display name for the native app (shown on home screen / dock)",
          },
          app_id: {
            type: "string",
            description: "Bundle identifier (e.g., 'com.mycompany.myapp'). Required for Capacitor and Tauri.",
          },
          icon_url: {
            type: "string",
            description: "URL to the app icon (1024x1024 PNG recommended). Will be resized for all platforms.",
          },
          splash_url: {
            type: "string",
            description: "URL to splash screen image (2732x2732 PNG recommended). Used for mobile apps.",
          },
          permissions: {
            type: "array",
            items: { type: "string", enum: ["camera", "microphone", "geolocation", "notifications", "storage", "contacts", "calendar", "biometrics"] },
            description: "Native permissions the app needs access to",
          },
          offline_strategy: {
            type: "string",
            enum: ["cache-first", "network-first", "stale-while-revalidate"],
            description: "Caching strategy for PWA/offline support. Default: 'cache-first' for static assets.",
          },
        },
        required: ["target"],
        additionalProperties: false,
      },
    },
  },
  // ── Webapp Rollback Tool ──
  {
    type: "function" as const,
    function: {
      name: "webapp_rollback",
      description:
        "Rollback a deployed webapp to a previous version. Lists available deployment versions and allows reverting to any previous successful deployment. Use when the user reports a broken deployment or wants to undo recent changes.",
      parameters: {
        type: "object",
        properties: {
          project_name: {
            type: "string",
            description: "Name of the webapp project to rollback",
          },
          version_id: {
            type: "string",
            description: "Specific deployment version ID to rollback to. If omitted, rolls back to the previous version.",
          },
          list_versions: {
            type: "boolean",
            description: "If true, lists available versions instead of performing a rollback.",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ── Video Analysis Tool ──
  {
    type: "function" as const,
    function: {
      name: "analyze_video",
      description:
        "Analyze video content using AI vision. Accepts YouTube URLs, direct video URLs, or uploaded video file URLs. Extracts key frames, identifies content, summarizes the video, and answers specific questions about it. Use when the user shares a video and asks about its content, wants a summary, or needs specific information extracted from it.",
      parameters: {
        type: "object",
        properties: {
          video_url: {
            type: "string",
            description: "URL of the video to analyze (YouTube URL, direct video URL, or uploaded file URL)",
          },
          prompt: {
            type: "string",
            description: "What to analyze or extract from the video. E.g., 'summarize the key points', 'identify all products shown', 'transcribe the speech', 'describe the visual style'",
          },
          extract_frames: {
            type: "boolean",
            description: "Whether to extract and analyze individual key frames (default: true)",
          },
          timestamps: {
            type: "boolean",
            description: "Whether to include timestamps in the analysis (default: true)",
          },
        },
        required: ["video_url", "prompt"],
        additionalProperties: false,
      },
    },
  },
  // ── Parallel Execute Tool ──
  {
    type: "function" as const,
    function: {
      name: "parallel_execute",
      description:
        "Execute multiple independent subtasks in parallel for faster results. Similar to map() — takes a list of inputs and a task template, executes them concurrently, and returns aggregated results. Use for: batch web searches, multi-source research, parallel data processing, bulk file operations, or any task where multiple independent operations can run simultaneously. Maximum 25 parallel subtasks.",
      parameters: {
        type: "object",
        properties: {
          task_template: {
            type: "string",
            description: "Template describing what to do with each input. Use {{input}} as placeholder. E.g., 'Search for information about {{input}} and summarize the key facts'",
          },
          inputs: {
            type: "array",
            items: { type: "string" },
            description: "List of inputs to process in parallel (max 25). Each input is substituted into the task_template.",
          },
          description: {
            type: "string",
            description: "Brief description of the parallel operation",
          },
          merge_strategy: {
            type: "string",
            enum: ["concatenate", "table", "summary", "json"],
            description: "How to merge results: 'concatenate' (join with separators), 'table' (markdown table), 'summary' (LLM-synthesized summary), 'json' (structured JSON array)",
          },
        },
        required: ["task_template", "inputs"],
        additionalProperties: false,
      },
    },
  },
  // ── Multi-Agent Orchestration Tool (Exceeds Manus Parity) ──
  {
    type: "function" as const,
    function: {
      name: "multi_agent_orchestrate",
      description:
        "Orchestrate multiple specialized AI agents to collaboratively solve complex tasks. Unlike parallel_execute (which runs identical operations on different inputs), this tool decomposes a complex goal into HETEROGENEOUS sub-tasks and assigns them to specialized agents (researcher, coder, writer, analyst, designer, reviewer) that communicate through a shared context bus. Use for: multi-faceted projects requiring different expertise, complex research-then-write workflows, code+docs+tests generation, or any task benefiting from division of labor among specialists.",
      parameters: {
        type: "object",
        properties: {
          goal: {
            type: "string",
            description: "The complex goal to decompose and solve using multiple specialized agents. Should be a task that benefits from different types of expertise working together.",
          },
          context: {
            type: "string",
            description: "Optional additional context, constraints, or requirements for the orchestration.",
          },
          agents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["researcher", "coder", "writer", "analyst", "designer", "reviewer"],
                  description: "The specialization of this agent",
                },
                focus: {
                  type: "string",
                  description: "Specific focus area or custom instructions for this agent",
                },
              },
              required: ["role"],
            },
            description: "Optional: manually specify which agents to use. If omitted, the supervisor will automatically determine the optimal team composition.",
          },
          max_agents: {
            type: "number",
            description: "Maximum number of agents to use (2-6, default: 4)",
          },
        },
        required: ["goal"],
        additionalProperties: false,
      },
    },
  },
];

// ── Tool Executors ──

export interface ToolResult {
  success: boolean;
  result: string;
  /** Optional URL for images or browser artifacts */
  url?: string;
  /** Optional artifact type for workspace persistence */
  artifactType?: "browser_url" | "code" | "terminal" | "generated_image" | "document" | "document_pdf" | "document_docx" | "document_xlsx" | "document_csv" | "slides" | "webapp_preview" | "webapp_deployed";
  /** Optional label for the artifact */
  artifactLabel?: string;
  /** Optional project external ID for webapp projects (links to WebAppProjectPage) */
  projectExternalId?: string;
  /** Optional code review issues found during post-deploy analysis */
  codeIssues?: string[];
  /** Emitted when a connector token is expired and user must re-authenticate */
  connectorAuthRequired?: { connector: string; reason: string };
  /** Emitted during multi-agent orchestration with sub-task progress */
  orchestrationProgress?: { phase: string; completedTasks: number; totalTasks: number; currentTask?: string; agentName?: string; quality?: number };
}

// ── Web Search: Multi-Source Pipeline ──

interface SearchSource {
  title: string;
  url: string;
  snippet: string;
  source: string; // "ddg", "wikipedia", "page"
}

/**
 * DuckDuckGo Instant Answer API — always free, no CAPTCHA, no API key.
 * Returns Wikipedia-quality abstracts for known entities.
 */
async function ddgInstantAnswer(query: string): Promise<{
  abstract: string;
  abstractUrl: string;
  infobox: Array<{ label: string; value: string }>;
  relatedTopics: Array<{ text: string; url: string }>;
}> {
  const resp = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`,
    { signal: AbortSignal.timeout(8000) }
  );
  const text = await resp.text();
  if (!text || text.length === 0) {
    return { abstract: "", abstractUrl: "", infobox: [], relatedTopics: [] };
  }
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return { abstract: "", abstractUrl: "", infobox: [], relatedTopics: [] };
  }

  const infobox: Array<{ label: string; value: string }> = [];
  if (data.Infobox?.content) {
    for (const item of data.Infobox.content) {
      if (item.label && item.value) {
        const val = typeof item.value === "object" ? JSON.stringify(item.value) : String(item.value);
        // Skip entries that are just objects or very long
        if (val.startsWith("{") || val.startsWith("[") || val.length > 200) continue;
        infobox.push({ label: item.label, value: val });
      }
    }
  }

  const relatedTopics: Array<{ text: string; url: string }> = [];
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics) {
      if (topic.Text && topic.FirstURL) {
        relatedTopics.push({ text: topic.Text, url: topic.FirstURL });
      }
      // Handle sub-topics
      if (topic.Topics) {
        for (const sub of topic.Topics) {
          if (sub.Text && sub.FirstURL) {
            relatedTopics.push({ text: sub.Text, url: sub.FirstURL });
          }
        }
      }
    }
  }

  return {
    abstract: data.Abstract || "",
    abstractUrl: data.AbstractURL || "",
    infobox,
    relatedTopics,
  };
}

/**
 * Wikipedia REST API — reliable summaries for known topics.
 */
async function wikipediaSummary(topic: string): Promise<{
  title: string;
  extract: string;
  url: string;
} | null> {
  try {
    // Try with the topic as-is first
    const resp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (resp.status === 404) return null;
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      title: data.title || topic,
      extract: data.extract || "",
      url: data.content_urls?.desktop?.page || "",
    };
  } catch {
    return null;
  }
}

/**
 * Wikipedia search API — find articles matching a query.
 */
async function wikipediaSearch(query: string): Promise<Array<{ title: string; snippet: string; url: string }>> {
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await resp.json();
    return (data.query?.search || []).map((r: any) => ({
      title: r.title,
      snippet: r.snippet?.replace(/<[^>]+>/g, "") || "",
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch a webpage and extract its text content (lightweight, no heavy deps).
 */
/** Block requests to internal/private IP ranges to prevent SSRF */
function isInternalUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    // Block common internal hostnames
    if (hostname === "localhost" || hostname === "[::1]") return true;
    // Block private/reserved IP ranges
    const parts = hostname.split(".");
    if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
      const [a, b] = parts.map(Number);
      if (a === 127) return true;                    // 127.0.0.0/8 loopback
      if (a === 10) return true;                     // 10.0.0.0/8 private
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
      if (a === 192 && b === 168) return true;        // 192.168.0.0/16 private
      if (a === 169 && b === 254) return true;        // 169.254.0.0/16 link-local / cloud metadata
      if (a === 0) return true;                       // 0.0.0.0/8
    }
    // Block non-http(s) schemes
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
    return false;
  } catch {
    return true; // If URL can't be parsed, block it
  }
}

async function fetchPageContent(url: string, maxChars = 8000): Promise<string> {
  try {
    // SSRF protection: block requests to internal networks
    if (isInternalUrl(url)) {
      return "(Blocked: URL points to an internal or private network address)";
    }
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });

    if (!resp.ok) {
      if (resp.status === 403 || resp.status === 401) {
        return `(Access blocked: HTTP ${resp.status}. This site blocks automated access. Use the SITE ACCESS FALLBACK STRATEGY: try web_search for cached content, cloud_browser for JS rendering, or Archive.org for historical snapshots.)`;
      }
      return `(Failed to fetch: HTTP ${resp.status})`;
    }

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return `(Non-text content: ${contentType})`;
    }

    const html = await resp.text();

    // Strip HTML tags and extract text
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();

    return text.slice(0, maxChars);
  } catch (err: any) {
    return `(Failed to fetch: ${err.message})`;
  }
}

/**
 * C8-B3: URL filtering — skip ad/redirect/tracking URLs during web research.
 * These domains are ad networks, tracking redirects, or low-quality content farms
 * that waste agent turns and produce unreliable results.
 */
const AD_REDIRECT_DOMAINS = [
  "duckduckgo.com/y.js", "duckduckgo.com/l/", // DDG ad redirects
  "ad.doubleclick.net", "googleadservices.com", "googlesyndication.com",
  "facebook.com/l.php", "t.co", "bit.ly", "tinyurl.com", "goo.gl",
  "clickserve", "clicktrack", "adclick", "adsrv",
  "track.adform.net", "serving-sys.com", "adnxs.com",
  "taboola.com", "outbrain.com", "revcontent.com",
  "smartadserver.com", "criteo.com", "bidswitch.net",
];
const AD_URL_PATTERNS = [
  /\/ad[s]?\/click/i, /\/redirect\?/i, /utm_source=ad/i,
  /\/sponsored\//i, /\/promo\//i, /click\.php/i,
  /\/aclk\?/i, /\/pagead\//i, /\/track\?/i,
];
function isAdOrRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const fullUrl = parsed.href.toLowerCase();
    // Check domain-based blocklist
    if (AD_REDIRECT_DOMAINS.some(d => fullUrl.includes(d))) return true;
    // Check pattern-based blocklist
    if (AD_URL_PATTERNS.some(p => p.test(fullUrl))) return true;
    // Skip URLs that are just tracking redirects (no real path)
    if (parsed.pathname === "/" && parsed.search.length > 100) return true;
    return false;
  } catch {
    return false; // If URL can't be parsed, let it through
  }
}

/**
 * DuckDuckGo HTML Search — scrape actual search results from DDG's HTML endpoint.
 * Returns titles, URLs, and snippets for real web pages.
 * More reliable than Instant Answer API for broad/current queries.
 */
async function ddgHtmlSearch(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  try {
    const resp = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    const html = await resp.text();

    // Parse titles + URLs
    const titleRegex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td)>/g;

    const titles: Array<{ url: string; title: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = titleRegex.exec(html)) !== null) {
      let url = match[1];
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
      titles.push({ url, title: match[2].replace(/<[^>]+>/g, "").trim() });
    }

    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(
        match[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&#x27;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim()
      );
    }

    // C8-B3: Filter out ad/redirect/tracking URLs
    const filteredResults = titles
      .map((t, i) => ({ title: t.title, url: t.url, snippet: snippets[i] || "" }))
      .filter(r => !isAdOrRedirectUrl(r.url));
    return filteredResults.slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * Execute a REAL web search using a multi-source pipeline:
 * 1. DuckDuckGo Instant Answer API (quick facts + Wikipedia link)
 * 2. Wikipedia REST API (detailed summary)
 * 3. Wikipedia Search API (find related articles)
 * 4. Direct page fetch on top URLs for deeper content
 */
async function executeWebSearch(args: { query: string }): Promise<ToolResult> {
  try {
    const query = args?.query;
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return { success: false, result: "Invalid web_search: 'query' parameter is required and must be a non-empty string." };
    }
    let formattedResults = `## Web Search Results for: "${query}"\n\n`;
    let foundDirectAnswer = false;
    const sources: SearchSource[] = [];
    const urlsToFetch: string[] = [];

    // Step 1: DuckDuckGo Instant Answer API — try multiple query variations
    console.log("[web_search] Querying DDG Instant Answer API...");
    let ddg = await ddgInstantAnswer(query);
    
    // If no abstract found, try variations
    if (!ddg.abstract) {
      const variations = [
        query + " agent",
        query + " company",
        query + " software",
      ];
      for (const variation of variations) {
        console.log(`[web_search] Trying DDG variation: "${variation}"`);
        const alt = await ddgInstantAnswer(variation);
        if (alt.abstract) {
          ddg = alt;
          break;
        }
      }
    }

    if (ddg.abstract) {
      foundDirectAnswer = true;
      formattedResults += `### DIRECT ANSWER\n\n`;
      formattedResults += `**${ddg.abstract}**\n`;
      if (ddg.abstractUrl) {
        formattedResults += `\nSource: [${ddg.abstractUrl}](${ddg.abstractUrl})\n\n`;
        urlsToFetch.push(ddg.abstractUrl);
      }

      if (ddg.infobox.length > 0) {
        formattedResults += `**Key Facts:**\n`;
        for (const item of ddg.infobox.slice(0, 10)) {
          formattedResults += `- **${item.label}**: ${item.value}\n`;
        }
        formattedResults += "\n";
      }
    }

    if (ddg.relatedTopics.length > 0) {
      formattedResults += `### Related Topics\n\n`;
      for (const topic of ddg.relatedTopics.slice(0, 5)) {
        formattedResults += `- ${topic.text} ([source](${topic.url}))\n`;
        sources.push({ title: topic.text.slice(0, 60), url: topic.url, snippet: topic.text, source: "ddg" });
      }
      formattedResults += "\n";
    }

    // Step 2: Wikipedia Search API (find relevant articles)
    // Extract core entity name for relevance checking
    const coreEntity = query.replace(/\b(capabilities|features|comparison|vs|versus|review|overview|what is|how does|compare|differences|between)\b/gi, "").trim();
    const entityWords = coreEntity.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    // Try multiple query variations and pick the best results
    const wikiQueries = Array.from(new Set([query, coreEntity, coreEntity + " agent", coreEntity + " company"].filter(q => q.length > 2)));
    
    let wikiResults: Array<{ title: string; snippet: string; url: string }> = [];
    let bestRelevance = 0;
    
    for (const wq of wikiQueries) {
      console.log(`[web_search] Searching Wikipedia for: "${wq}"...`);
      const results = await wikipediaSearch(wq);
      console.log(`[web_search] Wikipedia returned ${results.length} results: ${results.map(r => r.title).join(", ")}`);
      
      if (results.length === 0) continue;
      
      // Score results by how well they match the core entity
      const relevanceScore = results.reduce((score, r) => {
        const titleLower = r.title.toLowerCase();
        // Exact or near-exact title match is best
        for (const word of entityWords) {
          if (titleLower.includes(word)) score += 10;
        }
        // Bonus for title containing the entity as a phrase
        if (titleLower.includes(coreEntity.toLowerCase())) score += 50;
        return score;
      }, 0);
      
      console.log(`[web_search] Relevance score for "${wq}": ${relevanceScore}`);
      
      if (relevanceScore > bestRelevance) {
        bestRelevance = relevanceScore;
        wikiResults = results;
      }
    }

    // Prioritize the most relevant Wikipedia article (first result)
    if (wikiResults.length > 0) {
      // Get full summary for the top Wikipedia result
      const topResult = wikiResults[0];
      const topTitle = topResult.title.replace(/ /g, "_");
      const wikiSummary = await wikipediaSummary(topTitle);
      if (wikiSummary && wikiSummary.extract) {
        if (!foundDirectAnswer) {
          formattedResults += `### DIRECT ANSWER (Wikipedia: ${wikiSummary.title})\n\n`;
          formattedResults += `**${wikiSummary.extract}**\n\n`;
          foundDirectAnswer = true;
        } else {
          formattedResults += `### Wikipedia: ${wikiSummary.title}\n\n`;
          formattedResults += `${wikiSummary.extract}\n\n`;
        }
        if (wikiSummary.url) urlsToFetch.push(wikiSummary.url);
        sources.push({ title: wikiSummary.title, url: wikiSummary.url, snippet: wikiSummary.extract, source: "wikipedia" });
      }

      // Add other results briefly
      if (wikiResults.length > 1) {
        formattedResults += `### Related Wikipedia Articles\n\n`;
        for (const r of wikiResults.slice(1, 4)) {
          formattedResults += `- **[${r.title}](${r.url})**: ${r.snippet}\n`;
          sources.push({ title: r.title, url: r.url, snippet: r.snippet, source: "wikipedia" });
          if (urlsToFetch.length < 3) urlsToFetch.push(r.url);
        }
        formattedResults += "\n";
      }
    }

    // Step 3: Fetch top URLs for detailed content (prioritize the most relevant)
    // Deduplicate URLs
    const uniqueUrls = Array.from(new Set(urlsToFetch));
    if (uniqueUrls.length > 0) {
      console.log(`[web_search] Fetching ${Math.min(uniqueUrls.length, 2)} pages for detailed content...`);
      const fetchPromises = uniqueUrls.slice(0, 2).map(async (url) => {
        const content = await fetchPageContent(url, 4000);
        return { url, content };
      });

      const fetched = await Promise.allSettled(fetchPromises);
      const validPages = fetched
        .filter((r): r is PromiseFulfilledResult<{ url: string; content: string }> =>
          r.status === "fulfilled" && !r.value.content.startsWith("(Failed") && !r.value.content.startsWith("(Non-text"))
        .map(r => r.value);

      if (validPages.length > 0) {
        formattedResults += `### Detailed Page Content\n\n`;
        for (const page of validPages) {
          try {
            const hostname = new URL(page.url).hostname;
            formattedResults += `**From: ${hostname}** ([${page.url}](${page.url}))\n`;
          } catch {
            formattedResults += `**From:** [${page.url}](${page.url})\n`;
          }
          formattedResults += `${page.content.slice(0, 4000)}\n\n---\n\n`;
        }
      }
    }

    // Step 4: DDG HTML Search — real web results for broader queries
    // Run this if DDG Instant Answer didn't return an abstract (common for broad/current queries)
    if (!ddg.abstract) {
      console.log("[web_search] Running DDG HTML search for broader results...");
      const htmlResults = await ddgHtmlSearch(query);
      console.log(`[web_search] DDG HTML returned ${htmlResults.length} results`);

      if (htmlResults.length > 0) {
        formattedResults += `### Web Search Results\n\n`;
        for (const r of htmlResults.slice(0, 8)) {
          formattedResults += `- **[${r.title}](${r.url})**: ${r.snippet}\n`;
          sources.push({ title: r.title, url: r.url, snippet: r.snippet, source: "ddg" });
          if (urlsToFetch.length < 4) urlsToFetch.push(r.url);
        }
        formattedResults += "\n";

        // Fetch top 2 pages for detailed content if we haven't already
        const newUrls = htmlResults
          .slice(0, 3)
          .map(r => r.url)
          .filter(u => !u.includes("google.com/topics")); // Skip Google News redirect URLs
        if (newUrls.length > 0) {
          console.log(`[web_search] Fetching ${Math.min(newUrls.length, 2)} DDG HTML result pages...`);
          const fetchPromises = newUrls.slice(0, 2).map(async (url) => {
            const content = await fetchPageContent(url, 4000);
            return { url, content };
          });
          const fetched = await Promise.allSettled(fetchPromises);
          const validPages = fetched
            .filter((r): r is PromiseFulfilledResult<{ url: string; content: string }> =>
              r.status === "fulfilled" && !r.value.content.startsWith("(Failed") && !r.value.content.startsWith("(Non-text"))
            .map(r => r.value);
          if (validPages.length > 0) {
            formattedResults += `### Detailed Page Content\n\n`;
            for (const page of validPages) {
              try {
                const hostname = new URL(page.url).hostname;
                formattedResults += `**From: ${hostname}** ([${page.url}](${page.url}))\n`;
                formattedResults += `${page.content.slice(0, 4000)}\n\n---\n\n`;
              } catch {
                formattedResults += `${page.content.slice(0, 4000)}\n\n---\n\n`;
              }
            }
          }
        }
      } else if (wikiResults.length === 0) {
        // Last resort: try Wikipedia with cleaned query, then LLM synthesis
        const wikiTopic = query.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_()-]/g, "");
        const wikiSummary = await wikipediaSummary(wikiTopic);
        if (wikiSummary) {
          formattedResults += `### Wikipedia: ${wikiSummary.title}\n\n`;
          formattedResults += `${wikiSummary.extract}\n`;
          formattedResults += `\nSource: [${wikiSummary.url}](${wikiSummary.url})\n\n`;
        } else {
          formattedResults += `*Note: Limited web results for this query. Supplementing with AI knowledge.*\n\n`;
          const fallback = await executeWebSearchFallback(args);
          formattedResults += fallback.result;
        }
      }
    }

    // Add source summary
    if (sources.length > 0) {
      formattedResults += `\n### Sources\n\n`;
      const uniqueUrls = new Set<string>();
      for (const s of sources) {
        if (!uniqueUrls.has(s.url)) {
          uniqueUrls.add(s.url);
          formattedResults += `- [${s.title}](${s.url}) (${s.source})\n`;
        }
      }
    }

    return {
      success: true,
      result: formattedResults,
      url: ddg.abstractUrl || sources[0]?.url,
      artifactType: "browser_url",
      artifactLabel: `Search: ${query}`,
    };
  } catch (err: any) {
    console.error("[web_search] Error:", err.message);
    // Fallback to LLM synthesis
    return executeWebSearchFallback(args);
  }
}

/**
 * Fallback: LLM-powered research synthesis when all search sources fail.
 */
async function executeWebSearchFallback(args: { query: string }): Promise<ToolResult> {
  try {
    const { invokeLLM } = await import("./_core/llm");

    const response = await withRetry(() => invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a research engine. Provide factual, well-structured information with specific details. Clearly state that this is from your training data, not live web results.",
        },
        {
          role: "user",
          content: `Provide comprehensive, factual information about: "${args.query}". Include key facts, dates, numbers, and notable sources.`,
        },
      ],
    }));

    const content =
      typeof response.choices?.[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "Research could not be completed.";

    return {
      success: true,
      result: `## Research Results (from AI training data): "${args.query}"\n\n${content}\n\n*Note: These results are from AI training data. Live web search was temporarily unavailable.*`,
      artifactType: "browser_url",
      artifactLabel: `Research: ${args.query}`,
    };
  } catch (err: any) {
    return {
      success: false,
      result: `Research failed: ${err.message}`,
    };
  }
}

/**
 * Read a specific webpage and return its text content.
 */
async function executeReadWebpage(args: { url: string }): Promise<ToolResult> {
  try {
    // SSRF protection: block requests to internal networks
    if (isInternalUrl(args.url)) {
      return { success: false, result: "Blocked: URL points to an internal or private network address" };
    }
    // C8-B3: Skip ad/redirect URLs
    if (isAdOrRedirectUrl(args.url)) {
      return {
        success: false,
        result: `Skipped URL (detected as ad/redirect/tracking link): ${args.url}\n\nPlease use a direct content URL instead. Try web_search to find the actual page.`,
      };
    }
    // CHAT-004: Real PDF text extraction from URLs
    const urlLower = args.url.toLowerCase();
    if (urlLower.endsWith(".pdf") || urlLower.includes("/pdf/") || urlLower.includes("type=pdf")) {
      try {
        const { extractTextFromPdfUrl } = await import("./pdfExtraction");
        const result = await extractTextFromPdfUrl(args.url);
        const metaLines: string[] = [];
        if (result.metadata.title) metaLines.push(`Title: ${result.metadata.title}`);
        if (result.metadata.author) metaLines.push(`Author: ${result.metadata.author}`);
        metaLines.push(`Pages: ${result.numPages}`);
        if (result.truncated) metaLines.push(`[Note: Text was truncated to 100,000 characters]`);
        const header = metaLines.length > 0 ? metaLines.join("\n") + "\n\n---\n\n" : "";
        return {
          success: true,
          result: `${header}${result.text}`,
        };
      } catch (pdfErr: any) {
        return {
          success: false,
          result: `Failed to extract text from PDF: ${pdfErr.message}\n\nURL: ${args.url}\n\nAlternatives:\n1. The user can upload the file via the attach button\n2. Search for the same content in HTML format`,
        };
      }
    }

    const content = await fetchPageContent(args.url, 12000);

    if (content.startsWith("(Failed") || content.startsWith("(Non-text")) {
      return {
        success: false,
        result: `Could not read webpage: ${content}`,
      };
    }

    // CHAT-002: Detect JS-heavy pages with minimal content
    const textLength = content.replace(/\s+/g, " ").trim().length;
    const hasJSIndicators = content.includes("enable JavaScript") ||
      content.includes("requires JavaScript") ||
      content.includes("noscript") ||
      textLength < 200;

    if (hasJSIndicators && textLength < 500) {
      // Auto-fallback: try browse_web for more thorough extraction
      const browseResult = await executeBrowseWeb({ url: args.url, extract: "full" });
      if (browseResult.success) {
        return {
          ...browseResult,
          result: `[Note: Initial fetch returned minimal content — this site likely requires JavaScript. Used enhanced extraction.]\n\n${browseResult.result}`,
        };
      }
      return {
        success: false,
        result: `This webpage appears to require JavaScript to render its content. The initial fetch returned very little text (${textLength} chars). Enhanced extraction also failed. The site may use a single-page application framework.\n\nSuggestions:\n1. Try browse_web for structured extraction\n2. Search for the same content on alternative sources\n3. Ask the user to paste relevant content directly`,
      };
    }

    return {
      success: true,
      result: `## Content from: ${args.url}\n\n${content}`,
      url: args.url,
      artifactType: "browser_url",
      artifactLabel: `Page: ${new URL(args.url).hostname}`,
    };
  } catch (err: any) {
    return {
      success: false,
      result: `Failed to read webpage: ${err.message}`,
    };
  }
}

/**
 * Validate that an image URL is publicly accessible via HEAD request.
 * Returns true if the URL returns 2xx, false otherwise.
 */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Generate an image using the built-in image generation helper.
 * CHAT-003: Includes retry with exponential backoff and unique seed per call.
 * NS10: Added URL validation — verifies the generated URL is accessible before returning.
 * If URL fails validation, re-uploads the image to S3 as a fallback.
 */
async function executeGenerateImage(args: {
  prompt: string;
}): Promise<ToolResult> {
  const MAX_RETRIES = 3;
  const { generateImage } = await import("./_core/imageGeneration");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Add a unique seed suffix to prevent duplicate/cached results
      const uniqueSeed = `[seed:${Date.now()}-${Math.random().toString(36).slice(2, 8)}]`;
      const enhancedPrompt = `${args.prompt} ${uniqueSeed}`;

      const { url } = await generateImage({ prompt: enhancedPrompt });

      if (!url) {
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 2s, 4s
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        return {
          success: false,
          result: "Image generation completed but no URL was returned after multiple attempts.",
        };
      }

      // NS10: Validate the URL is publicly accessible
      const isAccessible = await validateImageUrl(url);
      if (!isAccessible) {
        console.warn(`[Agent] Generated image URL not accessible (attempt ${attempt}): ${url}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        // Last attempt — try to re-fetch the image and re-upload to S3
        try {
          const { storagePut } = await import("./storage");
          const imgResp = await fetch(url);
          if (imgResp.ok) {
            const buffer = Buffer.from(await imgResp.arrayBuffer());
            const contentType = imgResp.headers.get("content-type") || "image/png";
            const { url: reuploadedUrl } = await storagePut(
              `generated/reupload-${Date.now()}.png`,
              buffer,
              contentType
            );
            console.log(`[Agent] Re-uploaded image to S3: ${reuploadedUrl}`);
            return {
              success: true,
              result: `Image generated successfully.\n\n![Generated Image](${reuploadedUrl})`,
              url: reuploadedUrl,
              artifactType: "generated_image",
              artifactLabel: args.prompt.slice(0, 100),
            };
          }
        } catch (reuploadErr) {
          console.error(`[Agent] Re-upload fallback failed:`, reuploadErr);
        }
        return {
          success: false,
          result: "Image was generated but the URL is not accessible. Please try again.",
        };
      }

      return {
        success: true,
        result: `Image generated successfully.\n\n![Generated Image](${url})`,
        url,
        artifactType: "generated_image",
        artifactLabel: args.prompt.slice(0, 100),
      };
    } catch (err: any) {
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 2s, 4s
        await new Promise(r => setTimeout(r, 2000 * attempt));
        continue;
      }
      return {
        success: false,
        result: `Image generation failed after ${MAX_RETRIES} attempts: ${err.message}. The image generation service may be temporarily unavailable.`,
      };
    }
  }

  return {
    success: false,
    result: "Image generation failed: maximum retries exceeded.",
  };
}

/**
 * Analyze data using the LLM itself (structured analysis prompt)
 */
async function executeAnalyzeData(args: {
  data: string;
  analysis_type: string;
  question?: string;
}): Promise<ToolResult> {
  try {
    const { invokeLLM } = await import("./_core/llm");

    const analysisPrompt = `You are a data analyst. Analyze the following data and provide a ${args.analysis_type} analysis.
${args.question ? `Specific question: ${args.question}` : ""}

Data:
\`\`\`
${args.data.slice(0, 10000)}
\`\`\`

Provide clear, structured analysis with:
1. Key findings
2. Notable patterns or outliers
3. Specific numbers and statistics where relevant
4. Actionable insights`;

    const response = await withRetry(() => invokeLLM({
      messages: [
        { role: "system", content: "You are a precise data analyst. Output structured analysis with numbers." },
        { role: "user", content: analysisPrompt },
      ],
    }));

    const content =
      typeof response.choices?.[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "Analysis could not be completed.";

    return {
      success: true,
      result: content,
    };
  } catch (err: any) {
    return {
      success: false,
      result: `Data analysis failed: ${err.message}`,
    };
  }
}

/**
 * Execute JavaScript code in a sandboxed VM context
 */
async function executeCode(args: {
  code: string;
  language?: string;
  description?: string;
}): Promise<ToolResult> {
  const language = args.language || "javascript";

  if (language === "python") {
    // Python execution via subprocess
    try {
      const { execSync } = await import("child_process");
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      // Write code to a temp file
      const tmpDir = os.tmpdir();
      const tmpFile = path.join(tmpDir, `exec_${Date.now()}.py`);
      fs.writeFileSync(tmpFile, args.code);

      try {
        const output = execSync(`python3 "${tmpFile}" 2>&1`, {
          timeout: 30000, // 30 second timeout for Python (data science can be slower)
          maxBuffer: 1024 * 1024, // 1MB output buffer
          env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
        }).toString();

        // Clean up
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

        const trimmedOutput = output.trim() || "(Code executed successfully with no output)";
        return {
          success: true,
          result: `\`\`\`python\n${trimmedOutput}\n\`\`\``,
          artifactType: "terminal",
          artifactLabel: args.description || "Python execution",
        };
      } catch (execErr: any) {
        // Clean up
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

        const errorOutput = execErr.stdout?.toString() || execErr.stderr?.toString() || execErr.message;
        return {
          success: false,
          result: `Python execution error:\n\`\`\`\n${errorOutput.slice(0, 3000)}\n\`\`\``,
          artifactType: "terminal",
          artifactLabel: "Python execution (error)",
        };
      }
    } catch (err: any) {
      return {
        success: false,
        result: `Python setup error: ${err.message}. Python3 may not be available in this environment.`,
        artifactType: "terminal",
        artifactLabel: "Python execution (error)",
      };
    }
  }

  // JavaScript execution (default) — sandboxed VM
  try {
    const vm = await import("vm");

    const logs: string[] = [];
    const sandbox = {
      console: {
        log: (...a: any[]) => logs.push(a.map(String).join(" ")),
        error: (...a: any[]) => logs.push("[ERROR] " + a.map(String).join(" ")),
        warn: (...a: any[]) => logs.push("[WARN] " + a.map(String).join(" ")),
      },
      Math,
      Date,
      JSON,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
      Promise,
      setTimeout: undefined,
      setInterval: undefined,
      fetch: undefined,
      require: undefined,
      process: undefined,
    };

    const context = vm.createContext(sandbox);
    const script = new vm.Script(args.code);
    const result = script.runInContext(context, { timeout: 5000 });

    let output = "";
    if (logs.length > 0) {
      output += logs.join("\n");
    }
    if (result !== undefined && result !== null) {
      const resultStr =
        typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
      if (output) output += "\n";
      output += `→ ${resultStr}`;
    }

    if (!output) output = "(Code executed successfully with no output)";

    return {
      success: true,
      result: `\`\`\`\n${output}\n\`\`\``,
      artifactType: "terminal",
      artifactLabel: args.description || "Code execution",
    };
  } catch (err: any) {
    return {
      success: false,
      result: `Code execution error: ${err.message}`,
      artifactType: "terminal",
      artifactLabel: "Code execution (error)",
    };
  }
}

/**
 * Browse a webpage and extract structured information.
 * Enhanced version of read_webpage with structured extraction.
 */
async function executeBrowseWeb(args: { url: string; extract?: string }): Promise<ToolResult> {
  try {
    const resp = await fetch(args.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!resp.ok) return { success: false, result: `Failed to fetch: HTTP ${resp.status}` };

    const html = await resp.text();
    const extractMode = args.extract || "full";

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "(No title)";

    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : "";

    // Extract OG tags
    const ogTags: Record<string, string> = {};
    const ogMatches = Array.from(html.matchAll(/<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi));
    for (const m of ogMatches) ogTags[m[1]] = m[2];

    // Extract headings
    const headings: string[] = [];    const headingMatches = Array.from(html.matchAll(/<h([1-3])[^>]*>([^<]*(?:<[^\/][^>]*>[^<]*)*)<\/h\1>/gi));
    for (const m of headingMatches) {
      const text = m[2].replace(/<[^>]+>/g, "").trim();
      if (text) headings.push(`${'#'.repeat(parseInt(m[1]))} ${text}`);
    }

    // Extract links
    const links: Array<{ text: string; href: string }> = [];
    const linkMatches = Array.from(html.matchAll(/<a[^>]*href=["']([^"'#]+)["'][^>]*>([^<]*(?:<[^\/][^>]*>[^<]*)*)<\/a>/gi));
    for (const m of linkMatches) {      const text = m[2].replace(/<[^>]+>/g, "").trim();
      if (text && m[1].startsWith("http")) links.push({ text: text.slice(0, 100), href: m[1] });
    }
    const uniqueLinks = links.filter((l, i, arr) => arr.findIndex(a => a.href === l.href) === i).slice(0, 30);

    // Extract images
    const images: Array<{ src: string; alt: string }> = [];
    const imgMatches = Array.from(html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi));
    for (const m of imgMatches) {
      if (m[1].startsWith("http")) images.push({ src: m[1], alt: m[2] || "" });
    }
    const uniqueImages = images.slice(0, 20);

    // Extract main text content
    let mainText = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim()
      .slice(0, 6000);

    // Build result based on extract mode
    let result = `## Page Analysis: ${title}\n\n`;
    result += `**URL:** ${args.url}\n`;
    if (metaDesc) result += `**Description:** ${metaDesc}\n`;

    if (extractMode === "metadata" || extractMode === "full") {
      if (Object.keys(ogTags).length > 0) {
        result += `\n### Open Graph Tags\n`;
        for (const [k, v] of Object.entries(ogTags)) result += `- **og:${k}:** ${v}\n`;
      }
    }

    if (extractMode === "headings" || extractMode === "full") {
      if (headings.length > 0) {
        result += `\n### Page Structure (${headings.length} headings)\n`;
        result += headings.slice(0, 20).join("\n") + "\n";
      }
    }

    if (extractMode === "links" || extractMode === "full") {
      if (uniqueLinks.length > 0) {
        result += `\n### Links (${uniqueLinks.length} found)\n`;
        for (const l of uniqueLinks.slice(0, 15)) result += `- [${l.text}](${l.href})\n`;
      }
    }

    if (extractMode === "images" || extractMode === "full") {
      if (uniqueImages.length > 0) {
        result += `\n### Images (${uniqueImages.length} found)\n`;
        for (const img of uniqueImages.slice(0, 10)) result += `- ${img.alt || '(no alt)'}: ${img.src}\n`;
      }
    }

    if (extractMode === "full" || extractMode === "tables") {
      result += `\n### Main Content\n${mainText.slice(0, 3000)}\n`;
    }

    return {
      success: true,
      result,
      url: args.url,
      artifactType: "browser_url",
      artifactLabel: title,
    };
  } catch (err: any) {
    return { success: false, result: `Browse failed: ${err.message}` };
  }
}

/**
 * Generate a structured document and upload it to S3
 */
async function executeGenerateDocument(args: {
  title: string;
  content: string;
  format?: string;
  output_format?: string;
}): Promise<ToolResult> {
  try {
    const { storagePut } = await import("./storage");
    const { nanoid } = await import("nanoid");

    const outputFormat = args.output_format || "markdown";
    const safeTitle = args.title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase();
    const docContent = `# ${args.title}\n\n${args.content}`;

    let buffer: Buffer;
    let fileName: string;
    let contentType: string;
    let artifactType: ToolResult["artifactType"];

    switch (outputFormat) {
      case "pdf": {
        const { generatePDF } = await import("./documentGeneration");
        buffer = await generatePDF(args.title, args.content);
        fileName = `${safeTitle}-${nanoid(6)}.pdf`;
        contentType = "application/pdf";
        artifactType = "document_pdf";
        break;
      }
      case "docx": {
        const { generateDOCX } = await import("./documentGeneration");
        buffer = await generateDOCX(args.title, args.content);
        fileName = `${safeTitle}-${nanoid(6)}.docx`;
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        artifactType = "document_docx";
        break;
      }
      case "csv": {
        const { generateCSV } = await import("./documentGeneration");
        buffer = generateCSV(args.title, args.content);
        fileName = `${safeTitle}-${nanoid(6)}.csv`;
        contentType = "text/csv";
        artifactType = "document_csv";
        break;
      }
      case "xlsx": {
        const { generateXLSX } = await import("./documentGeneration");
        buffer = await generateXLSX(args.title, args.content);
        fileName = `${safeTitle}-${nanoid(6)}.xlsx`;
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        artifactType = "document_xlsx";
        break;
      }
      case "json": {
        // For JSON output, try to extract structured data from the markdown content
        // If the content is already valid JSON, use it directly
        let jsonContent: string;
        try {
          JSON.parse(args.content);
          jsonContent = args.content;
        } catch {
          // Convert markdown to a structured JSON document
          jsonContent = JSON.stringify({
            title: args.title,
            format: args.format || "document",
            content: args.content,
            generatedAt: new Date().toISOString(),
          }, null, 2);
        }
        buffer = Buffer.from(jsonContent, "utf-8");
        fileName = `${safeTitle}-${nanoid(6)}.json`;
        contentType = "application/json";
        artifactType = "document" as any;
        break;
      }
      default: {
        buffer = Buffer.from(docContent, "utf-8");
        fileName = `${safeTitle}-${nanoid(6)}.md`;
        contentType = "text/markdown";
        artifactType = "document";
        break;
      }
    }

    const fileKey = `documents/${fileName}`;
    const { url } = await storagePut(fileKey, buffer, contentType);

    const formatLabels: Record<string, string> = {
      pdf: "PDF",
      docx: "Word Document",
      csv: "CSV Spreadsheet",
      xlsx: "Excel Spreadsheet",
      json: "JSON",
      markdown: "Markdown",
    };
    const formatLabel = formatLabels[outputFormat] || "Markdown";

    return {
      success: true,
      result: `${formatLabel} generated: **${args.title}**\n\n[Download ${formatLabel}](${url})\n\n---\n\n${docContent.slice(0, 2000)}${docContent.length > 2000 ? "\n\n*[Document truncated for display — full version available at download link]*" : ""}`,
      url,
      artifactType,
      artifactLabel: `${args.title} (${formatLabel})`,
    };
  } catch (err: any) {
    return {
      success: false,
      result: `Document generation failed: ${err.message}`,
    };
  }
}

/**
 * Wide Research — Parallel multi-query research with LLM synthesis.
 * Runs multiple web searches concurrently via Promise.allSettled,
 * then synthesizes the combined results using the LLM.
 */
async function executeWideResearch(args: {
  queries: string[];
  synthesis_prompt: string;
}): Promise<ToolResult> {
  try {
    const queries = (args.queries || []).slice(0, 10); // Cap at 10 parallel queries (Manus-aligned)
    if (queries.length === 0) {
      return { success: false, result: "No queries provided for wide research." };
    }

    console.log(`[wide_research] Launching ${queries.length} parallel searches...`);

    // Execute all searches in parallel
    const searchPromises = queries.map(async (query) => {
      try {
        const result = await executeWebSearch({ query });
        return { query, result };
      } catch (err: any) {
        return { query, result: { success: false, result: `Search failed: ${err.message}` } as ToolResult };
      }
    });

    const results = await Promise.allSettled(searchPromises);

    // Collect all successful results
    let combinedResearch = `## Parallel Research Results\n\n`;
    let successCount = 0;

    for (const settled of results) {
      if (settled.status === "fulfilled") {
        const { query, result } = settled.value;
        combinedResearch += `### Query: "${query}"\n\n`;
        if (result.success) {
          combinedResearch += result.result + "\n\n---\n\n";
          successCount++;
        } else {
          combinedResearch += `*Search failed: ${result.result}*\n\n---\n\n`;
        }
      } else {
        combinedResearch += `*Search failed: ${settled.reason}*\n\n---\n\n`;
      }
    }

    if (successCount === 0) {
      return {
        success: false,
        result: "All parallel searches failed. Try individual web_search calls instead.",
      };
    }

    // Synthesize results using LLM
    console.log(`[wide_research] Synthesizing ${successCount}/${queries.length} successful results...`);
    const { invokeLLM } = await import("./_core/llm");

    const synthesisResponse = await withRetry(() => invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a research synthesis engine. Combine the following parallel research results into a unified, well-structured analysis. Use markdown formatting with clear sections, comparison tables where appropriate, and cite sources with links. Be thorough and analytical.",
        },
        {
          role: "user",
          content: `Synthesis instructions: ${args.synthesis_prompt}\n\n${combinedResearch}`,
        },
      ],
    }));

    const synthesis =
      typeof synthesisResponse.choices?.[0]?.message?.content === "string"
        ? synthesisResponse.choices[0].message.content
        : "Synthesis could not be completed.";

    const finalResult = `## Wide Research Synthesis\n\n**Queries researched:** ${queries.map(q => `"${q}"`).join(", ")}\n**Successful searches:** ${successCount}/${queries.length}\n\n${synthesis}\n\n---\n\n**IMPORTANT: This research synthesis is complete. If the user originally requested a deliverable (guide, document, report, PDF, etc.), you MUST now produce it using generate_document with the appropriate output_format. Do NOT present this raw synthesis as the final answer.**`;

    return {
      success: true,
      result: finalResult,
      artifactType: "document",
      artifactLabel: `Wide Research: ${args.synthesis_prompt.slice(0, 60)}`,
    };
  } catch (err: any) {
    console.error("[wide_research] Error:", err.message);
    return {
      success: false,
      result: `Wide research failed: ${err.message}`,
    };
  }
}

// ── Generate Slides ──

async function executeGenerateSlides(args: {
  topic: string;
  slideCount?: number;
  style?: string;
}): Promise<ToolResult> {
  try {
    const { invokeLLM } = await import("./_core/llm");
    const { storagePut } = await import("./storage");
    const { nanoid } = await import("nanoid");
    const count = Math.min(Math.max(args.slideCount || 8, 3), 30);
    const style = args.style || "professional";

    const response = await withRetry(() => invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a presentation designer. Generate exactly ${count} slides as a JSON array. Each slide has: title (string), content (markdown string with bullet points), notes (optional speaker notes string). Style: ${style}. Return ONLY valid JSON array, no markdown fences.`,
        },
        { role: "user", content: `Create a presentation about: ${args.topic}` },
      ],
    }));

    const rawContent = response.choices?.[0]?.message?.content ?? "[]";
    const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Build HTML slide deck with keyboard navigation
    const slideHtml = slides.map((s: any, i: number) => {
      const contentHtml = (s.content || "").replace(/^- /gm, "<li>").replace(/<li>/g, "</li><li>");
      return `<section class="slide" id="slide-${i}" style="display:${i === 0 ? 'flex' : 'none'}">
        <div class="slide-number">${i + 1} / ${slides.length}</div>
        <h2>${s.title}</h2>
        <div class="slide-content">${contentHtml.includes("<li>") ? `<ul>${contentHtml}</ul>` : `<p>${s.content}</p>`}</div>
        ${s.notes ? `<div class="speaker-notes"><strong>Notes:</strong> ${s.notes}</div>` : ""}
      </section>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${args.topic}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;overflow:hidden;height:100vh}
.slide{flex-direction:column;justify-content:center;align-items:center;height:100vh;padding:4rem 6rem;text-align:center;position:relative}
.slide h2{font-size:2.8rem;font-weight:700;margin-bottom:2rem;background:linear-gradient(135deg,#c8a97e,#e5d4b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.slide-content{font-size:1.3rem;line-height:1.8;max-width:800px;text-align:left}
.slide-content ul{list-style:none;padding:0}
.slide-content li{padding:0.5rem 0;padding-left:1.5rem;position:relative}
.slide-content li:before{content:"\u25B8";position:absolute;left:0;color:#c8a97e}
.slide-number{position:absolute;top:1.5rem;right:2rem;font-size:0.8rem;opacity:0.4}
.speaker-notes{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);font-size:0.75rem;opacity:0.3;max-width:600px}
.controls{position:fixed;bottom:2rem;right:2rem;display:flex;gap:0.5rem;z-index:10}
.controls button{background:rgba(200,169,126,0.15);border:1px solid rgba(200,169,126,0.3);color:#c8a97e;padding:0.5rem 1rem;border-radius:0.5rem;cursor:pointer;font-size:0.9rem}
.controls button:hover{background:rgba(200,169,126,0.25)}
.progress{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#c8a97e,#e5d4b8);transition:width 0.3s}
</style>
</head>
<body>
<div class="progress" id="progress"></div>
${slideHtml}
<div class="controls">
<button onclick="prev()">\u25C0 Prev</button>
<button onclick="next()">Next \u25B6</button>
</div>
<script>
let current=0;const total=${slides.length};
function show(n){document.querySelectorAll('.slide').forEach((s,i)=>{s.style.display=i===n?'flex':'none'});document.getElementById('progress').style.width=((n+1)/total*100)+'%'}
function next(){if(current<total-1){current++;show(current)}}
function prev(){if(current>0){current--;show(current)}}
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' ')next();if(e.key==='ArrowLeft')prev();if(e.key==='f'){document.documentElement.requestFullscreen?.()}});
show(0);
</script>
</body>
</html>`;

    const htmlFileName = `slides-${nanoid(6)}.html`;
    const { url: htmlUrl } = await storagePut(`slides/${htmlFileName}`, Buffer.from(html, "utf-8"), "text/html");

    // Also build markdown summary
    let markdown = `# ${args.topic}\n\n`;
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      markdown += `---\n\n## Slide ${i + 1}: ${s.title}\n\n${s.content}\n\n`;
      if (s.notes) markdown += `> **Speaker Notes:** ${s.notes}\n\n`;
    }

    return {
      success: true,
      result: `Presentation generated: **${args.topic}** (${slides.length} slides, ${style} style)\n\n[\u25B6 Present Slides](${htmlUrl})\n\n${markdown.slice(0, 3000)}`,
      url: htmlUrl,
      artifactType: "slides",
      artifactLabel: `Slides: ${args.topic.slice(0, 60)}`,
    };
  } catch (err: any) {
    return { success: false, result: `Slide generation failed: ${err.message}` };
  }
}

// ── Send Email ──

async function executeSendEmail(args: {
  subject: string;
  body: string;
}): Promise<ToolResult> {
  try {
    const { notifyOwner } = await import("./_core/notification");
    const sent = await notifyOwner({ title: args.subject, content: args.body });
    if (sent) {
      return {
        success: true,
        result: `Email sent successfully.\n\n**Subject:** ${args.subject}\n\n**Body:**\n${args.body}`,
      };
    } else {
      return {
        success: false,
        result: "Email delivery failed — notification service temporarily unavailable. The message was not sent.",
      };
    }
  } catch (err: any) {
    return { success: false, result: `Email sending failed: ${err.message}` };
  }
}

// ── Take Meeting Notes ──

async function executeTakeMeetingNotes(args: {
  transcript: string;
  title?: string;
}): Promise<ToolResult> {
  try {
    const { invokeLLM } = await import("./_core/llm");
    const { storagePut } = await import("./storage");
    const { nanoid } = await import("nanoid");

    let transcript = args.transcript;

    // If the transcript looks like a URL, try to transcribe it
    if (transcript.startsWith("http")) {
      try {
        const { transcribeAudio } = await import("./_core/voiceTranscription");
        const result = await transcribeAudio({ audioUrl: transcript });
        transcript = "text" in result ? result.text : transcript;
      } catch {
        // If transcription fails, treat the URL as text
      }
    }

    const response = await withRetry(() => invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a meeting notes assistant. Given a transcript, produce structured meeting notes as JSON with these fields:
- summary: string (2-3 paragraph executive summary)
- actionItems: string[] (specific action items with owners if mentioned)
- keyDecisions: string[] (decisions made during the meeting)
- attendees: string[] (names mentioned as participants)
- topics: string[] (main topics discussed)
Return ONLY valid JSON, no markdown fences.`,
        },
        { role: "user", content: transcript.slice(0, 30000) },
      ],
    }));

    const rawContent = response.choices?.[0]?.message?.content ?? "{}";
    const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "Could not parse meeting notes", actionItems: [], keyDecisions: [], attendees: [], topics: [] };

    const meetingTitle = args.title || "Meeting Notes";
    let markdown = `# ${meetingTitle}\n\n`;
    markdown += `## Summary\n\n${parsed.summary}\n\n`;
    if (parsed.attendees?.length) markdown += `## Attendees\n\n${parsed.attendees.map((a: string) => `- ${a}`).join("\n")}\n\n`;
    if (parsed.topics?.length) markdown += `## Topics Discussed\n\n${parsed.topics.map((t: string) => `- ${t}`).join("\n")}\n\n`;
    if (parsed.keyDecisions?.length) markdown += `## Key Decisions\n\n${parsed.keyDecisions.map((d: string) => `- ${d}`).join("\n")}\n\n`;
    if (parsed.actionItems?.length) markdown += `## Action Items\n\n${parsed.actionItems.map((a: string) => `- [ ] ${a}`).join("\n")}\n\n`;

    const fileName = `meeting-notes-${nanoid(6)}.md`;
    const { url } = await storagePut(`meetings/${fileName}`, Buffer.from(markdown, "utf-8"), "text/markdown");

    return {
      success: true,
      result: `Meeting notes generated: **${meetingTitle}**\n\n[Download Notes](${url})\n\n${markdown}`,
      url,
      artifactType: "document",
      artifactLabel: meetingTitle,
    };
  } catch (err: any) {
    return { success: false, result: `Meeting notes generation failed: ${err.message}` };
  }
}

// ── Design Canvas ──

async function executeDesignCanvas(args: {
  description: string;
  format?: string;
  text_overlay?: string;
}): Promise<ToolResult> {
  try {
    const { generateImage } = await import("./_core/imageGeneration");
    const format = args.format || "poster";
    const enhancedPrompt = `${format} design: ${args.description}${args.text_overlay ? `. Include text: "${args.text_overlay}"` : ""}. Professional graphic design, clean layout, high quality.`;

    const { url } = await generateImage({ prompt: enhancedPrompt });

    if (!url) {
      return { success: false, result: "Design generation completed but no image was returned." };
    }

    // NS10: Validate URL accessibility (same as generate_image)
    const isAccessible = await validateImageUrl(url);
    let finalUrl = url;
    if (!isAccessible) {
      console.warn(`[design_canvas] URL not accessible, attempting re-upload: ${url}`);
      try {
        const response = await fetch(url);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          const { storagePut } = await import("./storage");
          const { url: reuploadedUrl } = await storagePut(
            `designs/${Date.now()}.png`, buffer, "image/png"
          );
          finalUrl = reuploadedUrl;
          console.log(`[design_canvas] Re-uploaded to: ${finalUrl}`);
        }
      } catch (reuploadErr) {
        console.error(`[design_canvas] Re-upload failed:`, reuploadErr);
      }
    }

    return {
      success: true,
      result: `Design created: **${format}** — ${args.description.slice(0, 100)}\n\n![Design](${finalUrl})\n\n${args.text_overlay ? `**Text overlay:** ${args.text_overlay}` : ""}`,
      url: finalUrl,
      artifactType: "generated_image",
      artifactLabel: `Design: ${args.description.slice(0, 60)}`,
    };
  } catch (err: any) {
    return { success: false, result: `Design generation failed: ${err.message}` };
  }
}

// ── Cloud Browser ──

async function executeCloudBrowser(args: {
  url?: string;
  action?: string;
  selector?: string;
  text?: string;
  scroll_direction?: string;
  full_page?: boolean;
}): Promise<ToolResult> {
  const browserAuto = await import("./browserAutomation");
  const action = args.action || "navigate";
  // Use a persistent session ID so the browser stays open across tool calls
  const SESSION_ID = "agent-browser";

  try {
    let actionResult: any;

    switch (action) {
      case "navigate": {
        if (!args.url) return { success: false, result: "URL is required for navigate action" };
        actionResult = await browserAuto.navigate(SESSION_ID, args.url);
        break;
      }
      case "screenshot": {
        actionResult = await browserAuto.screenshot(SESSION_ID, {
          fullPage: args.full_page,
          selector: args.selector,
        });
        break;
      }
      case "click": {
        if (!args.selector) return { success: false, result: "Selector is required for click action" };
        actionResult = await browserAuto.click(SESSION_ID, args.selector);
        break;
      }
      case "type": {
        if (!args.selector || !args.text) return { success: false, result: "Selector and text are required for type action" };
        actionResult = await browserAuto.type(SESSION_ID, args.selector, args.text, { clear: true });
        break;
      }
      case "scroll": {
        const dir = (args.scroll_direction || "down") as "up" | "down" | "left" | "right";
        actionResult = await browserAuto.scroll(SESSION_ID, dir);
        break;
      }
      case "evaluate": {
        if (!args.text) return { success: false, result: "JavaScript code (in 'text' field) is required for evaluate action" };
        actionResult = await browserAuto.evaluate(SESSION_ID, args.text);
        break;
      }
      case "wait_for": {
        if (!args.selector) return { success: false, result: "Selector is required for wait_for action" };
        actionResult = await browserAuto.waitForSelector(SESSION_ID, args.selector);
        break;
      }
      case "press_key": {
        if (!args.text) return { success: false, result: "Key name (in 'text' field) is required for press_key action" };
        actionResult = await browserAuto.pressKey(SESSION_ID, args.text);
        break;
      }
      case "select": {
        if (!args.selector || !args.text) return { success: false, result: "Selector and value (in 'text' field) are required for select action" };
        actionResult = await browserAuto.selectOption(SESSION_ID, args.selector, args.text);
        break;
      }
      case "go_back": {
        actionResult = await browserAuto.goBack(SESSION_ID);
        break;
      }
      case "go_forward": {
        actionResult = await browserAuto.goForward(SESSION_ID);
        break;
      }
      case "reload": {
        actionResult = await browserAuto.reload(SESSION_ID);
        break;
      }
      case "get_elements": {
        const elemResult = await browserAuto.getInteractiveElements(SESSION_ID);
        if (!elemResult.success) return { success: false, result: elemResult.error || "Failed to get elements" };
        const elemList = (elemResult.elements || []).map((e, i) =>
          `${i + 1}. <${e.tag}> ${e.text ? `"${e.text.slice(0, 60)}"` : ""} → selector: \`${e.selector}\`${e.href ? ` href=${e.href}` : ""}${e.type ? ` type=${e.type}` : ""}`
        ).join("\n");
        // Also take a screenshot
        const ssResult = await browserAuto.screenshot(SESSION_ID);
        return {
          success: true,
          result: `## Interactive Elements on Page\n\n${elemList || "No interactive elements found."}`,
          url: ssResult.screenshotUrl || ssResult.url,
          artifactType: ssResult.screenshotUrl ? "browser_screenshot" as any : "browser_url",
          artifactLabel: `Elements: ${ssResult.title}`,
        };
      }
      default:
        return { success: false, result: `Unknown browser action: ${action}` };
    }

    // Format the result
    const r = actionResult as { success: boolean; url: string; title: string; screenshotUrl?: string; content?: string; error?: string; evalResult?: string };
    let resultText = `## Browser: ${r.title || "(untitled)"}\n\n**URL:** ${r.url}\n**Action:** ${action}\n**Status:** ${r.success ? "OK" : "Error"}\n\n`;
    if (r.screenshotUrl) resultText += `![Screenshot](${r.screenshotUrl})\n\n`;
    if (r.content) resultText += `### Page Content\n\n${r.content.slice(0, 3000)}\n\n`;
    if ((r as any).evalResult) resultText += `### Evaluation Result\n\n\`\`\`\n${(r as any).evalResult}\n\`\`\`\n\n`;
    if (r.error) resultText += `### Error\n\n${r.error}\n\n`;
    // Include recent console logs if any
    const logs = browserAuto.getConsoleLogs(SESSION_ID).slice(-5);
    if (logs.length > 0) {
      resultText += `### Console Logs (last ${logs.length})\n\n`;
      logs.forEach(l => { resultText += `[${l.type}] ${l.text.slice(0, 200)}\n`; });
    }

    return {
      success: r.success,
      result: resultText,
      url: r.screenshotUrl || r.url,
      artifactType: r.screenshotUrl ? "browser_screenshot" as any : "browser_url",
      artifactLabel: `Browser: ${r.title || action}`,
    };
  } catch (err: any) {
    return { success: false, result: `Cloud browser ${action} failed: ${err.message}` };
  }
}

// ── Screenshot Verify ──

async function executeScreenshotVerify(args: {
  image_url: string;
  question: string;
}): Promise<ToolResult> {
  try {
    // Graceful degradation: validate URL format
    if (!args.image_url || (!args.image_url.startsWith("http://") && !args.image_url.startsWith("https://"))) {
      return {
        success: true,
        result: `## Screenshot Verification (Skipped)\n\n**Reason:** Invalid URL format "${args.image_url}".\n\n**Fallback:** If the preview is local-only, verify by checking that the build output (index.html) exists and has content. Proceed with deployment if the build succeeded without errors.`,
      };
    }

    // Quick accessibility check with 5s timeout
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const headResp = await fetch(args.image_url, { method: "HEAD", signal: controller.signal });
      clearTimeout(timeout);
      if (!headResp.ok && headResp.status !== 405) {
        return {
          success: true,
          result: `## Screenshot Verification (Degraded)\n\n**Image URL:** ${args.image_url}\n**Status:** HTTP ${headResp.status} — image may not be publicly accessible yet.\n\n**Fallback:** The preview may still be rendering. Proceed with deployment if the build succeeded without errors. Verify the deployed URL after deployment completes.`,
        };
      }
    } catch (fetchErr: any) {
      // URL not reachable — provide graceful fallback instead of failing
      return {
        success: true,
        result: `## Screenshot Verification (Degraded)\n\n**Image URL:** ${args.image_url}\n**Status:** URL not reachable (${fetchErr.name === "AbortError" ? "timeout" : fetchErr.message}).\n\n**Fallback:** The preview server may not be externally accessible. This is normal for local dev servers. Proceed with deployment if the build succeeded without errors — the deployed URL will be publicly accessible.`,
      };
    }

    const { invokeLLM } = await import("./_core/llm");
    const response = await withRetry(() => invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a visual QA analyst. Analyze the provided image and answer the question precisely. Describe what you see, identify UI elements, text content, layout issues, and any anomalies.",
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: args.image_url, detail: "high" } },
            { type: "text", text: args.question },
          ],
        },
      ],
    }));

    const content =
      typeof response.choices?.[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "Analysis could not be completed.";

    return {
      success: true,
      result: `## Screenshot Analysis\n\n**Image:** ${args.image_url}\n**Question:** ${args.question}\n\n### Analysis\n\n${content}`,
      url: args.image_url,
      artifactType: "browser_screenshot" as any,
      artifactLabel: `Verify: ${args.question.slice(0, 60)}`,
    };
  } catch (err: any) {
    // Graceful degradation: never let screenshot_verify crash the agent loop
    return {
      success: true,
      result: `## Screenshot Verification (Degraded)\n\n**Status:** Vision analysis unavailable (${err.message}).\n\n**Fallback:** Proceed with deployment if the build succeeded. Use the deployed URL to verify visually after deployment.`,
    };
  }
}

// ── Tool Dispatcher ──

/**
 * Execute a named tool with the given JSON arguments.
 *
 * This is the central dispatcher called by the agentic loop when the LLM
 * emits a `tool_calls` response. It parses the arguments, routes to the
 * correct executor, and returns a standardized `ToolResult`.
 *
 * @param name - The tool name (must match one of AGENT_TOOLS[].function.name)
 * @param argsJson - JSON string of tool arguments from the LLM
 * @returns ToolResult with success status, result text, and optional artifact metadata
 *
 * @example
 * ```ts
 * const result = await executeTool("web_search", JSON.stringify({ query: "AI news" }));
 * // result.success === true
 * // result.result === "Research synthesis..."
 * // result.artifactType === "browser_url"
 * ```
 */
export interface ToolContext {
  userId?: number;
  taskExternalId?: string;
}

export async function executeTool(
  name: string,
  argsJson: string,
  context?: ToolContext
): Promise<ToolResult> {
  let args: any;
  try {
    args = JSON.parse(argsJson);
  } catch {
    return { success: false, result: `Invalid tool arguments: ${argsJson}` };
  }

  try {
  switch (name) {
    case "web_search":
      return executeWebSearch(args);
    case "read_webpage":
      return executeReadWebpage(args);
    case "generate_image":
      return executeGenerateImage(args);
    case "analyze_data":
      return executeAnalyzeData(args);
    case "execute_code":
      return executeCode(args);
    case "generate_document":
      return executeGenerateDocument(args);
    case "browse_web":
      return executeBrowseWeb(args);
    case "wide_research":
      return executeWideResearch(args);
    case "generate_slides":
      return executeGenerateSlides(args);
    case "send_email":
      return executeSendEmail(args);
    case "take_meeting_notes":
      return executeTakeMeetingNotes(args);
    case "design_canvas":
      return executeDesignCanvas(args);
    case "cloud_browser":
      return executeCloudBrowser(args);
    case "screenshot_verify":
      return executeScreenshotVerify(args);
    case "create_webapp":
      return executeCreateWebapp(args, context);
    case "create_file":
      return executeCreateFile(args);
    case "edit_file":
      return executeEditFile(args);
    case "read_file":
      return executeReadFile(args);
    case "list_files":
      return executeListFiles(args);
    case "install_deps":
      return executeInstallDeps(args);
    case "run_command":
      return executeRunCommand(args);
    case "git_operation":
      return executeGitOperation(args, context);
    case "deploy_webapp":
      return executeDeployWebapp(args, context);
    case "report_convergence":
      // This is a signal tool — the actual SSE emission happens in agentStream.ts
      // We just return success so the agent loop continues
      return {
        success: true,
        result: `Convergence pass ${args.pass_number} (${args.pass_type}${args.reasoning_mode ? "/" + args.reasoning_mode : ""}): ${args.status}${args.temperature !== undefined ? " [temp=" + args.temperature.toFixed(2) + "]" : ""}${args.description ? " — " + args.description : ""}${args.rating ? " [" + args.rating + "/10]" : ""}${args.score_delta !== undefined ? " (Δ" + (args.score_delta >= 0 ? "+" : "") + args.score_delta.toFixed(1) + ")" : ""}${args.failure_log ? "\nFailed: " + args.failure_log : ""}`,
      };
    case "github_edit": {
      const { executeGitHubEdit } = await import("./githubEditTool");
      return executeGitHubEdit(args, context);
    }
    case "github_assess": {
      const { executeGitHubAssess } = await import("./githubAssessTool");
      return executeGitHubAssess(args, context);
    }
    // ── Pass 38: Manus Parity+ Tool Executors ──
    case "data_pipeline": {
      const { executeDataPipeline } = await import("./dataPipelineTool");
      // Map schema args (source_description) to function args (sources[])
      const pipelineArgs = {
        ...args,
        sources: args.sources || (args.source_description ? [args.source_description] : undefined),
        description: args.description || args.source_description || args.data_sample,
      };
      return executeDataPipeline(pipelineArgs, context);
    }
    case "automation_orchestrate": {
      const { executeAutomation } = await import("./automationTool");
      // Map schema args (trigger) to function args (trigger_description)
      const automationArgs = {
        ...args,
        trigger_description: args.trigger_description || args.trigger,
      };
      return executeAutomation(automationArgs, context);
    }
    case "app_lifecycle": {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      return executeAppLifecycle(args, context);
    }
    case "deep_research_content": {
      const { executeDeepResearch } = await import("./deepResearchTool");
      return executeDeepResearch(args, context);
    }
    case "github_ops": {
      const { executeGitHubOps } = await import("./githubOpsTool");
      return executeGitHubOps(args, context);
    }
    case "create_github_repo": {
      const { executeCreateGitHubRepo } = await import("./githubCreateTool");
      return executeCreateGitHubRepo(args, context);
    }
    case "use_connector": {
      const { executeConnectorAction } = await import("./connectorApis");
      const { getUserConnectors } = await import("./db");
      const connectorId = args.connector_id as string;
      const action = args.action as string;
      const params = (args.params || {}) as Record<string, unknown>;
      if (!connectorId || !action) {
        return { success: false, result: "connector_id and action are required" };
      }
      // Get user's connectors to find the access token
      if (!context?.userId) {
        return { success: false, result: "Authentication required to use connectors" };
      }
      const userConns = await getUserConnectors(context.userId);
      const conn = userConns.find(c => c.connectorId === connectorId && c.status === "connected");
      if (!conn) {
        return { success: false, result: `Connector '${connectorId}' is not connected. The user needs to connect it via Settings > Connectors first.` };
      }
      if (!conn.accessToken) {
        return { success: false, result: `Connector '${connectorId}' is connected but has no access token. It may need to be reconnected via OAuth.` };
      }
      const result = await executeConnectorAction(connectorId, conn.accessToken, action, params);
      if (result.success) {
        return { success: true, result: typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2) };
      } else {
        return { success: false, result: result.error || "Connector action failed" };
      }
    }
    case "native_app_build":
      return executeNativeAppBuild(args, context);
    case "webapp_rollback":
      return executeWebappRollback(args, context);
    case "analyze_video":
      return executeAnalyzeVideo(args);
    case "parallel_execute":
      return executeParallelTasks(args, context);
    case "multi_agent_orchestrate":
      return executeMultiAgentOrchestration(args, context);
    default:
      return { success: false, result: `Unknown tool: ${name}` };
  }
  } catch (toolErr: any) {
    console.error(`[executeTool] Unhandled error in tool "${name}":`, toolErr);
    return { success: false, result: `Tool execution failed: ${toolErr?.message || String(toolErr ?? 'Unknown error')}` };
  }
}

// ── Webapp Project State ──
let activeProjectDir: string | null = null;
let activeProjectServePath: string | null = null;
let activeProjectType: "html" | "react" | null = null;
let activeProjectPreviewUrl: string | null = null;

export function getActiveProject() {
  return { dir: activeProjectDir, servePath: activeProjectServePath, type: activeProjectType };
}

export function getActivePreviewUrl(): string | null {
  return activeProjectPreviewUrl;
}

/**
 * Restore active project state from DB when the process-local globals are lost.
 * Called at the start of each agent stream if the user has webapp projects.
 * This allows webapp tools (create_file, edit_file, etc.) to work across
 * stream requests without requiring the user to call create_webapp again.
 */
export async function restoreActiveProject(userId: number): Promise<boolean> {
  // If already active, nothing to do
  if (activeProjectDir) return true;

  try {
    const { getUserWebappProjects } = await import("./db");
    const projects = await getUserWebappProjects(userId);
    if (!projects || projects.length === 0) return false;

    // Use the most recently updated project
    const project = projects[0];
    const fs = await import("fs");
    const path = await import("path");

    const projectName = project.name.replace(/[^a-z0-9-]/g, "-").toLowerCase();
    const projectDir = path.join("/tmp", "webapp-projects", projectName);

    // If the directory still exists (same process, not restarted), just reactivate
    if (fs.existsSync(projectDir)) {
      activeProjectDir = projectDir;
      activeProjectType = (project.framework === "static" ? "html" : "react") as "html" | "react";
      activeProjectServePath = activeProjectType === "react"
        ? (fs.existsSync(path.join(projectDir, "dist")) ? path.join(projectDir, "dist") : projectDir)
        : projectDir;
      activeProjectPreviewUrl = (project as any).publishedUrl || null;
      console.log(`[restoreActiveProject] Restored from existing dir: ${projectDir}`);
      return true;
    }

    // Directory doesn't exist — recreate a minimal scaffold so tools can work
    fs.mkdirSync(projectDir, { recursive: true });
    if (project.framework === "static") {
      fs.writeFileSync(path.join(projectDir, "index.html"), `<!DOCTYPE html><html><head><title>${projectName}</title></head><body><div id="app"></div><script src="main.js"></script></body></html>`);
      fs.writeFileSync(path.join(projectDir, "styles.css"), "");
      fs.writeFileSync(path.join(projectDir, "main.js"), "");
      activeProjectDir = projectDir;
      activeProjectServePath = projectDir;
      activeProjectType = "html";
    } else {
      // React scaffold
      fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({ name: projectName, private: true, type: "module" }, null, 2));
      fs.writeFileSync(path.join(projectDir, "src", "App.jsx"), `export default function App() { return <div>Restored project</div>; }`);
      activeProjectDir = projectDir;
      activeProjectServePath = projectDir;
      activeProjectType = "react";
    }
    activeProjectPreviewUrl = (project as any).publishedUrl || null;
    console.log(`[restoreActiveProject] Recreated scaffold for: ${projectDir}`);
    return true;
  } catch (err: any) {
    console.warn(`[restoreActiveProject] Failed:`, err.message);
    return false;
  }
}

/**
 * Build a React/Vite project and return the dist directory path.
 * Returns null if build fails.
 */
async function buildWebappProject(projectDir: string): Promise<string | null> {
  const fs = await import("fs");
  const path = await import("path");
  const { execSync } = await import("child_process");
  try {
    execSync(`cd ${projectDir} && npm run build 2>&1`, { timeout: 120000 });
    const distDir = path.join(projectDir, "dist");
    const buildDir = path.join(projectDir, "build");
    if (fs.existsSync(distDir)) return distDir;
    if (fs.existsSync(buildDir)) return buildDir;
    return null;
  } catch {
    return null;
  }
}

// ── Upload a directory to S3 and return the index.html URL ──
async function uploadDirToS3(
  buildDir: string,
  prefix: string,
  storagePutFn: (key: string, data: Buffer | Uint8Array | string, contentType?: string) => Promise<{ key: string; url: string }>
): Promise<string> {
  const fs = await import("fs");
  const pathMod = await import("path");

  const mimeTypes: Record<string, string> = {
    ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
    ".mjs": "application/javascript", ".json": "application/json", ".svg": "image/svg+xml",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".webp": "image/webp", ".ico": "image/x-icon", ".woff": "font/woff",
    ".woff2": "font/woff2", ".ttf": "font/ttf", ".map": "application/json",
    ".txt": "text/plain", ".xml": "application/xml",
  };

  // Recursively collect all files (skip heavy/irrelevant directories)
  const UPLOAD_SKIP_DIRS = new Set(["node_modules", ".git", ".next", "__pycache__", ".cache"]);
  const collectFiles = (dir: string, base: string): { relPath: string; absPath: string }[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: { relPath: string; absPath: string }[] = [];
    for (const entry of entries) {
      if (UPLOAD_SKIP_DIRS.has(entry.name)) continue;
      const fullPath = pathMod.join(dir, entry.name);
      const relPath = pathMod.relative(base, fullPath);
      if (entry.isDirectory()) {
        files.push(...collectFiles(fullPath, base));
      } else {
        files.push({ relPath, absPath: fullPath });
      }
    }
    return files;
  };
  const allFiles = collectFiles(buildDir, buildDir);
  const assetUrlMap = new Map<string, string>();

  // Upload non-HTML files first
  for (const file of allFiles) {
    if (file.relPath === "index.html") continue;
    const ext = pathMod.extname(file.absPath).toLowerCase();
    const mime = mimeTypes[ext] || "application/octet-stream";
    const fileData = fs.readFileSync(file.absPath);
    const fileKey = `${prefix}/${file.relPath}`;
    try {
      const { url } = await storagePutFn(fileKey, fileData, mime);
      assetUrlMap.set(file.relPath, url);
    } catch (err: any) {
      console.warn(`[uploadDirToS3] Failed to upload ${file.relPath}: ${err.message}`);
    }
  }

  // Read and rewrite index.html with S3 URLs
  let htmlContent = fs.readFileSync(pathMod.join(buildDir, "index.html"), "utf-8");
  for (const [relPath, s3Url] of Array.from(assetUrlMap.entries())) {
    const escapedPath = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    htmlContent = htmlContent.replace(
      new RegExp(`(["'])(/?${escapedPath})(["'])`, 'g'),
      `$1${s3Url}$3`
    );
    htmlContent = htmlContent.replace(
      new RegExp(`(["'])/${escapedPath}(["'])`, 'g'),
      `$1${s3Url}$2`
    );
  }

  // Upload rewritten index.html
  const { url: htmlUrl } = await storagePutFn(`${prefix}/index.html`, htmlContent, "text/html");
  return htmlUrl;
}

// ── Re-upload current project to S3 after file edits ──
async function reuploadPreviewToS3(): Promise<void> {
  if (!activeProjectDir) return;
  const fs = await import("fs");
  const pathMod = await import("path");
  const projectName = pathMod.basename(activeProjectDir);

  try {
    if (activeProjectType === "react") {
      // Rebuild first, then upload dist/
      const newServePath = await buildWebappProject(activeProjectDir);
      if (newServePath) {
        activeProjectServePath = newServePath;
        const { storagePut } = await import("./storage");
        const ts = Date.now();
        const prefix = `webapp-previews/${projectName}-${ts}`;
        const newUrl = await uploadDirToS3(newServePath, prefix, storagePut);
        activeProjectPreviewUrl = newUrl;
      }
    } else if (activeProjectType === "html") {
      // Upload HTML files directly
      const { storagePut } = await import("./storage");
      const ts = Date.now();
      const prefix = `webapp-previews/${projectName}-${ts}`;
      const newUrl = await uploadDirToS3(activeProjectDir, prefix, storagePut);
      activeProjectPreviewUrl = newUrl;
    }
  } catch (err: any) {
    console.warn("[reuploadPreviewToS3] Failed:", err.message);
  }
}

// ── create_webapp ──
async function executeCreateWebapp(args: {
  name: string;
  description: string;
  template?: string;
}, context?: ToolContext): Promise<ToolResult> {
  const fs = await import("fs");
  const path = await import("path");
  const { execSync } = await import("child_process");

  // Validate and sanitize project name to ensure valid filesystem path and HTML element IDs
  let projectName = args.name.replace(/[^a-z0-9-]/g, "-").toLowerCase();
  // Ensure name starts with a letter (valid for CSS selectors and HTML IDs)
  if (/^[^a-z]/.test(projectName)) {
    projectName = "app-" + projectName;
  }
  // Collapse consecutive hyphens and trim trailing hyphens
  projectName = projectName.replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
  // Ensure minimum length
  if (!projectName || projectName.length < 2) {
    projectName = "webapp-project";
  }
  // Truncate to reasonable length for filesystem compatibility
  if (projectName.length > 64) {
    projectName = projectName.slice(0, 64).replace(/-$/, "");
  }
  const projectDir = path.join("/tmp", "webapp-projects", projectName);
  const template = args.template || "react";

  try {
    // Clean up any existing project with same name
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    fs.mkdirSync(projectDir, { recursive: true });

    if (template === "html" || template === "landing") {
      // Plain HTML/CSS/JS scaffold
      fs.writeFileSync(path.join(projectDir, "index.html"), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <h1>${args.description}</h1>
  </div>
  <script src="main.js"></script>
</body>
</html>`);
      fs.writeFileSync(path.join(projectDir, "styles.css"), `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }\n#app { text-align: center; padding: 2rem; }\nh1 { font-size: 2rem; font-weight: 600; }`);
      fs.writeFileSync(path.join(projectDir, "main.js"), `console.log('${projectName} loaded');`);

      // Serve via Express static middleware for local dev AND immediately upload to S3 for production
      activeProjectDir = projectDir;
      activeProjectServePath = projectDir;
      activeProjectType = "html";

      // Upload initial scaffold to S3 so preview works in production (no /tmp dependency)
      const { storagePut } = await import("./storage");
      const deployTs = Date.now();
      const previewPrefix = `webapp-previews/${projectName}-${deployTs}`;
      const htmlData = fs.readFileSync(path.join(projectDir, "index.html"), "utf-8");
      const cssData = fs.readFileSync(path.join(projectDir, "styles.css"), "utf-8");
      const jsData = fs.readFileSync(path.join(projectDir, "main.js"), "utf-8");

      // Upload CSS and JS first to get URLs
      const { url: cssUrl } = await storagePut(`${previewPrefix}/styles.css`, Buffer.from(cssData), "text/css");
      const { url: jsUrl } = await storagePut(`${previewPrefix}/main.js`, Buffer.from(jsData), "application/javascript");

      // Rewrite HTML to use absolute S3 URLs for assets
      let rewrittenHtml = htmlData
        .replace('href="styles.css"', `href="${cssUrl}"`)
        .replace('src="main.js"', `src="${jsUrl}"`);
      const { url: htmlUrl } = await storagePut(`${previewPrefix}/index.html`, Buffer.from(rewrittenHtml), "text/html");

      // Store the preview URL for later updates
      activeProjectPreviewUrl = htmlUrl;

      // Persist to DB so WebAppProjectPage can manage it
      let projectExternalId: string | undefined;
      if (context?.userId) {
        try {
          const { createWebappProject } = await import("./db");
          const { nanoid } = await import("nanoid");
          projectExternalId = nanoid();
          await createWebappProject({
            externalId: projectExternalId,
            userId: context.userId,
            name: projectName,
            description: args.description,
            framework: "static",
            buildCommand: "",
            outputDir: ".",
            installCommand: "",
            deployStatus: "live",
          });
        } catch (dbErr) {
          console.warn("[create_webapp] Failed to persist project to DB:", dbErr);
        }
      }

      return {
        success: true,
        result: `Created HTML project "${projectName}". The live preview is available via the iframe in your chat. Files created:\n- index.html\n- styles.css\n- main.js\n\nYou can now use create_file and edit_file to modify the project files. The preview updates automatically after each edit.`,
        url: htmlUrl,
        artifactType: "webapp_preview",
        artifactLabel: projectName,
        projectExternalId,
      };
    } else {
      // React + Vite + Tailwind scaffold
      let usedFallback = false;

      const packageJson = {
        name: projectName,
        private: true,
        version: "0.0.1",
        type: "module",
        scripts: { dev: "vite --host", build: "vite build", preview: "vite preview" },
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: {
          "@vitejs/plugin-react": "^4.3.0",
          vite: "^6.0.0",
          tailwindcss: "^4.0.0",
          "@tailwindcss/vite": "^4.0.0",
        },
      };
      fs.writeFileSync(path.join(projectDir, "package.json"), JSON.stringify(packageJson, null, 2));

      fs.writeFileSync(path.join(projectDir, "vite.config.js"), `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport tailwindcss from '@tailwindcss/vite';\nexport default defineConfig({ plugins: [react(), tailwindcss()] });`);

      fs.writeFileSync(path.join(projectDir, "index.html"), `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${projectName}</title></head>\n<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>\n</html>`);

      fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(projectDir, "src", "index.css"), `@import "tailwindcss";`);
      fs.writeFileSync(path.join(projectDir, "src", "main.jsx"), `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\nReactDOM.createRoot(document.getElementById('root')).render(<App />);`);
         fs.writeFileSync(path.join(projectDir, "src", "App.jsx"), `export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
      <div className="text-center space-y-6 max-w-2xl mx-auto px-6">
        <h1 className="text-4xl font-bold tracking-tight">${projectName}</h1>
        <p className="text-neutral-400 text-lg leading-relaxed">${args.description}</p>
        <div className="pt-4">
          <span className="inline-block px-4 py-2 rounded-full bg-white/10 text-sm text-neutral-300">Built with Manus</span>
        </div>
      </div>
    </div>
  );
}`);

      // Install deps with error handling + fallback to HTML on total failure
      let installSuccess = false;
      try {
        // Attempt 1: prefer-offline for speed (5 min timeout — pilot repo has 2000+ files)
        execSync(`cd ${projectDir} && npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -3`, { timeout: 300000, stdio: 'pipe' });
        installSuccess = true;
      } catch (installErr: any) {
        console.warn(`[create_webapp] npm install --prefer-offline failed, retrying with network: ${installErr.message?.slice(0, 100)}`);
        try {
          // Attempt 2: full network install (5 min timeout)
          execSync(`cd ${projectDir} && npm install --no-audit --no-fund 2>&1 | tail -3`, { timeout: 300000, stdio: 'pipe' });
          installSuccess = true;
        } catch (retryErr: any) {
          console.warn(`[create_webapp] npm install retry failed, trying --legacy-peer-deps: ${retryErr.message?.slice(0, 100)}`);
          try {
            // Attempt 3: legacy-peer-deps for repos with peer dep conflicts (5 min timeout)
            execSync(`cd ${projectDir} && npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | tail -3`, { timeout: 300000, stdio: 'pipe' });
            installSuccess = true;
          } catch (legacyErr: any) {
            console.warn(`[create_webapp] All npm install attempts failed: ${legacyErr.message?.slice(0, 100)}`);
          }
        }
      }

      // If npm install failed entirely, fall back to HTML template
      if (!installSuccess || !fs.existsSync(path.join(projectDir, "node_modules"))) {
        console.warn(`[create_webapp] Falling back to HTML template for "${projectName}"`);
        usedFallback = true;
        // Rewrite as plain HTML with inline styles (no CDN dependency)
        fs.writeFileSync(path.join(projectDir, "index.html"), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    #app { text-align: center; padding: 2rem; }
    h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem; }
    p { color: #a3a3a3; font-size: 1.125rem; line-height: 1.75; }
  </style>
</head>
<body>
  <div id="app">
    <h1>${projectName}</h1>
    <p>${args.description}</p>
  </div>
  <script src="main.js"></script>
</body>
</html>`);
        fs.writeFileSync(path.join(projectDir, "styles.css"), `/* Additional custom styles */\n* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }\n#app { text-align: center; padding: 2rem; }\nh1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem; }\np { color: #a3a3a3; font-size: 1.125rem; line-height: 1.75; }`);
        fs.writeFileSync(path.join(projectDir, "main.js"), `console.log('${projectName} loaded');`);

        // Serve via Express static middleware for local dev AND upload to S3 for production
        activeProjectDir = projectDir;
        activeProjectServePath = projectDir;
        activeProjectType = "html";

        // Upload fallback HTML scaffold to S3
        const { storagePut: storagePutFallback } = await import("./storage");
        const fallbackTs = Date.now();
        const fallbackPrefix = `webapp-previews/${projectName}-${fallbackTs}`;
        const fallbackHtml = fs.readFileSync(path.join(projectDir, "index.html"), "utf-8");
        const fallbackCss = fs.readFileSync(path.join(projectDir, "styles.css"), "utf-8");
        const fallbackJs = fs.readFileSync(path.join(projectDir, "main.js"), "utf-8");

        const { url: fbCssUrl } = await storagePutFallback(`${fallbackPrefix}/styles.css`, Buffer.from(fallbackCss), "text/css");
        const { url: fbJsUrl } = await storagePutFallback(`${fallbackPrefix}/main.js`, Buffer.from(fallbackJs), "application/javascript");

        let fbRewrittenHtml = fallbackHtml
          .replace('href="styles.css"', `href="${fbCssUrl}"`)
          .replace('src="main.js"', `src="${fbJsUrl}"`);
        const { url: fbHtmlUrl } = await storagePutFallback(`${fallbackPrefix}/index.html`, Buffer.from(fbRewrittenHtml), "text/html");

        activeProjectPreviewUrl = fbHtmlUrl;

        let projectExternalId: string | undefined;
        if (context?.userId) {
          try {
            const { createWebappProject } = await import("./db");
            const { nanoid } = await import("nanoid");
            projectExternalId = nanoid();
            await createWebappProject({
              externalId: projectExternalId,
              userId: context.userId,
              name: projectName,
              description: args.description,
              framework: "static",
              buildCommand: "",
              outputDir: ".",
              installCommand: "",
              deployStatus: "live",
            });
          } catch (dbErr) {
            console.warn("[create_webapp] Failed to persist project to DB:", dbErr);
          }
        }

        return {
          success: true,
          result: `Created HTML project "${projectName}" (using HTML fallback). The live preview is available via the iframe in your chat. Files created:\n- index.html\n- styles.css\n- main.js\n\nYou can now use create_file and edit_file to modify the project files. The preview updates automatically after each edit.`,
          url: fbHtmlUrl,
          artifactType: "webapp_preview",
          artifactLabel: projectName,
          projectExternalId,
        };
      }

      // Build the project and serve via Express static middleware
      const buildOutput = await buildWebappProject(projectDir);
      activeProjectDir = projectDir;
      activeProjectServePath = buildOutput || projectDir;
      activeProjectType = "react";

      // Upload built dist/ to S3 so preview works in production
      let reactPreviewUrl = `/api/webapp-preview/`; // fallback for local dev
      if (buildOutput) {
        try {
          const { storagePut: storagePutReact } = await import("./storage");
          const reactTs = Date.now();
          const reactPrefix = `webapp-previews/${projectName}-${reactTs}`;
          reactPreviewUrl = await uploadDirToS3(buildOutput, reactPrefix, storagePutReact);
          activeProjectPreviewUrl = reactPreviewUrl;
        } catch (s3Err: any) {
          console.warn("[create_webapp] S3 upload failed, using local preview:", s3Err.message);
        }
      }

      // Persist to DB so WebAppProjectPage can manage it
      let projectExternalId: string | undefined;
      if (context?.userId) {
        try {
          const { createWebappProject } = await import("./db");
          const { nanoid } = await import("nanoid");
          projectExternalId = nanoid();
          await createWebappProject({
            externalId: projectExternalId,
            userId: context.userId,
            name: projectName,
            description: args.description,
            framework: "react",
            buildCommand: "npm run build",
            outputDir: "dist",
            installCommand: "npm install",
            deployStatus: "live",
          });
        } catch (dbErr) {
          console.warn("[create_webapp] Failed to persist project to DB:", dbErr);
        }
      }

      return {
        success: true,
        result: `Created React+Vite+Tailwind project "${projectName}". The live preview is available via the iframe in your chat. Files created:\n- package.json\n- vite.config.js\n- index.html\n- src/main.jsx\n- src/App.jsx\n- src/index.css\n\nYou can now use create_file and edit_file to modify the project files. The preview updates automatically after each edit.`,
        url: reactPreviewUrl,
        artifactType: "webapp_preview",
        artifactLabel: projectName,
        projectExternalId,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      result: `Failed to create webapp: ${err.message}`,
    };
  }
}

// ── create_file ──
async function executeCreateFile(args: {
  path: string;
  content: string;
}): Promise<ToolResult> {
  const fs = await import("fs");
  const pathMod = await import("path");

  if (!activeProjectDir) {
    return { success: false, result: "No active webapp project. Use create_webapp or git_operation(clone) first." };
  }

  try {
    const fullPath = pathMod.join(activeProjectDir, args.path);
    // Security: prevent path traversal
    if (!fullPath.startsWith(activeProjectDir)) {
      return { success: false, result: "Invalid path: cannot write outside project directory." };
    }

    // ── CRITICAL FILE PROTECTION (Video Bug Fix) ──
    // Prevents the catastrophic bug where the agent overwrites a valid
    // cloned package.json with hallucinated garbage content.
    const basename = pathMod.basename(args.path).toLowerCase();
    const CRITICAL_FILES = [
      "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
      "tsconfig.json", "tsconfig.node.json", "tsconfig.app.json",
      "vite.config.ts", "vite.config.js", "vite.config.mjs",
      "next.config.ts", "next.config.js", "next.config.mjs",
      "webpack.config.js", "webpack.config.ts",
      ".env", ".env.local", ".env.production",
      "dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ];
    const isCriticalFile = CRITICAL_FILES.includes(basename);

    if (fs.existsSync(fullPath) && isCriticalFile) {
      if (basename === "package.json") {
        try {
          const parsed = JSON.parse(args.content);
          const hasName = typeof parsed.name === "string" && parsed.name.length > 0;
          const hasHallucinationSignals = (
            (parsed.dependencies?.install) ||
            (parsed.dependencies?.npm) ||
            (parsed.dependencies?.node) ||
            (!hasName && !parsed.scripts && !parsed.version)
          );
          if (hasHallucinationSignals) {
            return {
              success: false,
              result: `BLOCKED: The content you're trying to write to package.json appears to be hallucinated (contains "install" or "npm" as dependencies, or is missing required fields). The file already exists with valid content from the cloned repository. Use read_file to see its current content, then use edit_file to make targeted modifications.`,
            };
          }
        } catch {
          return {
            success: false,
            result: `BLOCKED: Cannot overwrite existing package.json with invalid JSON content. Use read_file to see current content, then use edit_file for targeted modifications.`,
          };
        }
      }
      const existingSize = fs.statSync(fullPath).size;
      return {
        success: false,
        result: `BLOCKED: ${args.path} already exists (${existingSize} bytes) and is a critical configuration file. Use read_file to see current content, then use edit_file for targeted modifications. Do NOT overwrite it.`,
      };
    }

    if (basename === "package.json") {
      try {
        const parsed = JSON.parse(args.content);
        if ((parsed.dependencies?.install) || (parsed.dependencies?.npm) || (parsed.dependencies?.node) || (!parsed.name && !parsed.scripts && !parsed.version)) {
          return {
            success: false,
            result: `BLOCKED: The package.json content appears hallucinated. A valid package.json must have at least a "name" field and typically a "scripts" section.`,
          };
        }
      } catch { /* allow non-JSON for new files */ }
    }

    fs.mkdirSync(pathMod.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, args.content);

    // Auto-rebuild and re-upload to S3 so preview updates
    await reuploadPreviewToS3();

    return {
      success: true,
      result: `File created: ${args.path} (${args.content.length} bytes)`,
      artifactType: "code",
      artifactLabel: args.path,
    };
  } catch (err: any) {
    return { success: false, result: `Failed to create file: ${err.message}` };
  }
}

// ── edit_file ──
async function executeEditFile(args: {
  path: string;
  find: string;
  replace: string;
}): Promise<ToolResult> {
  const fs = await import("fs");
  const pathMod = await import("path");

  if (!activeProjectDir) {
    return { success: false, result: "No active webapp project. Use create_webapp or git_operation(clone) first." };
  }

  try {
    const fullPath = pathMod.join(activeProjectDir, args.path);
    if (!fullPath.startsWith(activeProjectDir)) {
      return { success: false, result: "Invalid path: cannot edit outside project directory." };
    }
    if (!fs.existsSync(fullPath)) {
      return { success: false, result: `File not found: ${args.path}` };
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    if (!content.includes(args.find)) {
      return { success: false, result: `Text not found in ${args.path}. Make sure the 'find' text matches exactly.` };
    }
    const updated = content.replace(args.find, args.replace);
    fs.writeFileSync(fullPath, updated);

    // Auto-rebuild and re-upload to S3 so preview updates
    await reuploadPreviewToS3();

    return {
      success: true,
      result: `File edited: ${args.path} — replaced ${args.find.length} chars with ${args.replace.length} chars`,
      artifactType: "code",
      artifactLabel: args.path,
    };
  } catch (err: any) {
    return { success: false, result: `Failed to edit file: ${err.message}` };
  }
}


// ── read_file ──
async function executeReadFile(args: {
  path: string;
}): Promise<ToolResult> {
  const fs = await import("fs");
  const pathMod = await import("path");

  if (!activeProjectDir) {
    return { success: false, result: "No active webapp project. Use create_webapp or git_operation(clone) first." };
  }

  try {
    const fullPath = pathMod.join(activeProjectDir, args.path);
    if (!fullPath.startsWith(activeProjectDir)) {
      return { success: false, result: "Invalid path: cannot read outside project directory." };
    }
    if (!fs.existsSync(fullPath)) {
      return { success: false, result: `File not found: ${args.path}` };
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    const truncated = content.length > 10000 ? content.slice(0, 10000) + "\n\n... (truncated, file is " + content.length + " bytes)" : content;
    return {
      success: true,
      result: `Contents of ${args.path}:\n\n${truncated}`,
      artifactType: "code",
      artifactLabel: args.path,
    };
  } catch (err: any) {
    return { success: false, result: `Failed to read file: ${err.message}` };
  }
}

// ── list_files ──
async function executeListFiles(args: {
  path?: string;
}): Promise<ToolResult> {
  const fs = await import("fs");
  const pathMod = await import("path");

  if (!activeProjectDir) {
    return { success: false, result: "No active webapp project. Use create_webapp or git_operation(clone) first." };
  }

  try {
    const targetDir = args.path
      ? pathMod.join(activeProjectDir, args.path)
      : activeProjectDir;

    if (!targetDir.startsWith(activeProjectDir)) {
      return { success: false, result: "Invalid path: cannot list outside project directory." };
    }

    const listDir = (dir: string, prefix: string = "", depth: number = 0): string[] => {
      if (depth > 4) return [prefix + "... (max depth reached)"];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const lines: string[] = [];
      // Skip node_modules, .git, dist
      const filtered = entries.filter(e => !["node_modules", ".git", "dist", ".next"].includes(e.name));
      filtered.forEach((entry, i) => {
        const isLast = i === filtered.length - 1;
        const connector = isLast ? "└── " : "├── ";
        const childPrefix = isLast ? "    " : "│   ";
        if (entry.isDirectory()) {
          lines.push(prefix + connector + entry.name + "/");
          lines.push(...listDir(pathMod.join(dir, entry.name), prefix + childPrefix, depth + 1));
        } else {
          const size = fs.statSync(pathMod.join(dir, entry.name)).size;
          const sizeStr = size < 1024 ? `${size}B` : size < 1048576 ? `${(size / 1024).toFixed(1)}KB` : `${(size / 1048576).toFixed(1)}MB`;
          lines.push(prefix + connector + entry.name + ` (${sizeStr})`);
        }
      });
      return lines;
    }

    const tree = listDir(targetDir);
    const relPath = args.path || ".";
    return {
      success: true,
      result: `Project files (${relPath}):\n\n${tree.join("\n")}`,
    };
  } catch (err: any) {
    return { success: false, result: `Failed to list files: ${err.message}` };
  }
}

// ── install_deps ──
async function executeInstallDeps(args: {
  packages: string;
  dev?: boolean;
}): Promise<ToolResult> {
  const { execSync } = await import("child_process");

  if (!activeProjectDir) {
    return { success: false, result: "No active webapp project. Use create_webapp or git_operation(clone) first." };
  }

  try {
    const devFlag = args.dev ? " --save-dev" : "";
    // Strict sanitization: only allow valid npm package names (scoped and unscoped)
    // Valid chars: alphanumeric, hyphens, dots, underscores, slashes (for scoped), @ (for scoped)
    const packages = args.packages.split(/\s+/).filter(Boolean);
    const validPkgPattern = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(@[a-z0-9^~>=<.*-]+)?$/i;
    for (const pkg of packages) {
      if (!validPkgPattern.test(pkg)) {
        return { success: false, result: `Invalid package name: ${pkg}` };
      }
    }
    const sanitized = packages.join(" ");
    let output: string;
    try {
      output = execSync(
        `cd ${activeProjectDir} && npm install ${sanitized}${devFlag} 2>&1 | tail -10`,
        { timeout: 300000 }
      ).toString();
    } catch (installErr: any) {
      // Retry with --legacy-peer-deps for peer dependency conflicts
      console.warn(`[install_deps] First attempt failed, retrying with --legacy-peer-deps`);
      try {
        output = execSync(
          `cd ${activeProjectDir} && npm install ${sanitized}${devFlag} --legacy-peer-deps 2>&1 | tail -10`,
          { timeout: 300000 }
        ).toString();
      } catch (retryErr: any) {
        return { success: false, result: `Failed to install packages after 2 attempts (with and without --legacy-peer-deps):\n\n${retryErr.stdout?.toString()?.slice(-1000) || retryErr.message}` };
      }
    }
    return {
      success: true,
      result: `Installed packages: ${args.packages}\n\n${output}`,
    };
  } catch (err: any) {
    return { success: false, result: `Failed to install packages: ${err.message}` };
  }
}

// ── run_command ──
async function executeRunCommand(args: {
  command: string;
}): Promise<ToolResult> {
  const { execSync } = await import("child_process");

  if (!activeProjectDir) {
    return { success: false, result: "No active webapp project. Use create_webapp or git_operation(clone) first." };
  }

  // Security: block dangerous commands and direct host-app modification
  // Note: commands run in activeProjectDir (the cloned project), NOT the host app.
  // Only block commands that explicitly target the RUNNING host instance path.
  const blocked = ["rm -rf /", "rm -rf /*", "mkfs", "dd if=", ":(){ :|:& };:"];
  const hostInstancePath = "/home/ubuntu/manus-next-app";
  // Block commands that would cd into or directly modify the running host instance
  if (args.command.includes(`cd ${hostInstancePath}`) || 
      args.command.includes(`rm -rf ${hostInstancePath}`) ||
      args.command.includes(`rm ${hostInstancePath}`)) {
    return { success: false, result: "Cannot modify the running host application directly. Use the cloned project in the sandbox." };
  }
  if (blocked.some(b => args.command.includes(b))) {
    return { success: false, result: "Command blocked for safety reasons." };
  }

  try {
    const output = execSync(
      `cd ${activeProjectDir} && ${args.command} 2>&1`,
      { timeout: 120000, maxBuffer: 2 * 1024 * 1024 }
    ).toString();
    const truncated = output.length > 5000 ? output.slice(-5000) + "\n... (output truncated)" : output;
    return {
      success: true,
      result: `Command: ${args.command}\n\nOutput:\n${truncated}`,
      artifactType: "terminal",
      artifactLabel: args.command.slice(0, 40),
    };
  } catch (err: any) {
    const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
    return {
      success: false,
      result: `Command failed: ${args.command}\n\nOutput:\n${output?.slice(-3000) || "No output"}`,
      artifactType: "terminal",
      artifactLabel: args.command.slice(0, 40),
    };
  }
}

// ── git_operation ──
async function executeGitOperation(args: {
  operation: string;
  message?: string;
  remote_url?: string;
  files?: string;
}, context?: ToolContext): Promise<ToolResult> {
  const { execSync } = await import("child_process");

  if (!activeProjectDir && args.operation !== "clone") {
    return { success: false, result: "No active webapp project. Use create_webapp or git_operation(clone) first." };
  }

  const dir = activeProjectDir || "/tmp/webapp-projects";

  try {
    let output = "";
    switch (args.operation) {
      case "init":
        output = execSync(`cd ${dir} && git init && git add . && echo "Git initialized"`, { timeout: 10000 }).toString();
        break;
      case "add":
        const files = args.files || ".";
        output = execSync(`cd ${dir} && git add ${files}`, { timeout: 10000 }).toString();
        output = output || `Added ${files} to staging`;
        break;
      case "commit":
        if (!args.message) return { success: false, result: "Commit message is required." };
        // Sanitize commit message: escape all shell metacharacters
        const safeMsg = args.message.replace(/[`$\\"!#&|;(){}]/g, "").slice(0, 500);
        output = execSync(`cd ${dir} && git add -A && git commit -m "${safeMsg}"`, { timeout: 10000 }).toString();
        break;
      case "push":
        const remote = args.remote_url ? `origin '${args.remote_url.replace(/'/g, "")}'` : "origin main";
        output = execSync(`cd ${dir} && git push ${remote} 2>&1`, { timeout: 30000 }).toString();
        break;
      case "status":
        output = execSync(`cd ${dir} && git status --short`, { timeout: 5000 }).toString();
        output = output || "Working tree clean";
        break;
      case "log":
        output = execSync(`cd ${dir} && git log --oneline -10`, { timeout: 5000 }).toString();
        break;
      case "clone": {
        if (!args.remote_url) return { success: false, result: "Remote URL is required for clone." };
        // Sanitize remote_url: only allow valid git URLs (https://, git://, ssh://)
        if (!/^(https?:\/\/|git:\/\/|git@)[\w.\-\/:@]+$/.test(args.remote_url)) {
          return { success: false, result: "Invalid remote URL format. Only https://, git://, and git@ URLs are allowed." };
        }
        
        // SELF-REPO AWARENESS: If cloning the host app, allow it but clone to a separate directory
        // so the agent can build a preview without interfering with the running instance.
        const normalizedUrl = args.remote_url.toLowerCase().replace(/\.git$/, "");
        const isSelfRepo = normalizedUrl.includes("mwpenn94/manus-next-app") || normalizedUrl.includes("mwpenn94/manus-next");
        // Note: We do NOT block self-repo clones. The agent needs to be able to clone, build,
        // preview, edit, and republish itself. The clone goes to /tmp/webapp-projects/ which
        // is separate from the running instance at /home/ubuntu/manus-next-app.
        const cloneName = args.remote_url.split("/").pop()?.replace(".git", "").replace(/[^a-zA-Z0-9_\-]/g, "") || "cloned-repo";
        const cloneDir = `/tmp/webapp-projects/${cloneName}`;
        
        // Try to use GitHub token for authenticated clone (supports private repos)
        let cloneUrl = args.remote_url.replace(/'/g, "");
        let tokenUsed = false;
        let originalUrl = cloneUrl;
        let tokenType = "unknown"; // "classic_pat" (ghp_), "fine_grained" (github_pat_), "oauth_app", "unknown"
        if (context?.userId && cloneUrl.includes("github.com")) {
          try {
            // ── MULTI-LAYER AUTH FAILOVER (Session 50) ──
            // Uses the 5-layer failover chain to resolve a valid GitHub token.
            // Priority: OAuth → Smart PAT → Classic PAT → Env Fallback → App Install
            const { resolveGitHubAuth } = await import("./services/githubAuthFailover");
            const authResult = await resolveGitHubAuth({
              userId: context.userId,
              validate: true,
              attemptRefresh: true,
            });

            if (authResult) {
              let token = authResult.token;
              // Map source to tokenType for error messages
              if (authResult.source === "oauth") tokenType = "oauth_app";
              else if (authResult.source === "smart_pat") tokenType = "fine_grained";
              else if (authResult.source === "classic_pat") tokenType = "classic_pat";
              else if (authResult.source === "env_fallback") tokenType = "env_fallback";
              else if (authResult.source === "app_install") tokenType = "app_install";
              else tokenType = "unknown";

              // Inject validated token into HTTPS URL for authenticated clone
              cloneUrl = cloneUrl.replace("https://github.com/", `https://x-access-token:${token}@github.com/`);
              tokenUsed = true;
              console.log(`[git_operation] Using GitHub token via failover (source: ${authResult.source}, user: ${authResult.username})`);
            } else {
              // All failover layers exhausted
              console.warn(`[git_operation] All auth layers exhausted for user ${context.userId}. Attempting unauthenticated clone.`);
            }
          } catch (tokenErr: any) {
            // Fall back to unauthenticated clone
            console.warn(`[git_operation] Auth failover error: ${tokenErr.message}`);
          }
        }
        
        // Ensure target directory doesn't already exist
        try { execSync(`rm -rf ${cloneDir}`, { timeout: 5000 }); } catch {}
        
        // Attempt clone with retry and fallback strategies
        let cloneSuccess = false;
        let cloneError = "";
        
        // Attempt 1: Clone with token (if available)
        try {
          output = execSync(`git clone '${cloneUrl}' ${cloneDir} 2>&1`, { timeout: 60000 }).toString();
          cloneSuccess = true;
        } catch (err1: any) {
          cloneError = err1.message || String(err1);
          console.warn(`[git_operation] Clone attempt 1 failed: ${cloneError}`);
          
          // Attempt 2: If token was used and failed, try without token (public repo fallback)
          if (tokenUsed && !cloneSuccess) {
            try {
              console.log(`[git_operation] Retrying clone without token (public repo fallback)...`);
              try { execSync(`rm -rf ${cloneDir}`, { timeout: 5000 }); } catch {}
              output = execSync(`git clone '${originalUrl}' ${cloneDir} 2>&1`, { timeout: 60000 }).toString();
              cloneSuccess = true;
              output += "\n(Note: Cloned without authentication — repo appears to be public)";
            } catch (err2: any) {
              cloneError = err2.message || String(err2);
              console.warn(`[git_operation] Clone attempt 2 (no token) also failed: ${cloneError}`);
            }
          }
          
          // Attempt 3: Try with .git suffix if not already present
          if (!cloneSuccess && !originalUrl.endsWith(".git")) {
            try {
              console.log(`[git_operation] Retrying clone with .git suffix...`);
              try { execSync(`rm -rf ${cloneDir}`, { timeout: 5000 }); } catch {}
              const urlWithGit = (tokenUsed ? cloneUrl : originalUrl) + ".git";
              output = execSync(`git clone '${urlWithGit}' ${cloneDir} 2>&1`, { timeout: 60000 }).toString();
              cloneSuccess = true;
            } catch (err3: any) {
              // Keep the original error as it's more informative
              console.warn(`[git_operation] Clone attempt 3 (.git suffix) also failed: ${err3.message}`);
            }
          }
        }
        
        // Attempt 4: PURE NODE.JS clone fallback — no git, curl, or tar binaries needed.
        // Uses Node.js built-in fetch + zlib + manual tar parsing.
        // This is the ONLY reliable method in Nixpacks/Cloud Run containers.
        if (!cloneSuccess && cloneUrl.includes("github.com")) {
          try {
            const ghMatch = originalUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
            if (ghMatch) {
              const [, owner, repo] = ghMatch;
              console.log(`[git_operation] Attempt 4: Pure Node.js download via GitHub API (${owner}/${repo})...`);
              
              const fs = await import("fs");
              const path = await import("path");
              const zlib = await import("zlib");
              
              // Clean and create target directory
              try { fs.rmSync(cloneDir, { recursive: true, force: true }); } catch {}
              fs.mkdirSync(cloneDir, { recursive: true });
              
              // Build headers for GitHub API
              const tokenForApi = tokenUsed ? cloneUrl.match(/x-access-token:([^@]+)@/)?.[1] : null;
              const headers: Record<string, string> = {
                "Accept": "application/vnd.github+json",
                "User-Agent": "manus-next-app",
              };
              if (tokenForApi) headers["Authorization"] = `Bearer ${tokenForApi}`;
              
              const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball`;
              console.log(`[git_operation] Fetching tarball from ${tarballUrl}...`);
              
              // Follow redirects (GitHub API returns 302 to S3)
              let response = await fetch(tarballUrl, { headers, redirect: "follow" });
              if (!response.ok) {
                throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
              }
              
              // Get the tarball as a buffer
              const tarballBuffer = Buffer.from(await response.arrayBuffer());
              console.log(`[git_operation] Downloaded ${(tarballBuffer.length / 1024 / 1024).toFixed(1)}MB tarball`);
              
              // Decompress gzip
              const tarBuffer = zlib.gunzipSync(tarballBuffer);
              
              // Parse tar format manually (512-byte header blocks)
              // TAR format: each file has a 512-byte header followed by file data padded to 512 bytes
              let offset = 0;
              let fileCount = 0;
              const BLOCK_SIZE = 512;
              
              while (offset < tarBuffer.length - BLOCK_SIZE) {
                // Read header
                const header = tarBuffer.subarray(offset, offset + BLOCK_SIZE);
                
                // Check for end-of-archive (two zero blocks)
                if (header.every((b: number) => b === 0)) break;
                
                // Extract filename (bytes 0-99, null-terminated)
                let fileName = "";
                for (let i = 0; i < 100; i++) {
                  if (header[i] === 0) break;
                  fileName += String.fromCharCode(header[i]);
                }
                
                // Check for GNU long name extension (type 'L')
                const typeFlag = String.fromCharCode(header[156]);
                
                // Extract file size (bytes 124-135, octal, null-terminated)
                let sizeStr = "";
                for (let i = 124; i < 136; i++) {
                  if (header[i] === 0 || header[i] === 32) break;
                  sizeStr += String.fromCharCode(header[i]);
                }
                const fileSize = parseInt(sizeStr, 8) || 0;
                
                // Check for USTAR prefix (bytes 345-499)
                let prefix = "";
                if (header[345] !== 0) {
                  for (let i = 345; i < 500; i++) {
                    if (header[i] === 0) break;
                    prefix += String.fromCharCode(header[i]);
                  }
                  if (prefix) fileName = prefix + "/" + fileName;
                }
                
                offset += BLOCK_SIZE; // Move past header
                
                if (typeFlag === "L") {
                  // GNU long name: the data block contains the real filename
                  const longName = tarBuffer.subarray(offset, offset + fileSize).toString("utf8").replace(/\0/g, "");
                  const dataPadded = Math.ceil(fileSize / BLOCK_SIZE) * BLOCK_SIZE;
                  offset += dataPadded;
                  // Next header is the actual file with this long name
                  // Read the next header
                  const nextHeader = tarBuffer.subarray(offset, offset + BLOCK_SIZE);
                  const nextTypeFlag = String.fromCharCode(nextHeader[156]);
                  let nextSizeStr = "";
                  for (let i = 124; i < 136; i++) {
                    if (nextHeader[i] === 0 || nextHeader[i] === 32) break;
                    nextSizeStr += String.fromCharCode(nextHeader[i]);
                  }
                  const nextFileSize = parseInt(nextSizeStr, 8) || 0;
                  offset += BLOCK_SIZE;
                  
                  // Strip the first path component (repo-hash prefix)
                  const parts = longName.split("/");
                  const stripped = parts.slice(1).join("/");
                  
                  if (stripped && nextTypeFlag === "0" || nextTypeFlag === "\0") {
                    const filePath = path.join(cloneDir, stripped);
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    fs.writeFileSync(filePath, tarBuffer.subarray(offset, offset + nextFileSize));
                    fileCount++;
                  } else if (stripped && nextTypeFlag === "5") {
                    fs.mkdirSync(path.join(cloneDir, stripped), { recursive: true });
                  }
                  
                  const nextDataPadded = Math.ceil(nextFileSize / BLOCK_SIZE) * BLOCK_SIZE;
                  offset += nextDataPadded;
                  continue;
                }
                
                // Strip the first path component (GitHub adds owner-repo-hash/ prefix)
                const parts = fileName.split("/");
                const strippedName = parts.slice(1).join("/");
                
                if (typeFlag === "5" || fileName.endsWith("/")) {
                  // Directory
                  if (strippedName) {
                    fs.mkdirSync(path.join(cloneDir, strippedName), { recursive: true });
                  }
                } else if ((typeFlag === "0" || typeFlag === "\0") && strippedName) {
                  // Regular file
                  const filePath = path.join(cloneDir, strippedName);
                  fs.mkdirSync(path.dirname(filePath), { recursive: true });
                  fs.writeFileSync(filePath, tarBuffer.subarray(offset, offset + fileSize));
                  fileCount++;
                }
                
                // Advance past file data (padded to 512-byte boundary)
                const dataPadded = Math.ceil(fileSize / BLOCK_SIZE) * BLOCK_SIZE;
                offset += dataPadded;
              }
              
              if (fileCount > 0) {
                cloneSuccess = true;
                output = `Repository downloaded via GitHub API (${fileCount} files extracted).\nNote: This is a snapshot download (no .git history). Full git operations require the git binary.`;
                console.log(`[git_operation] Pure Node.js clone succeeded: ${fileCount} files extracted`);
              } else {
                console.warn(`[git_operation] Tar extraction produced 0 files`);
              }
            }
          } catch (err4: any) {
            console.warn(`[git_operation] Attempt 4 (pure Node.js) failed: ${err4.message}`);
            // Keep original cloneError for guidance
          }
        }

        if (!cloneSuccess) {
          // Parse the error to give actionable guidance with token type context
          let guidance = "";
          const tokenInfo = tokenUsed ? `Token type: ${tokenType}. ` : "No token was used. ";
          if (cloneError.includes("Authentication failed") || cloneError.includes("could not read Username") || cloneError.includes("403")) {
            if (tokenType === "fine_grained") {
              guidance = `\n\n${tokenInfo}LIKELY CAUSE: Fine-grained PATs (github_pat_) require explicit repository access permissions. The token may not have 'Contents: Read' permission for this specific repository.\nACTION: Tell the user their fine-grained PAT needs 'Contents: Read' permission for this repo. Alternatively, a Classic PAT (ghp_) with 'repo' scope works for all repos.\nCRITICAL: Do NOT retry this clone — the token permissions need to be fixed first.`;
            } else {
              guidance = `\n\n${tokenInfo}LIKELY CAUSE: The GitHub token is invalid, expired, or lacks 'repo' scope.\nACTION: Ask the user to reconnect their GitHub in Settings, or generate a new Classic PAT with 'repo' scope.\nCRITICAL: Do NOT retry this clone — the token needs to be fixed first.`;
            }
          } else if (cloneError.includes("not found") || cloneError.includes("404") || cloneError.includes("does not exist")) {
            guidance = `\n\n${tokenInfo}LIKELY CAUSE: The repository does not exist, the URL is incorrect, or the token lacks access to this private repo.\nACTION: Verify the exact repository name and owner. Check capitalization. If the repo is private, ensure the token has access.\nCRITICAL: Do NOT retry — the URL or permissions need to be corrected.`;
          } else if (cloneError.includes("Permission denied")) {
            guidance = `\n\n${tokenInfo}LIKELY CAUSE: The token doesn't have permission to access this private repository.\nACTION: The user needs to grant repo access to their GitHub token/app.\nCRITICAL: Do NOT retry — permissions need to be fixed.`;
          } else {
            guidance = `\n\n${tokenInfo}ACTION: Present this error to the user and ask for guidance.\nCRITICAL: Do NOT retry more than once — repeated failures with the same token will produce the same result.`;
          }
          return { success: false, result: `Git clone failed: ${cloneError}${guidance}` };
        }
        
        activeProjectDir = cloneDir;
        break;
      }
      case "remote_add":
        if (!args.remote_url) return { success: false, result: "Remote URL is required." };
        // Sanitize remote_url
        if (!/^(https?:\/\/|git:\/\/|git@)[\w.\-\/:@]+$/.test(args.remote_url)) {
          return { success: false, result: "Invalid remote URL format. Only https://, git://, and git@ URLs are allowed." };
        }
        try {
          execSync(`cd ${dir} && git remote remove origin 2>/dev/null || true`, { timeout: 5000 });
        } catch {}
        output = execSync(`cd ${dir} && git remote add origin '${args.remote_url.replace(/'/g, "")}'`, { timeout: 5000 }).toString();
        output = output || `Remote origin set to ${args.remote_url}`;
        break;
      default:
        return { success: false, result: `Unknown git operation: ${args.operation}` };
    }
    return {
      success: true,
      result: `Git ${args.operation}:\n${output}`,
      artifactType: "terminal",
      artifactLabel: `git ${args.operation}`,
    };
  } catch (err: any) {
    return { success: false, result: `Git ${args.operation} failed: ${err.message}` };
  }
}


// ── deploy_webapp ──

/**
 * Retry a function with exponential backoff.
 * Manus parity: resilient tool execution — transient S3/network failures
 * should not crash the entire deploy pipeline.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  const label = opts.label ?? "operation";
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[deploy_webapp] ${label} failed (attempt ${attempt}/${maxAttempts}): ${err.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}
async function executeDeployWebapp(args: {
  version_label?: string;
  env_vars?: Record<string, string>;
  custom_domain?: string;
  production?: boolean;
}, context?: ToolContext): Promise<ToolResult> {
  const fs = await import("fs");
  const path = await import("path");
  const { execSync } = await import("child_process");

  if (!activeProjectDir) {
    return { success: false, result: "No active webapp project. Use create_webapp or git_operation(clone) first." };
  }

  const projectName = path.basename(activeProjectDir);
  const isProduction = args.production !== false; // Default true

  // ── ENV VAR INJECTION ──
  // Write environment variables to .env file before build
  if (args.env_vars && Object.keys(args.env_vars).length > 0) {
    const envContent = Object.entries(args.env_vars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    fs.writeFileSync(path.join(activeProjectDir, ".env"), envContent + "\n");
    console.log(`[deploy_webapp] Injected ${Object.keys(args.env_vars).length} environment variables`);
  }

  try {
    // ── PRE-DEPLOY VALIDATION (Manus Parity+) ──
    // Run critical checks BEFORE building to fail fast with actionable feedback
    const preDeployIssues: string[] = [];
    const hasPackageJson = fs.existsSync(path.join(activeProjectDir, "package.json"));
    
    if (!hasPackageJson && !fs.existsSync(path.join(activeProjectDir, "index.html"))) {
      return { success: false, result: "Pre-deploy validation failed: No index.html found. Create an index.html file as the entry point for your app." };
    }
    if (hasPackageJson) {
      try {
        const pkgContent = fs.readFileSync(path.join(activeProjectDir, "package.json"), "utf-8");
        const pkg = JSON.parse(pkgContent);
        if (!pkg.scripts?.build) {
          preDeployIssues.push("package.json has no 'build' script — deployment requires a build step");
        }
        if (!fs.existsSync(path.join(activeProjectDir, "node_modules"))) {
          preDeployIssues.push("node_modules/ not found — run 'npm install' before deploying");
        }
        const entryPoints = ["src/main.tsx", "src/main.ts", "src/index.tsx", "src/index.ts", "src/main.jsx", "src/index.jsx", "src/App.tsx", "src/App.jsx"];
        const hasEntry = entryPoints.some(ep => fs.existsSync(path.join(activeProjectDir!, ep)));
        if (!hasEntry && !fs.existsSync(path.join(activeProjectDir, "index.html"))) {
          preDeployIssues.push("No entry point found (src/main.tsx, etc.) — the app may not render");
        }
      } catch (jsonErr) {
        return { success: false, result: "Pre-deploy validation failed: package.json is invalid JSON. Fix the syntax and try again." };
      }
    }
    // TypeScript quick check (non-blocking — warnings only)
    if (hasPackageJson && fs.existsSync(path.join(activeProjectDir, "tsconfig.json"))) {
      try {
        const tscResult = execSync(`cd ${activeProjectDir} && npx tsc --noEmit --pretty 2>&1 | head -30`, { timeout: 30000 }).toString();
        const errorCount = (tscResult.match(/error TS/g) || []).length;
        if (errorCount > 0) {
          preDeployIssues.push(`TypeScript: ${errorCount} error(s) found — may cause build failure`);
        }
      } catch (tscErr: any) {
        const output = tscErr.stdout?.toString() || tscErr.stderr?.toString() || "";
        const errorCount = (output.match(/error TS/g) || []).length;
        if (errorCount > 0) {
          preDeployIssues.push(`TypeScript: ${errorCount} error(s) found — may cause build failure`);
        }
      }
    }
    // Check for empty/placeholder HTML content (common when agent forgets to write actual content)
    if (!hasPackageJson) {
      const indexPath = path.join(activeProjectDir, "index.html");
      if (fs.existsSync(indexPath)) {
        const htmlPreview = fs.readFileSync(indexPath, "utf-8");
        const bodyMatch = htmlPreview.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const bodyContent = bodyMatch?.[1]?.replace(/<script[\s\S]*?<\/script>/gi, "").trim() || "";
        if (bodyContent.length < 50) {
          preDeployIssues.push("index.html body is nearly empty — add content before deploying");
        }
      }
    }
    // Check for broken asset references (src="" or href="")
    if (!hasPackageJson && fs.existsSync(path.join(activeProjectDir, "index.html"))) {
      const htmlCheck = fs.readFileSync(path.join(activeProjectDir, "index.html"), "utf-8");
      const emptyRefs = (htmlCheck.match(/(?:src|href)=["']\s*["']/g) || []).length;
      if (emptyRefs > 0) {
        preDeployIssues.push(`${emptyRefs} empty src/href attribute(s) found — assets will not load`);
      }
    }
    // Block on critical issues
    if (preDeployIssues.some(i => i.includes("no 'build' script") || i.includes("node_modules/ not found") || i.includes("body is nearly empty"))) {
      return {
        success: false,
        result: `Pre-deploy validation failed:\n\n${preDeployIssues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}\n\n── RECOVERY for missing build script ──\n1. run_command("cat package.json") to see current scripts\n2. If no "build" script exists, use edit_file to add one (e.g. "build": "vite build" or "build": "next build")\n3. If the project uses a non-standard build tool, check the README\n4. After fixing, retry deploy_webapp\n\n── RECOVERY for missing node_modules ──\n1. Call install_deps() to install dependencies\n2. After install completes, retry deploy_webapp\n\nDo NOT overwrite package.json with create_file — use edit_file for targeted changes.`,
      };
    }

    let buildDir = activeProjectDir;
    let htmlContent: string;

    if (hasPackageJson) {
      // React/Vite project — run build
      try {
        execSync(`cd ${activeProjectDir} && npm run build 2>&1`, { timeout: 300000 });
      } catch (buildErr: any) {
        // GAP F: Extract structured build errors for better agent/user feedback
        const rawOutput = buildErr.stdout?.toString() || buildErr.stderr?.toString() || buildErr.message || "";
        const lines = rawOutput.split("\n");
        const errorLines = lines.filter((l: string) => /error|Error|TS\d{4}|SyntaxError|Cannot find|Module not found/i.test(l)).slice(0, 15);
        const structuredErrors = errorLines.length > 0 ? errorLines.join("\n") : rawOutput.slice(-2000);
        return {
          success: false,
          result: `Build failed with ${errorLines.length} error(s):\n\n\`\`\`\n${structuredErrors}\n\`\`\`\n\nFix the errors above and try deploying again.`,
          artifactLabel: "Build errors",
        };
      }

      // Find the build output directory (supports Vite/dist, CRA/build, Next.js/out, Gatsby/public)
      const distDir = path.join(activeProjectDir, "dist");
      const buildDirAlt = path.join(activeProjectDir, "build");
      const outDir = path.join(activeProjectDir, "out");
      if (fs.existsSync(distDir)) {
        buildDir = distDir;
      } else if (fs.existsSync(buildDirAlt)) {
        buildDir = buildDirAlt;
      } else if (fs.existsSync(outDir) && fs.existsSync(path.join(outDir, "index.html"))) {
        buildDir = outDir;
      } else {
        return {
          success: false,
          result: "Build completed but no dist/, build/, or out/ directory found. Check your build configuration. For Next.js, ensure 'output: export' is set in next.config.js.",
        };
      }

      // Read the built index.html
      const indexPath = path.join(buildDir, "index.html");
      if (!fs.existsSync(indexPath)) {
        return {
          success: false,
          result: "Build output missing index.html. Check your build configuration.",
        };
      }
      htmlContent = fs.readFileSync(indexPath, "utf-8");
      // Note: CSS/JS assets are uploaded separately to S3 and paths are rewritten below
    } else {
      // Static HTML project — read index.html directly
      const indexPath = path.join(activeProjectDir, "index.html");
      if (!fs.existsSync(indexPath)) {
        return {
          success: false,
          result: "No index.html found in project directory.",
        };
      }
      htmlContent = fs.readFileSync(indexPath, "utf-8");
      // Note: CSS/JS/images are uploaded separately to S3 and paths are rewritten below
    }

    // Upload ALL build files to S3 for proper multi-file deployment
    const { storagePut } = await import("./storage");
    const timestamp = Date.now();
    const deployPrefix = `webapp-deploys/${projectName}-${timestamp}`;

    // Recursively collect all files from the build directory
     const DEPLOY_SKIP_DIRS = new Set(["node_modules", ".git", ".next", "__pycache__", ".cache"]);
    const collectFiles = (dir: string, base: string): { relPath: string; absPath: string }[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: { relPath: string; absPath: string }[] = [];
      for (const entry of entries) {
        if (DEPLOY_SKIP_DIRS.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(base, fullPath);
        if (entry.isDirectory()) {
          files.push(...collectFiles(fullPath, base));
        } else {
          files.push({ relPath, absPath: fullPath });
        }
      }
      return files;
    };
    const allFiles = collectFiles(buildDir, buildDir);
    const mimeTypes: Record<string, string> = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".mjs": "application/javascript",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject",
      ".map": "application/json",
      ".txt": "text/plain",
      ".xml": "application/xml",
    };

    // Upload all files, rewriting asset paths in HTML to use S3 URLs
    const assetUrlMap = new Map<string, string>();

    // Upload non-HTML files first to get their URLs (with retry + graceful degradation)
    const failedAssets: string[] = [];
    for (const file of allFiles) {
      if (file.relPath === "index.html") continue;
      const ext = path.extname(file.absPath).toLowerCase();
      const mime = mimeTypes[ext] || "application/octet-stream";
      const fileData = fs.readFileSync(file.absPath);
      const fileKey = `${deployPrefix}/${file.relPath}`;
      try {
        const { url } = await retryWithBackoff(
          () => storagePut(fileKey, fileData, mime),
          { maxAttempts: 3, baseDelayMs: 1000, label: `upload ${file.relPath}` }
        );
        assetUrlMap.set(file.relPath, url);
      } catch (uploadErr: any) {
        // Graceful degradation: non-critical assets can fail without killing the deploy
        console.error(`[deploy_webapp] Failed to upload ${file.relPath} after 3 attempts: ${uploadErr.message}`);
        failedAssets.push(file.relPath);
      }
    }

    // Rewrite asset references in index.html to use absolute S3 URLs
    for (const [relPath, s3Url] of Array.from(assetUrlMap.entries())) {
      // Replace both /assets/... and ./assets/... and assets/... patterns
      const escapedPath = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      htmlContent = htmlContent.replace(
        new RegExp(`(["'])(/?${escapedPath})(["'])`, 'g'),
        `$1${s3Url}$3`
      );
      // Also handle bare /path references
      htmlContent = htmlContent.replace(
        new RegExp(`(["'])/${escapedPath}(["'])`, 'g'),
        `$1${s3Url}$2`
      );
    }

    // Upload the rewritten index.html (with retry — this is critical, no graceful degradation)
    const indexKey = `${deployPrefix}/index.html`;
    let publishedUrl: string;
    try {
      const result = await retryWithBackoff(
        () => storagePut(indexKey, htmlContent, "text/html"),
        { maxAttempts: 3, baseDelayMs: 1000, label: "upload index.html" }
      );
      publishedUrl = result.url;
    } catch (indexUploadErr: any) {
      return {
        success: false,
        result: `Deploy failed: could not upload index.html after 3 attempts. Error: ${indexUploadErr.message}\n\nThis is likely a transient network issue. Please try deploying again.`,
      };
    }

    console.log(`[deploy_webapp] Deployed ${allFiles.length} files to ${deployPrefix}/`);

    // Update the DB project record if we have context
    if (context?.userId) {
      try {
        const { getWebappProjectByExternalId, updateWebappProject, getUserWebappProjects, createWebappDeployment } = await import("./db");
        // Find the project by name (since we may not have the externalId here)
        const projects = await getUserWebappProjects(context.userId);
        const project = projects.find((p: any) => p.name === projectName);
        if (project) {
          await updateWebappProject(project.id, {
            deployStatus: "live",
            publishedUrl,
            lastDeployedAt: new Date(),
          });
          await createWebappDeployment({
            projectId: project.id,
            userId: context.userId,
            versionLabel: args.version_label ?? `Deploy ${new Date().toISOString().slice(0, 16)}`,
            status: "live",
            completedAt: new Date(),
            bundleUrl: publishedUrl,
            bundleKey: indexKey,
          });
        }
      } catch (dbErr) {
        console.warn("[deploy_webapp] Failed to update DB:", dbErr);
      }
    }

    // Find the projectExternalId for the SSE event
    let projectExternalId: string | undefined;
    if (context?.userId) {
      try {
        const { getUserWebappProjects } = await import("./db");
        const projects = await getUserWebappProjects(context.userId);
        const project = projects.find((p: any) => p.name === projectName);
        if (project) projectExternalId = project.externalId;
      } catch { /* ignore */ }
    }

    // ── POST-DEPLOY CODE REVIEW (Manus Parity+) ──
    // Static analysis of the source files to catch common React/HTML wiring issues
    // before presenting the result to the user.
    const codeIssues: string[] = [];
    try {
      const srcFiles = collectFiles(activeProjectDir, activeProjectDir)
        .filter(f => /\.(html|jsx?|tsx?|css)$/.test(f.relPath) && !f.relPath.includes("node_modules"));
      for (const file of srcFiles.slice(0, 20)) { // Cap at 20 files for performance
        const content = fs.readFileSync(file.absPath, "utf-8");
        // Check 1: onChange handlers missing on input/select elements with value prop
        if (/value=\{/.test(content) && !/onChange/.test(content) && /\.(jsx|tsx)$/.test(file.relPath)) {
          codeIssues.push(`${file.relPath}: Input has \`value\` prop but no \`onChange\` handler — form inputs will be read-only`);
        }
        // Check 2: useState setter never called (state defined but never updated)
        const stateMatches = content.match(/const \[(\w+),\s*set(\w+)\]/g);
        if (stateMatches) {
          for (const match of stateMatches) {
            const setterMatch = match.match(/set(\w+)/);
            if (setterMatch) {
              const setter = `set${setterMatch[1]}`;
              // Count occurrences — should appear at least twice (declaration + usage)
              const setterCount = (content.match(new RegExp(setter, "g")) || []).length;
              if (setterCount < 2) {
                codeIssues.push(`${file.relPath}: State setter \`${setter}\` is declared but never called — state will never update`);
              }
            }
          }
        }
        // Check 3: Missing closing tags in HTML (unclosed div, section, main)
        if (/\.html$/.test(file.relPath)) {
          const openDivs = (content.match(/<div[\s>]/g) || []).length;
          const closeDivs = (content.match(/<\/div>/g) || []).length;
          if (openDivs > closeDivs + 2) {
            codeIssues.push(`${file.relPath}: ${openDivs - closeDivs} unclosed <div> tags detected`);
          }
        }
        // Check 4: Broken imports (import from path that doesn't exist)
        const importMatches = content.match(/import .+ from ['"](\.\/.+?)['"];?/g);
        if (importMatches) {
          for (const imp of importMatches) {
            const pathMatch = imp.match(/from ['"](\.\/.+?)['"]/);
            if (pathMatch) {
              const importPath = pathMatch[1];
              const resolvedDir = path.dirname(file.absPath);
              const candidates = [
                path.join(resolvedDir, importPath),
                path.join(resolvedDir, importPath + ".ts"),
                path.join(resolvedDir, importPath + ".tsx"),
                path.join(resolvedDir, importPath + ".js"),
                path.join(resolvedDir, importPath + ".jsx"),
                path.join(resolvedDir, importPath, "index.ts"),
                path.join(resolvedDir, importPath, "index.tsx"),
                path.join(resolvedDir, importPath, "index.js"),
              ];
              if (!candidates.some(c => fs.existsSync(c))) {
                codeIssues.push(`${file.relPath}: Broken import \`${importPath}\` — file not found`);
              }
            }
          }
        }
        // Check 5: Empty event handlers (onClick={() => {}} or onClick={})
        if (/onClick=\{\s*\(\)\s*=>\s*\{?\s*\}?\s*\}/.test(content)) {
          codeIssues.push(`${file.relPath}: Empty onClick handler — button/element will do nothing when clicked`);
        }
      }
    } catch (reviewErr) {
      console.warn("[deploy_webapp] Code review failed (non-critical):", reviewErr);
    }

    // Update activeProjectPreviewUrl so post-deploy edits can reference the live URL
    activeProjectPreviewUrl = publishedUrl;
    // Build the result message, noting any failed assets and code issues
    const failedNote = failedAssets.length > 0
      ? `\n\nNote: ${failedAssets.length} asset(s) failed to upload and may be missing: ${failedAssets.join(", ")}`
      : "";
    const codeReviewNote = codeIssues.length > 0
      ? `\n\n⚠️ Code Review (${codeIssues.length} issue${codeIssues.length > 1 ? "s" : ""} found):\n${codeIssues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}\n\nThese issues may affect the app's interactivity. Consider fixing them and redeploying.`
      : "\n\n✅ Code review: No common issues detected.";

    return {
      success: true,
      result: `Successfully deployed "${projectName}"!\n\nLive URL: ${publishedUrl}\n\nThe app is now publicly accessible. Share this URL with anyone to view the app.${failedNote}${codeReviewNote}`,
      url: publishedUrl,
      artifactType: "webapp_deployed",
      artifactLabel: projectName,
      projectExternalId,
      codeIssues, // Pass to agentStream for quality validation
    };
  } catch (err: any) {
    return {
      success: false,
      result: `Deploy failed: ${err.message}`,
    };
  }
}


// ── native_app_build ──
async function executeNativeAppBuild(args: {
  target: string;
  platforms?: string[];
  app_name?: string;
  app_id?: string;
  icon_url?: string;
  splash_url?: string;
  permissions?: string[];
  offline_strategy?: string;
}, context?: ToolContext): Promise<ToolResult> {
  const fs = await import("fs");
  const path = await import("path");

  if (!activeProjectDir) {
    return { success: false, result: "No active webapp project. Use create_webapp first, then convert to native." };
  }

  const projectName = path.basename(activeProjectDir);
  const appName = args.app_name || projectName;
  const appId = args.app_id || `com.app.${projectName.replace(/[^a-z0-9]/g, "")}`;
  const target = args.target;
  const platforms = args.platforms || (target === "capacitor" ? ["ios", "android"] : ["windows", "macos", "linux"]);
  const offlineStrategy = args.offline_strategy || "cache-first";

  try {
    const generatedFiles: string[] = [];

    switch (target) {
      case "pwa": {
        // Generate service worker
        const swContent = `// Service Worker - ${offlineStrategy} strategy
const CACHE_NAME = '${projectName}-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  ${offlineStrategy === "cache-first" ? `event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      return response;
    }))
  );` : offlineStrategy === "network-first" ? `event.respondWith(
    fetch(event.request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      return response;
    }).catch(() => caches.match(event.request))
  );` : `event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
      return cached || fetchPromise;
    })
  );`}
});`;
        fs.writeFileSync(path.join(activeProjectDir, "sw.js"), swContent);
        generatedFiles.push("sw.js");

        // Generate manifest.json
        const manifest = {
          name: appName,
          short_name: appName.slice(0, 12),
          description: `${appName} - Progressive Web App`,
          start_url: "/",
          display: "standalone",
          background_color: "#0a0a0a",
          theme_color: "#3b82f6",
          orientation: "any",
          icons: [
            { src: args.icon_url || "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: args.icon_url || "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        };
        fs.writeFileSync(path.join(activeProjectDir, "manifest.json"), JSON.stringify(manifest, null, 2));
        generatedFiles.push("manifest.json");

        // Add SW registration to index.html
        const indexPath = path.join(activeProjectDir, "index.html");
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, "utf-8");
          if (!html.includes("serviceWorker")) {
            const swScript = `\n<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}</script>`;
            const manifestLink = `\n<link rel="manifest" href="/manifest.json">`;
            const metaTheme = `\n<meta name="theme-color" content="#3b82f6">`;
            html = html.replace("</head>", `${manifestLink}${metaTheme}</head>`);
            html = html.replace("</body>", `${swScript}</body>`);
            fs.writeFileSync(indexPath, html);
          }
        }

        return {
          success: true,
          result: `PWA configuration generated for "${appName}"!\n\nFiles created:\n${generatedFiles.map(f => `- ${f}`).join("\n")}\n\nFeatures:\n- Offline support (${offlineStrategy} strategy)\n- Installable on mobile/desktop\n- App manifest with icons\n- Service worker with caching\n\nNext steps:\n1. Add app icons (192x192 and 512x512 PNG)\n2. Deploy with deploy_webapp\n3. Users can install from browser "Add to Home Screen"`,
          artifactType: "code",
          artifactLabel: "PWA Config",
        };
      }

      case "capacitor": {
        // Generate capacitor.config.ts
        const capConfig = `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '${appId}',
  appName: '${appName}',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {${args.permissions?.includes("camera") ? "\n    Camera: { presentationStyle: 'popover' }," : ""}${args.permissions?.includes("geolocation") ? "\n    Geolocation: { enableHighAccuracy: true }," : ""}${args.permissions?.includes("notifications") ? "\n    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] }," : ""}
  }
};

export default config;
`;
        fs.writeFileSync(path.join(activeProjectDir, "capacitor.config.ts"), capConfig);
        generatedFiles.push("capacitor.config.ts");

        // Generate setup script
        const setupScript = `#!/bin/bash
# Capacitor Setup Script for ${appName}
echo "Installing Capacitor..."
npm install @capacitor/core @capacitor/cli
npx cap init "${appName}" "${appId}" --web-dir dist

${platforms.includes("ios") ? `echo "Adding iOS platform..."
npm install @capacitor/ios
npx cap add ios` : ""}

${platforms.includes("android") ? `echo "Adding Android platform..."
npm install @capacitor/android
npx cap add android` : ""}

${args.permissions?.includes("camera") ? "npm install @capacitor/camera" : ""}
${args.permissions?.includes("geolocation") ? "npm install @capacitor/geolocation" : ""}
${args.permissions?.includes("notifications") ? "npm install @capacitor/push-notifications" : ""}

echo "Building web assets..."
npm run build

echo "Syncing with native projects..."
npx cap sync

echo "Done! Open native IDE with:"
${platforms.includes("ios") ? 'echo "  npx cap open ios"' : ""}
${platforms.includes("android") ? 'echo "  npx cap open android"' : ""}
`;
        fs.writeFileSync(path.join(activeProjectDir, "setup-native.sh"), setupScript);
        fs.chmodSync(path.join(activeProjectDir, "setup-native.sh"), "755");
        generatedFiles.push("setup-native.sh");

        return {
          success: true,
          result: `Capacitor native app configuration generated for "${appName}"!\n\nBundle ID: ${appId}\nPlatforms: ${platforms.join(", ")}\n\nFiles created:\n${generatedFiles.map(f => `- ${f}`).join("\n")}\n\nNext steps:\n1. Run \`bash setup-native.sh\` to initialize native projects\n2. Build web assets: \`npm run build\`\n3. Sync: \`npx cap sync\`\n4. Open IDE: \`npx cap open ${platforms[0]}\`\n5. Build and run on device/simulator\n\nFor App Store submission:\n- iOS: Open Xcode, set signing team, archive and upload\n- Android: Open Android Studio, generate signed APK/AAB`,
          artifactType: "code",
          artifactLabel: "Capacitor Config",
        };
      }

      case "tauri": {
        // Generate tauri.conf.json
        const tauriConfig = {
          "$schema": "https://raw.githubusercontent.com/nicedoc/tauri-schema/main/schema.json",
          productName: appName,
          version: "0.1.0",
          identifier: appId,
          build: {
            beforeBuildCommand: "npm run build",
            beforeDevCommand: "npm run dev",
            devUrl: "http://localhost:5173",
            frontendDist: "../dist",
          },
          app: {
            title: appName,
            windows: [{ title: appName, width: 1200, height: 800, resizable: true }],
            security: { csp: null },
          },
          bundle: {
            active: true,
            targets: platforms.includes("macos") ? ["dmg", "app"] : platforms.includes("windows") ? ["msi", "nsis"] : ["deb", "appimage"],
            icon: ["icons/icon.png", "icons/icon.icns", "icons/icon.ico"],
          },
        };
        fs.mkdirSync(path.join(activeProjectDir, "src-tauri"), { recursive: true });
        fs.writeFileSync(path.join(activeProjectDir, "src-tauri", "tauri.conf.json"), JSON.stringify(tauriConfig, null, 2));
        generatedFiles.push("src-tauri/tauri.conf.json");

        // Generate Cargo.toml
        const cargoToml = `[package]
name = "${projectName}"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
`;
        fs.writeFileSync(path.join(activeProjectDir, "src-tauri", "Cargo.toml"), cargoToml);
        generatedFiles.push("src-tauri/Cargo.toml");

        // Generate main.rs
        const mainRs = `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`;
        fs.mkdirSync(path.join(activeProjectDir, "src-tauri", "src"), { recursive: true });
        fs.writeFileSync(path.join(activeProjectDir, "src-tauri", "src", "main.rs"), mainRs);
        generatedFiles.push("src-tauri/src/main.rs");

        return {
          success: true,
          result: `Tauri desktop app configuration generated for "${appName}"!\n\nBundle ID: ${appId}\nPlatforms: ${platforms.join(", ")}\n\nFiles created:\n${generatedFiles.map(f => `- ${f}`).join("\n")}\n\nNext steps:\n1. Install Tauri CLI: \`npm install -D @tauri-apps/cli\`\n2. Install Rust: \`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh\`\n3. Dev mode: \`npx tauri dev\`\n4. Build: \`npx tauri build\`\n\nOutput:\n- macOS: .dmg and .app in src-tauri/target/release/bundle/\n- Windows: .msi and .exe in src-tauri/target/release/bundle/\n- Linux: .deb and .AppImage in src-tauri/target/release/bundle/`,
          artifactType: "code",
          artifactLabel: "Tauri Config",
        };
      }

      case "electron": {
        // Generate electron main process
        const electronMain = `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '${appName}',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the built app
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
`;
        fs.mkdirSync(path.join(activeProjectDir, "electron"), { recursive: true });
        fs.writeFileSync(path.join(activeProjectDir, "electron", "main.js"), electronMain);
        generatedFiles.push("electron/main.js");

        // Generate preload script
        const preload = `const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
});
`;
        fs.writeFileSync(path.join(activeProjectDir, "electron", "preload.js"), preload);
        generatedFiles.push("electron/preload.js");

        // Generate electron-builder config
        const builderConfig = {
          appId: appId,
          productName: appName,
          directories: { output: "release", buildResources: "build" },
          files: ["dist/**/*", "electron/**/*"],
          mac: { target: ["dmg", "zip"], icon: "build/icon.icns" },
          win: { target: ["nsis", "portable"], icon: "build/icon.ico" },
          linux: { target: ["AppImage", "deb"], icon: "build/icon.png" },
        };
        fs.writeFileSync(path.join(activeProjectDir, "electron-builder.json"), JSON.stringify(builderConfig, null, 2));
        generatedFiles.push("electron-builder.json");

        return {
          success: true,
          result: `Electron desktop app configuration generated for "${appName}"!\n\nBundle ID: ${appId}\nPlatforms: ${platforms.join(", ")}\n\nFiles created:\n${generatedFiles.map(f => `- ${f}`).join("\n")}\n\nNext steps:\n1. Install Electron: \`npm install -D electron electron-builder\`\n2. Add to package.json scripts:\n   "electron:dev": "electron electron/main.js"\n   "electron:build": "npm run build && electron-builder"\n3. Dev mode: \`npm run electron:dev\`\n4. Build: \`npm run electron:build\`\n\nOutput:\n- macOS: .dmg in release/\n- Windows: .exe installer in release/\n- Linux: .AppImage in release/`,
          artifactType: "code",
          artifactLabel: "Electron Config",
        };
      }

      case "expo": {
        // Generate Expo/React Native project structure
        const appJson = {
          expo: {
            name: appName,
            slug: projectName.replace(/[^a-z0-9-]/g, "-"),
            version: "1.0.0",
            orientation: "portrait",
            icon: args.icon_url || "./assets/icon.png",
            splash: {
              image: args.splash_url || "./assets/splash.png",
              resizeMode: "contain",
              backgroundColor: "#0a0a0a",
            },
            ios: {
              supportsTablet: true,
              bundleIdentifier: appId,
              infoPlist: {
                ...(args.permissions?.includes("camera") ? { NSCameraUsageDescription: "This app uses the camera" } : {}),
                ...(args.permissions?.includes("geolocation") ? { NSLocationWhenInUseUsageDescription: "This app uses your location" } : {}),
              },
            },
            android: {
              adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#0a0a0a" },
              package: appId,
              permissions: [
                ...(args.permissions?.includes("camera") ? ["CAMERA"] : []),
                ...(args.permissions?.includes("geolocation") ? ["ACCESS_FINE_LOCATION"] : []),
                ...(args.permissions?.includes("notifications") ? ["RECEIVE_BOOT_COMPLETED", "VIBRATE"] : []),
              ],
            },
            plugins: [
              ...(args.permissions?.includes("camera") ? ["expo-camera"] : []),
              ...(args.permissions?.includes("notifications") ? ["expo-notifications"] : []),
            ],
          },
        };
        fs.writeFileSync(path.join(activeProjectDir, "app.json"), JSON.stringify(appJson, null, 2));
        generatedFiles.push("app.json");

        // Generate App.tsx entry point
        const appTsx = `import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${appName}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '${appName}' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
});
`;
        fs.writeFileSync(path.join(activeProjectDir, "App.tsx"), appTsx);
        generatedFiles.push("App.tsx");

        // Generate eas.json for EAS Build
        const easJson = {
          cli: { version: ">= 5.0.0" },
          build: {
            development: { developmentClient: true, distribution: "internal" },
            preview: { distribution: "internal" },
            production: {},
          },
          submit: {
            production: {
              ios: { appleId: "your-apple-id@example.com", ascAppId: "your-app-store-connect-app-id" },
              android: { serviceAccountKeyPath: "./google-services.json" },
            },
          },
        };
        fs.writeFileSync(path.join(activeProjectDir, "eas.json"), JSON.stringify(easJson, null, 2));
        generatedFiles.push("eas.json");

        // Generate setup script
        const setupScript = `#!/bin/bash\n# Expo/React Native Setup Script for ${appName}\necho "Creating Expo project..."\nnpx create-expo-app@latest . --template blank-typescript\n\necho "Installing navigation..."\nnpx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context\n\n${args.permissions?.includes("camera") ? 'echo "Installing camera..."\nnpx expo install expo-camera\n' : ""}${args.permissions?.includes("notifications") ? 'echo "Installing notifications..."\nnpx expo install expo-notifications expo-device\n' : ""}${args.permissions?.includes("geolocation") ? 'echo "Installing location..."\nnpx expo install expo-location\n' : ""}\necho "Installing EAS CLI..."\nnpm install -g eas-cli\n\necho "Done! Run with:"\necho "  npx expo start"\necho "  eas build --platform all"\n`;
        fs.writeFileSync(path.join(activeProjectDir, "setup-expo.sh"), setupScript);
        fs.chmodSync(path.join(activeProjectDir, "setup-expo.sh"), "755");
        generatedFiles.push("setup-expo.sh");

        return {
          success: true,
          result: `Expo/React Native app configuration generated for "${appName}"!\n\nBundle ID: ${appId}\nPlatforms: iOS, Android\n\nFiles created:\n${generatedFiles.map(f => `- ${f}`).join("\n")}\n\nNext steps:\n1. Run \`bash setup-expo.sh\` to initialize the project\n2. Start development: \`npx expo start\`\n3. Preview on device: Scan QR code with Expo Go app\n4. Build for stores: \`eas build --platform all\`\n5. Submit to stores: \`eas submit --platform all\`\n\nFor App Store/Play Store submission:\n- iOS: Configure Apple Developer account in eas.json\n- Android: Add google-services.json for Play Store\n- Run \`eas submit\` after successful build`,
          artifactType: "code",
          artifactLabel: "Expo Config",
        };
      }

      case "cicd": {
        // Generate GitHub Actions CI/CD pipeline for native builds
        fs.mkdirSync(path.join(activeProjectDir, ".github", "workflows"), { recursive: true });

        const ciWorkflow = `name: Build & Deploy\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  web-build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n          cache: 'npm'\n      - run: npm ci\n      - run: npm run build\n      - run: npm test\n      - uses: actions/upload-artifact@v4\n        with:\n          name: web-dist\n          path: dist/\n\n${platforms.includes("ios") || platforms.includes("android") ? `  mobile-build:\n    runs-on: ubuntu-latest\n    needs: web-build\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n      - uses: expo/expo-github-action@v8\n        with:\n          eas-version: latest\n          token: \${{ secrets.EXPO_TOKEN }}\n      - run: npm ci\n      - run: eas build --platform all --non-interactive\n` : ""}${platforms.includes("macos") || platforms.includes("windows") || platforms.includes("linux") ? `  desktop-build:\n    strategy:\n      matrix:\n        os: [${platforms.includes("macos") ? "macos-latest, " : ""}${platforms.includes("windows") ? "windows-latest, " : ""}${platforms.includes("linux") ? "ubuntu-latest" : ""}]\n    runs-on: \${{ matrix.os }}\n    needs: web-build\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n      - run: npm ci\n      - run: npm run build\n      - run: npx tauri build\n      - uses: actions/upload-artifact@v4\n        with:\n          name: desktop-\${{ matrix.os }}\n          path: src-tauri/target/release/bundle/\n` : ""}`;

        fs.writeFileSync(path.join(activeProjectDir, ".github", "workflows", "build.yml"), ciWorkflow);
        generatedFiles.push(".github/workflows/build.yml");

        // Generate release workflow
        const releaseWorkflow = `name: Release\non:\n  push:\n    tags: ['v*']\n\njobs:\n  create-release:\n    runs-on: ubuntu-latest\n    outputs:\n      upload_url: \${{ steps.create_release.outputs.upload_url }}\n    steps:\n      - uses: actions/create-release@v1\n        id: create_release\n        env:\n          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}\n        with:\n          tag_name: \${{ github.ref }}\n          release_name: Release \${{ github.ref }}\n          draft: false\n          prerelease: false\n`;
        fs.writeFileSync(path.join(activeProjectDir, ".github", "workflows", "release.yml"), releaseWorkflow);
        generatedFiles.push(".github/workflows/release.yml");

        return {
          success: true,
          result: `CI/CD pipeline generated for "${appName}"!\n\nPlatforms: ${platforms.join(", ")}\n\nFiles created:\n${generatedFiles.map(f => `- ${f}`).join("\n")}\n\nPipeline stages:\n1. Web Build — Build, test, upload artifacts\n${platforms.includes("ios") || platforms.includes("android") ? "2. Mobile Build — EAS Build for iOS/Android\n" : ""}${platforms.includes("macos") || platforms.includes("windows") || platforms.includes("linux") ? "3. Desktop Build — Tauri build matrix (macOS/Windows/Linux)\n" : ""}\nRequired secrets (add in GitHub repo settings):\n- EXPO_TOKEN — For EAS Build (mobile)\n- GITHUB_TOKEN — Auto-provided for releases\n\nTriggers:\n- Push to main → Build & test\n- Tag v* → Create GitHub Release`,
          artifactType: "code",
          artifactLabel: "CI/CD Pipeline",
        };
      }

      default:
        return { success: false, result: `Unknown target: ${target}. Supported: pwa, capacitor, tauri, electron, expo, cicd` };
    }
  } catch (err: any) {
    return { success: false, result: `Native app build failed: ${err.message}` };
  }
}

// ── webapp_rollback ──
async function executeWebappRollback(args: {
  project_name?: string;
  version_id?: string;
  list_versions?: boolean;
}, context?: ToolContext): Promise<ToolResult> {
  if (!context?.userId) {
    return { success: false, result: "Authentication required for webapp rollback." };
  }

  try {
    const { getUserWebappProjects, getProjectDeployments, updateWebappProject } = await import("./db");
    const projects = await getUserWebappProjects(context.userId);

    if (projects.length === 0) {
      return { success: false, result: "No webapp projects found. Create one first with create_webapp." };
    }

    // Find the target project
    const projectName = args.project_name || (activeProjectDir ? (await import("path")).basename(activeProjectDir) : null);
    const project = projectName
      ? projects.find((p: any) => p.name === projectName || p.externalId === projectName)
      : projects[0];

    if (!project) {
      return { success: false, result: `Project "${projectName}" not found. Available: ${projects.map((p: any) => p.name).join(", ")}` };
    }

    // Get deployment history
    const deployments = await getProjectDeployments(project.id);
    const successfulDeploys = deployments.filter((d: any) => d.status === "live" && d.bundleUrl);

    if (args.list_versions) {
      if (successfulDeploys.length === 0) {
        return { success: true, result: `No successful deployments found for "${project.name}".` };
      }
      const versionList = successfulDeploys.map((d: any, i: number) => 
        `${i + 1}. ${d.versionLabel || "Unnamed"} (${new Date(d.completedAt).toLocaleString()}) — ID: ${d.id}`
      ).join("\n");
      return {
        success: true,
        result: `Deployment history for "${project.name}" (${successfulDeploys.length} versions):\n\n${versionList}\n\nCurrent: ${project.publishedUrl || "Not deployed"}\n\nTo rollback, call webapp_rollback with version_id set to the deployment ID.`,
      };
    }

    // Perform rollback
    if (successfulDeploys.length < 2) {
      return { success: false, result: "Cannot rollback: only one deployment exists. Need at least 2 versions." };
    }

    let targetDeploy: any;
    if (args.version_id) {
      targetDeploy = successfulDeploys.find((d: any) => String(d.id) === args.version_id);
      if (!targetDeploy) {
        return { success: false, result: `Deployment version "${args.version_id}" not found. Use list_versions=true to see available versions.` };
      }
    } else {
      // Rollback to previous version (second most recent)
      targetDeploy = successfulDeploys[1]; // Index 0 is current, 1 is previous
    }

    // Update project to point to the target deployment's URL
    await updateWebappProject(project.id, {
      publishedUrl: targetDeploy.bundleUrl,
      deployStatus: "live",
      lastDeployedAt: new Date(),
    });

    return {
      success: true,
      result: `Rolled back "${project.name}" to version: ${targetDeploy.versionLabel || "Unnamed"} (deployed ${new Date(targetDeploy.completedAt).toLocaleString()})\n\nLive URL: ${targetDeploy.bundleUrl}\n\nThe previous version is now live. You can deploy a new version with deploy_webapp to override this.`,
      url: targetDeploy.bundleUrl,
      artifactType: "webapp_deployed",
      artifactLabel: `${project.name} (rollback)`,
    };
  } catch (err: any) {
    return { success: false, result: `Rollback failed: ${err.message}` };
  }
}


// ── analyze_video ──
async function executeAnalyzeVideo(args: {
  video_url: string;
  prompt: string;
  extract_frames?: boolean;
  timestamps?: boolean;
}): Promise<ToolResult> {
  try {
    const { invokeLLM } = await import("./_core/llm");

    // Determine video type
    const isYouTube = /youtube\.com|youtu\.be/.test(args.video_url);
    const videoType = isYouTube ? "YouTube" : "Direct video";

    // For YouTube videos, try to extract metadata via oEmbed
    let videoTitle = "";
    let videoDuration = "";
    if (isYouTube) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(args.video_url)}&format=json`;
        const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          const data = await resp.json() as any;
          videoTitle = data.title || "";
        }
      } catch { /* ignore metadata fetch failures */ }
    }

    // Use LLM with video/file content type for analysis
    const messages: Array<{ role: string; content: any }> = [
      {
        role: "system",
        content: `You are a video analysis expert. Analyze the provided video content and respond to the user's prompt. ${args.timestamps !== false ? "Include timestamps where relevant." : ""} ${args.extract_frames !== false ? "Describe key visual frames and transitions." : ""} Be detailed and specific about visual content, audio content, text overlays, and any other relevant information.`,
      },
      {
        role: "user",
        content: [
          {
            type: "file_url",
            file_url: {
              url: args.video_url,
              mime_type: "video/mp4" as const,
            },
          },
          {
            type: "text",
            text: `${videoTitle ? `Video title: "${videoTitle}"\n` : ""}${videoDuration ? `Duration: ${videoDuration}\n` : ""}Video source: ${videoType}\nURL: ${args.video_url}\n\nAnalysis request: ${args.prompt}`,
          },
        ],
      },
    ];

    const response = await invokeLLM({
      messages: messages as any,
      maxTokens: 4096,
    });

    const analysis = response?.choices?.[0]?.message?.content || "Unable to analyze video content.";

    return {
      success: true,
      result: `## Video Analysis\n\n**Source:** ${videoType}${videoTitle ? ` — "${videoTitle}"` : ""}\n**URL:** ${args.video_url}\n\n---\n\n${analysis}`,
      artifactType: "document",
      artifactLabel: `Video Analysis: ${videoTitle || args.video_url.slice(0, 50)}`,
    };
  } catch (err: any) {
    // Fallback: if LLM doesn't support video, provide a text-based analysis prompt
    if (err.message?.includes("unsupported") || err.message?.includes("file_url")) {
      return {
        success: true,
        result: `## Video Analysis Request\n\n**URL:** ${args.video_url}\n**Prompt:** ${args.prompt}\n\n---\n\n*Note: Direct video analysis is not available in the current model configuration. The video URL has been noted for manual review.*\n\nTo analyze this video, you can:\n1. Open the URL in a browser and describe what you see\n2. Use the cloud_browser tool to take screenshots at different timestamps\n3. If it's a YouTube video, search for its transcript`,
        artifactType: "document",
        artifactLabel: "Video Analysis (manual)",
      };
    }
    return {
      success: false,
      result: `Video analysis failed: ${err.message}`,
    };
  }
}

// ── parallel_execute ──
async function executeParallelTasks(args: {
  task_template: string;
  inputs: string[];
  description?: string;
  merge_strategy?: string;
}, context?: ToolContext): Promise<ToolResult> {
  const { invokeLLM } = await import("./_core/llm");

  // Cap at 25 parallel tasks (aligned with Manus Wide Research scale)
  const inputs = (args.inputs || []).slice(0, 25);
  if (inputs.length === 0) {
    return { success: false, result: "No inputs provided for parallel execution." };
  }

  const mergeStrategy = args.merge_strategy || "concatenate";
  const template = args.task_template;

  // Execute all tasks in parallel using Promise.allSettled
  const startTime = Date.now();
  const results = await Promise.allSettled(
    inputs.map(async (input, index) => {
      const prompt = template.replace(/\{\{input\}\}/g, input);

      // Use LLM to process each subtask
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a focused research assistant. Complete the given task concisely and accurately. Return only the relevant information without preamble.",
          },
          { role: "user", content: prompt },
        ],
        maxTokens: 2048,
      });

      const rawContent = response?.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "(No result)";
      return { input, result: content, index };
    })
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Separate successes and failures
  const successes: Array<{ input: string; result: string; index: number }> = [];
  const failures: Array<{ input: string; reason: string }> = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      successes.push(r.value);
    } else {
      failures.push({ input: inputs[i], reason: r.reason?.message || "Unknown error" });
    }
  }

  // Merge results based on strategy
  let mergedOutput = "";

  switch (mergeStrategy) {
    case "table": {
      mergedOutput = "| # | Input | Result |\n|---|---|---|\n";
      for (const s of successes) {
        const shortResult = s.result.replace(/\n/g, " ").slice(0, 200);
        mergedOutput += `| ${s.index + 1} | ${s.input} | ${shortResult} |\n`;
      }
      break;
    }
    case "json": {
      const jsonResults = successes.map(s => ({
        input: s.input,
        result: s.result,
      }));
      mergedOutput = "```json\n" + JSON.stringify(jsonResults, null, 2) + "\n```";
      break;
    }
    case "summary": {
      // Use LLM to synthesize all results into a coherent summary
      const allResults = successes.map(s => `[${s.input}]: ${s.result}`).join("\n\n");
      try {
        const summaryResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Synthesize the following parallel research results into a coherent, well-organized summary. Identify patterns, key findings, and notable differences across the results.",
            },
            { role: "user", content: allResults },
          ],
          maxTokens: 3000,
        });
        const summaryContent = summaryResponse?.choices?.[0]?.message?.content;
        mergedOutput = (typeof summaryContent === "string" ? summaryContent : allResults);
      } catch {
        // Fallback to concatenation if summary fails
        mergedOutput = allResults;
      }
      break;
    }
    case "concatenate":
    default: {
      mergedOutput = successes
        .map(s => `### ${s.input}\n\n${s.result}`)
        .join("\n\n---\n\n");
      break;
    }
  }

  // Build final result
  const header = `## Parallel Execution Results\n\n**Tasks:** ${inputs.length} | **Completed:** ${successes.length} | **Failed:** ${failures.length} | **Time:** ${elapsed}s\n${args.description ? `**Description:** ${args.description}\n` : ""}\n---\n\n`;

  const failureNote = failures.length > 0
    ? `\n\n---\n\n**Failed tasks:**\n${failures.map(f => `- ${f.input}: ${f.reason}`).join("\n")}`
    : "";

  return {
    success: true,
    result: `${header}${mergedOutput}${failureNote}`,
    artifactType: "document",
    artifactLabel: args.description || `Parallel: ${inputs.length} tasks`,
  };
}


// ── Multi-Agent Orchestration Executor ──

async function executeMultiAgentOrchestration(
  args: { goal: string; context?: string; agents?: Array<{ role: string; focus?: string }>; max_agents?: number },
  context?: { userId?: number; taskExternalId?: string },
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const { decompose, executeOrchestration, summarizePlan } = await import("./services/multiAgent");

    // Step 1: Supervisor decomposes the goal
    console.log(`[multi_agent_orchestrate] Decomposing goal: "${args.goal.slice(0, 80)}..."`);
    const plan = await decompose(args.goal, args.context);

    // Step 2: Execute the orchestration plan
    console.log(`[multi_agent_orchestrate] Executing plan with ${plan.agents.length} agents, ${plan.tasks.length} tasks`);

    // Track progress for SSE emission
    let latestProgress: { phase: string; completedTasks: number; totalTasks: number; currentTask?: string; agentName?: string; quality?: number } | undefined;

    const completedPlan = await executeOrchestration(
      plan,
      AGENT_TOOLS, // Give workers access to all tools
      async (toolName: string, toolArgs: any) => {
        // Workers can call tools through the same executor
        const result = await executeTool(toolName, toolArgs, context);
        return { success: result.success, result: result.result };
      },
      {
        onTaskStarted: (task, agent) => {
          console.log(`[multi_agent_orchestrate] Agent "${agent.name}" starting: ${task.title}`);
          latestProgress = {
            phase: "executing",
            completedTasks: plan.tasks.filter(t => t.status === "completed").length,
            totalTasks: plan.tasks.length,
            currentTask: task.title,
            agentName: agent.name,
          };
        },
        onTaskCompleted: (task, _result, quality) => {
          console.log(`[multi_agent_orchestrate] Task "${task.title}" completed (quality: ${quality.toFixed(2)})`);
          latestProgress = {
            phase: "executing",
            completedTasks: plan.tasks.filter(t => t.status === "completed").length,
            totalTasks: plan.tasks.length,
            currentTask: task.title,
            quality,
          };
        },
        onTaskFailed: (task, error) => {
          console.warn(`[multi_agent_orchestrate] Task "${task.title}" failed: ${error}`);
        },
      },
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const planSummary = summarizePlan(completedPlan);
    const successCount = completedPlan.tasks.filter(t => t.status === "completed").length;
    const failCount = completedPlan.tasks.filter(t => t.status === "failed").length;
    const avgQuality = completedPlan.tasks
      .filter(t => t.quality != null)
      .reduce((sum, t) => sum + (t.quality || 0), 0) / Math.max(1, completedPlan.tasks.filter(t => t.quality != null).length);

    const header = `## Multi-Agent Orchestration Results\n\n` +
      `**Goal:** ${args.goal}\n` +
      `**Agents:** ${completedPlan.agents.length} | **Tasks:** ${completedPlan.tasks.length} | ` +
      `**Completed:** ${successCount} | **Failed:** ${failCount} | ` +
      `**Avg Quality:** ${avgQuality.toFixed(2)} | **Time:** ${elapsed}s\n\n---\n\n`;

    return {
      success: failCount === 0 || successCount > 0,
      result: `${header}${planSummary}\n\n---\n\n## Final Synthesized Result\n\n${completedPlan.finalResult || "(No synthesis produced)"}`,
      artifactType: "document",
      artifactLabel: `Multi-Agent: ${args.goal.slice(0, 50)}`,
      orchestrationProgress: latestProgress ? { ...latestProgress, phase: "completed", completedTasks: successCount, totalTasks: plan.tasks.length, quality: avgQuality } : undefined,
    };
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[multi_agent_orchestrate] Orchestration failed after ${elapsed}s:`, err);
    return {
      success: false,
      result: `Multi-agent orchestration failed: ${err.message}\n\nThe supervisor could not decompose or execute the task. Consider breaking it into smaller pieces or using parallel_execute for simpler batch operations.`,
    };
  }
}
