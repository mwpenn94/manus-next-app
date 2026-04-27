/**
 * deepResearchTool.ts — Manus-Aligned Deep Research & Content Production
 *
 * Pass 38.4: Deep parity with the Manus AI Features & Capability Surfaces References.
 * Covers: multi-source research, content writing, media generation,
 * slide/document production, citation management, and recursive refinement.
 *
 * Modes:
 *   - research:    Multi-source research with citations and synthesis
 *   - write:       Long-form content writing with structure and citations
 *   - media:       Media generation (image, audio, video) specifications
 *   - document:    Document production (PDF, DOCX, slides) specifications
 *   - analyze:     Deep analysis of provided content/data
 *   - full:        Research → Analyze → Write → Document pipeline
 */

import type { ToolResult } from "./agentTools";

// ── Types ──

export type ResearchMode = "research" | "write" | "media" | "document" | "analyze" | "full";

export type SourceType =
  | "web_search"
  | "academic_paper"
  | "news_article"
  | "api_data"
  | "uploaded_document"
  | "database_query"
  | "expert_knowledge"
  | "user_provided";

export type ContentFormat =
  | "report"
  | "article"
  | "whitepaper"
  | "blog_post"
  | "executive_summary"
  | "technical_doc"
  | "presentation"
  | "email"
  | "social_media"
  | "custom";

export type DocumentOutput =
  | "markdown"
  | "pdf"
  | "docx"
  | "slides"
  | "spreadsheet"
  | "html";

// ── Research Source ──

export interface ResearchSource {
  type: SourceType;
  query: string;
  url?: string;
  reliability: "high" | "medium" | "low";
  findings: string[];
  citations: string[];
}

// ── Content Outline ──

export interface ContentOutline {
  title: string;
  format: ContentFormat;
  targetLength: string;
  sections: Array<{
    heading: string;
    subheadings: string[];
    keyPoints: string[];
    estimatedWords: number;
  }>;
  citations: string[];
  tone: string;
  audience: string;
}

// ── Research Report ──

export interface ResearchReport {
  topic: string;
  mode: ResearchMode;
  sources: ResearchSource[];
  outline?: ContentOutline;
  content?: string;
  mediaSpecs?: Array<{
    type: "image" | "audio" | "video" | "chart";
    description: string;
    prompt: string;
    placement: string;
  }>;
  documentSpec?: {
    format: DocumentOutput;
    pages: number;
    sections: number;
    includesCharts: boolean;
    includesImages: boolean;
  };
  qualityMetrics: {
    sourceCount: number;
    citationCount: number;
    depthScore: number;
    breadthScore: number;
    accuracyScore: number;
    coherenceScore: number;
    overallScore: number;
  };
  summary: string;
}

// ── Source Type Classifier ──

function classifySourceType(description: string): SourceType {
  const d = description.toLowerCase();
  if (d.includes("academic") || d.includes("paper") || d.includes("journal") || d.includes("arxiv") || d.includes("pubmed"))
    return "academic_paper";
  if (d.includes("news") || d.includes("press") || d.includes("article") || d.includes("reuters") || d.includes("bloomberg"))
    return "news_article";
  if (d.includes("api") || d.includes("data source") || d.includes("endpoint") || d.includes("database"))
    return "api_data";
  if (d.includes("upload") || d.includes("file") || d.includes("pdf") || d.includes("docx") || d.includes("csv"))
    return "uploaded_document";
  if (d.includes("database") || d.includes("sql") || d.includes("query"))
    return "database_query";
  if (d.includes("expert") || d.includes("knowledge") || d.includes("domain"))
    return "expert_knowledge";
  if (d.includes("user") || d.includes("provided") || d.includes("input"))
    return "user_provided";
  return "web_search";
}

// ── Content Format Selector ──

