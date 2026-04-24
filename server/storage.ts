// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const segmentStart = relKey.lastIndexOf("/");
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1 || lastDot <= segmentStart) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();

  // Retry upload up to 3 times to handle transient failures
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Generate a fresh key each attempt to avoid stale/conflicting keys
      const key = appendHashSuffix(normalizeKey(relKey));
      const uploadUrl = buildUploadUrl(baseUrl, key);
      const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: buildAuthHeaders(apiKey),
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        lastError = new Error(
          `Storage upload failed (${response.status} ${response.statusText}): ${message}`
        );
        // Wait before retry
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
        continue;
      }

      const url = (await response.json()).url;

      // Verify the URL is accessible with a HEAD request
      // Wait a moment for CDN propagation
      await new Promise((r) => setTimeout(r, 500));
      try {
        const headResp = await fetch(url, { method: "HEAD" });
        if (headResp.ok) {
          return { key, url };
        }
        // If HEAD fails, wait longer and retry verification
        await new Promise((r) => setTimeout(r, 2000));
        const headResp2 = await fetch(url, { method: "HEAD" });
        if (headResp2.ok) {
          return { key, url };
        }
        // URL not accessible — retry the entire upload with a new key
        console.warn(`[storagePut] URL verification failed for ${url} (status: ${headResp2.status}), retrying upload...`);
        lastError = new Error(`URL verification failed: ${headResp2.status}`);
      } catch (verifyErr) {
        // Verification request itself failed — still return the URL
        // (might be a CORS issue with HEAD requests from server)
        console.warn(`[storagePut] URL verification request failed, returning URL anyway:`, verifyErr);
        return { key, url };
      }
    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Storage upload failed after retries");
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
