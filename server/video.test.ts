import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  createVideoProject: vi.fn().mockResolvedValue({
    id: 1,
    externalId: "test-vid-123",
    userId: 1,
    title: "Test Video",
    prompt: "A sunset over mountains",
    provider: "ffmpeg",
    sourceImages: [],
    videoUrl: null,
    thumbnailUrl: null,
    duration: null,
    resolution: "1280x720",
    status: "pending",
    errorMessage: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getUserVideoProjects: vi.fn().mockResolvedValue([
    {
      id: 1,
      externalId: "test-vid-123",
      userId: 1,
      title: "Test Video",
      prompt: "A sunset over mountains",
      provider: "ffmpeg",
      status: "pending",
      createdAt: new Date(),
    },
  ]),
  getVideoProjectByExternalId: vi.fn().mockImplementation((externalId: string) => {
    if (externalId === "test-vid-123") {
      return Promise.resolve({
        id: 1,
        externalId: "test-vid-123",
        userId: 1,
        title: "Test Video",
        prompt: "A sunset over mountains",
        provider: "ffmpeg",
        status: "pending",
      });
    }
    return Promise.resolve(null);
  }),
  deleteVideoProject: vi.fn().mockResolvedValue(undefined),
  updateVideoProjectStatus: vi.fn().mockResolvedValue(undefined),
}));

import {
  createVideoProject,
  getUserVideoProjects,
  getVideoProjectByExternalId,
  deleteVideoProject,
  updateVideoProjectStatus,
} from "./db";

describe("Video Projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createVideoProject", () => {
    it("creates a video project with required fields", async () => {
      const project = await createVideoProject({
        externalId: "test-vid-123",
        userId: 1,
        title: "Test Video",
        prompt: "A sunset over mountains",
        provider: "ffmpeg",
        status: "pending",
      });

      expect(createVideoProject).toHaveBeenCalledWith({
        externalId: "test-vid-123",
        userId: 1,
        title: "Test Video",
        prompt: "A sunset over mountains",
        provider: "ffmpeg",
        status: "pending",
      });
      expect(project).toBeDefined();
      expect(project.externalId).toBe("test-vid-123");
      expect(project.status).toBe("pending");
    });

    it("creates a project with source images", async () => {
      await createVideoProject({
        externalId: "test-vid-456",
        userId: 1,
        title: "Slideshow Video",
        prompt: "Create a slideshow",
        provider: "ffmpeg",
        status: "pending",
        sourceImages: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
      });

      expect(createVideoProject).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceImages: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
        })
      );
    });
  });

  describe("getUserVideoProjects", () => {
    it("returns user's video projects", async () => {
      const projects = await getUserVideoProjects(1);

      expect(getUserVideoProjects).toHaveBeenCalledWith(1);
      expect(projects).toHaveLength(1);
      expect(projects[0].title).toBe("Test Video");
    });
  });

  describe("getVideoProjectByExternalId", () => {
    it("returns project when found", async () => {
      const project = await getVideoProjectByExternalId("test-vid-123");

      expect(project).toBeDefined();
      expect(project!.externalId).toBe("test-vid-123");
    });

    it("returns null for non-existent project", async () => {
      const project = await getVideoProjectByExternalId("non-existent");

      expect(project).toBeNull();
    });
  });

  describe("deleteVideoProject", () => {
    it("deletes a project by id and userId", async () => {
      await deleteVideoProject(1, 1);

      expect(deleteVideoProject).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("updateVideoProjectStatus", () => {
    it("updates status to generating", async () => {
      await updateVideoProjectStatus(1, "generating");

      expect(updateVideoProjectStatus).toHaveBeenCalledWith(1, "generating");
    });

    it("updates status to ready with video URL and duration", async () => {
      await updateVideoProjectStatus(1, "ready", {
        videoUrl: "https://cdn.example.com/video.mp4",
        thumbnailUrl: "https://cdn.example.com/thumb.jpg",
        duration: 30,
      });

      expect(updateVideoProjectStatus).toHaveBeenCalledWith(1, "ready", {
        videoUrl: "https://cdn.example.com/video.mp4",
        thumbnailUrl: "https://cdn.example.com/thumb.jpg",
        duration: 30,
      });
    });

    it("updates status to error with error message", async () => {
      await updateVideoProjectStatus(1, "error", {
        errorMessage: "Provider API unavailable",
      });

      expect(updateVideoProjectStatus).toHaveBeenCalledWith(1, "error", {
        errorMessage: "Provider API unavailable",
      });
    });
  });

  describe("provider tier validation", () => {
    it("accepts ffmpeg as free-tier provider", async () => {
      await createVideoProject({
        externalId: "ffmpeg-test",
        userId: 1,
        title: "FFmpeg Video",
        prompt: "Slideshow from images",
        provider: "ffmpeg",
        status: "pending",
      });

      expect(createVideoProject).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "ffmpeg" })
      );
    });

    it("accepts replicate-svd as freemium provider", async () => {
      await createVideoProject({
        externalId: "replicate-test",
        userId: 1,
        title: "AI Video",
        prompt: "A cat walking",
        provider: "replicate-svd",
        status: "pending",
      });

      expect(createVideoProject).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "replicate-svd" })
      );
    });

    it("accepts veo3 as premium provider", async () => {
      await createVideoProject({
        externalId: "veo3-test",
        userId: 1,
        title: "Premium Video",
        prompt: "Cinematic drone shot",
        provider: "veo3",
        status: "pending",
      });

      expect(createVideoProject).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "veo3" })
      );
    });
  });
});
