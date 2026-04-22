/**
 * CloudFront Distribution Provisioning
 * 
 * Manages CDN distribution lifecycle for deployed webapp projects.
 * Uses S3 as the origin and generates branded subdomain URLs.
 * 
 * Architecture:
 *   S3 Bucket (origin) → CloudFront Distribution → Custom Domain (CNAME)
 *   
 * When AWS_CLOUDFRONT_DISTRIBUTION_ID is set, uses real CloudFront invalidation.
 * Otherwise, uses S3 direct URLs with CDN-ready headers.
 */

import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// ── Types ──

export interface DistributionConfig {
  projectId: number;
  projectName: string;
  subdomainPrefix: string;
  customDomain?: string | null;
}

export interface DistributionResult {
  /** The public URL where the app is accessible */
  publicUrl: string;
  /** The S3 key where the HTML was stored */
  s3Key: string;
  /** The raw S3 URL */
  s3Url: string;
  /** CloudFront distribution ID (if configured) */
  distributionId?: string;
  /** Whether CloudFront is active or using S3 direct */
  cdnActive: boolean;
  /** Cache invalidation ID (if CloudFront is active) */
  invalidationId?: string;
}

// ── Helpers ──

function sanitizeSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

function generateDeployKey(subdomain: string, deployId: string): string {
  return `webapp-deploys/${subdomain}/${deployId}/index.html`;
}

function generateAssetKey(subdomain: string, deployId: string, filename: string): string {
  return `webapp-deploys/${subdomain}/${deployId}/assets/${filename}`;
}

// ── CloudFront Integration ──

/**
 * Check if real CloudFront is configured via environment variables.
 */
export function isCloudFrontConfigured(): boolean {
  return !!(process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID && process.env.AWS_ACCESS_KEY_ID);
}

/**
 * Get the CloudFront distribution domain if configured.
 */
export function getCloudFrontDomain(): string | null {
  return process.env.AWS_CLOUDFRONT_DOMAIN || null;
}

/**
 * Invalidate CloudFront cache for a specific path.
 * Only works when AWS credentials are configured.
 */
async function invalidateCloudFrontCache(paths: string[]): Promise<string | null> {
  if (!isCloudFrontConfigured()) return null;
  
  try {
    // Dynamic import to avoid requiring AWS SDK when not configured
    const { CloudFrontClient, CreateInvalidationCommand } = await import("@aws-sdk/client-cloudfront");
    
    const client = new CloudFrontClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const result = await client.send(new CreateInvalidationCommand({
      DistributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID!,
      InvalidationBatch: {
        CallerReference: `deploy-${Date.now()}-${nanoid(6)}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    }));

    return result.Invalidation?.Id || null;
  } catch (err: any) {
    console.error("[CloudFront] Cache invalidation failed:", err.message);
    return null;
  }
}

// ── Main Provisioning Function ──

/**
 * Provision or update a CDN distribution for a webapp project.
 * 
 * 1. Uploads HTML to S3 with a structured key
 * 2. If CloudFront is configured, invalidates the cache
 * 3. Returns the public URL (CloudFront domain or S3 direct)
 */
export async function provisionDistribution(
  config: DistributionConfig,
  htmlContent: string,
  additionalAssets?: Array<{ filename: string; content: Buffer | string; contentType: string }>
): Promise<DistributionResult> {
  const subdomain = config.subdomainPrefix || sanitizeSubdomain(config.projectName);
  const deployId = nanoid(8);
  
  // 1. Upload main HTML to S3
  const s3Key = generateDeployKey(subdomain, deployId);
  const { url: s3Url } = await storagePut(s3Key, Buffer.from(htmlContent, "utf-8"), "text/html");
  
  // 2. Upload additional assets if any
  if (additionalAssets?.length) {
    await Promise.all(
      additionalAssets.map(asset => {
        const assetKey = generateAssetKey(subdomain, deployId, asset.filename);
        const data = typeof asset.content === "string" 
          ? Buffer.from(asset.content, "utf-8") 
          : asset.content;
        return storagePut(assetKey, data, asset.contentType);
      })
    );
  }
  
  // 3. Determine public URL
  let publicUrl = s3Url;
  let distributionId: string | undefined;
  let invalidationId: string | undefined;
  const cdnActive = isCloudFrontConfigured();
  
  if (cdnActive) {
    const cfDomain = getCloudFrontDomain();
    if (cfDomain) {
      publicUrl = `https://${cfDomain}/${s3Key}`;
    }
    
    distributionId = process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID;
    
    // Invalidate cache for the new deployment
    const invId = await invalidateCloudFrontCache([
      `/${s3Key}`,
      `/webapp-deploys/${subdomain}/*`,
    ]);
    if (invId) invalidationId = invId;
  }
  
  // 4. If custom domain is set, note it (DNS must be configured separately)
  if (config.customDomain) {
    console.log(`[CloudFront] Custom domain ${config.customDomain} configured for project ${config.projectName}. DNS CNAME must point to ${cdnActive ? getCloudFrontDomain() : "S3 bucket"}.`);
  }
  
  return {
    publicUrl,
    s3Key,
    s3Url,
    distributionId,
    cdnActive,
    invalidationId,
  };
}

/**
 * Get the hosting status for a project.
 */
export function getHostingStatus(project: {
  publishedUrl?: string | null;
  customDomain?: string | null;
  subdomainPrefix?: string | null;
}): {
  isPublished: boolean;
  cdnActive: boolean;
  publicUrl: string | null;
  customDomain: string | null;
  hostingProvider: "cloudfront" | "s3-direct";
} {
  return {
    isPublished: !!project.publishedUrl,
    cdnActive: isCloudFrontConfigured(),
    publicUrl: project.publishedUrl || null,
    customDomain: project.customDomain || null,
    hostingProvider: isCloudFrontConfigured() ? "cloudfront" : "s3-direct",
  };
}
