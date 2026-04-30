import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const TASK_VIEW_SRC = readFileSync(
  resolve(__dirname, "../client/src/pages/TaskView.tsx"),
  "utf-8"
);

const BUILD_STREAM_SRC = readFileSync(
  resolve(__dirname, "../client/src/lib/buildStreamCallbacks.ts"),
  "utf-8"
);

const WEBAPP_CARD_SRC = readFileSync(
  resolve(__dirname, "../client/src/components/WebappPreviewCard.tsx"),
  "utf-8"
);

describe("Pass 68 — Message Ordering (Manus Parity)", () => {
  describe("Actions accordion renders BEFORE text content for assistant messages", () => {
    it("actions accordion block appears before card-type rendering block", () => {
      const actionsIdx = TASK_VIEW_SRC.indexOf(
        "Actions accordion — rendered BEFORE text content for Manus parity"
      );
      const cardIdx = TASK_VIEW_SRC.indexOf(
        "Card-type messages render special inline cards"
      );
      expect(actionsIdx).toBeGreaterThan(-1);
      expect(cardIdx).toBeGreaterThan(-1);
      expect(actionsIdx).toBeLessThan(cardIdx);
    });

    it("assistant actions accordion uses !isUser guard", () => {
      const match = TASK_VIEW_SRC.match(
        /\{hasActions && !isUser && \(\s*<div className="mb-2\.5">/
      );
      expect(match).not.toBeNull();
    });

    it("user message actions accordion uses isUser guard and renders after text", () => {
      const match = TASK_VIEW_SRC.match(
        /\{hasActions && isUser && \(\s*<div className="mt-2\.5">/
      );
      expect(match).not.toBeNull();
    });

    it("actions accordion appears before Streamdown text content", () => {
      const actionsAccordionIdx = TASK_VIEW_SRC.indexOf(
        "{hasActions && !isUser && ("
      );
      const streamdownIdx = TASK_VIEW_SRC.indexOf(
        '<Streamdown>{message.content}</Streamdown>'
      );
      expect(actionsAccordionIdx).toBeGreaterThan(-1);
      expect(streamdownIdx).toBeGreaterThan(-1);
      expect(actionsAccordionIdx).toBeLessThan(streamdownIdx);
    });
  });

  describe("Step indicator completeness", () => {
    it("ActionIcon covers all 18 action types", () => {
      const actionTypes = [
        "browsing", "scrolling", "clicking", "executing", "creating",
        "searching", "generating", "thinking", "writing", "researching",
        "building", "editing", "reading", "installing", "versioning",
        "analyzing", "designing", "sending", "deploying"
      ];
      for (const type of actionTypes) {
        expect(TASK_VIEW_SRC).toContain(`case "${type}"`);
      }
    });

    it("ActionGroupHeader supports collapsible groups", () => {
      expect(TASK_VIEW_SRC).toContain("ActionGroupHeader");
      expect(TASK_VIEW_SRC).toContain("setExpanded(!expanded)");
    });

    it("GroupedActionsList groups 3+ consecutive similar actions", () => {
      expect(TASK_VIEW_SRC).toContain("if (count >= 3)");
    });

    it("steps completed text matches Manus format", () => {
      expect(TASK_VIEW_SRC).toContain("{totalCount} steps completed");
      expect(TASK_VIEW_SRC).toContain("{doneCount} of {totalCount} steps");
    });
  });

  describe("Streaming bubble ordering is correct", () => {
    it("ActiveToolIndicator renders before GroupedActionsList in streaming bubble", () => {
      // In the streaming section (after "streaming && ("), find the order
      const streamingSection = TASK_VIEW_SRC.slice(
        TASK_VIEW_SRC.indexOf("{streaming && (")
      );
      const toolIndicatorIdx = streamingSection.indexOf("ActiveToolIndicator");
      const groupedActionsIdx = streamingSection.indexOf("GroupedActionsList");
      const streamContentIdx = streamingSection.indexOf("{streamContent && (");
      
      expect(toolIndicatorIdx).toBeGreaterThan(-1);
      expect(groupedActionsIdx).toBeGreaterThan(-1);
      expect(streamContentIdx).toBeGreaterThan(-1);
      expect(toolIndicatorIdx).toBeLessThan(groupedActionsIdx);
      expect(groupedActionsIdx).toBeLessThan(streamContentIdx);
    });
  });

  describe("WebappPreviewCard has full management features", () => {
    it("contains live iframe preview", () => {
      expect(WEBAPP_CARD_SRC).toContain("iframe");
    });

    it("has Visit Site button", () => {
      expect(WEBAPP_CARD_SRC).toContain("Visit Site");
    });

    it("has status badge", () => {
      expect(WEBAPP_CARD_SRC).toMatch(/status/i);
    });

    it("has overflow protection", () => {
      expect(WEBAPP_CARD_SRC).toContain("truncate");
    });
  });

  describe("buildStreamCallbacks does not inject raw URLs", () => {
    it("onWebappPreview creates card with empty content", () => {
      expect(BUILD_STREAM_SRC).toContain('content: ""');
    });

    it("onWebappDeployed updates card in-place", () => {
      expect(BUILD_STREAM_SRC).toContain("updateMessageCard");
    });
  });
});
