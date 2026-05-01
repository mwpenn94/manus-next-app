/**
 * OG Image Generation — Dynamic Open Graph images for shared tasks
 *
 * Generates a branded 1200x630 OG image with:
 *  - Dark gradient background with subtle grid pattern
 *  - Task title (word-wrapped, max 3 lines)
 *  - Step count and status badge
 *  - "Manus Next" brand mark
 *  - Timestamp
 *
 * Uses sharp for server-side SVG-to-PNG conversion.
 * Images are cached in-memory (30 min TTL) and in S3 by share token.
 */
import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getTaskShareByToken,
  getTaskByExternalId,
  getTaskMessages,
} from "../db";
import { storagePut } from "../storage";

// ── In-memory cache ──
const ogCache = new Map<string, { url: string; generatedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── Shared helpers ──

/** Truncate title for display, max 80 chars */
function truncateTitle(title: string): string {
  return title.length > 80 ? title.slice(0, 77) + "..." : title;
}

/** Format a date for display */
function formatDate(createdAt: Date | string | null): string {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Map raw status string to display label */
function statusToLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "running":
      return "Running";
    case "error":
      return "Error";
    default:
      return "Task";
  }
}

// ── Public exports ──

/**
 * Generate an OG image buffer directly (used by Express route).
 * Returns the PNG buffer and content type.
 */
export async function generateOgImageBuffer(
  title: string,
  stepCount: number,
  status: string,
  createdAt: Date | string | null,
): Promise<{ buffer: Buffer; contentType: string }> {
  const svg = buildOgSvg(
    truncateTitle(title),
    stepCount,
    statusToLabel(status),
    formatDate(createdAt),
  );
  const pngBuffer = await svgToPng(svg);
  return { buffer: pngBuffer, contentType: "image/png" };
}

/**
 * Generate an OG image, upload to S3, and return the public URL.
 * Results are cached in-memory by share token.
 */
async function generateOgImage(
  title: string,
  stepCount: number,
  status: string,
  createdAt: Date | string | null,
  shareToken: string,
): Promise<string> {
  const cached = ogCache.get(shareToken);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
    return cached.url;
  }

  const svg = buildOgSvg(
    truncateTitle(title),
    stepCount,
    statusToLabel(status),
    formatDate(createdAt),
  );
  const pngBuffer = await svgToPng(svg);

  const key = `og-images/share-${shareToken}.png`;
  const { url } = await storagePut(key, pngBuffer, "image/png");

  ogCache.set(shareToken, { url, generatedAt: Date.now() });
  return url;
}

// ── SVG builder ──

