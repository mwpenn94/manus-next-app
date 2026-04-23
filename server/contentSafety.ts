/**
 * Content Safety Filter (V-005 Security Fix)
 *
 * Two-tier content safety check before webapp publishing:
 *   1. Fast keyword blocklist scan (synchronous, <1ms)
 *   2. LLM-based content classifier (async, ~2-5s)
 *
 * Returns a safety verdict with confidence score and flagged items.
 */
import { invokeLLM } from "./_core/llm";

// ── Tier 1: Keyword Blocklist ──

const BLOCKED_PATTERNS: Array<{ pattern: RegExp; category: string; severity: "block" | "warn" }> = [
  // Malware / phishing patterns
  { pattern: /eval\s*\(\s*atob\s*\(/gi, category: "malware", severity: "block" },
  { pattern: /document\.cookie\s*[=+]/gi, category: "data_exfiltration", severity: "block" },
  { pattern: /window\.location\s*=\s*['"`](?!\/)/gi, category: "redirect", severity: "warn" },
  { pattern: /fetch\s*\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1)/gi, category: "external_request", severity: "warn" },
  { pattern: /new\s+XMLHttpRequest/gi, category: "external_request", severity: "warn" },
  { pattern: /\.innerHTML\s*=\s*[^'"]/gi, category: "xss_risk", severity: "warn" },
  { pattern: /crypto\s*\.\s*subtle/gi, category: "crypto_api", severity: "warn" },
  // Deceptive content patterns
  { pattern: /password.*input.*type\s*=\s*['"`]text/gi, category: "phishing", severity: "block" },
  { pattern: /credit.?card|cvv|ssn|social.?security/gi, category: "pii_collection", severity: "block" },
  { pattern: /keylog|keystroke|screen.?capture/gi, category: "surveillance", severity: "block" },
  // Obfuscation patterns
  { pattern: /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){10,}/gi, category: "obfuscation", severity: "block" },
  { pattern: /String\.fromCharCode\s*\(\s*(?:\d+\s*,\s*){5,}/gi, category: "obfuscation", severity: "block" },
  { pattern: /unescape\s*\(\s*['"`]%/gi, category: "obfuscation", severity: "block" },
];

export interface SafetyFlag {
  category: string;
  severity: "block" | "warn";
  detail: string;
  line?: number;
}

export interface SafetyVerdict {
  safe: boolean;
  tier1Flags: SafetyFlag[];
  tier2Verdict?: {
    safe: boolean;
    confidence: number;
    reasoning: string;
    categories: string[];
  };
  checkedAt: number;
}

/**
 * Tier 1: Fast keyword/pattern scan against generated code.
 */
export function scanKeywords(code: string): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, category, severity } of BLOCKED_PATTERNS) {
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        flags.push({
          category,
          severity,
          detail: line.trim().slice(0, 120),
          line: i + 1,
        });
      }
    }
  }

  return flags;
}

/**
 * Tier 2: LLM-based content classifier.
 * Sends the code to the LLM for semantic safety analysis.
 */
export async function classifyWithLLM(code: string): Promise<{
  safe: boolean;
  confidence: number;
  reasoning: string;
  categories: string[];
}> {
  // Truncate very long code to avoid token limits
  const truncated = code.length > 15000 ? code.slice(0, 15000) + "\n... [truncated]" : code;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a content safety classifier for web applications. Analyze the provided code/content and determine if it is safe to publish publicly.

Check for:
1. Malware, phishing, or data exfiltration
2. Deceptive UI patterns (fake login forms, misleading buttons)
3. Illegal content promotion
4. Privacy violations (unauthorized data collection)
5. Hate speech, harassment, or violent content in text/comments
6. Copyright-infringing content (exact reproductions)

Respond ONLY with valid JSON matching this schema:
{
  "safe": boolean,
  "confidence": number (0.0-1.0),
  "reasoning": "brief explanation",
  "categories": ["list of flagged categories, empty if safe"]
}`
        },
        {
          role: "user",
          content: `Analyze this web application code for safety:\n\n\`\`\`\n${truncated}\n\`\`\``
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "safety_verdict",
          strict: true,
          schema: {
            type: "object",
            properties: {
              safe: { type: "boolean" },
              confidence: { type: "number" },
              reasoning: { type: "string" },
              categories: { type: "array", items: { type: "string" } },
            },
            required: ["safe", "confidence", "reasoning", "categories"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      return { safe: true, confidence: 0.5, reasoning: "LLM returned empty response — defaulting to safe with low confidence", categories: [] };
    }

    return JSON.parse(content);
  } catch (err) {
    console.error("[ContentSafety] LLM classification failed:", err);
    // On LLM failure, rely on Tier 1 results only
    return { safe: true, confidence: 0.3, reasoning: "LLM unavailable — relying on keyword scan only", categories: [] };
  }
}

/**
 * Full safety check: runs both tiers and returns a combined verdict.
 */
export async function checkContentSafety(code: string): Promise<SafetyVerdict> {
  // Tier 1: Fast keyword scan
  const tier1Flags = scanKeywords(code);
  const hasBlockingFlags = tier1Flags.some(f => f.severity === "block");

  // If Tier 1 finds blocking patterns, skip Tier 2 (save LLM cost)
  if (hasBlockingFlags) {
    return {
      safe: false,
      tier1Flags,
      checkedAt: Date.now(),
    };
  }

  // Tier 2: LLM classification
  const tier2Verdict = await classifyWithLLM(code);

  // Combined verdict: safe only if both tiers agree
  const safe = tier1Flags.length === 0 && tier2Verdict.safe;

  return {
    safe,
    tier1Flags,
    tier2Verdict,
    checkedAt: Date.now(),
  };
}
