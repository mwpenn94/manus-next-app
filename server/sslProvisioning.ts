/**
 * Custom Domain SSL Provisioning
 *
 * Manages SSL/TLS certificate lifecycle for custom domains using AWS ACM.
 * When AWS credentials are configured, uses real ACM API.
 * Otherwise, provides a simulation mode for development/testing.
 *
 * Workflow:
 *   1. User adds custom domain in settings
 *   2. requestCertificate() creates ACM cert request
 *   3. getDnsValidationRecords() returns CNAME records user must add
 *   4. getCertificateStatus() polls for validation completion
 *   5. Once issued, cert ARN is stored and used by CloudFront
 */

import { nanoid } from "nanoid";

// ── Types ──

export type SslStatus = "none" | "pending_validation" | "issued" | "failed" | "expired" | "revoked";

export interface DnsValidationRecord {
  /** The CNAME record name to add (e.g., _abc123.example.com) */
  name: string;
  /** The CNAME record value to point to (e.g., _xyz789.acm-validations.aws) */
  value: string;
  /** Record type (always CNAME for ACM DNS validation) */
  type: "CNAME";
}

export interface CertificateRequest {
  /** ACM certificate ARN */
  certArn: string;
  /** Current certificate status */
  status: SslStatus;
  /** Domain the certificate covers */
  domain: string;
  /** DNS validation records the user needs to add */
  validationRecords: DnsValidationRecord[];
  /** When the certificate was requested */
  requestedAt: number;
  /** When the certificate was issued (null if not yet issued) */
  issuedAt: number | null;
}

export interface SslProvisioningResult {
  success: boolean;
  certArn: string | null;
  status: SslStatus;
  validationRecords: DnsValidationRecord[];
  error?: string;
}

// ── Configuration ──

function isAcmConfigured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

// ── Simulated Certificate Store (for dev/testing without AWS) ──

const simulatedCerts = new Map<string, CertificateRequest>();

// ── Public API ──

/**
 * Request a new SSL certificate for a custom domain.
 * Uses ACM when AWS credentials are available, otherwise simulates.
 */
export async function requestCertificate(domain: string): Promise<SslProvisioningResult> {
  // Validate domain format
  if (!isValidDomain(domain)) {
    return {
      success: false,
      certArn: null,
      status: "failed",
      validationRecords: [],
      error: `Invalid domain format: ${domain}`,
    };
  }

  if (isAcmConfigured()) {
    return requestAcmCertificate(domain);
  }

  return requestSimulatedCertificate(domain);
}

/**
 * Get the current status of a certificate by its ARN.
 */
export async function getCertificateStatus(certArn: string): Promise<{
  status: SslStatus;
  domain: string | null;
  issuedAt: number | null;
  validationRecords: DnsValidationRecord[];
}> {
  if (isAcmConfigured()) {
    return getAcmCertificateStatus(certArn);
  }

  return getSimulatedCertificateStatus(certArn);
}

/**
 * Get DNS validation records for a certificate.
 */
export async function getDnsValidationRecords(certArn: string): Promise<DnsValidationRecord[]> {
  if (isAcmConfigured()) {
    const status = await getAcmCertificateStatus(certArn);
    return status.validationRecords;
  }

  const cert = simulatedCerts.get(certArn);
  return cert?.validationRecords || [];
}

/**
 * Delete/cancel a certificate request.
 */
export async function deleteCertificate(certArn: string): Promise<boolean> {
  if (isAcmConfigured()) {
    return deleteAcmCertificate(certArn);
  }

  return simulatedCerts.delete(certArn);
}

// ── ACM Implementation ──

async function requestAcmCertificate(domain: string): Promise<SslProvisioningResult> {
  try {
    const { ACMClient, RequestCertificateCommand, DescribeCertificateCommand } = await import("@aws-sdk/client-acm");

    const client = new ACMClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Request certificate with DNS validation
    const requestResult = await client.send(new RequestCertificateCommand({
      DomainName: domain,
      ValidationMethod: "DNS",
      Tags: [
        { Key: "ManagedBy", Value: "manus-next" },
        { Key: "Domain", Value: domain },
      ],
    }));

    const certArn = requestResult.CertificateArn;
    if (!certArn) {
      return {
        success: false,
        certArn: null,
        status: "failed",
        validationRecords: [],
        error: "ACM did not return a certificate ARN",
      };
    }

    // Wait a moment for ACM to generate validation records
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Describe to get validation records
    const describeResult = await client.send(new DescribeCertificateCommand({
      CertificateArn: certArn,
    }));

    const validationRecords: DnsValidationRecord[] = [];
    const options = describeResult.Certificate?.DomainValidationOptions || [];
    for (const opt of options) {
      if (opt.ResourceRecord) {
        validationRecords.push({
          name: opt.ResourceRecord.Name || "",
          value: opt.ResourceRecord.Value || "",
          type: "CNAME",
        });
      }
    }

    return {
      success: true,
      certArn,
      status: "pending_validation",
      validationRecords,
    };
  } catch (err: any) {
    console.error("[SSL] ACM certificate request failed:", err.message);
    return {
      success: false,
      certArn: null,
      status: "failed",
      validationRecords: [],
      error: err.message,
    };
  }
}

