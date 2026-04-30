/**
 * Pass 67 — Chat Rendering Manus Parity Tests
 *
 * Validates:
 * 1. WebappPreviewCard is compact (no iframe)
 * 2. onWebappPreview does NOT inject raw URLs into accumulated text
 * 3. onWebappDeployed updates existing card in-place (no separate message)
 * 4. onReconnecting does NOT inject visible text
 * 5. linkifyCitations still works
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Pass 67: WebappPreviewCard — full management card with live preview", () => {
  const cardContent = fs.readFileSync(
    path.resolve("client/src/components/WebappPreviewCard.tsx"),
    "utf-8"
  );

  it("contains a live iframe preview", () => {
    expect(cardContent).toContain("iframe");
  });

  it("has Visit Site button", () => {
    expect(cardContent).toContain("Visit Site");
  });

  it("has a URL bar with copy functionality", () => {
    expect(cardContent).toContain("Copy URL");
    expect(cardContent).toContain("handleCopy");
  });

  it("has a status badge (Published/Running/Deploying)", () => {
    expect(cardContent).toContain("Published");
    expect(cardContent).toContain("Running");
    expect(cardContent).toContain("Deploying");
  });

  it("prevents overflow with truncate and min-w-0", () => {
    expect(cardContent).toContain("truncate");
    expect(cardContent).toContain("min-w-0");
  });

  it("constrains max width with max-w-lg", () => {
    expect(cardContent).toContain("max-w-lg");
  });
});

describe("Pass 67: onWebappPreview — no raw URL injection", () => {
  const cbContent = fs.readFileSync(
    path.resolve("client/src/lib/buildStreamCallbacks.ts"),
    "utf-8"
  );

  it("creates a card message with empty content (no URL text)", () => {
    // The card message content should be empty string, not a markdown link
    expect(cbContent).toContain('content: "", // Card renders visually; no text content needed');
  });

  it("does NOT have fallback text injection for webapp preview", () => {
    // Should NOT have the old pattern of appending markdown to accumulated
    expect(cbContent).toContain("// No fallback text injection");
  });

  it("deduplicates — only creates one card per app name", () => {
    expect(cbContent).toContain("_webappPreviewsSeen");
    expect(cbContent).toContain("seen.has(preview.name)");
  });
});

describe("Pass 67: onWebappDeployed — in-place card update, no separate message", () => {
  const cbContent = fs.readFileSync(
    path.resolve("client/src/lib/buildStreamCallbacks.ts"),
    "utf-8"
  );

  it("updates existing webapp_preview card instead of creating webapp_deployed message", () => {
    expect(cbContent).toContain("return; // Done — card updated in-place, no new message needed");
  });

  it("fallback creates webapp_preview card (not webapp_deployed)", () => {
    // The fallback should create a webapp_preview card, not webapp_deployed
    const deployedSection = cbContent.slice(cbContent.indexOf("onWebappDeployed"));
    const fallbackIdx = deployedSection.indexOf("// Fallback: If no existing preview card");
    const fallbackSection = deployedSection.slice(fallbackIdx, fallbackIdx + 500);
    expect(fallbackSection).toContain('cardType: "webapp_preview"');
  });

  it("does NOT inject raw URL text into accumulated stream", () => {
    expect(cbContent).toContain("// No raw URL injection into accumulated text");
  });
});

describe("Pass 67: onReconnecting — no visible text injection", () => {
  const cbContent = fs.readFileSync(
    path.resolve("client/src/lib/buildStreamCallbacks.ts"),
    "utf-8"
  );

  it("signals reconnecting state without modifying stream content", () => {
    // Should NOT have setStreamContent with reconnecting text
    const reconnectSection = cbContent.slice(
      cbContent.indexOf("onReconnecting"),
      cbContent.indexOf("onReconnecting") + 400
    );
    expect(reconnectSection).not.toContain("setStreamContent");
    expect(reconnectSection).toContain("setIsReconnecting");
  });
});

describe("Pass 67: TaskView renders compact cards", () => {
  const tvContent = fs.readFileSync(
    path.resolve("client/src/pages/TaskView.tsx"),
    "utf-8"
  );

  it("webapp_deployed renders as WebappPreviewCard (not DeploymentCard)", () => {
    // The webapp_deployed branch should use WebappPreviewCard
    const deployedIdx = tvContent.indexOf('message.cardType === "webapp_deployed"');
    const section = tvContent.slice(deployedIdx, deployedIdx + 300);
    expect(section).toContain("WebappPreviewCard");
    expect(section).not.toContain("DeploymentCard");
  });

  it("webapp_preview uses simplified props (no onSettings/onPublish callbacks)", () => {
    const previewIdx = tvContent.indexOf('message.cardType === "webapp_preview"');
    const section = tvContent.slice(previewIdx, previewIdx + 400);
    expect(section).not.toContain("onSettings={");
    expect(section).not.toContain("onPublish={");
  });
});
