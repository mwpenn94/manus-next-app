/**
 * Pass 30: ConnectorDetailPage — Inline Tiered Auth & Deep Manus Alignment
 *
 * Validates that ConnectorDetailPage now contains:
 * - Inline tiered auth (Tier 1-4) instead of bouncing to ConnectorsPage
 * - OAuth scope display for connected connectors
 * - Same-window callback handling (query params)
 * - Manus Verify flow with verified identity banner
 * - Smart PAT guidance with token-help steps
 * - OAuth setup guide for unconfigured providers
 * - Pull-to-reveal disconnect gesture (preserved from Pass 29)
 * - Connector auth data for all 8 OAuth-capable connectors
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8");
}

describe("Pass 30: ConnectorDetailPage — Inline Tiered Auth", () => {
  const detailPage = readFile("client/src/pages/ConnectorDetailPage.tsx");

  describe("Tiered Auth Architecture", () => {
    it("contains TIER_LABELS for all 4 tiers", () => {
      expect(detailPage).toContain("TIER_LABELS");
      expect(detailPage).toContain("Direct OAuth");
      expect(detailPage).toContain("Manus Verify");
      expect(detailPage).toContain("Smart PAT");
      expect(detailPage).toContain("Manual Entry");
    });

    it("builds available tiers from tierStatus query", () => {
      expect(detailPage).toContain("tieredAuthStatus");
      expect(detailPage).toContain("availableTiers");
      expect(detailPage).toContain("tierStatus?.tier1");
      expect(detailPage).toContain("tierStatus?.tier2");
    });

    it("renders tier accordion with expand/collapse", () => {
      expect(detailPage).toContain("expandedTier");
      expect(detailPage).toContain("setExpandedTier");
      expect(detailPage).toContain("ChevronDown");
      expect(detailPage).toContain("rotate-180");
    });

    it("auto-expands best tier on auth section open", () => {
      expect(detailPage).toContain("showAuthSection");
      expect(detailPage).toContain("bestTier");
      expect(detailPage).toContain("setExpandedTier(bestTier)");
    });

    it("shows 'Best' badge for recommended tier", () => {
      expect(detailPage).toContain("isRecommended");
      // Uses "Best" instead of "Recommended" for compact detail page
      expect(detailPage).toMatch(/Best/);
    });

    it("shows 'Verified' badge when identity is verified", () => {
      expect(detailPage).toContain("isVerifiedRecommended");
      expect(detailPage).toContain("Verified");
    });

    it("shows auth method count in footer", () => {
      expect(detailPage).toContain("auth");
      expect(detailPage).toContain("methods");
      expect(detailPage).toContain("Layers");
    });
  });

  describe("Tier 1: Direct OAuth", () => {
    it("renders OAuth connect button when configured", () => {
      expect(detailPage).toContain("handleOAuthConnect");
      expect(detailPage).toContain("getOAuthUrlMutation");
      expect(detailPage).toContain("Sign in with");
    });

    it("shows OAuth setup guide when not configured", () => {
      expect(detailPage).toContain("OAuth Not Configured");
      expect(detailPage).toContain("oauthSetupGuide");
      expect(detailPage).toContain("callbackUrl");
      expect(detailPage).toContain("CLIENT_ID");
      expect(detailPage).toContain("CLIENT_SECRET");
    });

    it("shows 'Setup needed' badge when OAuth not available", () => {
      expect(detailPage).toContain("Setup needed");
      expect(detailPage).toContain("isOAuthAvailable");
    });

    it("handles popup and mobile OAuth flows", () => {
      expect(detailPage).toContain("window.open");
      expect(detailPage).toContain("window.location.href = result.url");
      expect(detailPage).toContain("popupRef");
    });
  });

  describe("Tier 2: Manus Verify", () => {
    it("renders Manus verify button", () => {
      expect(detailPage).toContain("handleManusVerify");
      expect(detailPage).toContain("manusVerifyMutation");
      expect(detailPage).toContain("Verify via Manus");
    });

    it("shows verified identity banner after verification", () => {
      expect(detailPage).toContain("verifiedIdentity");
      expect(detailPage).toContain("Identity Verified");
      expect(detailPage).toContain("BadgeCheck");
      expect(detailPage).toContain("ShieldCheck");
    });

    it("shows contextual PAT guidance after verification", () => {
      expect(detailPage).toContain("getVerifiedPATGuidance");
      expect(detailPage).toContain("verifiedGuidance");
      expect(detailPage).toContain("Personalized token guide");
    });

    it("auto-switches to Smart PAT tier after verification", () => {
      // When verified, expandedTier should be set to 3
      expect(detailPage).toContain("setExpandedTier(3)");
    });
  });

  describe("Tier 3: Smart PAT", () => {
    it("renders token-help steps for supported connectors", () => {
      expect(detailPage).toContain("tokenHelp");
      expect(detailPage).toContain("How to get your token");
      expect(detailPage).toContain("list-decimal");
    });

    it("renders input fields for credentials", () => {
      expect(detailPage).toContain("configValues");
      expect(detailPage).toContain("configFields");
      expect(detailPage).toContain("handleManualConnect");
    });

    it("shows personalized guidance when verified", () => {
      expect(detailPage).toContain("Personalized for");
    });
  });

  describe("Tier 4: Manual Entry", () => {
    it("renders manual credential fields with fallback", () => {
      // Tier 4 uses authData?.configFields with a fallback default field
      expect(detailPage).toContain("Enter your credentials directly");
      expect(detailPage).toContain("API Token / Key");
    });
  });

  describe("OAuth Scope Display", () => {
    it("shows authorized scopes for OAuth-connected connectors", () => {
      expect(detailPage).toContain("Authorized Scopes");
      expect(detailPage).toContain("oauthScopes");
      expect(detailPage).toContain("font-mono");
    });
  });

  describe("Same-Window Callback Handling", () => {
    it("handles oauth_success query param", () => {
      expect(detailPage).toContain('params.get("oauth_success")');
      expect(detailPage).toContain("replaceState");
    });

    it("handles manus_verified query param", () => {
      expect(detailPage).toContain('params.get("manus_verified")');
      expect(detailPage).toContain('params.get("identity")');
      expect(detailPage).toContain('params.get("method")');
    });

    it("handles code+state query params for same-window OAuth", () => {
      expect(detailPage).toContain('params.get("code")');
      expect(detailPage).toContain('params.get("state")');
      expect(detailPage).toContain("JSON.parse(atob(state))");
    });

    it("listens for postMessage from popup windows", () => {
      expect(detailPage).toContain("connector-oauth-callback");
      expect(detailPage).toContain("connector-oauth-success");
      expect(detailPage).toContain("connector-manus-verified");
    });
  });

  describe("Preserved Pass 29 Features", () => {
    it("still has pull-to-reveal disconnect gesture", () => {
      expect(detailPage).toContain("pullOffset");
      expect(detailPage).toContain("handleTouchStart");
      expect(detailPage).toContain("handleTouchMove");
      expect(detailPage).toContain("handleTouchEnd");
      expect(detailPage).toContain("Release to disconnect");
    });

    it("still has back button navigation", () => {
      expect(detailPage).toContain("ChevronLeft");
      expect(detailPage).toContain("Go back");
    });

    it("still has more-options menu", () => {
      expect(detailPage).toContain("MoreHorizontal");
      expect(detailPage).toContain("showMenu");
    });

    it("still has Details section with key-value rows", () => {
      expect(detailPage).toContain("DetailRow");
      expect(detailPage).toContain("DetailLinkRow");
      expect(detailPage).toContain("Connector Type");
      expect(detailPage).toContain("Author");
      expect(detailPage).toContain("Privacy Policy");
    });

    it("still has bottom action button", () => {
      expect(detailPage).toContain("actionLabel");
      expect(detailPage).toContain("actionRoute");
    });

    it("handles 404 for unknown connector IDs", () => {
      expect(detailPage).toContain("Connector not found");
    });
  });
});

describe("Pass 30: CONNECTOR_AUTH_DATA completeness", () => {
  const detailPage = readFile("client/src/pages/ConnectorDetailPage.tsx");

  it("defines auth data for GitHub", () => {
    expect(detailPage).toContain('"github"');
    expect(detailPage).toContain("ghp_");
    expect(detailPage).toContain("Fine-grained");
  });

  it("defines auth data for Slack", () => {
    expect(detailPage).toContain('"slack"');
    expect(detailPage).toContain("hooks.slack.com");
    expect(detailPage).toContain("api.slack.com/apps");
  });

  it("defines auth data for Gmail", () => {
    expect(detailPage).toContain("gmail");
    expect(detailPage).toContain("Gmail API");
  });

  it("defines auth data for Google Drive", () => {
    expect(detailPage).toContain('"google-drive"');
    expect(detailPage).toContain("Service Account");
  });

  it("defines auth data for Google Calendar", () => {
    expect(detailPage).toContain('"calendar"');
    expect(detailPage).toContain("Google Calendar API");
  });

  it("defines auth data for Outlook", () => {
    expect(detailPage).toContain("outlook");
    expect(detailPage).toContain("Graph Explorer");
  });

  it("defines auth data for Microsoft 365", () => {
    expect(detailPage).toContain('"microsoft-365"');
    expect(detailPage).toContain("Azure Portal");
  });

  it("defines auth data for Notion", () => {
    expect(detailPage).toContain('"notion"');
    expect(detailPage).toContain("secret_");
    expect(detailPage).toContain("notion.so/my-integrations");
  });
});

describe("Pass 30: OAuth Setup Guide for all providers", () => {
  const detailPage = readFile("client/src/pages/ConnectorDetailPage.tsx");

  it("includes setup guide for GitHub", () => {
    expect(detailPage).toContain("github.com/settings/developers");
    expect(detailPage).toContain("CONNECTOR_GITHUB");
  });

  it("includes setup guide for Microsoft 365", () => {
    expect(detailPage).toContain("portal.azure.com");
    expect(detailPage).toContain("CONNECTOR_MICROSOFT_365");
  });

  it("includes setup guide for Google Drive", () => {
    expect(detailPage).toContain("console.cloud.google.com/apis/credentials");
    expect(detailPage).toContain("CONNECTOR_GOOGLE");
  });

  it("includes setup guide for Notion", () => {
    expect(detailPage).toContain("notion.so/my-integrations");
    expect(detailPage).toContain("CONNECTOR_NOTION");
  });

  it("includes setup guide for Slack", () => {
    expect(detailPage).toContain("api.slack.com/apps");
    expect(detailPage).toContain("CONNECTOR_SLACK");
  });
});

describe("Pass 30: Deep Manus Alignment Decisions", () => {
  const detailPage = readFile("client/src/pages/ConnectorDetailPage.tsx");

  it("does NOT contain a 'Discover Connectors' marketplace (Manus uses fixed first-party set)", () => {
    expect(detailPage).not.toContain("Discover Connectors");
    expect(detailPage).not.toContain("marketplace");
    expect(detailPage).not.toContain("install count");
  });

  it("does NOT contain revocable per-scope permissions (Manus shows scopes as info only)", () => {
    expect(detailPage).not.toContain("Revoke scope");
    expect(detailPage).not.toContain("revoke");
    expect(detailPage).not.toContain("Remove permission");
  });

  it("shows scopes as read-only display (info only, matching Manus native)", () => {
    expect(detailPage).toContain("Authorized Scopes");
    // Scopes are rendered as badges, not as toggleable items
    expect(detailPage).toContain("rounded-md bg-emerald-500/10");
  });

  it("uses MANUS_VERIFIABLE_IDS matching the platform set", () => {
    expect(detailPage).toContain("MANUS_VERIFIABLE_IDS");
    expect(detailPage).toContain('"github"');
    expect(detailPage).toContain('"microsoft-365"');
    expect(detailPage).toContain('"google-drive"');
    expect(detailPage).toContain('"calendar"');
  });

  it("uses OAUTH_CAPABLE_IDS matching the platform set", () => {
    expect(detailPage).toContain("OAUTH_CAPABLE_IDS");
  });
});