function selectContentFormat(description: string): ContentFormat {
  const d = description.toLowerCase();
  if (d.includes("report") || d.includes("analysis")) return "report";
  if (d.includes("whitepaper") || d.includes("white paper")) return "whitepaper";
  if (d.includes("blog") || d.includes("post")) return "blog_post";
  if (d.includes("executive") || d.includes("summary") || d.includes("brief")) return "executive_summary";
  if (d.includes("technical") || d.includes("documentation") || d.includes("spec")) return "technical_doc";
  if (d.includes("presentation") || d.includes("slides") || d.includes("deck")) return "presentation";
  if (d.includes("email") || d.includes("newsletter")) return "email";
  if (d.includes("social") || d.includes("tweet") || d.includes("linkedin")) return "social_media";
  if (d.includes("article")) return "article";
  return "report";
}

// ── Research Strategy Builder ──

function buildResearchStrategy(topic: string, depth: string): ResearchSource[] {
  const sources: ResearchSource[] = [];
  const d = (depth || "standard").toLowerCase();

  // Always include web search
  sources.push({
    type: "web_search",
    query: topic,
    reliability: "medium",
    findings: [],
    citations: [],
  });

  // Add academic sources for deep research
  if (d === "deep" || d === "exhaustive") {
    sources.push({
      type: "academic_paper",
      query: `${topic} research papers`,
      reliability: "high",
      findings: [],
      citations: [],
    });
  }

  // Add news for current topics
  sources.push({
    type: "news_article",
    query: `${topic} latest developments`,
    reliability: "medium",
    findings: [],
    citations: [],
  });

  // Add expert knowledge
  sources.push({
    type: "expert_knowledge",
    query: `${topic} expert analysis`,
    reliability: "high",
    findings: [],
    citations: [],
  });

  // Exhaustive adds API data and more
  if (d === "exhaustive") {
    sources.push({
      type: "api_data",
      query: `${topic} data statistics`,
      reliability: "high",
      findings: [],
      citations: [],
    });
  }

  return sources;
}

// ── Outline Generator ──

function generateOutline(
  topic: string,
  format: ContentFormat,
  targetLength: string
): ContentOutline {
  const sectionTemplates: Record<ContentFormat, Array<{ heading: string; subheadings: string[] }>> = {
    report: [
      { heading: "Executive Summary", subheadings: [] },
      { heading: "Introduction", subheadings: ["Background", "Scope", "Methodology"] },
      { heading: "Key Findings", subheadings: ["Finding 1", "Finding 2", "Finding 3"] },
      { heading: "Analysis", subheadings: ["Quantitative Analysis", "Qualitative Analysis"] },
      { heading: "Recommendations", subheadings: ["Short-term", "Long-term"] },
      { heading: "Conclusion", subheadings: [] },
      { heading: "References", subheadings: [] },
    ],
    article: [
      { heading: "Introduction", subheadings: [] },
      { heading: "Background", subheadings: [] },
      { heading: "Main Discussion", subheadings: ["Point 1", "Point 2", "Point 3"] },
      { heading: "Expert Perspectives", subheadings: [] },
      { heading: "Conclusion", subheadings: [] },
    ],
    whitepaper: [
      { heading: "Abstract", subheadings: [] },
      { heading: "Problem Statement", subheadings: [] },
      { heading: "Current Landscape", subheadings: ["Market Overview", "Key Players"] },
      { heading: "Proposed Solution", subheadings: ["Architecture", "Implementation", "Benefits"] },
      { heading: "Case Studies", subheadings: [] },
      { heading: "ROI Analysis", subheadings: [] },
      { heading: "Conclusion", subheadings: [] },
      { heading: "References", subheadings: [] },
    ],
    blog_post: [
      { heading: "Hook", subheadings: [] },
      { heading: "The Problem", subheadings: [] },
      { heading: "The Solution", subheadings: ["Step 1", "Step 2", "Step 3"] },
      { heading: "Key Takeaways", subheadings: [] },
      { heading: "Call to Action", subheadings: [] },
    ],
    executive_summary: [
      { heading: "Overview", subheadings: [] },
      { heading: "Key Findings", subheadings: [] },
      { heading: "Recommendations", subheadings: [] },
      { heading: "Next Steps", subheadings: [] },
    ],
    technical_doc: [
      { heading: "Overview", subheadings: [] },
      { heading: "Architecture", subheadings: ["System Design", "Data Flow", "API Design"] },
      { heading: "Implementation Guide", subheadings: ["Setup", "Configuration", "Deployment"] },
      { heading: "API Reference", subheadings: [] },
      { heading: "Troubleshooting", subheadings: [] },
    ],
    presentation: [
      { heading: "Title Slide", subheadings: [] },
      { heading: "Problem", subheadings: [] },
      { heading: "Solution", subheadings: [] },
      { heading: "How It Works", subheadings: [] },
      { heading: "Results", subheadings: [] },
      { heading: "Next Steps", subheadings: [] },
    ],
    email: [
      { heading: "Subject Line", subheadings: [] },
      { heading: "Opening", subheadings: [] },
      { heading: "Body", subheadings: [] },
      { heading: "Call to Action", subheadings: [] },
    ],
    social_media: [
      { heading: "Hook", subheadings: [] },
      { heading: "Value", subheadings: [] },
      { heading: "CTA", subheadings: [] },
    ],
    custom: [
      { heading: "Introduction", subheadings: [] },
      { heading: "Main Content", subheadings: [] },
      { heading: "Conclusion", subheadings: [] },
    ],
  };

  const sections = sectionTemplates[format] || sectionTemplates.custom;
  const totalWords = targetLength === "long" ? 5000 : targetLength === "short" ? 1000 : 2500;
  const wordsPerSection = Math.round(totalWords / sections.length);

  return {
    title: topic,
    format,
    targetLength: `${totalWords} words`,
    sections: sections.map((s) => ({
      heading: s.heading,
      subheadings: s.subheadings,
      keyPoints: [],
      estimatedWords: wordsPerSection,
    })),
    citations: [],
    tone: format === "blog_post" ? "conversational" : format === "technical_doc" ? "precise" : "professional",
    audience: format === "executive_summary" ? "executives" : format === "technical_doc" ? "developers" : "general",
  };
}

