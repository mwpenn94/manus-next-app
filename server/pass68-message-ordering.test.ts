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
  describe("Text content renders BEFORE actions accordion for assistant messages (Manus production parity)", () => {
    it("text content appears before actions accordion in assistant messages", () => {
      // In Manus production, conversational text appears ABOVE collapsible action steps
      const streamdownIdx = TASK_VIEW_SRC.indexOf(
        '<Streamdown>{message.content}</Streamdown>'
      );
      const actionsIdx = TASK_VIEW_SRC.indexOf(
        "Actions accordion — rendered AFTER text content for Manus parity"
      );
      expect(streamdownIdx).toBeGreaterThan(-1);
      expect(actionsIdx).toBeGreaterThan(-1);
      expect(streamdownIdx).toBeLessThan(actionsIdx);
    });

    it("assistant actions accordion uses !isUser guard", () => {
      const match = TASK_VIEW_SRC.match(
        /\{hasActions && !isUser && \(\s*<div className="mt-2\.5">/
      );
      expect(match).not.toBeNull();
    });

    it("user message actions accordion uses isUser guard and renders after text", () => {
      const match = TASK_VIEW_SRC.match(
        /\{hasActions && isUser && \(\s*<div className="mt-2\.5">/
      );
      expect(match).not.toBeNull();
    });

    it("actions accordion appears after Streamdown text content", () => {
      const streamdownIdx = TASK_VIEW_SRC.indexOf(
        '<Streamdown>{message.content}</Streamdown>'
      );
      const actionsAccordionIdx = TASK_VIEW_SRC.indexOf(
        "{hasActions && !isUser && ("
      );
      expect(streamdownIdx).toBeGreaterThan(-1);
      expect(actionsAccordionIdx).toBeGreaterThan(-1);
      expect(streamdownIdx).toBeLessThan(actionsAccordionIdx);
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
    it("streamContent renders before StreamingStepsCollapsible in streaming bubble (text first, actions below)", () => {
      // In Manus production, text streams first, then action steps appear below
      const streamingSection = TASK_VIEW_SRC.slice(
        TASK_VIEW_SRC.indexOf("{streaming && (")
      );
      const streamContentIdx = streamingSection.indexOf("{streamContent && (");
      const groupedActionsIdx = streamingSection.indexOf("StreamingStepsCollapsible");
      
      expect(streamContentIdx).toBeGreaterThan(-1);
      expect(groupedActionsIdx).toBeGreaterThan(-1);
      expect(streamContentIdx).toBeLessThan(groupedActionsIdx);
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
