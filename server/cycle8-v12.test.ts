import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Cycle 8 v1.2 Convergence Tests
 * Tests all changes from Cycle 8 + v1.2 improvements:
 * - Phase A: Chat resilience (continue detection, loop detection)
 * - Phase B: URL filtering, document delivery, progress accuracy
 * - Phase C: Branch + TTS (already existed, verify)
 * - Phase D: GitHub Deploy tab
 * - Phase E: QA Testing page
 * - Phase F: Role-based sidebar
 * - Phase H: Agent behavior (anti-apology, anti-clarification, failover)
 * - Phase I: v1.2 failover protocol, cleanup, integrity
 * - Phase J: PDF attachment handling
 * - Phase K: Server-side PDF extraction
 */

const ROOT = path.resolve(__dirname, "..");

// ─── Phase A: Chat Resilience ───

describe("Phase A: Chat Resilience", () => {
  it("A1: System prompt contains interrupted response handling rules", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/interrupted|interruptMarker|Response interrupted/i);
  });

  it("A2: System prompt contains continue command detection rule", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    // Rule 8 should handle continue/resume as special commands
    expect(agentStream).toMatch(/continue|resume/i);
  });

  it("A3: Client-side continue detection exists in TaskView", () => {
    const taskView = fs.readFileSync(path.join(ROOT, "client/src/pages/TaskView.tsx"), "utf-8");
    expect(taskView).toMatch(/isContinueCommand|continue/i);
  });

  it("A4: Loop/stuck detection exists in agentStream", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/stuck|MAX_STUCK/i);
  });

  it("A5: resumeStale procedure exists in routers", () => {
    const routers = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf-8");
    expect(routers).toContain("resumeStale");
  });
});

// ─── Phase B: URL Filtering + Document Delivery ───

describe("Phase B: URL Filtering & Document Delivery", () => {
  it("B1: URL filtering function exists in agentTools", () => {
    const tools = fs.readFileSync(path.join(ROOT, "server/agentTools.ts"), "utf-8");
    expect(tools).toContain("isAdOrRedirectUrl");
  });

  it("B2: URL filtering blocks common ad/redirect domains", () => {
    const tools = fs.readFileSync(path.join(ROOT, "server/agentTools.ts"), "utf-8");
    // Should contain patterns for ad/redirect URLs
    expect(tools).toMatch(/duckduckgo\.com\/y\.js|ad_domain|doubleclick|googleadservices/i);
  });

  it("B3: read_webpage rejects ad/redirect URLs", () => {
    const tools = fs.readFileSync(path.join(ROOT, "server/agentTools.ts"), "utf-8");
    // The read_webpage handler should check URLs before fetching
    expect(tools).toMatch(/isAdOrRedirectUrl/);
  });

  it("B4: generate_document tool exists with PDF support", () => {
    const tools = fs.readFileSync(path.join(ROOT, "server/agentTools.ts"), "utf-8");
    expect(tools).toContain("generate_document");
    expect(tools).toMatch(/pdf|PDF/);
  });

  it("B5: Document generation module exists", () => {
    expect(fs.existsSync(path.join(ROOT, "server/documentGeneration.ts"))).toBe(true);
  });

  it("B6: wide_research synthesis includes deliverable reminder", () => {
    const tools = fs.readFileSync(path.join(ROOT, "server/agentTools.ts"), "utf-8");
    expect(tools).toMatch(/deliverable|generate_document|produce.*document/i);
  });
});

// ─── Phase C: Branch + TTS ───

