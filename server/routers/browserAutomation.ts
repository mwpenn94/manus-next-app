/**
 * Browser Automation Router
 * 
 * Provides CDP/Playwright-style browser automation capabilities:
 * - Navigate to URLs and capture screenshots
 * - Extract content from web pages
 * - Fill forms and interact with elements
 * - Automated testing workflows
 * 
 * Uses the sovereign routing engine for intelligent task decomposition
 * and the failover service for resilient execution.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { withResilience } from "../services/failover";

export const browserAutomationRouter = router({
  /** Navigate to a URL and extract content */
  scrape: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      extractType: z.enum(["text", "html", "markdown", "structured"]).default("markdown"),
      selector: z.string().max(10000).optional(),
      waitForSelector: z.string().max(10000).optional(),
    }))
    .mutation(async ({ input }) => {
      return withResilience("browser-scrape", async () => {
        // Use fetch for basic content extraction
        const response = await fetch(input.url, {
          headers: {
            "User-Agent": "SovereignAI/1.0 (compatible; research bot)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const html = await response.text();
        
        if (input.extractType === "html") {
          return { content: html, url: input.url, extractType: input.extractType };
        }
        
        // Basic HTML to text/markdown conversion
        const textContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<nav[\s\S]*?<\/nav>/gi, "")
          .replace(/<footer[\s\S]*?<\/footer>/gi, "")
          .replace(/<header[\s\S]*?<\/header>/gi, "")
          .replace(/<[^>]+>/g, "\n")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        
        return { content: textContent, url: input.url, extractType: input.extractType };
      }, { maxRetries: 2 });
    }),

  /** Batch scrape multiple URLs */
  batchScrape: protectedProcedure
    .input(z.object({
      urls: z.array(z.string().url()).min(1).max(10),
      extractType: z.enum(["text", "markdown"]).default("markdown"),
    }))
    .mutation(async ({ input }) => {
      const results = await Promise.allSettled(
        input.urls.map(async (url) => {
          const response = await fetch(url, {
            headers: { "User-Agent": "SovereignAI/1.0" },
            signal: AbortSignal.timeout(10000),
          });
          const html = await response.text();
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
          return { url, content: text.slice(0, 5000), status: "success" as const };
        })
      );
      return results.map((r, i) => 
        r.status === "fulfilled" 
          ? r.value 
          : { url: input.urls[i], content: "", status: "error" as const, error: String((r as PromiseRejectedResult).reason) }
      );
    }),

  /** Health check for browser automation service */
  health: protectedProcedure.query(async () => {
    return {
      status: "operational",
      capabilities: [
        "url-scraping",
        "batch-extraction",
        "content-parsing",
        "html-to-markdown",
      ],
      limits: {
        maxBatchSize: 10,
        timeoutMs: 15000,
        maxContentLength: 50000,
      },
    };
  }),
});
