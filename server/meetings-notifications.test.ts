/**
 * Meetings & Notifications — vitest tests
 *
 * Tests the meeting and notification tRPC procedure contracts:
 * - Input validation (schemas, constraints)
 * - Auth requirements (protectedProcedure enforcement)
 * - Procedure existence and structure
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      headers: { origin: "http://localhost:3000" },
    } as any,
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as any,
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      headers: { origin: "http://localhost:3000" },
    } as any,
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as any,
  };
}

describe("Meeting procedures", () => {
  const caller = appRouter.createCaller;

  it("meeting.list requires authentication", async () => {
    const ctx = createUnauthContext();
    const trpc = caller(ctx);
    await expect(trpc.meeting.list()).rejects.toThrow();
  });

  it("meeting.generateFromTranscript requires authentication", async () => {
    const ctx = createUnauthContext();
    const trpc = caller(ctx);
    await expect(
      trpc.meeting.generateFromTranscript({ transcript: "test transcript" })
    ).rejects.toThrow();
  });

  it("meeting.create requires authentication", async () => {
    const ctx = createUnauthContext();
    const trpc = caller(ctx);
    await expect(
      trpc.meeting.create({ audioUrl: "https://example.com/audio.mp3" })
    ).rejects.toThrow();
  });

  it("meeting.generateFromTranscript validates transcript is required", async () => {
    const ctx = createAuthContext();
    const trpc = caller(ctx);
    // Empty transcript should fail validation
    await expect(
      trpc.meeting.generateFromTranscript({ transcript: "" })
    ).rejects.toThrow();
  });

  it("meeting.create validates audioUrl is required", async () => {
    const ctx = createAuthContext();
    const trpc = caller(ctx);
    await expect(
      // @ts-expect-error - testing missing required field
      trpc.meeting.create({})
    ).rejects.toThrow();
  });

  it("meeting router has expected procedures", () => {
    // Verify the router shape
    const routerDef = appRouter._def;
    expect(routerDef).toBeDefined();
    // Check that meeting procedures exist by trying to create a caller
    const ctx = createAuthContext();
    const trpc = caller(ctx);
    expect(trpc.meeting).toBeDefined();
    expect(trpc.meeting.list).toBeDefined();
    expect(trpc.meeting.create).toBeDefined();
    expect(trpc.meeting.generateFromTranscript).toBeDefined();
  });
});

describe("Notification procedures", () => {
  const caller = appRouter.createCaller;

  it("notification.list requires authentication", async () => {
    const ctx = createUnauthContext();
    const trpc = caller(ctx);
    await expect(trpc.notification.list()).rejects.toThrow();
  });

  it("notification.unreadCount requires authentication", async () => {
    const ctx = createUnauthContext();
    const trpc = caller(ctx);
    await expect(trpc.notification.unreadCount()).rejects.toThrow();
  });

  it("notification.markRead requires authentication", async () => {
    const ctx = createUnauthContext();
    const trpc = caller(ctx);
    await expect(trpc.notification.markRead({ id: 1 })).rejects.toThrow();
  });

  it("notification.markAllRead requires authentication", async () => {
    const ctx = createUnauthContext();
    const trpc = caller(ctx);
    await expect(trpc.notification.markAllRead()).rejects.toThrow();
  });

  it("notification.markRead validates id is required", async () => {
    const ctx = createAuthContext();
    const trpc = caller(ctx);
    await expect(
      // @ts-expect-error - testing missing required field
      trpc.notification.markRead({})
    ).rejects.toThrow();
  });

  it("notification.list accepts optional limit parameter", async () => {
    const ctx = createAuthContext();
    const trpc = caller(ctx);
    // Should not throw on valid limit
    // (will fail at DB level but input validation should pass)
    try {
      await trpc.notification.list({ limit: 10 });
    } catch (err: any) {
      // DB errors are expected, but input validation errors are not
      expect(err.code).not.toBe("BAD_REQUEST");
    }
  });

  it("notification.list rejects invalid limit values", async () => {
    const ctx = createAuthContext();
    const trpc = caller(ctx);
    // Limit must be 1-100
    await expect(
      trpc.notification.list({ limit: 0 })
    ).rejects.toThrow();
    await expect(
      trpc.notification.list({ limit: 101 })
    ).rejects.toThrow();
  });

  it("notification router has expected procedures", () => {
    const ctx = createAuthContext();
    const trpc = caller(ctx);
    expect(trpc.notification).toBeDefined();
    expect(trpc.notification.list).toBeDefined();
    expect(trpc.notification.unreadCount).toBeDefined();
    expect(trpc.notification.markRead).toBeDefined();
    expect(trpc.notification.markAllRead).toBeDefined();
  });
});

describe("MeetingsPage frontend contract", () => {
  it("uploadAudioToS3 function structure is correct", async () => {
    // Verify the MeetingsPage has the expected upload function pattern
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/MeetingsPage.tsx", "utf-8");

    // Has upload function
    expect(content).toContain("uploadAudioToS3");
    // Has MediaRecorder integration
    expect(content).toContain("MediaRecorder");
    // Has progress tracking
    expect(content).toContain("onProgress");
    expect(content).toContain("uploadProgress");
    // Has error handling for mic permissions
    expect(content).toContain("NotAllowedError");
    expect(content).toContain("NotFoundError");
    expect(content).toContain("NotReadableError");
    // Has file size validation
    expect(content).toContain("MAX_AUDIO_SIZE");
    // Has file type validation
    expect(content).toContain("audio/mpeg");
    expect(content).toContain("audio/wav");
    expect(content).toContain("audio/webm");
    // Has processing status indicators
    expect(content).toContain("processingStatus");
    expect(content).toContain("Transcribing audio with Whisper");
    expect(content).toContain("Generating AI summary");
    // Has recording timer
    expect(content).toContain("recordingTime");
    expect(content).toContain("formatTime");
  });

  it("MeetingsPage has all three input tabs", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/MeetingsPage.tsx", "utf-8");
    expect(content).toContain('value="record"');
    expect(content).toContain('value="paste"');
    expect(content).toContain('value="upload"');
  });

  it("MeetingsPage has proper error handling with toast", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/MeetingsPage.tsx", "utf-8");
    // Count toast.error calls for comprehensive error handling
    const errorToasts = (content.match(/toast\.error/g) || []).length;
    expect(errorToasts).toBeGreaterThanOrEqual(5); // mic denied, not found, not readable, upload fail, process fail
  });
});