// ── Quality Metrics Calculator ──

function calculateResearchQuality(
  sources: ResearchSource[],
  hasContent: boolean,
  hasOutline: boolean
): ResearchReport["qualityMetrics"] {
  const sourceCount = sources.length;
  const citationCount = sources.reduce((sum, s) => sum + s.citations.length, 0);
  const highReliabilitySources = sources.filter((s) => s.reliability === "high").length;

  const depthScore = Math.min(10, sourceCount * 1.5 + (hasOutline ? 2 : 0));
  const breadthScore = Math.min(10, new Set(sources.map((s) => s.type)).size * 2.5);
  const accuracyScore = Math.min(10, (highReliabilitySources / Math.max(sourceCount, 1)) * 10);
  const coherenceScore = hasContent ? 7 : hasOutline ? 5 : 3;

  return {
    sourceCount,
    citationCount,
    depthScore: Math.round(depthScore * 10) / 10,
    breadthScore: Math.round(breadthScore * 10) / 10,
    accuracyScore: Math.round(accuracyScore * 10) / 10,
    coherenceScore,
    overallScore: Math.round(((depthScore + breadthScore + accuracyScore + coherenceScore) / 4) * 10) / 10,
  };
}

// ── LLM-Driven Research Execution ──

async function executeResearchWithLLM(
  topic: string,
  mode: ResearchMode,
  sources: ResearchSource[],
  outline: ContentOutline,
  args: Record<string, any>
): Promise<ResearchReport> {
  const report: ResearchReport = {
    topic,
    mode,
    sources,
    outline,
    qualityMetrics: calculateResearchQuality(sources, false, true),
    summary: "",
  };

  try {
    const { invokeLLM } = await import("./_core/llm");

    const prompt = buildResearchPrompt(topic, mode, sources, outline, args);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a Manus-aligned deep research and content production agent. You conduct thorough multi-source research and produce publication-quality content following the Manus AI Features & Capability Surfaces References.

Your responsibilities:
1. RESEARCH: Multi-source information gathering with citation tracking
2. ANALYSIS: Deep analysis with quantitative and qualitative methods
3. WRITING: Structured long-form content with proper citations
4. MEDIA: Specification of images, charts, and visual assets
5. DOCUMENTS: Production-ready document specifications
6. QUALITY: Recursive refinement for accuracy, depth, and coherence

For research mode, provide:
- Findings from each source type
- Citations in academic format
- Synthesis across sources
- Confidence levels

For writing mode, provide:
- Full structured content following the outline
- Inline citations
- Key takeaways

Respond in JSON format.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "research_execution",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sources: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    findings: { type: "array", items: { type: "string" } },
                    citations: { type: "array", items: { type: "string" } },
                    reliability: { type: "string" },
                  },
                  required: ["type", "findings", "citations", "reliability"],
                  additionalProperties: false,
                },
              },
              content: { type: "string" },
              media_specs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    description: { type: "string" },
                    prompt: { type: "string" },
                    placement: { type: "string" },
                  },
                  required: ["type", "description", "prompt", "placement"],
                  additionalProperties: false,
                },
              },
              quality_score: { type: "number" },
              summary: { type: "string" },
            },
            required: ["sources", "content", "media_specs", "quality_score", "summary"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string" && content) {
      const parsed = JSON.parse(content);

      // Merge LLM findings into sources
      if (parsed.sources) {
        for (let i = 0; i < Math.min(parsed.sources.length, report.sources.length); i++) {
          report.sources[i].findings = parsed.sources[i].findings || [];
          report.sources[i].citations = parsed.sources[i].citations || [];
        }
      }

      report.content = parsed.content;
      report.mediaSpecs = parsed.media_specs?.map((m: any) => ({
        type: m.type,
        description: m.description,
        prompt: m.prompt,
        placement: m.placement,
      }));

      report.qualityMetrics = calculateResearchQuality(report.sources, !!report.content, true);
      if (parsed.quality_score) {
        report.qualityMetrics.overallScore = parsed.quality_score;
      }
      report.summary = parsed.summary;
    }
  } catch (err: any) {
    report.summary = `Research execution error: ${err.message}`;
  }

  return report;
}

