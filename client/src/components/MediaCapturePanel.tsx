/**
 * MediaCapturePanel — Unified media capture UI
 * 
 * Provides screen sharing, webcam recording, and video file upload
 * in a single panel that slides up from the input area.
 */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Camera,
  Upload,
  X,
  Circle,
  Square,
  ScreenShare,
  Video,
  StopCircle,
  Loader2,
  AlertCircle,
  Check,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScreenShare } from "@/hooks/useScreenShare";
import { useVideoCapture } from "@/hooks/useVideoCapture";
import { cn } from "@/lib/utils";

interface MediaCaptureResult {
  type: "screen_share_frames" | "video_recording" | "video_upload";
  urls: string[];
  mimeType: string;
  fileName?: string;
}

interface MediaCapturePanelProps {
  open: boolean;
  onClose: () => void;
  onMediaCaptured: (result: MediaCaptureResult) => void;
  taskId?: string;
}

type CaptureMode = "screen" | "camera" | "upload" | null;

export function MediaCapturePanel({
  open,
  onClose,
  onMediaCaptured,
  taskId,
}: MediaCapturePanelProps) {
  const [mode, setMode] = useState<CaptureMode>(null);

  const screenShare = useScreenShare({
    taskId,
    onFrame: () => {
      // Frames are auto-captured and stored in the hook
    },
  });

  const videoCapture = useVideoCapture({ taskId });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUploading, setFileUploading] = useState(false);

  // Handle screen share completion
  const handleScreenShareDone = useCallback(() => {
    const frameUrls = screenShare.getRecentFrameUrls(8);
    if (frameUrls.length > 0) {
      onMediaCaptured({
        type: "screen_share_frames",
        urls: frameUrls,
        mimeType: "image/jpeg",
      });
    }
    if (screenShare.recordedVideoUrl) {
      onMediaCaptured({
        type: "video_recording",
        urls: [screenShare.recordedVideoUrl],
        mimeType: "video/webm",
        fileName: "screen-recording.webm",
      });
    }
    screenShare.stopSharing();
    setMode(null);
    onClose();
  }, [screenShare, onMediaCaptured, onClose]);

  // Handle camera recording completion
  const handleCameraRecordingDone = useCallback(() => {
    if (videoCapture.recordedUrl) {
      onMediaCaptured({
        type: "video_recording",
        urls: [videoCapture.recordedUrl],
        mimeType: "video/webm",
        fileName: "camera-recording.webm",
      });
    }
    videoCapture.stopCamera();
    setMode(null);
    onClose();
  }, [videoCapture, onMediaCaptured, onClose]);

  // Handle video file upload
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 100 * 1024 * 1024) {
        alert("Video file too large. Maximum size is 100MB.");
        return;
      }

      setFileUploading(true);
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": file.type || "video/mp4",
            "X-File-Name": encodeURIComponent(file.name),
            "X-Task-Id": taskId || "unknown",
          },
          credentials: "include",
          body: file,
        });

        if (response.ok) {
          const result = await response.json();
          onMediaCaptured({
            type: "video_upload",
            urls: [result.url],
            mimeType: file.type,
            fileName: file.name,
          });
          onClose();
        } else {
          alert("Upload failed. Please try again.");
        }
      } catch {
        alert("Upload failed. Please try again.");
      } finally {
        setFileUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [taskId, onMediaCaptured, onClose]
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: 20, height: 0 }}
        transition={{ duration: 0.2 }}
        className="border border-border rounded-xl bg-card shadow-lg overflow-hidden mb-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {mode === "screen"
                ? "Screen Share"
                : mode === "camera"
                  ? "Camera Recording"
                  : mode === "upload"
                    ? "Upload Video"
                    : "Add Visual Context"}
            </span>
          </div>
          <button
            onClick={() => {
              if (screenShare.sharing) screenShare.stopSharing();
              if (videoCapture.cameraActive) videoCapture.stopCamera();
              setMode(null);
              onClose();
            }}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selection */}
        {!mode && (
          <div className="p-4 grid grid-cols-3 gap-3">
            <ModeButton
              icon={Monitor}
              label="Share Screen"
              description="Live screen broadcast"
              onClick={() => {
                setMode("screen");
                screenShare.startSharing();
              }}
            />
            <ModeButton
              icon={Camera}
              label="Record Video"
              description="Camera recording"
              onClick={() => {
                setMode("camera");
                videoCapture.startCamera();
              }}
            />
            <ModeButton
              icon={Upload}
              label="Upload Video"
              description="From file"
              onClick={() => {
                setMode("upload");
                fileInputRef.current?.click();
              }}
            />
          </div>
        )}

        {/* Screen Share Active */}
        {mode === "screen" && (
          <div className="p-4 space-y-3">
            {screenShare.error ? (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {screenShare.error}
              </div>
            ) : screenShare.sharing ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-foreground">
                    Screen sharing active — {screenShare.frames.length} frame(s) captured
                  </span>
                </div>

                {/* Frame preview strip */}
                {screenShare.frames.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {screenShare.frames.slice(-6).map((frame, i) => (
                      <img
                        key={i}
                        src={frame.url}
                        alt={`Frame ${i}`}
                        className="h-16 w-auto rounded border border-border object-cover flex-shrink-0"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {!screenShare.recording ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={screenShare.startRecording}
                      className="gap-1.5"
                    >
                      <Circle className="w-3 h-3 text-red-500 fill-red-500" />
                      Record
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={screenShare.stopRecording}
                      className="gap-1.5"
                    >
                      <Square className="w-3 h-3 text-red-500 fill-red-500" />
                      Stop Recording
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleScreenShareDone}
                    className="gap-1.5"
                  >
                    <Check className="w-3 h-3" />
                    Done — Add to Context
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      screenShare.stopSharing();
                      setMode(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting screen share...
              </div>
            )}
          </div>
        )}

        {/* Camera Recording Active */}
        {mode === "camera" && (
          <div className="p-4 space-y-3">
            {videoCapture.error ? (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {videoCapture.error}
              </div>
            ) : videoCapture.cameraActive ? (
              <>
                {/* Camera preview */}
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-48">
                  <video
                    ref={videoCapture.bindPreviewElement}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {videoCapture.recording && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-500/90 text-white text-xs px-2 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <Clock className="w-3 h-3" />
                      {videoCapture.formattedDuration}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!videoCapture.recording ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={videoCapture.startRecording}
                      className="gap-1.5"
                    >
                      <Circle className="w-3 h-3 text-red-500 fill-red-500" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={videoCapture.stopRecording}
                      className="gap-1.5"
                    >
                      <StopCircle className="w-3 h-3" />
                      Stop ({videoCapture.formattedDuration})
                    </Button>
                  )}

                  {videoCapture.recordedUrl && !videoCapture.recording && (
                    <Button
                      size="sm"
                      onClick={handleCameraRecordingDone}
                      className="gap-1.5"
                    >
                      <Check className="w-3 h-3" />
                      Add to Context
                    </Button>
                  )}

                  {videoCapture.uploading && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading...
                    </span>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      videoCapture.stopCamera();
                      setMode(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting camera...
              </div>
            )}
          </div>
        )}

        {/* File Upload */}
        {mode === "upload" && (
          <div className="p-4">
            {fileUploading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading video...
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select a video file to add as context...
              </div>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </motion.div>
    </AnimatePresence>
  );
}

function ModeButton({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/50 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
