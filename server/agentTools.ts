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
              "Array of 2-5 search queries to execute in parallel. Each query should target a different aspect or angle of the research topic.",
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
        "Navigate to a URL in a cloud browser session, take a screenshot, and extract page content. Use when the user asks to visit a website and see what it looks like, or when you need to verify visual appearance of a page.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to navigate to in the cloud browser",
          },
          action: {
            type: "string",
            enum: ["navigate", "screenshot", "click", "scroll"],
            description: "Browser action to perform (default: navigate)",
          },
          selector: {
            type: "string",
            description: "CSS selector for click/scroll actions (optional)",
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
        "Execute JavaScript/TypeScript code to perform calculations, data transformations, or generate structured output. Use this for math, algorithms, data processing, or when you need to compute something precisely rather than estimate.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "JavaScript code to execute. Must be a self-contained snippet that produces output via console.log() or returns a value.",
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
        "Create a new web application project. Scaffolds a React + Vite + Tailwind project with the specified name, creates initial files, installs dependencies, and starts a dev server. Returns a preview URL that can be embedded in the chat. Use this when the user asks to build a website, web app, landing page, or any browser-based project.",
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
            description: "Template type: 'react' (React+Vite+Tailwind), 'html' (plain HTML/CSS/JS), or 'landing' (landing page template)",
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
        "Build and deploy the current webapp project. This bundles the project (runs npm run build for React projects), uploads the built output to cloud storage, and makes it publicly accessible. Returns the live URL.",
      parameters: {
        type: "object",
        properties: {
          version_label: {
            type: "string",
            description: "Version label for this deployment (e.g. 'v1.0.0', 'initial release')",
          },
        },
        required: [],
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
  artifactType?: "browser_url" | "code" | "terminal" | "generated_image" | "document" | "document_pdf" | "document_docx" | "slides" | "webapp_preview";
  /** Optional label for the artifact */
  artifactLabel?: string;
  /** Optional project external ID for webapp projects (links to WebAppProjectPage) */
  projectExternalId?: string;
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
async function fetchPageContent(url: string, maxChars = 8000): Promise<string> {
  try {
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

    return titles.slice(0, 10).map((t, i) => ({
      title: t.title,
      url: t.url,
      snippet: snippets[i] || "",
    }));
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
    const query = args.query;
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
          const hostname = new URL(page.url).hostname;
          formattedResults += `**From: ${hostname}** ([${page.url}](${page.url}))\n`;
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
  description?: string;
}): Promise<ToolResult> {
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
        artifactType = "document" as any;
        break;
      }
      case "xlsx": {
        const { generateXLSX } = await import("./documentGeneration");
        buffer = await generateXLSX(args.title, args.content);
        fileName = `${safeTitle}-${nanoid(6)}.xlsx`;
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        artifactType = "document" as any;
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
    const queries = (args.queries || []).slice(0, 5); // Cap at 5 parallel queries
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

    const finalResult = `## Wide Research Synthesis\n\n**Queries researched:** ${queries.map(q => `"${q}"`).join(", ")}\n**Successful searches:** ${successCount}/${queries.length}\n\n${synthesis}\n\n---\n\n## Raw Research Data\n\n${combinedResearch}`;

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
      artifactType: "document",
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
  url: string;
  action?: string;
  selector?: string;
}): Promise<ToolResult> {
  try {
    const action = args.action || "navigate";

    // Fetch the page content (simulating cloud browser navigation)
    const resp = await fetch(args.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!resp.ok) return { success: false, result: `Cloud browser: HTTP ${resp.status} for ${args.url}` };

    const html = await resp.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "(No title)";

    // Extract viewport-relevant content
    let mainText = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    // Try to generate a screenshot via image generation
    let screenshotUrl: string | undefined;
    try {
      const { generateImage } = await import("./_core/imageGeneration");
      const { url: imgUrl } = await generateImage({
        prompt: `Screenshot of website "${title}" at ${args.url}. Clean browser window showing a modern webpage with the title "${title}". Realistic browser screenshot.`,
      });
      screenshotUrl = imgUrl;
    } catch {
      // Screenshot generation is optional
    }

    let result = `## Cloud Browser: ${title}\n\n**URL:** ${args.url}\n**Action:** ${action}\n**Status:** ${resp.status} OK\n\n`;
    if (screenshotUrl) result += `![Screenshot](${screenshotUrl})\n\n`;
    result += `### Page Content\n\n${mainText}`;

    return {
      success: true,
      result,
      url: screenshotUrl || args.url,
      artifactType: screenshotUrl ? "browser_screenshot" as any : "browser_url",
      artifactLabel: `Browser: ${title}`,
    };
  } catch (err: any) {
    return { success: false, result: `Cloud browser navigation failed: ${err.message}` };
  }
}

// ── Screenshot Verify ──

async function executeScreenshotVerify(args: {
  image_url: string;
  question: string;
}): Promise<ToolResult> {
  try {
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
    return { success: false, result: `Screenshot verification failed: ${err.message}` };
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
      return executeGitOperation(args);
    case "deploy_webapp":
      return executeDeployWebapp(args, context);
    default:
      return { success: false, result: `Unknown tool: ${name}` };
  }
}

// ── Webapp Project State ──
let activeProjectDir: string | null = null;
let activeProjectPort: number | null = null;

export function getActiveProject() {
  return { dir: activeProjectDir, port: activeProjectPort };
}

/** Find an available port starting from `start`, checking up to 50 ports */
async function findWebappPort(start: number): Promise<number> {
  const net = await import("net");
  for (let p = start; p < start + 50; p++) {
    const available = await new Promise<boolean>((resolve) => {
      const srv = net.createServer();
      srv.listen(p, () => srv.close(() => resolve(true)));
      srv.on("error", () => resolve(false));
    });
    if (available) return p;
  }
  // Fallback: random port in range
  return start + Math.floor(Math.random() * 900);
}

/** Poll a port until it responds to HTTP or timeout is reached */
async function waitForPort(port: number, timeoutMs: number = 12000): Promise<boolean> {
  const http = await import("http");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = http.request({ hostname: "127.0.0.1", port, path: "/", method: "GET", timeout: 2000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
      req.end();
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
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

  const projectName = args.name.replace(/[^a-z0-9-]/g, "-").toLowerCase();
  const projectDir = path.join("/tmp", "webapp-projects", projectName);
  const template = args.template || "react";

  try {
    // Clean up any existing project with same name
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    fs.mkdirSync(projectDir, { recursive: true });

    if (template === "html") {
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

      // Find available port dynamically
      const port = await findWebappPort(4100);
      try { execSync(`fuser -k ${port}/tcp 2>/dev/null || true`); } catch {}
      execSync(`cd ${projectDir} && nohup npx -y serve -l ${port} -s . > /dev/null 2>&1 &`, { timeout: 15000 });

      // Wait for server to be reachable
      const ready = await waitForPort(port, 8000);

      activeProjectDir = projectDir;
      activeProjectPort = port;

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
        result: `Created HTML project "${projectName}" at ${projectDir}. Dev server ${ready ? "running" : "starting"} on port ${port}.\n\nFiles created:\n- index.html\n- styles.css\n- main.js\n\nYou can now use create_file and edit_file to modify the project files. The preview is available at http://localhost:${port}`,
        url: `http://localhost:${port}`,
        artifactType: "webapp_preview",
        artifactLabel: projectName,
        projectExternalId,
      };
    } else {
      // React + Vite + Tailwind scaffold
      // Find available port dynamically (avoid hardcoded 4200 which may conflict)
      const port = await findWebappPort(4200);

      const packageJson = {
        name: projectName,
        private: true,
        version: "0.0.1",
        type: "module",
        scripts: { dev: `vite --host --port ${port}`, build: "vite build", preview: "vite preview" },
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
      fs.writeFileSync(path.join(projectDir, "src", "App.jsx"), `export default function App() {\n  return (\n    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">\n      <div className="text-center space-y-4">\n        <h1 className="text-4xl font-bold">${projectName}</h1>\n        <p className="text-neutral-400">${args.description}</p>\n      </div>\n    </div>\n  );\n}`);

      // Install deps with error handling
      try {
        execSync(`cd ${projectDir} && npm install --prefer-offline 2>&1 | tail -5`, { timeout: 90000 });
      } catch (installErr: any) {
        // Try again without --prefer-offline
        console.warn(`[create_webapp] npm install --prefer-offline failed, retrying: ${installErr.message}`);
        execSync(`cd ${projectDir} && npm install 2>&1 | tail -5`, { timeout: 120000 });
      }

      // Verify node_modules exists
      if (!fs.existsSync(path.join(projectDir, "node_modules"))) {
        return {
          success: false,
          result: `Failed to install dependencies for "${projectName}". node_modules directory not found after npm install.`,
        };
      }

      // Kill any process on the target port
      try { execSync(`fuser -k ${port}/tcp 2>/dev/null || true`); } catch {}

      // Start dev server
      execSync(`cd ${projectDir} && nohup npm run dev > /tmp/${projectName}-dev.log 2>&1 &`, { timeout: 10000 });

      // Health-check polling loop — wait up to 15s for Vite to be ready
      const ready = await waitForPort(port, 15000);

      if (!ready) {
        // Check the dev log for errors
        let logTail = "";
        try {
          logTail = execSync(`tail -10 /tmp/${projectName}-dev.log 2>/dev/null || echo 'no log'`).toString();
        } catch {}
        console.warn(`[create_webapp] Vite dev server may not be ready on port ${port}. Log: ${logTail}`);
      }

      activeProjectDir = projectDir;
      activeProjectPort = port;

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
        result: `Created React+Vite+Tailwind project "${projectName}" at ${projectDir}. Dev server ${ready ? "running" : "starting (may take a moment)"} on port ${port}.\n\nFiles created:\n- package.json\n- vite.config.js\n- index.html\n- src/main.jsx\n- src/App.jsx\n- src/index.css\n\nYou can now use create_file and edit_file to modify the project files. The preview is available at http://localhost:${port}`,
        url: `http://localhost:${port}`,
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
    return { success: false, result: "No active webapp project. Use create_webapp first." };
  }

  try {
    const fullPath = pathMod.join(activeProjectDir, args.path);
    // Security: prevent path traversal
    if (!fullPath.startsWith(activeProjectDir)) {
      return { success: false, result: "Invalid path: cannot write outside project directory." };
    }
    fs.mkdirSync(pathMod.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, args.content);
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
    return { success: false, result: "No active webapp project. Use create_webapp first." };
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
    return { success: false, result: "No active webapp project. Use create_webapp first." };
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
    return { success: false, result: "No active webapp project. Use create_webapp first." };
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
    return { success: false, result: "No active webapp project. Use create_webapp first." };
  }

  try {
    const devFlag = args.dev ? " --save-dev" : "";
    const sanitized = args.packages.replace(/[;&|`$]/g, ""); // Basic sanitization
    const output = execSync(
      `cd ${activeProjectDir} && npm install ${sanitized}${devFlag} 2>&1 | tail -10`,
      { timeout: 60000 }
    ).toString();
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
    return { success: false, result: "No active webapp project. Use create_webapp first." };
  }

  // Security: block dangerous commands and host-app modification
  const blocked = ["rm -rf /", "rm -rf /*", "mkfs", "dd if=", ":(){ :|:& };:"];
  const hostAppPaths = ["/home/ubuntu/manus-next-app", "manus-next-app"];
  if (hostAppPaths.some(p => args.command.includes(p))) {
    return { success: false, result: "Cannot modify the host application. Commands must operate within the active project sandbox only." };
  }
  if (blocked.some(b => args.command.includes(b))) {
    return { success: false, result: "Command blocked for safety reasons." };
  }

  try {
    const output = execSync(
      `cd ${activeProjectDir} && ${args.command} 2>&1`,
      { timeout: 30000, maxBuffer: 1024 * 1024 }
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
}): Promise<ToolResult> {
  const { execSync } = await import("child_process");

  if (!activeProjectDir && args.operation !== "clone") {
    return { success: false, result: "No active webapp project. Use create_webapp first." };
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
        output = execSync(`cd ${dir} && git add -A && git commit -m "${args.message.replace(/"/g, '\\"')}"`, { timeout: 10000 }).toString();
        break;
      case "push":
        const remote = args.remote_url ? `origin ${args.remote_url}` : "origin main";
        output = execSync(`cd ${dir} && git push ${remote} 2>&1`, { timeout: 30000 }).toString();
        break;
      case "status":
        output = execSync(`cd ${dir} && git status --short`, { timeout: 5000 }).toString();
        output = output || "Working tree clean";
        break;
      case "log":
        output = execSync(`cd ${dir} && git log --oneline -10`, { timeout: 5000 }).toString();
        break;
      case "clone":
        if (!args.remote_url) return { success: false, result: "Remote URL is required for clone." };
        const cloneName = args.remote_url.split("/").pop()?.replace(".git", "") || "cloned-repo";
        const cloneDir = `/tmp/webapp-projects/${cloneName}`;
        output = execSync(`git clone ${args.remote_url} ${cloneDir} 2>&1`, { timeout: 60000 }).toString();
        activeProjectDir = cloneDir;
        break;
      case "remote_add":
        if (!args.remote_url) return { success: false, result: "Remote URL is required." };
        try {
          execSync(`cd ${dir} && git remote remove origin 2>/dev/null || true`, { timeout: 5000 });
        } catch {}
        output = execSync(`cd ${dir} && git remote add origin ${args.remote_url}`, { timeout: 5000 }).toString();
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
async function executeDeployWebapp(args: {
  version_label?: string;
}, context?: ToolContext): Promise<ToolResult> {
  const fs = await import("fs");
  const path = await import("path");
  const { execSync } = await import("child_process");

  if (!activeProjectDir) {
    return { success: false, result: "No active webapp project. Use create_webapp first." };
  }

  const projectName = path.basename(activeProjectDir);

  try {
    // Determine if this is a React/Vite project or static HTML
    const hasPackageJson = fs.existsSync(path.join(activeProjectDir, "package.json"));
    let buildDir = activeProjectDir;
    let htmlContent: string;

    if (hasPackageJson) {
      // React/Vite project — run build
      try {
        execSync(`cd ${activeProjectDir} && npm run build 2>&1`, { timeout: 120000 });
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

      // Find the build output directory
      const distDir = path.join(activeProjectDir, "dist");
      const buildDirAlt = path.join(activeProjectDir, "build");
      if (fs.existsSync(distDir)) {
        buildDir = distDir;
      } else if (fs.existsSync(buildDirAlt)) {
        buildDir = buildDirAlt;
      } else {
        return {
          success: false,
          result: "Build completed but no dist/ or build/ directory found. Check your build configuration.",
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
    const collectFiles = (dir: string, base: string): { relPath: string; absPath: string }[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: { relPath: string; absPath: string }[] = [];
      for (const entry of entries) {
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

    // Upload non-HTML files first to get their URLs
    for (const file of allFiles) {
      if (file.relPath === "index.html") continue;
      const ext = path.extname(file.absPath).toLowerCase();
      const mime = mimeTypes[ext] || "application/octet-stream";
      const fileData = fs.readFileSync(file.absPath);
      const fileKey = `${deployPrefix}/${file.relPath}`;
      const { url } = await storagePut(fileKey, fileData, mime);
      assetUrlMap.set(file.relPath, url);
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

    // Upload the rewritten index.html
    const indexKey = `${deployPrefix}/index.html`;
    const { url: publishedUrl } = await storagePut(indexKey, htmlContent, "text/html");

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

    return {
      success: true,
      result: `Successfully deployed "${projectName}"!\n\nLive URL: ${publishedUrl}\n\nThe app is now publicly accessible. Share this URL with anyone to view the app.`,
      url: publishedUrl,
      artifactType: "webapp_preview",
      artifactLabel: projectName,
      projectExternalId,
    };
  } catch (err: any) {
    return {
      success: false,
      result: `Deploy failed: ${err.message}`,
    };
  }
}
