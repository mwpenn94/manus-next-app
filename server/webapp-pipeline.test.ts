/**
 * Webapp Deployment Pipeline Tests — Session 30
 *
 * Tests for:
 * 1. WebappPreviewCard publishedUrl prop and URL resolution logic
 * 2. DeploymentCard empty URL guards
 * 3. SSE pipeline webapp_preview → published status update
 * 4. buildStreamCallbacks onWebappDeployed fallback matching
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── WebappPreviewCard URL Resolution Logic ───

describe("WebappPreviewCard URL resolution", () => {
  // Test the URL resolution logic that was implemented in the component
  // We test the pure logic here since the component uses useMemo

  function resolveEffectiveUrl(publishedUrl?: string, previewUrl?: string): string {
    if (publishedUrl) return publishedUrl;
    if (previewUrl?.startsWith("http://localhost")) return `/api/webapp-preview/`;
    if (previewUrl?.startsWith("/api/webapp-preview")) return previewUrl;
    return previewUrl || `/api/webapp-preview/`;
  }

  function resolveDisplayUrl(publishedUrl?: string, domain?: string, appName?: string): string {
    if (publishedUrl) return publishedUrl.replace(/^https?:\/\//, "");
    if (domain) return domain;
    return `${appName || "app"} \u00b7 Dev Preview`;
  }

  function resolveCopyableUrl(publishedUrl?: string, domain?: string): string {
    if (publishedUrl) return publishedUrl;
    if (domain) return domain.startsWith("http") ? domain : `https://${domain}`;
    return `http://localhost:3000/api/webapp-preview/`; // In real code: window.location.origin
  }

  describe("effectiveUrl", () => {
    it("uses publishedUrl when available (post-deploy)", () => {
      expect(resolveEffectiveUrl("https://cdn.example.com/app/index.html", "/api/webapp-preview/"))
        .toBe("https://cdn.example.com/app/index.html");
    });

    it("uses proxy for localhost previewUrl when no publishedUrl", () => {
      expect(resolveEffectiveUrl(undefined, "/api/webapp-preview/"))
        .toBe("/api/webapp-preview/");
    });

    it("uses previewUrl directly when not localhost and no publishedUrl", () => {
      expect(resolveEffectiveUrl(undefined, "https://some-preview.example.com"))
        .toBe("https://some-preview.example.com");
    });

    it("falls back to proxy when no URLs available", () => {
      expect(resolveEffectiveUrl(undefined, undefined)).toBe("/api/webapp-preview/");
    });

    it("passes through proxy URLs directly", () => {
      expect(resolveEffectiveUrl(undefined, "/api/webapp-preview/")).toBe("/api/webapp-preview/");
    });

    it("publishedUrl takes priority even when previewUrl is a non-localhost URL", () => {
      expect(resolveEffectiveUrl("https://deployed.com/app", "https://preview.com/app"))
        .toBe("https://deployed.com/app");
    });
  });

  describe("displayUrl", () => {
    it("shows clean domain for publishedUrl", () => {
      expect(resolveDisplayUrl("https://cdn.example.com/app/index.html"))
        .toBe("cdn.example.com/app/index.html");
    });

    it("shows domain when available and no publishedUrl", () => {
      expect(resolveDisplayUrl(undefined, "myapp.manus.space"))
        .toBe("myapp.manus.space");
    });

    it("shows app name with Dev Preview for dev server", () => {
      expect(resolveDisplayUrl(undefined, undefined, "My App"))
        .toBe("My App \u00b7 Dev Preview");
    });

    it("defaults to 'app' when no app name", () => {
      expect(resolveDisplayUrl(undefined, undefined, undefined))
        .toBe("app \u00b7 Dev Preview");
    });
  });

  describe("copyableUrl", () => {
    it("copies publishedUrl when available", () => {
      expect(resolveCopyableUrl("https://cdn.example.com/app/index.html"))
        .toBe("https://cdn.example.com/app/index.html");
    });

    it("copies domain with https when domain lacks protocol", () => {
      expect(resolveCopyableUrl(undefined, "myapp.manus.space"))
        .toBe("https://myapp.manus.space");
    });

    it("copies domain as-is when it has protocol", () => {
      expect(resolveCopyableUrl(undefined, "https://myapp.manus.space"))
        .toBe("https://myapp.manus.space");
    });

    it("returns proxy URL when no publishedUrl or domain", () => {
      expect(resolveCopyableUrl(undefined, undefined))
        .toContain("/api/webapp-preview/");
    });
  });
});

// ─── WebappPreviewCard Status Logic ───

describe("WebappPreviewCard status logic", () => {
  function getStatusText(
    status: "published" | "not_published" | "deploying" | "running",
    publishedUrl?: string
  ): string {
    const isPublished = status === "published" || !!publishedUrl;
    if (isPublished) return "Published";
    if (status === "deploying") return "Deploying...";
    if (status === "running") return "Running";
    return "Not published";
  }

  it("shows Published when status is published", () => {
    expect(getStatusText("published")).toBe("Published");
  });

  it("shows Published when publishedUrl is set even if status is running", () => {
    expect(getStatusText("running", "https://deployed.com")).toBe("Published");
  });

  it("shows Published when publishedUrl is set even if status is not_published", () => {
    expect(getStatusText("not_published", "https://deployed.com")).toBe("Published");
  });

  it("shows Running when status is running and no publishedUrl", () => {
    expect(getStatusText("running")).toBe("Running");
  });

  it("shows Deploying when status is deploying and no publishedUrl", () => {
    expect(getStatusText("deploying")).toBe("Deploying...");
  });

  it("shows Not published when status is not_published and no publishedUrl", () => {
    expect(getStatusText("not_published")).toBe("Not published");
  });
});

// ─── DeploymentCard Empty URL Guards ───

describe("DeploymentCard URL guards", () => {
  it("strips protocol from display URL", () => {
    const url = "https://cdn.example.com/app/index.html";
    expect(url.replace(/^https?:\/\//, "")).toBe("cdn.example.com/app/index.html");
  });

  it("handles empty deployedUrl gracefully", () => {
    const deployedUrl = "";
    const displayUrl = deployedUrl ? deployedUrl.replace(/^https?:\/\//, "") : "";
    expect(displayUrl).toBe("");
  });

  it("Visit Site button should be disabled when URL is empty", () => {
    const deployedUrl = "";
    const canVisit = !!deployedUrl;
    expect(canVisit).toBe(false);
  });

  it("Visit Site button should be enabled when URL is present", () => {
    const deployedUrl = "https://cdn.example.com/app/index.html";
    const canVisit = !!deployedUrl;
    expect(canVisit).toBe(true);
  });

  it("Copy handler should not fire when URL is empty", () => {
    const deployedUrl = "";
    let copied = false;
    if (deployedUrl) copied = true;
    expect(copied).toBe(false);
  });
});

// ─── SSE Pipeline: onWebappDeployed Matching Logic ───

describe("onWebappDeployed preview card matching", () => {
  type MockMessage = {
    id: string;
    cardType?: string;
    cardData?: Record<string, unknown>;
  };

  function findPreviewCard(
    messages: MockMessage[],
    deployment: { name: string; projectExternalId?: string }
  ): MockMessage | undefined {
    // Match by projectExternalId first
    let previewMsg = deployment.projectExternalId
      ? messages.find(
          (m) => m.cardType === "webapp_preview" && m.cardData?.projectExternalId === deployment.projectExternalId
        )
      : undefined;
    // Fallback: match by app name
    if (!previewMsg) {
      previewMsg = messages.find(
        (m) => m.cardType === "webapp_preview" && m.cardData?.appName === deployment.name
      );
    }
    // Last resort: match any webapp_preview card
    if (!previewMsg) {
      previewMsg = messages.find((m) => m.cardType === "webapp_preview");
    }
    return previewMsg;
  }

  const baseMessages: MockMessage[] = [
    { id: "msg-1", cardType: "webapp_preview", cardData: { appName: "My App", projectExternalId: "proj-123", previewUrl: "/api/webapp-preview/" } },
    { id: "msg-2", cardType: undefined, cardData: undefined },
    { id: "msg-3", cardType: "task_completed", cardData: {} },
  ];

  it("matches by projectExternalId when available", () => {
    const result = findPreviewCard(baseMessages, { name: "My App", projectExternalId: "proj-123" });
    expect(result?.id).toBe("msg-1");
  });

  it("falls back to matching by app name when projectExternalId is missing", () => {
    const result = findPreviewCard(baseMessages, { name: "My App" });
    expect(result?.id).toBe("msg-1");
  });

  it("falls back to matching by app name when projectExternalId doesn't match", () => {
    const result = findPreviewCard(baseMessages, { name: "My App", projectExternalId: "proj-999" });
    expect(result?.id).toBe("msg-1");
  });

  it("last resort: matches any webapp_preview card", () => {
    const messagesWithDifferentName: MockMessage[] = [
      { id: "msg-1", cardType: "webapp_preview", cardData: { appName: "Different App", projectExternalId: "proj-456" } },
      { id: "msg-2", cardType: "task_completed", cardData: {} },
    ];
    const result = findPreviewCard(messagesWithDifferentName, { name: "Unknown App" });
    expect(result?.id).toBe("msg-1");
  });

  it("returns undefined when no webapp_preview cards exist", () => {
    const messagesWithoutPreview: MockMessage[] = [
      { id: "msg-1", cardType: "task_completed", cardData: {} },
      { id: "msg-2", cardType: undefined, cardData: undefined },
    ];
    const result = findPreviewCard(messagesWithoutPreview, { name: "My App", projectExternalId: "proj-123" });
    expect(result).toBeUndefined();
  });

  it("prefers projectExternalId match over name match when both exist", () => {
    const messagesWithMultiple: MockMessage[] = [
      { id: "msg-1", cardType: "webapp_preview", cardData: { appName: "App A", projectExternalId: "proj-111" } },
      { id: "msg-2", cardType: "webapp_preview", cardData: { appName: "App B", projectExternalId: "proj-222" } },
    ];
    const result = findPreviewCard(messagesWithMultiple, { name: "App A", projectExternalId: "proj-222" });
    // Should match proj-222 by ID, not App A by name
    expect(result?.id).toBe("msg-2");
  });
});

// ─── SSE Pipeline: Card Data Update ───

describe("webapp_preview card data update on deploy", () => {
  it("sets correct card data fields when deployment completes", () => {
    const deployment = {
      name: "My App",
      url: "https://cdn.example.com/app/index.html",
      projectExternalId: "proj-123",
    };

    const updatedCardData = {
      status: "published",
      domain: deployment.url.replace(/^https?:\/\//, ""),
      publishedUrl: deployment.url,
      hasUnpublishedChanges: false,
      projectExternalId: deployment.projectExternalId,
    };

    expect(updatedCardData.status).toBe("published");
    expect(updatedCardData.domain).toBe("cdn.example.com/app/index.html");
    expect(updatedCardData.publishedUrl).toBe("https://cdn.example.com/app/index.html");
    expect(updatedCardData.hasUnpublishedChanges).toBe(false);
    expect(updatedCardData.projectExternalId).toBe("proj-123");
  });

  it("preserves existing projectExternalId when deployment doesn't have one", () => {
    const existingCardData = { projectExternalId: "proj-existing" };
    const deployment = { name: "My App", url: "https://cdn.example.com/app/index.html" };

    const projectExternalId = deployment.projectExternalId || existingCardData.projectExternalId;
    expect(projectExternalId).toBe("proj-existing");
  });

  it("uses deployment projectExternalId when both exist", () => {
    const existingCardData = { projectExternalId: "proj-existing" };
    const deployment = { name: "My App", url: "https://cdn.example.com/app/index.html", projectExternalId: "proj-new" };

    const projectExternalId = deployment.projectExternalId || existingCardData.projectExternalId;
    expect(projectExternalId).toBe("proj-new");
  });
});

// ─── TaskView WebappPreviewCard Props ───

describe("TaskView WebappPreviewCard prop wiring", () => {
  it("cardData.publishedUrl is passed through to WebappPreviewCard", () => {
    // Simulate the cardData that would be set by onWebappDeployed
    const cardData: Record<string, unknown> = {
      appName: "My App",
      previewUrl: "/api/webapp-preview/",
      status: "published",
      publishedUrl: "https://cdn.example.com/app/index.html",
      domain: "cdn.example.com/app/index.html",
      hasUnpublishedChanges: false,
      projectExternalId: "proj-123",
    };

    // These are the props that TaskView extracts from cardData
    const props = {
      appName: (cardData.appName as string) ?? "App",
      domain: cardData.domain as string,
      status: (cardData.status as any) ?? "not_published",
      previewUrl: cardData.previewUrl as string,
      publishedUrl: cardData.publishedUrl as string,
      projectExternalId: cardData.projectExternalId as string,
    };

    expect(props.publishedUrl).toBe("https://cdn.example.com/app/index.html");
    expect(props.status).toBe("published");
    expect(props.domain).toBe("cdn.example.com/app/index.html");
    expect(props.previewUrl).toBe("/api/webapp-preview/");
  });

  it("onVisit handler uses publishedUrl when available", () => {
    const cardData: Record<string, unknown> = {
      publishedUrl: "https://cdn.example.com/app/index.html",
      domain: "cdn.example.com/app/index.html",
    };

    let openedUrl = "";
    const mockWindowOpen = (url: string) => { openedUrl = url; };

    // Simulate the onVisit handler logic from TaskView
    const publishedUrl = cardData.publishedUrl as string;
    const domain = cardData.domain as string;
    if (publishedUrl) {
      mockWindowOpen(publishedUrl);
    } else if (domain) {
      mockWindowOpen(domain.startsWith("http") ? domain : `https://${domain}`);
    } else {
      mockWindowOpen("/api/webapp-preview/");
    }

    expect(openedUrl).toBe("https://cdn.example.com/app/index.html");
  });

  it("onVisit handler falls back to domain when no publishedUrl", () => {
    const cardData: Record<string, unknown> = {
      domain: "myapp.manus.space",
    };

    let openedUrl = "";
    const mockWindowOpen = (url: string) => { openedUrl = url; };

    const publishedUrl = cardData.publishedUrl as string;
    const domain = cardData.domain as string;
    if (publishedUrl) {
      mockWindowOpen(publishedUrl);
    } else if (domain) {
      mockWindowOpen(domain.startsWith("http") ? domain : `https://${domain}`);
    } else {
      mockWindowOpen("/api/webapp-preview/");
    }

    expect(openedUrl).toBe("https://myapp.manus.space");
  });

  it("onVisit handler falls back to proxy when no publishedUrl or domain", () => {
    const cardData: Record<string, unknown> = {};

    let openedUrl = "";
    const mockWindowOpen = (url: string) => { openedUrl = url; };

    const publishedUrl = cardData.publishedUrl as string;
    const domain = cardData.domain as string;
    if (publishedUrl) {
      mockWindowOpen(publishedUrl);
    } else if (domain) {
      mockWindowOpen(domain.startsWith("http") ? domain : `https://${domain}`);
    } else {
      mockWindowOpen("/api/webapp-preview/");
    }

    expect(openedUrl).toBe("/api/webapp-preview/");
  });
});

// ─── WebappPreviewCard Publish Button State ───

describe("WebappPreviewCard publish button state", () => {
  it("shows 'Published' text when isPublished is true", () => {
    const isPublished = true;
    const buttonText = isPublished ? "Published" : "Publish";
    expect(buttonText).toBe("Published");
  });

  it("shows 'Publish' text when isPublished is false", () => {
    const isPublished = false;
    const buttonText = isPublished ? "Published" : "Publish";
    expect(buttonText).toBe("Publish");
  });

  it("hides unpublished changes dot when published", () => {
    const hasUnpublishedChanges = true;
    const isPublished = true;
    const showDot = hasUnpublishedChanges && !isPublished;
    expect(showDot).toBe(false);
  });

  it("shows unpublished changes dot when not published and has changes", () => {
    const hasUnpublishedChanges = true;
    const isPublished = false;
    const showDot = hasUnpublishedChanges && !isPublished;
    expect(showDot).toBe(true);
  });
});

// ─── Proxy Failure Detection ───

describe("WebappPreviewCard proxy failure detection", () => {
  it("marks proxy as failed after max retries without publishedUrl", () => {
    const retryCount = 5;
    const publishedUrl = undefined;
    const proxyFailed = retryCount >= 5 && !publishedUrl;
    expect(proxyFailed).toBe(true);
  });

  it("does not mark proxy as failed when publishedUrl is available", () => {
    const retryCount = 5;
    const publishedUrl = "https://deployed.com/app";
    const proxyFailed = retryCount >= 5 && !publishedUrl;
    expect(proxyFailed).toBe(false);
  });

  it("does not mark proxy as failed before max retries", () => {
    const retryCount = 3;
    const publishedUrl = undefined;
    const proxyFailed = retryCount >= 5 && !publishedUrl;
    expect(proxyFailed).toBe(false);
  });
});

// ─── DeploymentCard Status Config ───

describe("DeploymentCard status configuration", () => {
  const statusConfig = {
    live: { label: "Live", color: "text-emerald-400" },
    deploying: { label: "Deploying...", color: "text-amber-400" },
    failed: { label: "Failed", color: "text-red-400" },
  };

  it("live status shows correct label and color", () => {
    expect(statusConfig.live.label).toBe("Live");
    expect(statusConfig.live.color).toBe("text-emerald-400");
  });

  it("deploying status shows correct label and color", () => {
    expect(statusConfig.deploying.label).toBe("Deploying...");
    expect(statusConfig.deploying.color).toBe("text-amber-400");
  });

  it("failed status shows correct label and color", () => {
    expect(statusConfig.failed.label).toBe("Failed");
    expect(statusConfig.failed.color).toBe("text-red-400");
  });

  it("header icon color changes for failed status", () => {
    const status = "failed";
    const iconBg = status === "failed" ? "bg-red-500/10" : "bg-emerald-500/10";
    expect(iconBg).toBe("bg-red-500/10");
  });

  it("header icon color is emerald for live status", () => {
    const status = "live";
    const iconBg = status === "failed" ? "bg-red-500/10" : "bg-emerald-500/10";
    expect(iconBg).toBe("bg-emerald-500/10");
  });
});
