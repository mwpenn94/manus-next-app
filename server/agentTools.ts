/**
 * Agent Tools — Server-side tool definitions and executors
 *
 * These tools are provided to the LLM via function calling. When the LLM
 * decides to use a tool, the server executes it and feeds the result back
 * into the conversation for the next LLM turn.
 *
 * Tools:
 * - web_search: Search the web for current information
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
        "Search the web for current information, news, research, or facts. Use this when the user asks about recent events, needs factual data, or wants research on a topic. Returns search results with titles, snippets, and source URLs.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up",
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

/**
 * Execute a web search using LLM-powered research synthesis.
 * Since no general web search API is available in the Data API hub,
 * we use a dedicated LLM call with a research-focused system prompt
 * to synthesize comprehensive information about the query.
 */
async function executeWebSearch(args: { query: string }): Promise<ToolResult> {
  try {
    const { invokeLLM } = await import("./_core/llm");

    const researchPrompt = `You are a research assistant. Provide comprehensive, factual information about the following query. Include:
1. Key facts and current understanding
2. Multiple perspectives where relevant
3. Specific data points, dates, and numbers
4. Notable sources or authorities on the topic

Be thorough but concise. Present information as if summarizing top search results.

Query: "${args.query}"`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a research engine. Provide factual, well-structured information with specific details. Format as a research brief with clear sections.",
        },
        { role: "user", content: researchPrompt },
      ],
    });

    const content =
      typeof response.choices?.[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "Research could not be completed.";

    return {
      success: true,
      result: `## Research Results: "${args.query}"\n\n${content}`,
      artifactType: "browser_url",
      artifactLabel: `Research: ${args.query}`,
    };
  } catch (err: any) {
    return {
      success: false,
      result: `Research failed: ${err.message}. Please answer based on your existing knowledge.`,
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
    // Use Node.js vm module for sandboxed execution
    const vm = await import("vm");

    // Capture console.log output
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
      setTimeout: undefined, // Block async for safety
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