/** Escape XML entities for safe embedding in SVG text nodes */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Word-wrap text into lines of approximately maxChars width */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildOgSvg(
  title: string,
  stepCount: number,
  status: string,
  dateStr: string,
): string {
  const titleLines = wrapText(title, 40).slice(0, 3);
  const titleY =
    titleLines.length === 1 ? 280 : titleLines.length === 2 ? 260 : 240;

  // Status-dependent colors
  const statusBg =
    status === "Completed"
      ? "rgba(34,197,94,0.15)"
      : status === "Running"
        ? "rgba(59,130,246,0.15)"
        : "rgba(200,169,126,0.15)";
  const statusFg =
    status === "Completed"
      ? "#22c55e"
      : status === "Running"
        ? "#3b82f6"
        : "#c8a97e";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0a0a0b"/>
      <stop offset="50%" stop-color="#111113"/>
      <stop offset="100%" stop-color="#0a0a0b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c8a97e"/>
      <stop offset="100%" stop-color="#d4b896"/>
    </linearGradient>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="1200" height="3" fill="url(#accent)" opacity="0.6"/>

  <!-- Brand section (top-left) -->
  <g transform="translate(60, 48)">
    <circle cx="20" cy="20" r="20" fill="rgba(200,169,126,0.15)"/>
    <text x="20" y="27" text-anchor="middle" fill="#c8a97e" font-size="18" font-family="system-ui, -apple-system, sans-serif" font-weight="600">S</text>
    <text x="52" y="28" fill="#c8a97e" font-size="18" font-family="system-ui, -apple-system, sans-serif" font-weight="600" letter-spacing="0.5">Manus Next</text>
  </g>

  <!-- Status badge (top-right) -->
  <g transform="translate(1020, 48)">
    <rect x="0" y="0" width="120" height="36" rx="18" fill="${statusBg}"/>
    <circle cx="18" cy="18" r="4" fill="${statusFg}"/>
    <text x="32" y="23" fill="${statusFg}" font-size="14" font-family="system-ui, -apple-system, sans-serif" font-weight="500">${esc(status)}</text>
  </g>

  <!-- Title -->
  ${titleLines
    .map(
      (line, i) =>
        `<text x="60" y="${titleY + i * 52}" fill="#f5f5f5" font-size="42" font-family="system-ui, -apple-system, sans-serif" font-weight="700" letter-spacing="-0.5">${esc(line)}</text>`,
    )
    .join("\n  ")}

  <!-- Divider line -->
  <line x1="60" y1="${titleY + titleLines.length * 52 + 20}" x2="300" y2="${titleY + titleLines.length * 52 + 20}" stroke="rgba(200,169,126,0.3)" stroke-width="2"/>

  <!-- Stats row -->
  <g transform="translate(60, ${titleY + titleLines.length * 52 + 50})">
    <text x="0" y="0" fill="#a1a1aa" font-size="16" font-family="system-ui, -apple-system, sans-serif" font-weight="400">
      ${stepCount} step${stepCount !== 1 ? "s" : ""} completed
    </text>
    ${dateStr ? `<text x="0" y="30" fill="#71717a" font-size="14" font-family="system-ui, -apple-system, sans-serif">${esc(dateStr)}</text>` : ""}
  </g>

  <!-- Bottom bar -->
  <rect x="0" y="590" width="1200" height="40" fill="rgba(0,0,0,0.3)"/>
  <text x="60" y="616" fill="#71717a" font-size="13" font-family="system-ui, -apple-system, sans-serif">Shared via Manus Next — Autonomous Agent</text>
  <text x="1140" y="616" text-anchor="end" fill="#52525b" font-size="12" font-family="monospace">sovereign.ai</text>
</svg>`;
}

// ── SVG → PNG conversion ──

async function svgToPng(svg: string): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(Buffer.from(svg))
      .resize(1200, 630)
      .png({ quality: 90 })
      .toBuffer();
  } catch (err) {
    console.warn("[OG Image] sharp conversion failed, returning raw SVG:", err);
    return Buffer.from(svg);
  }
}

// ── tRPC router ──

export const ogImageRouter = router({
  /** Get or generate OG image URL for a shared task */
  getOgImageUrl: publicProcedure
    .input(z.object({ shareToken: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      try {
        const share = await getTaskShareByToken(input.shareToken);
        if (!share) return { url: null };

        const task = await getTaskByExternalId(share.taskExternalId);
        if (!task) return { url: null };

        const messages = await getTaskMessages(task.id);

        // Count action steps across all assistant messages
        let stepCount = 0;
        for (const msg of messages.filter((m) => m.role === "assistant")) {
          try {
            const actions =
              typeof msg.actions === "string"
                ? JSON.parse(msg.actions)
                : msg.actions;
            if (Array.isArray(actions)) stepCount += actions.length;
          } catch {
            /* skip */
          }
        }

        const url = await generateOgImage(
          task.title || "Shared Task",
          stepCount,
          task.status || "completed",
          task.createdAt,
          input.shareToken,
        );

        return { url };
      } catch (err) {
        console.error("[OG Image] Error generating OG image:", err);
        return { url: null };
      }
    }),
});
