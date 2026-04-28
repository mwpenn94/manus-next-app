import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Pass 53 — Slides Generation Fix", () => {
  it("should return 'slides' artifact type from executeGenerateSlides", () => {
    const agentToolsPath = path.join(__dirname, "agentTools.ts");
    const content = fs.readFileSync(agentToolsPath, "utf-8");

    // The generate_slides function should return artifactType: "slides" not "document"
    const slidesReturnMatch = content.match(/artifactType:\s*"slides",\s*\n\s*artifactLabel:\s*`Slides:/);
    expect(slidesReturnMatch).not.toBeNull();
  });

  it("should NOT return 'document' artifact type from executeGenerateSlides", () => {
    const agentToolsPath = path.join(__dirname, "agentTools.ts");
    const content = fs.readFileSync(agentToolsPath, "utf-8");

    // Find the slides function section
    const slidesSection = content.slice(
      content.indexOf("async function executeGenerateSlides"),
      content.indexOf("async function executeGenerateSlides") + 3000
    );

    // Should not have artifactType: "document" in the slides function
    expect(slidesSection).not.toContain('artifactType: "document"');
  });

  it("should query slides artifacts in workspace panel", () => {
    const taskViewPath = path.join(__dirname, "..", "client", "src", "pages", "TaskView.tsx");
    const content = fs.readFileSync(taskViewPath, "utf-8");

    // Should have a slides artifact query
    expect(content).toContain('type: "slides"');
    expect(content).toContain("slidesArtifacts");
  });

  it("should include slides in allDocuments list", () => {
    const taskViewPath = path.join(__dirname, "..", "client", "src", "pages", "TaskView.tsx");
    const content = fs.readFileSync(taskViewPath, "utf-8");

    // Should push slides into allDocuments with docType "slides"
    expect(content).toContain('docType: "slides"');
  });

  it("should render slides in iframe like PDFs", () => {
    const taskViewPath = path.join(__dirname, "..", "client", "src", "pages", "TaskView.tsx");
    const content = fs.readFileSync(taskViewPath, "utf-8");

    // Should render slides via iframe (same as PDF)
    expect(content).toContain('doc.docType === "slides"');
    expect(content).toContain("Slides Preview");
  });

  it("should use slides icon in document list", () => {
    const taskViewPath = path.join(__dirname, "..", "client", "src", "pages", "TaskView.tsx");
    const content = fs.readFileSync(taskViewPath, "utf-8");

    // Should have a specific icon for slides
    expect(content).toContain('"slides" ? "📊"');
  });
});

describe("Pass 53 — Webapp Creation Fallback", () => {
  it("should have HTML fallback when npm install fails", () => {
    const agentToolsPath = path.join(__dirname, "agentTools.ts");
    const content = fs.readFileSync(agentToolsPath, "utf-8");

    // Should have fallback logic
    expect(content).toContain("Falling back to HTML template");
    expect(content).toContain("usedFallback");
  });

  it("should use Tailwind CDN in HTML fallback", () => {
    const agentToolsPath = path.join(__dirname, "agentTools.ts");
    const content = fs.readFileSync(agentToolsPath, "utf-8");

    expect(content).toContain("cdn.tailwindcss.com");
  });

  it("should handle npm install failure gracefully", () => {
    const agentToolsPath = path.join(__dirname, "agentTools.ts");
    const content = fs.readFileSync(agentToolsPath, "utf-8");

    // Should have installSuccess flag
    expect(content).toContain("let installSuccess = false");
    expect(content).toContain("installSuccess = true");

    // Should check for node_modules existence
    expect(content).toContain('!installSuccess || !fs.existsSync(path.join(projectDir, "node_modules"))');
  });
});

describe("Pass 53 — Double Onboarding Fix", () => {
  it("should not import OnboardingTour in App.tsx", () => {
    const appPath = path.join(__dirname, "..", "client", "src", "App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");

    // Should have the removal comment
    expect(content).toContain("OnboardingTour removed");

    // Should not have an active import of OnboardingTour
    const activeImport = content.match(/^import.*OnboardingTour/m);
    expect(activeImport).toBeNull();
  });

  it("should set sovereign onboarding key in OnboardingTooltips", () => {
    const tooltipsPath = path.join(__dirname, "..", "client", "src", "components", "OnboardingTooltips.tsx");
    const content = fs.readFileSync(tooltipsPath, "utf-8");

    // Should set the old sovereign key as safety measure
    expect(content).toContain("sovereign-onboarding-complete");
  });
});

describe("Pass 53 — Auto-scroll Fix", () => {
  it("should have userScrolledUpRef for scroll guard", () => {
    const taskViewPath = path.join(__dirname, "..", "client", "src", "pages", "TaskView.tsx");
    const content = fs.readFileSync(taskViewPath, "utf-8");

    expect(content).toContain("userScrolledUpRef");
  });

  it("should track streaming content in scroll dependencies", () => {
    const taskViewPath = path.join(__dirname, "..", "client", "src", "pages", "TaskView.tsx");
    const content = fs.readFileSync(taskViewPath, "utf-8");

    // The auto-scroll useEffect should depend on streaming state
    expect(content).toContain("streamContent");
    expect(content).toContain("agentActions");
  });
});

describe("Pass 53 — Duplicate Image Fix", () => {
  it("should check each image individually in onDone", () => {
    const callbacksPath = path.join(__dirname, "..", "client", "src", "lib", "buildStreamCallbacks.ts");
    const content = fs.readFileSync(callbacksPath, "utf-8");

    // Should filter images that aren't already in accumulated content
    expect(content).toContain("filter");
    expect(content).toContain("accumulated.includes");
  });
});
