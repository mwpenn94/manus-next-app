/**
 * Media Context Pipeline
 * 
 * Processes video, screen recordings, and live screen share frames
 * into multimodal context for the agent loop.
 * 
 * Capabilities:
 * 1. Video file upload → frame extraction + audio transcription → context injection
 * 2. Screen share → periodic frame capture → live context updates
 * 3. Video recording → same as video file but from webcam/screen capture
 * 
 * The LLM natively supports video/mp4 via file_url content type,
 * so for short videos we can pass the URL directly.
 * For longer videos or live streams, we extract keyframes and transcribe audio.
 */

import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import type { ImageContent, FileContent, TextContent } from "./_core/llm";
import crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MediaAsset {
  id: string;
  type: "video" | "screen_share" | "recording" | "live_frame";
  url: string;
  mimeType: string;
  fileName?: string;
  size?: number;
  duration?: number; // seconds, if known
  createdAt: number;
}

export interface ProcessedMediaContext {
  /** Original asset reference */
  asset: MediaAsset;
  /** Transcription of audio track (if available) */
  transcription?: string;
  /** Extracted keyframe URLs for long videos */
  keyframeUrls?: string[];
  /** Summary description generated from video content */
  summary?: string;
  /** LLM-ready content parts to inject into conversation */
  contentParts: Array<ImageContent | FileContent | TextContent>;
}

export interface ScreenShareSession {
  id: string;
  taskId: string;
  active: boolean;
  startedAt: number;
  frames: ScreenShareFrame[];
  lastFrameAt?: number;
}