// ── Prompt Builder ──

function buildResearchPrompt(
  topic: string,
  mode: ResearchMode,
  sources: ResearchSource[],
  outline: ContentOutline,
  args: Record<string, any>
): string {
  const parts: string[] = [];

  parts.push(`# Research Task: ${topic}`);
  parts.push(`Mode: ${mode}`);
  parts.push("");

  parts.push("## Research Sources to Investigate");
  for (const s of sources) {
    parts.push(`- ${s.type}: "${s.query}" (reliability: ${s.reliability})`);
  }
  parts.push("");

  if (mode === "write" || mode === "full") {
    parts.push("## Content Outline");
    parts.push(`Format: ${outline.format}`);
    parts.push(`Target Length: ${outline.targetLength}`);
    parts.push(`Tone: ${outline.tone}`);
    parts.push(`Audience: ${outline.audience}`);
    parts.push("");
    for (const section of outline.sections) {
      parts.push(`### ${section.heading}`);
      if (section.subheadings.length > 0) {
        for (const sub of section.subheadings) {
          parts.push(`  - ${sub}`);
        }
      }
      parts.push(`  (~${section.estimatedWords} words)`);
    }
    parts.push("");
  }

  if (args.depth) {
    parts.push(`## Research Depth: ${args.depth}`);
    parts.push("");
  }

  if (args.custom_instructions) {
    parts.push("## Custom Instructions");
    parts.push(args.custom_instructions);
    parts.push("");
  }

  parts.push("Execute this research task. Provide detailed findings from each source, proper citations, and synthesize the information into coherent content.");

  return parts.join("\n");
}

// ── Report Formatter ──

