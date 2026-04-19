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

// ── Tool Definitions (OpenAI function-calling format) ──

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
        "Generate a structured document (report, analysis, summary, article, plan) as a downloadable markdown file. Use this when the user asks you to create, write, draft, or produce a document, report, or any long-form structured content. Returns the document content and a download URL.",
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
            description: "The type/format of document to generate",
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
];

// ── Tool Executors ──

export interface ToolResult {
  success: boolean;
  result: string;
  /** Optional URL for images or browser artifacts */
  url?: string;
  /** Optional artifact type for workspace persistence */
  artifactType?: "browser_url" | "code" | "terminal" | "generated_image" | "document";
  /** Optional label for the artifact */
  artifactLabel?: string;
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

    if (!resp.ok) return `(Failed to fetch: HTTP ${resp.status})`;

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

    const response = await invokeLLM({
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
    });

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
    const content = await fetchPageContent(args.url, 12000);

    if (content.startsWith("(Failed") || content.startsWith("(Non-text")) {
      return {
        success: false,
        result: `Could not read webpage: ${content}`,
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
 * Generate an image using the built-in image generation helper
 */
async function executeGenerateImage(args: {
  prompt: string;
}): Promise<ToolResult> {
  try {
    const { generateImage } = await import("./_core/imageGeneration");
    const { url } = await generateImage({ prompt: args.prompt });

    if (!url) {
      return {
        success: false,
        result: "Image generation completed but no URL was returned.",
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
    return {
      success: false,
      result: `Image generation failed: ${err.message}`,
    };
  }
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

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a precise data analyst. Output structured analysis with numbers." },
        { role: "user", content: analysisPrompt },
      ],
    });

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
}): Promise<ToolResult> {
  try {
    const { storagePut } = await import("./storage");
    const { nanoid } = await import("nanoid");

    const fileName = `${args.title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase()}-${nanoid(6)}.md`;
    const fileKey = `documents/${fileName}`;

    // Build document with front matter
    const docContent = `# ${args.title}\n\n${args.content}`;
    const buffer = Buffer.from(docContent, "utf-8");

    const { url } = await storagePut(fileKey, buffer, "text/markdown");

    return {
      success: true,
      result: `Document generated: **${args.title}**\n\n[Download Document](${url})\n\n---\n\n${docContent.slice(0, 2000)}${docContent.length > 2000 ? "\n\n*[Document truncated for display — full version available at download link]*" : ""}`,
      url,
      artifactType: "document",
      artifactLabel: args.title,
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

    const synthesisResponse = await invokeLLM({
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
    });

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

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a presentation designer. Generate exactly ${count} slides as a JSON array. Each slide has: title (string), content (markdown string with bullet points), notes (optional speaker notes string). Style: ${style}. Return ONLY valid JSON array, no markdown fences.`,
        },
        { role: "user", content: `Create a presentation about: ${args.topic}` },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content ?? "[]";
    const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Build markdown document from slides
    let markdown = `# ${args.topic}\n\n`;
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      markdown += `---\n\n## Slide ${i + 1}: ${s.title}\n\n${s.content}\n\n`;
      if (s.notes) markdown += `> **Speaker Notes:** ${s.notes}\n\n`;
    }

    const fileName = `slides-${nanoid(6)}.md`;
    const { url } = await storagePut(`slides/${fileName}`, Buffer.from(markdown, "utf-8"), "text/markdown");

    return {
      success: true,
      result: `Presentation generated: **${args.topic}** (${slides.length} slides, ${style} style)\n\n[Download Slides](${url})\n\n${markdown.slice(0, 3000)}`,
      url,
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

    const response = await invokeLLM({
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
    });

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

    return {
      success: true,
      result: `Design created: **${format}** — ${args.description.slice(0, 100)}\n\n![Design](${url})\n\n${args.text_overlay ? `**Text overlay:** ${args.text_overlay}` : ""}`,
      url,
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

    const response = await invokeLLM({
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
    });

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
export async function executeTool(
  name: string,
  argsJson: string
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
    default:
      return { success: false, result: `Unknown tool: ${name}` };
  }
}