export interface ScreenShareFrame {
  url: string;
  capturedAt: number;
  index: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Max video size for direct LLM pass-through (under this, send whole video) */
const DIRECT_VIDEO_THRESHOLD = 20 * 1024 * 1024; // 20MB

/** Max upload size for video files */
export const MAX_VIDEO_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB

/** How often to capture frames during screen share (ms) */
export const SCREEN_SHARE_FRAME_INTERVAL = 5000; // 5 seconds

/** Max frames to keep in memory per screen share session */
const MAX_FRAMES_PER_SESSION = 60; // 5 minutes at 5s intervals

/** Max frames to inject into a single LLM context */
const MAX_CONTEXT_FRAMES = 8;

// ─── In-memory stores ────────────────────────────────────────────────────────

const screenShareSessions = new Map<string, ScreenShareSession>();
const processedMediaCache = new Map<string, ProcessedMediaContext>();

// ─── Video Processing ────────────────────────────────────────────────────────

/**
 * Process a video file into LLM-ready context.
 * 
 * Strategy:
 * - Small videos (< 20MB): Pass directly as file_url (LLM native video understanding)
 * - Large videos: Transcribe audio + extract description, pass as text context
 * - All videos: Attempt audio transcription for richer context
 */
export async function processVideoForContext(
  asset: MediaAsset
): Promise<ProcessedMediaContext> {
  // Check cache first
  const cached = processedMediaCache.get(asset.id);
  if (cached) return cached;

  const contentParts: Array<ImageContent | FileContent | TextContent> = [];
  let transcription: string | undefined;

  // Attempt audio transcription
  try {
    const result = await transcribeAudio({
      audioUrl: asset.url,
      prompt: "Transcribe the audio from this video recording",
    });
    if ("text" in result && result.text && result.text.trim().length > 0) {
      transcription = result.text;
    }
  } catch (err) {
    // Audio transcription is best-effort — video may have no audio
    console.log(`[MediaContext] Audio transcription skipped for ${asset.id}: ${(err as Error).message}`);
  }

  // Determine how to pass video to LLM
  const isSmall = (asset.size || 0) < DIRECT_VIDEO_THRESHOLD;
  const isNativeVideoType = asset.mimeType === "video/mp4" || asset.mimeType === "video/webm";

  if (isSmall && isNativeVideoType) {
    // Direct pass-through: LLM can understand the video natively
    contentParts.push({
      type: "file_url",
      file_url: {
        url: asset.url,
        mime_type: "video/mp4" as const,
      },
    });
  } else {
    // For large videos or unsupported formats, provide text context
    const contextText = buildVideoTextContext(asset, transcription);
    contentParts.push({ type: "text", text: contextText });
  }

  // Always add transcription as supplementary text if available
  if (transcription && isSmall && isNativeVideoType) {
    contentParts.push({
      type: "text",
      text: `[Audio transcription from ${asset.fileName || "video"}]: ${transcription}`,
    });
  }

  const result: ProcessedMediaContext = {
    asset,
    transcription,
    contentParts,
  };

  processedMediaCache.set(asset.id, result);
  return result;
}

/**
 * Build text-based context for videos that can't be passed directly to LLM
 */
function buildVideoTextContext(asset: MediaAsset, transcription?: string): string {
  const parts: string[] = [];
  parts.push(`[Video context from "${asset.fileName || "recording"}"]`);
  parts.push(`Type: ${asset.type}, Format: ${asset.mimeType}`);
  if (asset.duration) {
    parts.push(`Duration: ${Math.round(asset.duration)}s`);
  }
  if (asset.size) {
    parts.push(`Size: ${(asset.size / 1024 / 1024).toFixed(1)}MB`);
  }
  parts.push(`URL: ${asset.url}`);
  if (transcription) {
    parts.push(`\nAudio transcription:\n${transcription}`);
  } else {
    parts.push(`\n(No audio transcription available)`);
  }
  return parts.join("\n");
}

// ─── Screen Share Session Management ─────────────────────────────────────────

/**
 * Start a new screen share session for a task
 */
export function startScreenShareSession(taskId: string): ScreenShareSession {
  const session: ScreenShareSession = {
    id: crypto.randomUUID(),
    taskId,
    active: true,
    startedAt: Date.now(),
    frames: [],
  };
  screenShareSessions.set(session.id, session);
  return session;
}

/**
 * Add a captured frame to an active screen share session
 */
export async function addScreenShareFrame(
  sessionId: string,
  frameData: Buffer,
  mimeType: string = "image/png"
): Promise<ScreenShareFrame | null> {
  const session = screenShareSessions.get(sessionId);
  if (!session || !session.active) return null;

  // Upload frame to S3
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const frameKey = `screen-share/${session.taskId}/${session.id}/frame-${session.frames.length}-${Date.now()}.${ext}`;
  const { url } = await storagePut(frameKey, frameData, mimeType);

  const frame: ScreenShareFrame = {
    url,
    capturedAt: Date.now(),
    index: session.frames.length,
  };

  session.frames.push(frame);
  session.lastFrameAt = frame.capturedAt;

  // Evict old frames if over limit
  if (session.frames.length > MAX_FRAMES_PER_SESSION) {
    session.frames = session.frames.slice(-MAX_FRAMES_PER_SESSION);
  }

  return frame;
}

/**
 * End a screen share session
 */
export function endScreenShareSession(sessionId: string): ScreenShareSession | null {
  const session = screenShareSessions.get(sessionId);
  if (!session) return null;
  session.active = false;
  return session;
}

/**
 * Get the active screen share session for a task
 */
export function getActiveScreenShareSession(taskId: string): ScreenShareSession | null {
  const sessions = Array.from(screenShareSessions.values());
  for (const session of sessions) {
    if (session.taskId === taskId && session.active) return session;
  }
  return null;
}

/**
 * Build LLM context from screen share frames.
 * Selects the most recent frames (up to MAX_CONTEXT_FRAMES) and
 * returns them as image_url content parts.
 */
export function buildScreenShareContext(
  sessionId: string
): Array<ImageContent | TextContent> {
  const session = screenShareSessions.get(sessionId);
  if (!session || session.frames.length === 0) return [];

  const recentFrames = session.frames.slice(-MAX_CONTEXT_FRAMES);
  const parts: Array<ImageContent | TextContent> = [];

  parts.push({
    type: "text",
    text: `[Live screen share — ${recentFrames.length} recent frame(s) captured over ${
      recentFrames.length > 1
        ? `${Math.round((recentFrames[recentFrames.length - 1].capturedAt - recentFrames[0].capturedAt) / 1000)}s`
        : "0s"
    }]`,
  });

  for (const frame of recentFrames) {
    parts.push({
      type: "image_url",
      image_url: { url: frame.url, detail: "auto" },
    });
  }

  return parts;
}

// ─── Unified Context Builder ─────────────────────────────────────────────────

/**
 * Build complete media context for a task, combining:
 * - Uploaded video files
 * - Active screen share frames
 * - Recorded video clips
 * 
 * Returns an array of content parts ready to inject into the LLM conversation.
 */
export async function buildMediaContextForTask(
  taskId: string,
  mediaAssets: MediaAsset[]
): Promise<Array<ImageContent | FileContent | TextContent>> {
  const allParts: Array<ImageContent | FileContent | TextContent> = [];

  // Process each media asset
  for (const asset of mediaAssets) {
    if (asset.type === "video" || asset.type === "recording") {
      const processed = await processVideoForContext(asset);
      allParts.push(...processed.contentParts);
    }
  }

  // Add active screen share context
  const activeSession = getActiveScreenShareSession(taskId);
  if (activeSession) {
    const screenParts = buildScreenShareContext(activeSession.id);
    allParts.push(...screenParts);
  }

  return allParts;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Clean up expired screen share sessions (older than 1 hour)
 */
export function cleanupExpiredSessions(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const entries = Array.from(screenShareSessions.entries());
  for (const [id, session] of entries) {
    if (session.startedAt < oneHourAgo && !session.active) {
      screenShareSessions.delete(id);
    }
  }
}

/**
 * Clear all caches (for testing)
 */
export function clearMediaCaches(): void {
  screenShareSessions.clear();
  processedMediaCache.clear();
}

/**
 * Create a MediaAsset from an uploaded file
 */
export function createMediaAsset(
  url: string,
  mimeType: string,
  fileName?: string,
  size?: number,
  type: MediaAsset["type"] = "video"
): MediaAsset {
  return {
    id: crypto.randomUUID(),
    type,
    url,
    mimeType,
    fileName,
    size,
    createdAt: Date.now(),
  };
}