async function getAcmCertificateStatus(certArn: string): Promise<{
  status: SslStatus;
  domain: string | null;
  issuedAt: number | null;
  validationRecords: DnsValidationRecord[];
}> {
  try {
    const { ACMClient, DescribeCertificateCommand } = await import("@aws-sdk/client-acm");

    const client = new ACMClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const result = await client.send(new DescribeCertificateCommand({
      CertificateArn: certArn,
    }));

    const cert = result.Certificate;
    if (!cert) {
      return { status: "failed", domain: null, issuedAt: null, validationRecords: [] };
    }

    const statusMap: Record<string, SslStatus> = {
      PENDING_VALIDATION: "pending_validation",
      ISSUED: "issued",
      INACTIVE: "failed",
      EXPIRED: "expired",
      REVOKED: "revoked",
      FAILED: "failed",
      VALIDATION_TIMED_OUT: "failed",
    };

    const validationRecords: DnsValidationRecord[] = [];
    for (const opt of cert.DomainValidationOptions || []) {
      if (opt.ResourceRecord) {
        validationRecords.push({
          name: opt.ResourceRecord.Name || "",
          value: opt.ResourceRecord.Value || "",
          type: "CNAME",
        });
      }
    }

    return {
      status: statusMap[cert.Status || ""] || "none",
      domain: cert.DomainName || null,
      issuedAt: cert.IssuedAt ? cert.IssuedAt.getTime() : null,
      validationRecords,
    };
  } catch (err: any) {
    console.error("[SSL] ACM describe failed:", err.message);
    return { status: "failed", domain: null, issuedAt: null, validationRecords: [] };
  }
}

async function deleteAcmCertificate(certArn: string): Promise<boolean> {
  try {
    const { ACMClient, DeleteCertificateCommand } = await import("@aws-sdk/client-acm");

    const client = new ACMClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    await client.send(new DeleteCertificateCommand({
      CertificateArn: certArn,
    }));

    return true;
  } catch (err: any) {
    console.error("[SSL] ACM delete failed:", err.message);
    return false;
  }
}

// ── Simulated Implementation (for dev/testing) ──

function requestSimulatedCertificate(domain: string): SslProvisioningResult {
  const certArn = `arn:aws:acm:us-east-1:000000000000:certificate/${nanoid(36)}`;
  const validationHash = nanoid(32).toLowerCase();

  const validationRecords: DnsValidationRecord[] = [
    {
      name: `_${validationHash.slice(0, 32)}.${domain}.`,
      value: `_${validationHash.slice(0, 32)}.acm-validations.aws.`,
      type: "CNAME",
    },
  ];

  const cert: CertificateRequest = {
    certArn,
    status: "pending_validation",
    domain,
    validationRecords,
    requestedAt: Date.now(),
    issuedAt: null,
  };

  simulatedCerts.set(certArn, cert);

  console.log(`[SSL] Simulated certificate requested for ${domain}: ${certArn}`);

  return {
    success: true,
    certArn,
    status: "pending_validation",
    validationRecords,
  };
}

function getSimulatedCertificateStatus(certArn: string): {
  status: SslStatus;
  domain: string | null;
  issuedAt: number | null;
  validationRecords: DnsValidationRecord[];
} {
  const cert = simulatedCerts.get(certArn);
  if (!cert) {
    return { status: "none", domain: null, issuedAt: null, validationRecords: [] };
  }

  // Auto-issue after 60 seconds in simulation mode
  if (cert.status === "pending_validation" && Date.now() - cert.requestedAt > 60_000) {
    cert.status = "issued";
    cert.issuedAt = Date.now();
    simulatedCerts.set(certArn, cert);
  }

  return {
    status: cert.status,
    domain: cert.domain,
    issuedAt: cert.issuedAt,
    validationRecords: cert.validationRecords,
  };
}

// ── Helpers ──

function isValidDomain(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Check if SSL provisioning is available (either real ACM or simulated).
 */
export function isSslAvailable(): boolean {
  return true; // Always available — simulated mode works without AWS
}

/**
 * Get the SSL provider type.
 */
export function getSslProvider(): "acm" | "simulated" {
  return isAcmConfigured() ? "acm" : "simulated";
}
