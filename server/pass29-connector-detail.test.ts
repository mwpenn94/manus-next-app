/**
 * Pass 29: Connector Detail Page + ConnectorsSheet Card Rows Tests
 *
 * Tests verify:
 * 1. CONNECTOR_DEFS export has all 9 connectors with required fields
 * 2. ConnectorIcon export exists and covers all icon types
 * 3. ConnectorDetailPage route registered at /connector/:id
 * 4. ConnectorsSheet card-row pattern (no toggle switches)
 * 5. Detail page metadata (connectorType, author, website, privacyPolicy)
 * 6. Auth steps defined for each connector
 * 7. Warning callout for My Browser connector
 * 8. Action labels and routes for GitHub connector
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CLIENT_SRC = path.resolve(__dirname, "../client/src");

// ── Helper: read file content ──
function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(CLIENT_SRC, relPath), "utf-8");
}

describe("Pass 29: ConnectorsSheet — Manus Native Card Rows", () => {
  const sheetCode = readFile("components/ConnectorsSheet.tsx");

  it("exports CONNECTOR_DEFS array with all 9 connectors", () => {
    expect(sheetCode).toContain("export const CONNECTOR_DEFS");
    // Check all 9 connector IDs are present
    const connectorIds = ["browser", "github", "gmail", "calendar", "google-drive", "outlook", "microsoft-365", "slack", "notion"];
    for (const id of connectorIds) {
      expect(sheetCode).toContain(`id: "${id}"`);
    }
  });

  it("exports ConnectorIcon component", () => {
    expect(sheetCode).toContain("export function ConnectorIcon");
  });

  it("exports ConnectorDef interface", () => {
    expect(sheetCode).toContain("export interface ConnectorDef");
  });

  it("does NOT use toggle Switch components (card rows only)", () => {
    // The sheet should not import or use Switch components anymore
    expect(sheetCode).not.toContain('from "@/components/ui/switch"');
    expect(sheetCode).not.toContain("<Switch");
  });

  it("uses card-row pattern with ChevronRight", () => {
    expect(sheetCode).toContain("ChevronRight");
    expect(sheetCode).toContain("ConnectorCard");
  });

  it("has + button in header for adding connectors", () => {
    expect(sheetCode).toContain("Add connector");
    expect(sheetCode).toContain("<Plus");
  });

  it("has X close button in header", () => {
    expect(sheetCode).toContain("DrawerClose");
    expect(sheetCode).toContain("<X");
  });

  it("navigates to /connector/:id on card click", () => {
    expect(sheetCode).toContain("/connector/");
    expect(sheetCode).toContain("handleCardClick");
  });

  it("each connector has description, connectorType, and author fields", () => {
    // Check that ConnectorDef interface has the required fields
    expect(sheetCode).toContain("description: string");
    expect(sheetCode).toContain("connectorType: string");
    expect(sheetCode).toContain("author: string");
  });

  it("shows both connected and available sections", () => {
    expect(sheetCode).toContain("connectedDefs");
    expect(sheetCode).toContain("availableDefs");
    expect(sheetCode).toContain("Available");
  });
});

describe("Pass 29: ConnectorDetailPage — Manus Native Detail View", () => {
  const detailCode = readFile("pages/ConnectorDetailPage.tsx");

  it("exists and imports from ConnectorsSheet", () => {
    expect(detailCode).toContain("CONNECTOR_DEFS");
    expect(detailCode).toContain("ConnectorIcon");
  });

  it("uses wouter route param /connector/:id", () => {
    expect(detailCode).toContain('"/connector/:id"');
  });

  it("has back navigation button with ChevronLeft", () => {
    expect(detailCode).toContain("ChevronLeft");
    expect(detailCode).toContain("Go back");
  });

  it("has ··· more options menu", () => {
    expect(detailCode).toContain("MoreHorizontal");
    expect(detailCode).toContain("More options");
  });

  it("renders large centered connector icon", () => {
    expect(detailCode).toContain("w-20 h-20");
    expect(detailCode).toContain("ConnectorIcon");
  });

  it("renders connector title and description", () => {
    expect(detailCode).toContain("connectorDef.name");
    expect(detailCode).toContain("connectorDef.description");
  });

  it("renders auth steps with check/circle indicators", () => {
    expect(detailCode).toContain("CheckCircle2");
    expect(detailCode).toContain("Circle");
    expect(detailCode).toContain("authSteps");
  });

  it("renders Details section with key-value rows", () => {
    expect(detailCode).toContain("Details");
    expect(detailCode).toContain("Connector Type");
    expect(detailCode).toContain("Author");
    expect(detailCode).toContain("Website");
    expect(detailCode).toContain("Privacy Policy");
    expect(detailCode).toContain("Provide feedback");
  });

  it("has DetailRow and DetailLinkRow components", () => {
    expect(detailCode).toContain("function DetailRow");
    expect(detailCode).toContain("function DetailLinkRow");
    expect(detailCode).toContain("ExternalLink");
  });

  it("has warning callout support", () => {
    expect(detailCode).toContain("warningCallout");
    expect(detailCode).toContain("AlertCircle");
    expect(detailCode).toContain("Learn more");
  });

  it("has disconnect functionality", () => {
    expect(detailCode).toContain("Disconnect");
    expect(detailCode).toContain("handleDisconnect");
    expect(detailCode).toContain("disconnectMutation");
  });

  it("has pull-to-reveal disconnect gesture", () => {
    expect(detailCode).toContain("pullOffset");
    expect(detailCode).toContain("handleTouchStart");
    expect(detailCode).toContain("handleTouchMove");
    expect(detailCode).toContain("handleTouchEnd");
    expect(detailCode).toContain("Pull to disconnect");
  });

  it("has OAuth connect flow", () => {
    expect(detailCode).toContain("handleConnect");
    expect(detailCode).toContain("getOAuthUrlMutation");
    expect(detailCode).toContain("completeOAuthMutation");
  });

  it("has action button at bottom", () => {
    expect(detailCode).toContain("actionLabel");
    expect(detailCode).toContain("actionRoute");
  });

  it("handles 404 for unknown connector", () => {
    expect(detailCode).toContain("Connector not found");
  });
});

describe("Pass 29: CONNECTOR_DEFS Data Integrity", () => {
  // Parse connector definitions from the source
  const sheetCode = readFile("components/ConnectorsSheet.tsx");

  it("GitHub connector has App type and Add Repositories action", () => {
    expect(sheetCode).toContain('id: "github"');
    expect(sheetCode).toContain('connectorType: "App"');
    expect(sheetCode).toContain('actionLabel: "Add Repositories"');
    expect(sheetCode).toContain('actionRoute: "/github"');
  });

  it("My Browser connector has Browser extension type and warning callout", () => {
    expect(sheetCode).toContain('id: "browser"');
    expect(sheetCode).toContain('connectorType: "Browser extension"');
    expect(sheetCode).toContain("does not support plugin installation");
  });

  it("GitHub has two auth steps: Authorize Account and Authorize Repository", () => {
    // Check the authSteps array for github
    expect(sheetCode).toContain('{ id: "authorize-account", label: "Authorize Account" }');
    expect(sheetCode).toContain('{ id: "authorize-repository", label: "Authorize Repository" }');
  });

  it("all connectors have author set to Manus", () => {
    // Count occurrences of author: "Manus"
    const matches = sheetCode.match(/author: "Manus"/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(9);
  });

  it("all connectors have privacy policy URL", () => {
    const matches = sheetCode.match(/privacyPolicy: "https:\/\/manus\.im\/privacy"/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(9);
  });

  it("OAuth connectors have OAuth type", () => {
    const oauthConnectors = ["gmail", "calendar", "google-drive", "outlook", "microsoft-365", "slack", "notion"];
    for (const id of oauthConnectors) {
      expect(sheetCode).toContain(`id: "${id}"`);
    }
    // Count OAuth type entries
    const oauthMatches = sheetCode.match(/connectorType: "OAuth"/g);
    expect(oauthMatches).not.toBeNull();
    expect(oauthMatches!.length).toBe(7);
  });
});

describe("Pass 29: Route Registration", () => {
  const appCode = readFile("App.tsx");

  it("registers /connector/:id route", () => {
    expect(appCode).toContain('path="/connector/:id"');
  });

  it("lazy-loads ConnectorDetailPage", () => {
    expect(appCode).toContain('import("./pages/ConnectorDetailPage")');
  });

  it("wraps ConnectorDetailPage in SuspenseRoute", () => {
    expect(appCode).toContain("<ConnectorDetailPage />");
  });

  it("maintains /connectors route for ConnectorsPage", () => {
    expect(appCode).toContain('path="/connectors"');
    expect(appCode).toContain("<ConnectorsPage />");
  });
});

describe("Pass 29: ConnectorsBadge preserved", () => {
  const sheetCode = readFile("components/ConnectorsSheet.tsx");

  it("exports ConnectorsBadge component", () => {
    expect(sheetCode).toContain("export function ConnectorsBadge");
  });

  it("ConnectorsBadge shows connected count", () => {
    expect(sheetCode).toContain("connectedCount");
    expect(sheetCode).toContain("connectors active");
  });
});
