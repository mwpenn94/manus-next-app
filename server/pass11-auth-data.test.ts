/**
 * Pass 11 — Auth Loop Fix + DataPipelinesPage Upgrade
 *
 * Tests verify:
 * 1. main.tsx has NO global auth redirect (prevents auth loops)
 * 2. useAuth handles per-page redirect instead
 * 3. DataPipelinesPage has full taxonomy: topologies, source classes, storage tiers, runbooks, governance
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Pass 11: Auth Loop Fix", () => {
  const mainTsx = readFile("client/src/main.tsx");

  it("main.tsx does NOT import getLoginUrl", () => {
    expect(mainTsx).not.toMatch(/import.*getLoginUrl/);
  });

  it("main.tsx does NOT contain hasEverBeenAuthenticated", () => {
    expect(mainTsx).not.toContain("hasEverBeenAuthenticated");
  });

  it("main.tsx does NOT contain redirectToLoginIfUnauthorized", () => {
    expect(mainTsx).not.toContain("redirectToLoginIfUnauthorized");
  });

  it("main.tsx does NOT call window.location.href for auth redirect", () => {
    // The only window.location.href should NOT be in the error subscriber
    const errorSubscriberSection = mainTsx.slice(
      mainTsx.indexOf("getQueryCache().subscribe"),
      mainTsx.indexOf("getMutationCache().subscribe")
    );
    expect(errorSubscriberSection).not.toContain("window.location.href");
  });

  it("main.tsx documents the AUTH REDIRECT POLICY in comments", () => {
    expect(mainTsx).toContain("AUTH REDIRECT POLICY");
    expect(mainTsx).toContain("per-page via useAuth");
  });

  it("main.tsx suppresses UNAUTHED errors from console.error (no noise)", () => {
    expect(mainTsx).toContain("error.message !== UNAUTHED_ERR_MSG");
  });

  it("main.tsx does not retry auth errors", () => {
    expect(mainTsx).toContain("UNAUTHED_ERR_MSG");
    expect(mainTsx).toMatch(/return false.*Don.*retry auth/s);
  });

  it("useAuth.ts handles per-page redirect via redirectOnUnauthenticated option", () => {
    const useAuth = readFile("client/src/_core/hooks/useAuth.ts");
    expect(useAuth).toContain("redirectOnUnauthenticated");
    expect(useAuth).toContain("window.location.href");
  });
});

describe("Pass 11: DataPipelinesPage — Full Taxonomy", () => {
  const page = readFile("client/src/pages/DataPipelinesPage.tsx");

  describe("Pipeline Topologies", () => {
    it("defines 3 topologies: linear, fan-out-fan-in, recursive-convergence", () => {
      expect(page).toContain('"linear"');
      expect(page).toContain('"fan-out-fan-in"');
      expect(page).toContain('"recursive-convergence"');
    });

    it("has TopologyBadge component", () => {
      expect(page).toContain("function TopologyBadge");
    });

    it("includes topology use cases", () => {
      expect(page).toContain("Standard ETL");
      expect(page).toContain("Wide research");
      expect(page).toContain("Multi-pass optimization");
    });
  });

  describe("Source Classes", () => {
    it("defines 5 source classes", () => {
      expect(page).toContain('"saas-api"');
      expect(page).toContain('"file-upload"');
      expect(page).toContain('"web-scrape"');
      expect(page).toContain('"database"');
      expect(page).toContain('"manual"');
    });
  });

  describe("Storage Tiers", () => {
    it("defines 3 storage tiers", () => {
      expect(page).toContain("Tier 1: Sandbox");
      expect(page).toContain("Tier 2: Share Page");
      expect(page).toContain("Tier 3: External Persistence");
    });

    it("describes tier characteristics", () => {
      expect(page).toContain("Ephemeral");
      expect(page).toContain("Persists beyond session");
      expect(page).toContain("Version-controlled");
    });
  });

  describe("Operation Categories", () => {
    it("defines 5 operation categories", () => {
      const categories = ["Ingestion", "Transformation", "Enrichment", "Modeling", "Storage"];
      for (const cat of categories) {
        expect(page).toContain(cat);
      }
    });

    it("includes ingestion modes from the reference", () => {
      expect(page).toContain("One-Off Batch");
      expect(page).toContain("Wide Research Fan-Out");
      expect(page).toContain("Scheduled/Cron");
      expect(page).toContain("Event-Driven");
    });

    it("includes transformation operations", () => {
      expect(page).toContain("Deduplication");
      expect(page).toContain("Normalization");
      expect(page).toContain("Aggregation");
      expect(page).toContain("Delta Detection");
    });

    it("includes enrichment operations", () => {
      expect(page).toContain("LLM Scoring");
      expect(page).toContain("Geocoding");
      expect(page).toContain("Imputation");
      expect(page).toContain("Sentiment Analysis");
    });

    it("includes storage operations", () => {
      expect(page).toContain("S3 Upload");
      expect(page).toContain("Database Write");
      expect(page).toContain("Webhook Delivery");
      expect(page).toContain("GitHub Commit");
    });
  });

  describe("Runbook Templates", () => {
    it("defines 4 runbook templates", () => {
      expect(page).toContain("One-Off Fan-Out Research");
      expect(page).toContain("Daily Scheduled Ingestion");
      expect(page).toContain("Recursive Document Convergence");
      expect(page).toContain("Bulk-Sync Recovery Monitor");
    });

    it("each runbook has a copy-pasteable prompt", () => {
      expect(page).toContain("Conduct a Wide-Research run");
      expect(page).toContain("Schedule a daily run");
      expect(page).toContain("multi-pass optimization");
      expect(page).toContain("Monitor <sync script>");
    });

    it("has a copy-to-clipboard button for runbook prompts", () => {
      expect(page).toContain("navigator.clipboard.writeText(rb.prompt)");
      expect(page).toContain("Runbook prompt copied to clipboard");
    });
  });

  describe("Governance Plane", () => {
    it("includes data inclusion/exclusion", () => {
      expect(page).toContain("Data Inclusion / Exclusion");
    });

    it("includes convergence rules", () => {
      expect(page).toContain("Convergence Rules");
      expect(page).toContain("2-3 consecutive");
    });

    it("includes access control", () => {
      expect(page).toContain("Access Control");
      expect(page).toContain("Hierarchical permissions");
    });
  });

  describe("UI Tabs", () => {
    it("has 4 tabs: pipelines, runbooks, taxonomy, monitoring", () => {
      expect(page).toContain('value="pipelines"');
      expect(page).toContain('value="runbooks"');
      expect(page).toContain('value="taxonomy"');
      expect(page).toContain('value="monitoring"');
    });
  });

  describe("Pipeline Builder", () => {
    it("has CreatePipelineDialog component", () => {
      expect(page).toContain("function CreatePipelineDialog");
    });

    it("allows selecting topology in create dialog", () => {
      expect(page).toMatch(/setTopology.*PipelineTopology/);
    });

    it("allows selecting source class in create dialog", () => {
      expect(page).toContain("setSourceClass");
    });

    it("allows selecting storage tier in create dialog", () => {
      expect(page).toContain("setStorageTier");
    });

    it("has step builder with add/remove functionality", () => {
      expect(page).toContain("addStep");
      expect(page).toContain("removeStep");
    });
  });

  describe("Monitoring", () => {
    it("shows key metrics", () => {
      expect(page).toContain("Active Pipelines");
      expect(page).toContain("Total Runs");
      expect(page).toContain("Success Rate");
      expect(page).toContain("Avg Duration");
    });

    it("shows recent pipeline runs", () => {
      expect(page).toContain("Recent Pipeline Runs");
    });
  });

  describe("Empty States", () => {
    it("has empty state for no pipelines", () => {
      expect(page).toContain("No pipelines yet");
    });

    it("has empty state for filtered results", () => {
      expect(page).toContain("No pipelines match your filters");
    });
  });
});