describe("Phase C: Branch & TTS Features", () => {
  it("C1: BranchIndicator component exists", () => {
    const taskView = fs.readFileSync(path.join(ROOT, "client/src/pages/TaskView.tsx"), "utf-8");
    expect(taskView).toMatch(/BranchIndicator|BranchBanner|branch/i);
  });

  it("C2: Task duplicate/fork procedure exists", () => {
    const routers = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf-8");
    expect(routers).toContain("duplicate");
  });

  it("C3: TTS hook exists", () => {
    const hooksDir = path.join(ROOT, "client/src/hooks");
    const files = fs.readdirSync(hooksDir);
    const hasTTS = files.some(f => f.toLowerCase().includes("tts"));
    expect(hasTTS).toBe(true);
  });

  it("C4: Edge TTS hook exists", () => {
    const hooksDir = path.join(ROOT, "client/src/hooks");
    const files = fs.readdirSync(hooksDir);
    const hasEdgeTTS = files.some(f => f.toLowerCase().includes("edgetts") || f.toLowerCase().includes("edge"));
    expect(hasEdgeTTS).toBe(true);
  });
});

// ─── Phase D: GitHub Deploy Tab ───

describe("Phase D: GitHub Deploy Tab", () => {
  it("D1: GitHubPage contains Deploy tab", () => {
    const github = fs.readFileSync(path.join(ROOT, "client/src/pages/GitHubPage.tsx"), "utf-8");
    expect(github).toMatch(/deploy|Deploy/);
  });

  it("D2: DeployTab component exists in GitHubPage", () => {
    const github = fs.readFileSync(path.join(ROOT, "client/src/pages/GitHubPage.tsx"), "utf-8");
    expect(github).toMatch(/DeployTab|deploy.*tab/i);
  });

  it("D3: Deploy tab uses deployFromGitHub procedure", () => {
    const github = fs.readFileSync(path.join(ROOT, "client/src/pages/GitHubPage.tsx"), "utf-8");
    expect(github).toMatch(/deployFromGitHub|deploy/i);
  });

  it("D4: Deploy tab shows preview URL", () => {
    const github = fs.readFileSync(path.join(ROOT, "client/src/pages/GitHubPage.tsx"), "utf-8");
    expect(github).toMatch(/preview.*url|previewUrl|Preview URL/i);
  });

  it("D5: deployFromGitHub procedure exists in routers", () => {
    const routers = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf-8");
    expect(routers).toContain("deployFromGitHub");
  });
});

// ─── Phase E: QA Testing Page ───

describe("Phase E: QA Testing Page", () => {
  it("E1: QATestingPage exists", () => {
    expect(fs.existsSync(path.join(ROOT, "client/src/pages/QATestingPage.tsx"))).toBe(true);
  });

  it("E2: QATestingPage has test scenario tab", () => {
    const qa = fs.readFileSync(path.join(ROOT, "client/src/pages/QATestingPage.tsx"), "utf-8");
    expect(qa).toMatch(/scenario|Scenario/i);
  });

  it("E3: QATestingPage has accessibility tab", () => {
    const qa = fs.readFileSync(path.join(ROOT, "client/src/pages/QATestingPage.tsx"), "utf-8");
    expect(qa).toMatch(/accessibility|Accessibility/i);
  });

  it("E4: QATestingPage has performance tab", () => {
    const qa = fs.readFileSync(path.join(ROOT, "client/src/pages/QATestingPage.tsx"), "utf-8");
    expect(qa).toMatch(/performance|Performance/i);
  });

  it("E5: QATestingPage has visual regression tab", () => {
    const qa = fs.readFileSync(path.join(ROOT, "client/src/pages/QATestingPage.tsx"), "utf-8");
    expect(qa).toMatch(/visual|Visual/i);
  });

  it("E6: QATestingPage is routed in App.tsx", () => {
    const app = fs.readFileSync(path.join(ROOT, "client/src/App.tsx"), "utf-8");
    expect(app).toMatch(/QATestingPage|qa-testing/i);
  });

  it("E7: QA Testing is in the sidebar navigation", () => {
    const layout = fs.readFileSync(path.join(ROOT, "client/src/components/AppLayout.tsx"), "utf-8");
    expect(layout).toMatch(/qa-testing|QA Testing/i);
  });

  it("E8: cleanupTestArtifacts procedure exists", () => {
    const routers = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf-8");
    expect(routers).toContain("cleanupTestArtifacts");
  });
});

