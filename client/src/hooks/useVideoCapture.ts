/**
 * useVideoCapture — Webcam/camera video recording hook
 * 
 * Uses getUserMedia API to capture video from the user's camera.
 * Records video and uploads it for agent context.
 */
import { useState, useRef, useCallback, useEffect } from "react";

export interface UseVideoCaptureOptions {
  /** Task ID for upload context */
  taskId?: string;
  /** Max recording duration in seconds (default: 120) */
  maxDuration?: number;
}

export function useVideoCapture(options: UseVideoCaptureOptions = {}) {
  const { taskId, maxDuration = 120 } = options;

  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Start camera preview
  const startCamera = useCallback(async () => {
    setError(null);
    setRecordedUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      streamRef.current = stream;
      setCameraActive(true);

      // If there's a preview video element, bind the stream
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Camera access was denied. Please allow access and try again.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError(err.message || "Failed to access camera");
      }
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setRecording(false);
    setDuration(0);
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setDuration(0);
    setRecordedUrl(null);

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const blob = new Blob(chunksRef.current, { type: mimeType });

      // Check size limit (100MB)
      if (blob.size > 100 * 1024 * 1024) {
        setError("Recording too large (max 100MB). Try a shorter recording.");
        setRecording(false);
        return;
      }

      setUploading(true);
      try {
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": mimeType,
            "X-File-Name": `camera-recording-${Date.now()}.${ext}`,
            "X-Task-Id": taskId || "unknown",
          },
          credentials: "include",
          body: blob,
        });

        if (response.ok) {
          const result = await response.json();
          setRecordedUrl(result.url);
        } else {
          setRecordedUrl(URL.createObjectURL(blob));
        }
      } catch {
        setRecordedUrl(URL.createObjectURL(blob));
      } finally {
        setUploading(false);
        setRecording(false);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setRecording(true);

    // Duration timer
    timerRef.current = setInterval(() => {
      setDuration((prev) => {
        const next = prev + 1;
        if (next >= maxDuration) {
          // Auto-stop at max duration
          stopRecording();
        }
        return next;
      });
    }, 1000);
  }, [taskId, maxDuration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Bind a video element for preview
  const bindPreviewElement = useCallback((el: HTMLVideoElement | null) => {
    previewVideoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  // Format duration as mm:ss
  const formattedDuration = `${Math.floor(duration / 60).toString().padStart(2, "0")}:${(duration % 60).toString().padStart(2, "0")}`;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    cameraActive,
    recording,
    error,
    recordedUrl,
    uploading,
    duration,
    formattedDuration,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    bindPreviewElement,
    clearError: () => setError(null),
  };
}
