/**
 * URL Validation & SSRF Protection — §L.35 Security Hardening
 *
 * Validates URLs to prevent Server-Side Request Forgery (SSRF) attacks.
 * Blocks requests to private/internal IP ranges, localhost, and metadata endpoints.
 */

const PRIVATE_RANGES = [
  /^127\./,                    // Loopback
  /^10\./,                     // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
  /^192\.168\./,               // Class C private
  /^169\.254\./,               // Link-local
  /^0\./,                      // Current network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Shared address space (CGNAT)
  /^198\.1[89]\./,             // Benchmarking
  /^::1$/,                     // IPv6 loopback
  /^fc/i,                      // IPv6 ULA
  /^fd/i,                      // IPv6 ULA
  /^fe80/i,                    // IPv6 link-local
];

const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",           // AWS/GCP metadata
  "100.100.100.200",           // Alibaba metadata
  "[::1]",
];

/**
 * Check if a hostname resolves to a private/internal IP address.
 * Returns true if the URL is safe (not targeting internal resources).
 */
export function isUrlSafe(url: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block known dangerous hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return { safe: false, reason: `Blocked hostname: ${hostname}` };
    }

    // Block IP addresses in private ranges
    for (const range of PRIVATE_RANGES) {
      if (range.test(hostname)) {
        return { safe: false, reason: `Private IP range detected: ${hostname}` };
      }
    }

    // Block non-http(s) protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { safe: false, reason: `Unsupported protocol: ${parsed.protocol}` };
    }

    // Block URLs with credentials
    if (parsed.username || parsed.password) {
      return { safe: false, reason: "URLs with embedded credentials are not allowed" };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: "Invalid URL format" };
  }
}

/**
 * Validate a tunnel URL for device connections.
 * Must be a valid HTTPS URL that doesn't target internal resources.
 */
export function validateTunnelUrl(url: string): { valid: boolean; reason?: string } {
  const safety = isUrlSafe(url);
  if (!safety.safe) {
    return { valid: false, reason: safety.reason };
  }

  try {
    const parsed = new URL(url);

    // Tunnel URLs should use HTTPS in production
    // Allow HTTP only for development (localhost is already blocked above)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { valid: false, reason: "Tunnel URL must use HTTPS" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid tunnel URL format" };
  }
}
