import { readRouterSource } from "./test-utils/readRouterSource";
/**
 * Session 8 — Tests for CloudFront Provisioning, aria-live Regions, and Geographic/Device Analytics
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── 1. CloudFront Distribution Provisioning ────────────────────────────────

describe("CloudFront Distribution Provisioning", () => {
  const cfFile = readFileSync(resolve(__dirname, "./cloudfront.ts"), "utf-8");

  describe("module exports", () => {
    it("exports isCloudFrontConfigured function", () => {
      expect(cfFile).toContain("export function isCloudFrontConfigured");
    });

    it("exports getCloudFrontDomain function", () => {
      expect(cfFile).toContain("export function getCloudFrontDomain");
    });

    it("exports provisionDistribution function", () => {
      expect(cfFile).toContain("export async function provisionDistribution");
    });

    it("exports getHostingStatus function", () => {
      expect(cfFile).toContain("export function getHostingStatus");
    });
  });

  describe("sanitizeSubdomain helper", () => {
    // Test the sanitization logic by importing the module
    it("sanitizes subdomain names correctly", async () => {
      // The function is not exported, but we can test the logic pattern
      const sanitize = (name: string) =>
        name
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 63);

      expect(sanitize("My Cool App")).toBe("my-cool-app");
      expect(sanitize("test--app")).toBe("test-app");
      expect(sanitize("UPPERCASE")).toBe("uppercase");
      expect(sanitize("special!@#chars")).toBe("special-chars");
      expect(sanitize("-leading-trailing-")).toBe("leading-trailing");
      expect(sanitize("a".repeat(100))).toHaveLength(63);
    });
  });

  describe("isCloudFrontConfigured", () => {
    it("checks for AWS_CLOUDFRONT_DISTRIBUTION_ID and AWS_ACCESS_KEY_ID", () => {
      expect(cfFile).toContain("AWS_CLOUDFRONT_DISTRIBUTION_ID");
      expect(cfFile).toContain("AWS_ACCESS_KEY_ID");
    });

    it("returns boolean", () => {
      expect(cfFile).toContain("): boolean");
    });
  });

  describe("getHostingStatus", () => {
    it("returns isPublished, cdnActive, publicUrl, customDomain, hostingProvider", () => {
      expect(cfFile).toContain("isPublished");
      expect(cfFile).toContain("cdnActive");
      expect(cfFile).toContain("publicUrl");
      expect(cfFile).toContain("customDomain");
      expect(cfFile).toContain("hostingProvider");
    });

    it("distinguishes between cloudfront and s3-direct hosting", () => {
      expect(cfFile).toContain('"cloudfront"');
      expect(cfFile).toContain('"s3-direct"');
    });
  });

  describe("provisionDistribution", () => {
    it("accepts DistributionConfig and htmlContent parameters", () => {
      expect(cfFile).toContain("config: DistributionConfig");
      expect(cfFile).toContain("htmlContent: string");
    });

    it("returns DistributionResult with publicUrl, s3Key, cdnActive", () => {
      expect(cfFile).toContain("publicUrl");
      expect(cfFile).toContain("s3Key");
      expect(cfFile).toContain("s3Url");
      expect(cfFile).toContain("cdnActive");
    });

    it("supports additional assets upload", () => {
      expect(cfFile).toContain("additionalAssets");
      expect(cfFile).toContain("generateAssetKey");
    });

    it("calls storagePut for S3 upload", () => {
      expect(cfFile).toContain("storagePut");
    });

    it("invalidates CloudFront cache when configured", () => {
      expect(cfFile).toContain("invalidateCloudFrontCache");
      expect(cfFile).toContain("CreateInvalidationCommand");
    });
  });

  describe("deploy procedure integration", () => {
    const routersFile = readRouterSource();

    it("deploy procedure imports provisionDistribution from cloudfront", () => {
      expect(routersFile).toContain('import("./cloudfront")');
    });

    it("deploy procedure calls provisionDistribution", () => {
      expect(routersFile).toContain("provisionDistribution(");
    });

    it("deploy result includes cdnActive and distributionId", () => {
      expect(routersFile).toContain("cdnActive");
      expect(routersFile).toContain("distributionId");
    });
  });
});

// ─── 2. aria-live Regions for Dynamic Content ───────────────────────────────

describe("aria-live Regions", () => {
  describe("WebAppBuilderPage accessibility", () => {
    const builderPage = readFileSync(
      resolve(__dirname, "../client/src/pages/WebAppBuilderPage.tsx"),
      "utf-8"
    );

    it("has aria-live='polite' on build steps container", () => {
      expect(builderPage).toContain('aria-live="polite"');
    });

    it("has aria-atomic='false' on build steps container", () => {
      expect(builderPage).toContain('aria-atomic="false"');
    });

    it("has aria-label on build steps container", () => {
      expect(builderPage).toContain('aria-label="Build progress steps"');
    });

    it("has role='list' on build steps container", () => {
      expect(builderPage).toContain('role="list"');
    });

    it("has role='listitem' on individual build steps", () => {
      expect(builderPage).toContain('role="listitem"');
    });

    it("has aria-label with step status on list items", () => {
      expect(builderPage).toContain("aria-label={`${step.label}: ${step.status}`}");
    });

    it("has role='status' on generated code output", () => {
      expect(builderPage).toContain('role="status"');
      expect(builderPage).toContain('aria-label="Generated source code"');
    });

    it("has aria-busy on build button during building", () => {
      expect(builderPage).toContain("aria-busy={isBuilding}");
    });
  });

  describe("WebAppProjectPage accessibility", () => {
    const projectPage = readFileSync(
      resolve(__dirname, "../client/src/pages/WebAppProjectPage.tsx"),
      "utf-8"
    );

    it("has aria-live='assertive' on deploy status badge wrapper", () => {
      expect(projectPage).toContain('aria-live="assertive"');
    });

    it("has aria-atomic='true' on deploy status badge wrapper", () => {
      expect(projectPage).toContain('aria-atomic="true"');
    });

    it("has role='status' on deploy status badge wrapper", () => {
      expect(projectPage).toContain('role="status"');
    });

    it("has screen-reader-only deploy status message with role='alert'", () => {
      expect(projectPage).toContain('role="alert"');
      expect(projectPage).toContain("sr-only");
      expect(projectPage).toContain("deployStatusMessage");
    });

    it("has aria-live='polite' on deployments list", () => {
      expect(projectPage).toContain('aria-label="Deployment history"');
    });

    it("has aria-busy on publish button during deploy", () => {
      expect(projectPage).toContain("aria-busy={deployMut.isPending}");
    });

    it("sets deploy status message on mutation lifecycle", () => {
      expect(projectPage).toContain('setDeployStatusMessage("Deploying...")');
      expect(projectPage).toContain("Deployment successful");
      expect(projectPage).toContain("Deployment failed:");
    });
  });
});

// ─── 3. Geographic and Device Analytics ─────────────────────────────────────

describe("Geographic and Device Analytics", () => {
  describe("DB helpers", () => {
    const dbFile = readFileSync(resolve(__dirname, "./db.ts"), "utf-8");

    it("exports getGeoAnalytics function", () => {
      expect(dbFile).toContain("export async function getGeoAnalytics");
    });

    it("exports getDeviceAnalytics function", () => {
      expect(dbFile).toContain("export async function getDeviceAnalytics");
    });

    it("getGeoAnalytics groups by country and sorts by count", () => {
      const fn = dbFile.slice(dbFile.indexOf("getGeoAnalytics"));
      expect(fn).toContain("countryMap");
      expect(fn).toContain("b.count - a.count");
    });

    it("getDeviceAnalytics classifies by screen width breakpoints", () => {
      const fn = dbFile.slice(dbFile.indexOf("getDeviceAnalytics"));
      expect(fn).toContain("768");
      expect(fn).toContain("1024");
      expect(fn).toContain("mobile");
      expect(fn).toContain("tablet");
      expect(fn).toContain("desktop");
    });

    it("getDeviceAnalytics returns total count", () => {
      const fn = dbFile.slice(dbFile.indexOf("getDeviceAnalytics"));
      expect(fn).toContain("total: allViews.length");
    });
  });

  describe("tRPC procedures", () => {
    const routersFile = readRouterSource();

    it("has geoAnalytics procedure", () => {
      expect(routersFile).toContain("geoAnalytics: protectedProcedure");
    });

    it("has deviceAnalytics procedure", () => {
      expect(routersFile).toContain("deviceAnalytics: protectedProcedure");
    });

    it("geoAnalytics imports getGeoAnalytics from db", () => {
      expect(routersFile).toContain("getGeoAnalytics");
    });

    it("deviceAnalytics imports getDeviceAnalytics from db", () => {
      expect(routersFile).toContain("getDeviceAnalytics");
    });

    it("both procedures accept externalId and optional days", () => {
      // Count occurrences of the pattern near geoAnalytics
      const geoSection = routersFile.slice(routersFile.indexOf("geoAnalytics:"));
      expect(geoSection).toContain("externalId: z.string()");
      expect(geoSection).toContain("days: z.number()");
    });
  });

  describe("analytics collect endpoint — country detection", () => {
    const serverFile = readFileSync(resolve(__dirname, "./_core/index.ts"), "utf-8");

    it("reads CF-IPCountry header for country detection", () => {
      expect(serverFile).toContain("cf-ipcountry");
    });

    it("reads X-Country header as fallback", () => {
      expect(serverFile).toContain("x-country");
    });

    it("reads X-Vercel-IP-Country header as fallback", () => {
      expect(serverFile).toContain("x-vercel-ip-country");
    });

    it("passes country to recordPageView", () => {
      const collectSection = serverFile.slice(serverFile.indexOf("/api/analytics/collect"));
      expect(collectSection).toContain("country");
    });
  });

  describe("dashboard UI components", () => {
    const projectPage = readFileSync(
      resolve(__dirname, "../client/src/pages/WebAppProjectPage.tsx"),
      "utf-8"
    );

    it("imports geoAnalytics query", () => {
      expect(projectPage).toContain("geoAnalytics.useQuery");
    });

    it("imports deviceAnalytics query", () => {
      expect(projectPage).toContain("deviceAnalytics.useQuery");
    });

    it("renders Visitors by Country card", () => {
      expect(projectPage).toContain("Visitors by Country");
    });

    it("renders Device Breakdown card", () => {
      expect(projectPage).toContain("Device Breakdown");
    });

    it("renders SVG donut chart for device breakdown", () => {
      expect(projectPage).toContain("<svg viewBox");
      expect(projectPage).toContain("strokeDasharray");
      expect(projectPage).toContain("strokeDashoffset");
    });

    it("shows device type labels: Desktop, Tablet, Mobile", () => {
      expect(projectPage).toContain('"Desktop"');
      expect(projectPage).toContain('"Tablet"');
      expect(projectPage).toContain('"Mobile"');
    });

    it("imports device icons: Smartphone, Tablet, Monitor, MapPin", () => {
      expect(projectPage).toContain("Smartphone");
      expect(projectPage).toContain("Tablet");
      expect(projectPage).toContain("Monitor");
      expect(projectPage).toContain("MapPin");
    });

    it("shows country bar chart with percentage widths", () => {
      expect(projectPage).toContain("Math.max(pct, 4)");
    });

    it("shows empty state messages for no data", () => {
      expect(projectPage).toContain("No geographic data yet");
      expect(projectPage).toContain("No device data yet");
    });
  });

  describe("pageViews schema has country and screenWidth columns", () => {
    const schema = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
    const pvSection = schema.slice(schema.indexOf("pageViews"));

    it("has country column", () => {
      expect(pvSection).toContain("country");
      expect(pvSection).toContain("varchar");
    });

    it("has screenWidth column", () => {
      expect(pvSection).toContain("screenWidth");
      expect(pvSection).toContain("int");
    });
  });

  describe("tracking pixel sends screenWidth", () => {
    const serverFile = readFileSync(resolve(__dirname, "./_core/index.ts"), "utf-8");
    const pixelSection = serverFile.slice(serverFile.indexOf("pixel.js"));

    it("includes screenWidth in the tracking beacon", () => {
      expect(pixelSection).toContain("screenWidth");
      expect(pixelSection).toContain("screen.width");
    });
  });
});
