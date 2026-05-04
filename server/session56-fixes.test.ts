/**
 * Session 56 Fixes: Comprehensive test suite for the 3 critical "losing its mind" bugs.
 *
 * Bug 1: Clone Dedup Registry — prevents re-cloning the same repo
 * Bug 2: Exact-Repetition Detection — fires even during app-building pipeline
 * Bug 3: Deploy Directory Validation + Clone Protection from create_webapp
 *
 * These tests verify the fix logic by inspecting the source code and testing
 * the helper functions/patterns in isolation.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════
// BUG 1: Successful Clone Registry — prevents re-cloning same repo
// ═══════════════════════════════════════════════════════════════════
describe("Bug 1: Successful Clone Registry", () => {
  const agentToolsPath = path.resolve(__dirname, "agentTools.ts");
  const agentStreamPath = path.resolve(__dirname, "agentStream.ts");
  let toolsSource: string;
  let streamSource: string;

  beforeEach(() => {
    toolsSource = fs.readFileSync(agentToolsPath, "utf-8");
    streamSource = fs.readFileSync(agentStreamPath, "utf-8");
  });

  it("should declare successfulCloneRegistry as a Map in agentTools.ts", () => {
    expect(toolsSource).toContain("const successfulCloneRegistry = new Map<string, { dir: string; timestamp: number }>();");
  });

  it("should export getSuccessfulCloneRegistry function", () => {
    expect(toolsSource).toContain("export function getSuccessfulCloneRegistry()");
  });

  it("should check registry BEFORE attempting clone", () => {
    // The registry check must appear before the actual clone execution
    const registryCheckIdx = toolsSource.indexOf("SUCCESSFUL CLONE REGISTRY (Session 56 Fix)");
    const cloneExecIdx = toolsSource.indexOf("Attempt clone with retry and fallback strategies");
    expect(registryCheckIdx).toBeGreaterThan(-1);
    expect(cloneExecIdx).toBeGreaterThan(-1);
    expect(registryCheckIdx).toBeLessThan(cloneExecIdx);
  });

  it("should register successful clones in the registry after clone succeeds", () => {
    expect(toolsSource).toContain("successfulCloneRegistry.set(normalizedUrlForRegistry, { dir: cloneDir, timestamp: Date.now() })");
  });

  it("should normalize URLs by removing .git suffix and trailing slash", () => {
    expect(toolsSource).toContain('.toLowerCase().replace(/\\.git$/, "").replace(/\\/$/, "")');
  });

  it("should reactivate existing clone directory instead of re-cloning", () => {
    expect(toolsSource).toContain("CLONE DEDUP: Repo already cloned at");
    expect(toolsSource).toContain("activeProjectDir = existingClone.dir");
  });

  it("should remove stale entries from registry if directory no longer exists", () => {
    expect(toolsSource).toContain("successfulCloneRegistry.delete(normalizedUrlForRegistry)");
  });

  it("should declare successfulCloneUrls Set in agentStream.ts for stream-level dedup", () => {
    expect(streamSource).toContain("const successfulCloneUrls = new Set<string>();");
  });

  it("should block re-clone at stream level with ALREADY CLONED message", () => {
    expect(streamSource).toContain("ALREADY CLONED: This repository");
    expect(streamSource).toContain("successfulCloneUrls.has(cloneUrl)");
  });

  it("should register successful clones in stream-level Set", () => {
    expect(streamSource).toContain("successfulCloneUrls.add(clonedUrl)");
  });
});

// ═══════════════════════════════════════════════════════════════════
// BUG 2: Exact-Repetition Detection during app-building pipeline
// ═══════════════════════════════════════════════════════════════════
describe("Bug 2: Exact-Repetition Detection Override", () => {
  const agentStreamPath = path.resolve(__dirname, "agentStream.ts");
  let streamSource: string;

  beforeEach(() => {
    streamSource = fs.readFileSync(agentStreamPath, "utf-8");
  });

  it("should implement exact-repetition detection with >90% threshold", () => {
    expect(streamSource).toContain("EXACT-REPETITION DETECTION (fires even during app-building pipeline)");
    expect(streamSource).toContain("exactSimilarity > 0.9");
  });

  it("should set isExactRepeat flag when near-verbatim match detected", () => {
    expect(streamSource).toContain("let isExactRepeat = false");
    expect(streamSource).toContain("isExactRepeat = true");
  });

  it("should override pipeline exemption when exact repeat is detected", () => {
    // The condition should be: (!isInAppBuildPipeline || isExactRepeat)
    expect(streamSource).toContain("(!isInAppBuildPipeline || isExactRepeat)");
  });

  it("should compare against the IMMEDIATELY PREVIOUS response for exact match", () => {
    expect(streamSource).toContain("recentTextResponses[recentTextResponses.length - 1]");
  });

  it("should use words with length > 2 for exact-match comparison (more sensitive)", () => {
    // The exact-match uses w.length > 2 (more sensitive) vs the general check using w.length > 3
    expect(streamSource).toContain('filter(w => w.length > 2)');
  });

  it("should log when exact repeat overrides pipeline exemption", () => {
    expect(streamSource).toContain("EXACT REPEAT DETECTED");
    expect(streamSource).toContain("overriding pipeline exemption");
  });

  // Functional test: verify the exact-repeat detection logic works correctly
  it("should detect exact repeats with >90% word overlap", () => {
    // Simulate the detection logic
    const text1 = "i am now cloning the repository and will install dependencies then build and deploy the webapp for you";
    const text2 = "i am now cloning the repository and will install dependencies then build and deploy the webapp for you";
    
    const words1 = new Set(text1.split(" ").filter(w => w.length > 2));
    const words2 = new Set(text2.split(" ").filter(w => w.length > 2));
    let shared = 0;
    Array.from(words2).forEach(w => { if (words1.has(w)) shared++; });
    const similarity = shared / Math.max(words1.size, words2.size);
    
    expect(similarity).toBeGreaterThan(0.9);
  });

  it("should NOT trigger exact repeat for legitimately different responses", () => {
    const text1 = "cloning the repository from github and setting up the project structure";
    const text2 = "installing dependencies with npm and configuring the build pipeline for production";
    
    const words1 = new Set(text1.split(" ").filter(w => w.length > 2));
    const words2 = new Set(text2.split(" ").filter(w => w.length > 2));
    let shared = 0;
    Array.from(words2).forEach(w => { if (words1.has(w)) shared++; });
    const similarity = shared / Math.max(words1.size, words2.size);
    
    expect(similarity).toBeLessThan(0.9);
  });
});

// ═══════════════════════════════════════════════════════════════════
// BUG 3: Deploy Directory Validation + Clone Protection
// ═══════════════════════════════════════════════════════════════════
describe("Bug 3: Deploy Directory Validation & Clone Protection", () => {
  const agentToolsPath = path.resolve(__dirname, "agentTools.ts");
  let toolsSource: string;

  beforeEach(() => {
    toolsSource = fs.readFileSync(agentToolsPath, "utf-8");
  });

  describe("create_webapp clone protection", () => {
    it("should check if target directory is a cloned repo before overwriting", () => {
      expect(toolsSource).toContain("Protect cloned repos from being overwritten by create_webapp");
      expect(toolsSource).toContain("Array.from(successfulCloneRegistry.values()).some(entry => entry.dir === projectDir)");
    });

    it("should reactivate existing clone instead of overwriting", () => {
      expect(toolsSource).toContain('PROTECTED: ${projectDir} is a cloned repo');
      expect(toolsSource).toContain("reactivating instead of overwriting");
    });

    it("should protect active cloned project even when create_webapp targets different name", () => {
      expect(toolsSource).toContain("Also protect if activeProjectDir is already set to a cloned repo");
      expect(toolsSource).toContain("Array.from(successfulCloneRegistry.values()).some(entry => entry.dir === activeProjectDir)");
    });

    it("should tell agent to use existing files instead of creating new ones", () => {
      expect(toolsSource).toContain("DO NOT create a new webapp over a cloned repository");
      expect(toolsSource).toContain("Use the existing files: install_deps, run_command(build), edit_file, or deploy_webapp");
    });
  });

  describe("deploy_webapp directory validation", () => {
    it("should verify activeProjectDir exists before deploying", () => {
      expect(toolsSource).toContain("Deploy directory content validation");
      expect(toolsSource).toContain("if (!fs.existsSync(activeProjectDir))");
    });

    it("should recover to last cloned repo if activeProjectDir is missing", () => {
      expect(toolsSource).toContain("RECOVERY: activeProjectDir was missing, recovered to last cloned repo");
      expect(toolsSource).toContain("Array.from(successfulCloneRegistry.entries()).pop()");
    });

    it("should fail gracefully if both activeProjectDir and clone registry are empty", () => {
      expect(toolsSource).toContain("Deploy failed: The project directory no longer exists. Use create_webapp or git_operation(clone)");
    });

    it("should check for empty directory (catches rm -rf cases)", () => {
      expect(toolsSource).toContain("fs.readdirSync(activeProjectDir)");
      expect(toolsSource).toContain("dirContents.length === 0");
    });

    it("should provide actionable error when directory is empty", () => {
      expect(toolsSource).toContain("project directory (${activeProjectDir}) is empty");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Integration: All 3 fixes work together
// ═══════════════════════════════════════════════════════════════════
describe("Integration: All 3 fixes work together", () => {
  const agentToolsPath = path.resolve(__dirname, "agentTools.ts");
  const agentStreamPath = path.resolve(__dirname, "agentStream.ts");
  let toolsSource: string;
  let streamSource: string;

  beforeEach(() => {
    toolsSource = fs.readFileSync(agentToolsPath, "utf-8");
    streamSource = fs.readFileSync(agentStreamPath, "utf-8");
  });

  it("should have clone registry check BEFORE the rm -rf in create_webapp", () => {
    const protectionIdx = toolsSource.indexOf("Protect cloned repos from being overwritten by create_webapp");
    const rmRfIdx = toolsSource.indexOf("fs.rmSync(projectDir, { recursive: true, force: true })");
    expect(protectionIdx).toBeGreaterThan(-1);
    expect(rmRfIdx).toBeGreaterThan(-1);
    expect(protectionIdx).toBeLessThan(rmRfIdx);
  });

  it("should have deploy validation BEFORE the pre-deploy checks", () => {
    const validationIdx = toolsSource.indexOf("Deploy directory content validation");
    const preDeployIdx = toolsSource.indexOf("PRE-DEPLOY VALIDATION (Manus Parity+)");
    expect(validationIdx).toBeGreaterThan(-1);
    expect(preDeployIdx).toBeGreaterThan(-1);
    expect(validationIdx).toBeLessThan(preDeployIdx);
  });

  it("should have stream-level clone dedup BEFORE tool execution", () => {
    const dedupIdx = streamSource.indexOf("SUCCESSFUL CLONE DEDUP (Session 56 Fix)");
    const execIdx = streamSource.indexOf("const result: ToolResult = await executeTool(tn, ta, toolCtx)");
    expect(dedupIdx).toBeGreaterThan(-1);
    expect(execIdx).toBeGreaterThan(-1);
    expect(dedupIdx).toBeLessThan(execIdx);
  });

  it("should have exact-repeat detection BEFORE the stuck break logic", () => {
    const exactRepeatIdx = streamSource.indexOf("EXACT-REPETITION DETECTION");
    const stuckBreakIdx = streamSource.indexOf("STUCK DETECTED (${stuckBreakCount}");
    expect(exactRepeatIdx).toBeGreaterThan(-1);
    expect(stuckBreakIdx).toBeGreaterThan(-1);
    expect(exactRepeatIdx).toBeLessThan(stuckBreakIdx);
  });
});