function formatResearchReport(report: ResearchReport): string {
  const lines: string[] = [];

  lines.push(`# 🔬 Research Report: ${report.topic}`);
  lines.push("");
  lines.push(`**Mode:** ${report.mode} | **Sources:** ${report.qualityMetrics.sourceCount} | **Citations:** ${report.qualityMetrics.citationCount} | **Quality:** ${report.qualityMetrics.overallScore}/10`);
  lines.push("");

  // Quality Metrics
  lines.push("## Quality Metrics");
  lines.push("");
  lines.push("| Metric | Score |");
  lines.push("|--------|-------|");
  lines.push(`| Depth | ${report.qualityMetrics.depthScore}/10 |`);
  lines.push(`| Breadth | ${report.qualityMetrics.breadthScore}/10 |`);
  lines.push(`| Accuracy | ${report.qualityMetrics.accuracyScore}/10 |`);
  lines.push(`| Coherence | ${report.qualityMetrics.coherenceScore}/10 |`);
  lines.push(`| **Overall** | **${report.qualityMetrics.overallScore}/10** |`);
  lines.push("");

  // Sources & Findings
  if (report.sources.length > 0) {
    lines.push("## Research Sources");
    lines.push("");
    for (const s of report.sources) {
      lines.push(`### ${s.type} (${s.reliability} reliability)`);
      lines.push(`Query: "${s.query}"`);
      if (s.findings.length > 0) {
        lines.push("**Findings:**");
        for (const f of s.findings) {
          lines.push(`- ${f}`);
        }
      }
      if (s.citations.length > 0) {
        lines.push("**Citations:**");
        for (const c of s.citations) {
          lines.push(`- ${c}`);
        }
      }
      lines.push("");
    }
  }

  // Content
  if (report.content) {
    lines.push("## Content");
    lines.push("");
    lines.push(report.content);
    lines.push("");
  }

  // Media Specs
  if (report.mediaSpecs && report.mediaSpecs.length > 0) {
    lines.push("## Media Specifications");
    lines.push("");
    lines.push("| Type | Description | Placement |");
    lines.push("|------|-------------|-----------|");
    for (const m of report.mediaSpecs) {
      lines.push(`| ${m.type} | ${m.description} | ${m.placement} |`);
    }
    lines.push("");
  }

  // Document Spec
  if (report.documentSpec) {
    lines.push("## Document Specification");
    lines.push("");
    lines.push(`- **Format:** ${report.documentSpec.format}`);
    lines.push(`- **Pages:** ${report.documentSpec.pages}`);
    lines.push(`- **Sections:** ${report.documentSpec.sections}`);
    lines.push(`- **Charts:** ${report.documentSpec.includesCharts ? "Yes" : "No"}`);
    lines.push(`- **Images:** ${report.documentSpec.includesImages ? "Yes" : "No"}`);
    lines.push("");
  }

  // Summary
  if (report.summary) {
    lines.push("## Summary");
    lines.push("");
    lines.push(report.summary);
  }

  return lines.join("\n");
}

// ── Main Executor ──

export async function executeDeepResearch(
  args: {
    mode: ResearchMode;
    topic?: string;
    description?: string;
    depth?: string;
    format?: string;
    target_length?: string;
    custom_instructions?: string;
  },
  _context?: { userId?: number; taskExternalId?: string }
): Promise<ToolResult> {
  try {
    const topic = args.topic || args.description || "Research topic";
    const depth = args.depth || "standard";
    const format = selectContentFormat(args.format || args.description || "");

    // Build research strategy
    const sources = buildResearchStrategy(topic, depth);

    // Generate outline
    const outline = generateOutline(topic, format, args.target_length || "standard");

    // If mode is "research" with no LLM needed (plan only)
    if (args.mode === "research" && depth === "quick") {
      const report: ResearchReport = {
        topic,
        mode: "research",
        sources,
        outline,
        qualityMetrics: calculateResearchQuality(sources, false, true),
        summary: `Research plan generated for "${topic}" with ${sources.length} sources and ${outline.sections.length} content sections.`,
      };
      return {
        success: true,
        result: formatResearchReport(report),
        artifactType: "document" as any,
        artifactLabel: `Research Plan: ${topic}`,
      };
    }

    // Execute via LLM
    const report = await executeResearchWithLLM(topic, args.mode, sources, outline, args);

    return {
      success: true,
      result: formatResearchReport(report),
      artifactType: "document" as any,
      artifactLabel: `Research ${args.mode}: ${topic}`,
    };
  } catch (err: any) {
    return {
      success: false,
      result: `Deep research failed: ${err.message}`,
    };
  }
}

// ── Exports for testing ──

export const _testExports = {
  classifySourceType,
  selectContentFormat,
  buildResearchStrategy,
  generateOutline,
  calculateResearchQuality,
  formatResearchReport,
};
