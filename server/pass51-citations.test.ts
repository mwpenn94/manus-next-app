/**
 * Pass 51: Tests for linkifyCitations and PDF pagination fixes
 */
import { describe, it, expect } from "vitest";
import { linkifyCitations } from "../client/src/lib/buildStreamCallbacks";

describe("linkifyCitations", () => {
  const sources = [
    { name: "web_search", url: "https://news.mit.edu/2024/ai-research" },
    { name: "web_search", url: "https://www.sciencedaily.com/releases/2024/01/ai-brain.htm" },
    { name: "read_webpage", url: "https://arxiv.org/abs/2401.12345" },
    { name: "web_search", url: "https://www.nature.com/articles/s41586-024-00001" },
    { name: "web_search", url: "https://techcrunch.com/2024/01/quantum-ai" },
  ];

  it("converts (Source: MIT News) to a clickable link", () => {
    const input = "This is important. (Source: MIT News)";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[MIT News]");
    expect(result).toContain("https://news.mit.edu");
    expect(result).not.toContain("(Source:");
  });

  it("converts (Source: ScienceDaily) to a clickable link", () => {
    const input = "Brain research advances. (Source: ScienceDaily)";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[ScienceDaily]");
    expect(result).toContain("sciencedaily.com");
  });

  it("converts (Source: Nature) to a clickable link", () => {
    const input = "Published findings. (Source: Nature)";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[Nature]");
    expect(result).toContain("nature.com");
  });

  it("converts (Sources: MIT News, ScienceDaily) with multiple sources", () => {
    const input = "Multiple findings. (Sources: MIT News, ScienceDaily)";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[MIT News]");
    expect(result).toContain("[ScienceDaily]");
  });

  it("handles [Source: Name] with square brackets", () => {
    const input = "Research shows [Source: TechCrunch] that AI is advancing.";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[TechCrunch]");
    expect(result).toContain("techcrunch.com");
  });

  it("handles (Via: Name) prefix", () => {
    const input = "As reported (Via: MIT News) recently.";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[MIT News]");
  });

  it("handles (From: Name) prefix", () => {
    const input = "Data shows (From: Nature) that...";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[Nature]");
  });

  it("handles (Ref: Name) prefix", () => {
    const input = "See details (Ref: arXiv) for more.";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[arXiv]");
    expect(result).toContain("arxiv.org");
  });

  it("does not modify already-linked citations", () => {
    const input = "See [MIT News](https://news.mit.edu/2024/ai-research) for details.";
    const result = linkifyCitations(input, sources);
    // Should remain unchanged since it's already a markdown link
    expect(result).toBe(input);
  });

  it("returns content unchanged when no sources provided", () => {
    const input = "No sources here. (Source: Unknown)";
    const result = linkifyCitations(input, []);
    expect(result).toBe(input);
  });

  it("returns content unchanged when no citation patterns found", () => {
    const input = "Just regular text without any citations.";
    const result = linkifyCitations(input, sources);
    expect(result).toBe(input);
  });

  it("leaves unmatched source names as-is", () => {
    const input = "Data from (Source: Bloomberg Terminal) shows growth.";
    const result = linkifyCitations(input, sources);
    // Bloomberg isn't in our sources, so it should remain as-is
    expect(result).toContain("(Source: Bloomberg Terminal)");
  });

  it("handles empty content", () => {
    const result = linkifyCitations("", sources);
    expect(result).toBe("");
  });

  it("handles case-insensitive matching", () => {
    const input = "Research (source: mit news) confirms this.";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[mit news]");
    expect(result).toContain("mit.edu");
  });

  it("handles multiple citations in the same content", () => {
    const input = "AI advances (Source: MIT News) and brain research (Source: ScienceDaily) show progress.";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[MIT News]");
    expect(result).toContain("[ScienceDaily]");
    // Both should be linked
    const linkCount = (result.match(/\]\(https?:\/\//g) || []).length;
    expect(linkCount).toBe(2);
  });

  it("handles Reference: prefix", () => {
    const input = "See (Reference: Nature) for the full study.";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[Nature]");
  });
});

describe("linkifyCitations edge cases", () => {
  it("handles sources with only domain-based matching", () => {
    const sources = [
      { name: "web_search", url: "https://www.reuters.com/technology/ai-2024" },
    ];
    const input = "Breaking news (Source: Reuters) about AI.";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[Reuters]");
    expect(result).toContain("reuters.com");
  });

  it("handles sources where name matches but not domain", () => {
    const sources = [
      { name: "The Guardian", url: "https://www.theguardian.com/tech/ai" },
    ];
    const input = "As reported (Source: The Guardian) today.";
    const result = linkifyCitations(input, sources);
    expect(result).toContain("[The Guardian]");
    expect(result).toContain("theguardian.com");
  });

  it("does not create nested markdown links", () => {
    const sources = [
      { name: "web_search", url: "https://example.com" },
    ];
    const input = "See ([Example](https://example.com)) for details.";
    const result = linkifyCitations(input, sources);
    // Should not double-wrap the already-linked citation
    expect(result).not.toContain("[[");
    expect(result).not.toContain("]]");
  });
});
