/**
 * useScreenShare — Screen sharing/broadcasting hook
 * 
 * Uses getDisplayMedia API to capture the user's screen, window, or tab.
 * Periodically captures frames and uploads them for agent context.
 * Supports live preview and recording.
 */
import { useState, useRef, useCallback, useEffect } from "react";

export interface ScreenShareFrame {
  url: string;
  capturedAt: number;
  blob: Blob;
}

export interface UseScreenShareOptions {
  /** Interval between frame captures in ms (default: 5000) */
  captureInterval?: number;
  /** Max frames to keep in memory (default: 30) */
  maxFrames?: number;
  /** Callback when a new frame is captured */
  onFrame?: (frame: ScreenShareFrame) => void;
  /** Task ID for upload context */
  taskId?: string;
}

export function useScreenShare(options: UseScreenShareOptions = {}) {
  const {
    captureInterval = 5000,
    maxFrames = 30,
    onFrame,
    taskId,
  } = options;

  const [sharing, setSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<ScreenShareFrame[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Capture a single frame from the video stream
  const captureFrame = useCallback(async (): Promise<ScreenShareFrame | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return null;

    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) { resolve(null); return; }

          let url = "";
          try {
            // Upload frame to server
            const response = await fetch("/api/upload", {
              method: "POST",
              headers: {
                "Content-Type": "image/jpeg",
                "X-File-Name": `screen-frame-${Date.now()}.jpg`,
                "X-Task-Id": taskId || "unknown",
              },
              credentials: "include",
              body: blob,
            });
            if (response.ok) {
              const result = await response.json();
              url = result.url;
            }
          } catch {
            // If upload fails, use local blob URL as fallback
            url = URL.createObjectURL(blob);
          }

          const frame: ScreenShareFrame = {
            url,
            capturedAt: Date.now(),
            blob,
          };
          resolve(frame);
        },
        "image/jpeg",
        0.7
      );
    });
  }, [taskId]);

  // Start screen sharing
  const startSharing = useCallback(async () => {
    setError(null);
    setRecordedVideoUrl(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 5 },
        },
        audio: true, // Capture system audio if available
      });

      streamRef.current = stream;

      // Create hidden video element for frame capture
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;

      // Create hidden canvas for frame extraction
      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;

      // Set preview URL — store stream reference for video element binding
      // Note: createObjectURL(MediaStream) is deprecated; we'll bind via ref instead
      setPreviewUrl(`stream:${Date.now()}`); // Signal that preview is available
      setSharing(true);

      // Start periodic frame capture
      intervalRef.current = setInterval(async () => {
        const frame = await captureFrame();
        if (frame) {
          setFrames((prev) => {
            const updated = [...prev, frame];
            return updated.length > maxFrames ? updated.slice(-maxFrames) : updated;
          });
          onFrame?.(frame);
        }
      }, captureInterval);

      // Capture first frame immediately
      const firstFrame = await captureFrame();
      if (firstFrame) {
        setFrames([firstFrame]);
        onFrame?.(firstFrame);
      }

      // Handle stream ending (user clicks "Stop sharing" in browser UI)
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopSharing();
      });
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Screen sharing was denied. Please allow access and try again.");
      } else if (err.name === "NotFoundError") {
        setError("No screen sharing source found.");
      } else {
        setError(err.message || "Failed to start screen sharing");
      }
    }
  }, [captureFrame, captureInterval, maxFrames, onFrame]);

  // Stop screen sharing
  const stopSharing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSharing(false);
    setRecording(false);
    setPreviewUrl(null);
  }, [previewUrl]);

  // Start recording the screen share as video
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      
      // Upload the recording
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": mimeType,
            "X-File-Name": `screen-recording-${Date.now()}.${mimeType.includes("webm") ? "webm" : "mp4"}`,
            "X-Task-Id": taskId || "unknown",
          },
          credentials: "include",
          body: blob,
        });
        if (response.ok) {
          const result = await response.json();
          setRecordedVideoUrl(result.url);
        } else {
          setRecordedVideoUrl(URL.createObjectURL(blob));
        }
      } catch {
        setRecordedVideoUrl(URL.createObjectURL(blob));
      }
      setRecording(false);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000); // Capture in 1-second chunks
    setRecording(true);
  }, [taskId]);

  // Stop recording (but keep sharing)
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Get the most recent frames for context injection
  const getRecentFrameUrls = useCallback((count: number = 8): string[] => {
    return frames.slice(-count).map((f) => f.url).filter(Boolean);
  }, [frames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    sharing,
    recording,
    error,
    frames,
    previewUrl,
    recordedVideoUrl,
    startSharing,
    stopSharing,
    startRecording,
    stopRecording,
    captureFrame,
    getRecentFrameUrls,
    clearError: () => setError(null),
  };
}