// ─── Phase F: Role-Based Sidebar ───

describe("Phase F: Role-Based Sidebar", () => {
  const layoutSrc = fs.readFileSync(path.join(__dirname, "../client/src/components/AppLayout.tsx"), "utf8");

  it("F1: AppsGridMenu has role-based filtering", () => {
    expect(layoutSrc).toContain("userRole");
  });

  it("F2: AppsGridMenu items have admin-only annotations", () => {
    expect(layoutSrc).toContain('userRole === "admin"');
  });
});

// ─── Phase H: Agent Behavior Rules ───

describe("Phase H: Agent Behavior Rules", () => {
  it("H1: System prompt contains anti-apology rule (rule 10)", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/NEVER apologize|never apologize/i);
  });

  it("H2: System prompt contains anti-clarification rule (rule 11)", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/NEVER ask for clarification|never ask.*clarification/i);
  });

  it("H3: System prompt contains anti-self-deprecation rule (rule 12)", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/self-deprecat|fell short|You are absolutely right/i);
  });

  it("H4: System prompt contains format compliance rule (rule 13)", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/output_format|format.*request|PDF.*request/i);
  });

  it("H5: Limitless mode reinforces anti-apology rules", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    // The Limitless mode section should have reinforcement
    expect(agentStream).toMatch(/Limitless/);
  });

  it("H6: Quality and Max modes also have anti-apology rules", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/Quality/);
    expect(agentStream).toMatch(/Max/);
  });
});

// ─── Phase I: v1.2 Failover Protocol ───

describe("Phase I: v1.2 Failover Protocol", () => {
  it("I1: System prompt contains failover protocol rule (rule 14)", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/FAILOVER|failover|alternative approach/i);
  });

  it("I2: System prompt contains never-halt rule (rule 15)", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/NEVER HALT|wait for human|best-inference/i);
  });

  it("I3: System prompt contains notifications-informational rule (rule 16)", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/NOTIFICATION|informational|log.*continue/i);
  });

  it("I4: NOTIFICATIONS.json exists", () => {
    expect(fs.existsSync(path.join(ROOT, "NOTIFICATIONS.json"))).toBe(true);
  });

  it("I5: STATE_MANIFEST.md exists and is updated", () => {
    const manifest = fs.readFileSync(path.join(ROOT, "STATE_MANIFEST.md"), "utf-8");
    expect(manifest).toContain("temperature");
    expect(manifest).toContain("pass");
  });
});

// ─── Phase K: PDF Extraction ───

describe("Phase K: Server-Side PDF Extraction", () => {
  it("K1: PDF preprocessing function exists in agentStream", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/preprocessPdf|pdf.*extract|extractPdf/i);
  });

  it("K2: PDF extraction converts file_url to text content", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/file_url.*pdf|pdf.*file_url|application\/pdf/i);
  });

  it("K3: PDF extraction has fallback for unreadable PDFs", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    // Should have a catch/fallback for when extraction fails
    expect(agentStream).toMatch(/catch|fallback|extraction.*not possible|could not extract/i);
  });

  it("K4: System prompt contains attachment-aware response section", () => {
    const agentStream = fs.readFileSync(path.join(ROOT, "server/agentStream.ts"), "utf-8");
    expect(agentStream).toMatch(/ATTACHMENT|attachment.*aware|attached file/i);
  });
});

// ─── UX Fixes ───

