/**
 * Agent Tools — Server-side tool definitions and executors
 *
 * These tools are provided to the LLM via function calling. When the LLM
 * decides to use a tool, the server executes it and feeds the result back
 * into the conversation for the next LLM turn.
 *
 * Tools:
 * - web_search: Multi-source web search (DDG API + Wikipedia + page fetch)
 * - read_webpage: Fetch and read a specific URL's content
 * - generate_image: Create images from text descriptions
 * - analyze_data: Analyze data and produce insights
 * - execute_code: Execute JavaScript code and return results
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
  artifactType?: "browser_url" | "code" | "terminal" | "generated_image";
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

    // Step 4: If we got nothing from DDG or Wikipedia, try fetching known URLs
    if (!ddg.abstract && wikiResults.length === 0) {
      console.log("[web_search] No DDG/Wikipedia results, trying direct search...");
      
      // Try to construct likely URLs from the query
      const searchTerm = query.replace(/\s+/g, "+");
      
      // Try Wikipedia with a cleaned query
      const wikiTopic = query.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_()-]/g, "");
      const wikiSummary = await wikipediaSummary(wikiTopic);
      if (wikiSummary) {
        formattedResults += `### Wikipedia: ${wikiSummary.title}\n\n`;
        formattedResults += `${wikiSummary.extract}\n`;
        formattedResults += `\nSource: [${wikiSummary.url}](${wikiSummary.url})\n\n`;
        
        // Fetch full article
        const fullContent = await fetchPageContent(wikiSummary.url, 5000);
        if (!fullContent.startsWith("(Failed")) {
          formattedResults += `### Full Article Content\n\n${fullContent}\n\n`;
        }
      } else {
        // Last resort: use LLM synthesis
        formattedResults += `*Note: Could not find specific web results for this query. The following is based on AI training data.*\n\n`;
        const fallback = await executeWebSearchFallback(args);
        formattedResults += fallback.result;
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

// ── Tool Dispatcher ──

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
    default:
      return { success: false, result: `Unknown tool: ${name}` };
  }
}
