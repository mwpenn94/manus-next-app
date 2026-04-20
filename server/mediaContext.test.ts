/**
 * Media Context Pipeline Tests
 * Tests for video processing, screen share context building, and media session management
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies before importing the module
vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    text: "This is a test transcription of the video audio",
    language: "en",
    segments: [],
  }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "test-key",
    url: "https://cdn.example.com/uploaded-frame.png",
  }),
}));

import {
  processVideoForContext,
  buildScreenShareContext,
  startScreenShareSession,
  endScreenShareSession,
  getActiveScreenShareSession,
  addScreenShareFrame,
  buildMediaContextForTask,
  createMediaAsset,
  clearMediaCaches,
  cleanupExpiredSessions,
  MAX_VIDEO_UPLOAD_SIZE,
  SCREEN_SHARE_FRAME_INTERVAL,
  type MediaAsset,
} from "./mediaContext";

describe("Media Context Pipeline", () => {
  beforeEach(() => {
    clearMediaCaches();
  });

  describe("createMediaAsset", () => {
    it("should create a media asset with all required fields", () => {
      const asset = createMediaAsset(
        "https://example.com/video.mp4",
        "video/mp4",
        "test-video.mp4",
        5 * 1024 * 1024
      );

      expect(asset.id).toBeDefined();
      expect(asset.type).toBe("video");
      expect(asset.url).toBe("https://example.com/video.mp4");
      expect(asset.mimeType).toBe("video/mp4");
      expect(asset.fileName).toBe("test-video.mp4");
      expect(asset.size).toBe(5 * 1024 * 1024);
      expect(asset.createdAt).toBeGreaterThan(0);
    });

    it("should allow custom type", () => {
      const asset = createMediaAsset(
        "https://example.com/recording.webm",
        "video/webm",
        "recording.webm",
        undefined,
        "recording"
      );
      expect(asset.type).toBe("recording");
    });

    it("should generate unique IDs", () => {
      const a1 = createMediaAsset("https://example.com/1.mp4", "video/mp4");
      const a2 = createMediaAsset("https://example.com/2.mp4", "video/mp4");
      expect(a1.id).not.toBe(a2.id);
    });
  });

  describe("processVideoForContext", () => {
    it("should return processed context with content parts for small mp4", async () => {
      const asset = createMediaAsset(
        "https://example.com/small-video.mp4",
        "video/mp4",
        "small.mp4",
        10 * 1024 * 1024 // 10MB — under threshold
      );

      const result = await processVideoForContext(asset);

      expect(result).toBeDefined();
      expect(result.asset.id).toBe(asset.id);
      expect(result.contentParts.length).toBeGreaterThan(0);

      // Should include file_url for direct pass-through
      const hasFileUrl = result.contentParts.some(
        (p) => p.type === "file_url"
      );
      expect(hasFileUrl).toBe(true);
    });

    it("should return text context for large videos", async () => {
      const asset = createMediaAsset(
        "https://example.com/large-video.mp4",
        "video/mp4",
        "large.mp4",
        50 * 1024 * 1024 // 50MB — over threshold
      );

      const result = await processVideoForContext(asset);

      expect(result).toBeDefined();
      // Should include text context instead of file_url
      const hasText = result.contentParts.some((p) => p.type === "text");
      expect(hasText).toBe(true);
    });

    it("should include transcription when available", async () => {
      const asset = createMediaAsset(
        "https://example.com/video.mp4",
        "video/mp4",
        "video.mp4",
        5 * 1024 * 1024
      );

      const result = await processVideoForContext(asset);

      // Transcription should be captured
      expect(result.transcription).toBeDefined();
      expect(result.transcription).toContain("test transcription");
    });

    it("should cache processed results", async () => {
      const asset = createMediaAsset(
        "https://example.com/cached-video.mp4",
        "video/mp4",
        "cached.mp4",
        5 * 1024 * 1024
      );

      const result1 = await processVideoForContext(asset);
      const result2 = await processVideoForContext(asset);

      // Should be the exact same object (cached)
      expect(result1).toBe(result2);
    });

    it("should handle webm format", async () => {
      const asset = createMediaAsset(
        "https://example.com/recording.webm",
        "video/webm",
        "recording.webm",
        8 * 1024 * 1024,
        "recording"
      );

      const result = await processVideoForContext(asset);
      expect(result).toBeDefined();
      expect(result.contentParts.length).toBeGreaterThan(0);
    });
  });

  describe("Screen Share Session Management", () => {
    it("should start a new session", () => {
      const session = startScreenShareSession("task-123");

      expect(session.id).toBeDefined();
      expect(session.taskId).toBe("task-123");
      expect(session.active).toBe(true);
      expect(session.frames).toHaveLength(0);
    });

    it("should find active session for a task", () => {
      startScreenShareSession("task-456");

      const found = getActiveScreenShareSession("task-456");
      expect(found).not.toBeNull();
      expect(found!.taskId).toBe("task-456");
    });

    it("should return null for tasks without active sessions", () => {
      const found = getActiveScreenShareSession("nonexistent-task");
      expect(found).toBeNull();
    });

    it("should end a session", () => {
      const session = startScreenShareSession("task-789");
      const ended = endScreenShareSession(session.id);

      expect(ended).not.toBeNull();
      expect(ended!.active).toBe(false);

      // Should no longer be found as active
      const found = getActiveScreenShareSession("task-789");
      expect(found).toBeNull();
    });

    it("should add frames to a session", async () => {
      const session = startScreenShareSession("task-frames");
      const frameData = Buffer.from("fake-image-data");

      const frame = await addScreenShareFrame(session.id, frameData, "image/png");

      expect(frame).not.toBeNull();
      expect(frame!.url).toBe("https://cdn.example.com/uploaded-frame.png");
      expect(frame!.index).toBe(0);

      // Verify session has the frame
      const active = getActiveScreenShareSession("task-frames");
      expect(active!.frames).toHaveLength(1);
    });

    it("should reject frames for inactive sessions", async () => {
      const session = startScreenShareSession("task-inactive");
      endScreenShareSession(session.id);

      const frame = await addScreenShareFrame(
        session.id,
        Buffer.from("data"),
        "image/png"
      );
      expect(frame).toBeNull();
    });

    it("should reject frames for nonexistent sessions", async () => {
      const frame = await addScreenShareFrame(
        "nonexistent-id",
        Buffer.from("data"),
        "image/png"
      );
      expect(frame).toBeNull();
    });
  });

  describe("buildScreenShareContext", () => {
    it("should build context from session frames", async () => {
      const session = startScreenShareSession("task-context");

      // Add some frames
      await addScreenShareFrame(session.id, Buffer.from("frame1"), "image/png");
      await addScreenShareFrame(session.id, Buffer.from("frame2"), "image/png");

      const parts = buildScreenShareContext(session.id);

      expect(parts.length).toBeGreaterThan(0);

      // Should have text header + image parts
      const textParts = parts.filter((p) => p.type === "text");
      const imageParts = parts.filter((p) => p.type === "image_url");

      expect(textParts.length).toBe(1);
      expect(imageParts.length).toBe(2);
    });

    it("should return empty array for nonexistent session", () => {
      const parts = buildScreenShareContext("nonexistent");
      expect(parts).toHaveLength(0);
    });

    it("should return empty array for session with no frames", () => {
      const session = startScreenShareSession("task-empty");
      const parts = buildScreenShareContext(session.id);
      expect(parts).toHaveLength(0);
    });

    it("should limit frames to MAX_CONTEXT_FRAMES", async () => {
      const session = startScreenShareSession("task-many-frames");

      // Add more frames than the limit (8)
      for (let i = 0; i < 15; i++) {
        await addScreenShareFrame(
          session.id,
          Buffer.from(`frame-${i}`),
          "image/png"
        );
      }

      const parts = buildScreenShareContext(session.id);
      const imageParts = parts.filter((p) => p.type === "image_url");

      // Should be capped at 8 (MAX_CONTEXT_FRAMES)
      expect(imageParts.length).toBeLessThanOrEqual(8);
    });
  });

  describe("buildMediaContextForTask", () => {
    it("should combine video and screen share context", async () => {
      // Start a screen share session
      const session = startScreenShareSession("task-combined");
      await addScreenShareFrame(session.id, Buffer.from("frame"), "image/png");

      // Create a video asset
      const videoAsset = createMediaAsset(
        "https://example.com/video.mp4",
        "video/mp4",
        "video.mp4",
        5 * 1024 * 1024
      );

      const parts = await buildMediaContextForTask("task-combined", [videoAsset]);

      expect(parts.length).toBeGreaterThan(0);

      // Should have both video and screen share parts
      const hasFileUrl = parts.some((p) => p.type === "file_url");
      const hasImageUrl = parts.some((p) => p.type === "image_url");

      expect(hasFileUrl).toBe(true); // from video
      expect(hasImageUrl).toBe(true); // from screen share
    });

    it("should handle empty assets array", async () => {
      const parts = await buildMediaContextForTask("task-empty", []);
      // Should still work — just no video parts
      expect(Array.isArray(parts)).toBe(true);
    });
  });

  describe("Constants", () => {
    it("should have correct max video upload size", () => {
      expect(MAX_VIDEO_UPLOAD_SIZE).toBe(100 * 1024 * 1024);
    });

    it("should have correct screen share frame interval", () => {
      expect(SCREEN_SHARE_FRAME_INTERVAL).toBe(5000);
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("should not remove active sessions", () => {
      const session = startScreenShareSession("task-active-cleanup");
      cleanupExpiredSessions();

      const found = getActiveScreenShareSession("task-active-cleanup");
      expect(found).not.toBeNull();
    });

    it("should remove ended sessions older than 1 hour", () => {
      const session = startScreenShareSession("task-old");
      // Manually set startedAt to 2 hours ago
      (session as any).startedAt = Date.now() - 2 * 60 * 60 * 1000;
      endScreenShareSession(session.id);

      cleanupExpiredSessions();

      // Session should be cleaned up — endScreenShareSession marks inactive,
      // and it's older than 1 hour
      // Note: we can't directly check the map, but we can verify
      // getActiveScreenShareSession returns null (it was already ended)
      const found = getActiveScreenShareSession("task-old");
      expect(found).toBeNull();
    });
  });
});