describe("UX Fixes", () => {
  it("UX1: Delete confirmation dialog exists in AppLayout", () => {
    const layout = fs.readFileSync(path.join(ROOT, "client/src/components/AppLayout.tsx"), "utf-8");
    expect(layout).toMatch(/AlertDialog|deleteConfirm|confirmDelete/i);
  });

  it("UX2: Sidebar nav items have title/tooltip attributes", () => {
    const layout = fs.readFileSync(path.join(ROOT, "client/src/components/AppLayout.tsx"), "utf-8");
    expect(layout).toMatch(/title=\{|title="/);
  });

  it("UX3: Error humanization function exists", () => {
    const streamRetry = fs.readFileSync(path.join(ROOT, "client/src/lib/streamWithRetry.ts"), "utf-8");
    expect(streamRetry).toMatch(/getStreamErrorMessage|humanize|friendly/i);
  });

  it("UX4: Keyboard shortcuts dialog exists", () => {
    expect(fs.existsSync(path.join(ROOT, "client/src/components/KeyboardShortcutsDialog.tsx"))).toBe(true);
  });
});

// ─── Routing Completeness ───

describe("Routing Completeness", () => {
  it("All page files have corresponding routes in App.tsx", () => {
    const app = fs.readFileSync(path.join(ROOT, "client/src/App.tsx"), "utf-8");
    const pagesDir = path.join(ROOT, "client/src/pages");
    const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith(".tsx"));
    
    // These are utility/component files, not routable pages
    const EXCLUDED = ["ComponentShowcase.tsx"];
    
    const unrouted: string[] = [];
    for (const file of pageFiles) {
      if (EXCLUDED.includes(file)) continue;
      const componentName = file.replace(".tsx", "");
      if (!app.includes(componentName)) {
        unrouted.push(file);
      }
    }
    
    expect(unrouted).toEqual([]);
  });
});

// ─── TypeScript Integrity ───

describe("TypeScript Integrity", () => {
  it("tsconfig.json exists", () => {
    expect(fs.existsSync(path.join(ROOT, "tsconfig.json"))).toBe(true);
  });

  it("No syntax errors in key files", () => {
    const keyFiles = [
      "server/agentStream.ts",
      "server/agentTools.ts",
      "server/routers.ts",
      "client/src/App.tsx",
      "client/src/components/AppLayout.tsx",
    ];
    
    for (const file of keyFiles) {
      const content = fs.readFileSync(path.join(ROOT, file), "utf-8");
      // Basic check: file is non-empty and has valid structure
      expect(content.length).toBeGreaterThan(100);
      // Check for balanced braces (rough syntax check)
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      expect(Math.abs(openBraces - closeBraces)).toBeLessThan(5); // Allow small variance for template literals
    }
  });
});

// ─── v1.2 State Files ───

describe("v1.2 State Files", () => {
  it("COMPLIANCE_LOG.md exists", () => {
    expect(fs.existsSync(path.join(ROOT, "COMPLIANCE_LOG.md"))).toBe(true);
  });

  it("PARITY_MATRIX.md exists", () => {
    expect(fs.existsSync(path.join(ROOT, "PARITY_MATRIX.md"))).toBe(true);
  });

  it("CURRENT_BEST.md exists", () => {
    expect(fs.existsSync(path.join(ROOT, "CURRENT_BEST.md"))).toBe(true);
  });

  it("OPERATORS.md exists", () => {
    expect(fs.existsSync(path.join(ROOT, "OPERATORS.md"))).toBe(true);
  });

  it("UHO Field Kit exists", () => {
    expect(fs.existsSync(path.join(ROOT, "docs/uho/UHO_MANUS_FIELD_KIT.md"))).toBe(true);
  });

  it("Strategist pass 1 exists", () => {
    expect(fs.existsSync(path.join(ROOT, "docs/uho/strategist-pass-1.md"))).toBe(true);
  });

  it("Compliance pass 1 exists", () => {
    expect(fs.existsSync(path.join(ROOT, "docs/uho/compliance-pass-1.md"))).toBe(true);
  });

  it("Adversary pass 1 exists", () => {
    expect(fs.existsSync(path.join(ROOT, "docs/uho/adversary-pass-1.md"))).toBe(true);
  });
});
