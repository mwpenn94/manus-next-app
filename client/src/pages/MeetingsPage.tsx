/**
 * MeetingsPage — Meeting notes capture, transcription, and AI summary
 *
 * Production pipeline:
 * - Record tab: MediaRecorder → blob → S3 upload → meeting.create tRPC → Whisper → AI summary
 * - Upload tab: file select → S3 upload → meeting.create tRPC → Whisper → AI summary
 * - Paste tab: text → meeting.generateFromTranscript tRPC → AI summary
 * - History: trpc.meeting.list → display past meetings from DB
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import {
  Mic,
  MicOff,
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Clipboard,
  Download,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const MAX_AUDIO_SIZE = 16 * 1024 * 1024; // 16MB — Whisper limit

type MeetingNote = {
  id: number;
  title: string;
  summary: string;
  actionItems: string[];
  keyDecisions?: string[];
  attendees?: string[];
  topics?: string[];
  createdAt: string;
  downloadUrl?: string;
  status?: string;
};

/** Upload a blob/file to S3 via /api/upload and return the URL */
async function uploadAudioToS3(
  data: Blob | File,
  fileName: string,
  onProgress?: (pct: number) => void
): Promise<{ url: string; key: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("Content-Type", data.type || "audio/webm");
    xhr.setRequestHeader("X-File-Name", fileName);
    xhr.setRequestHeader("X-Task-Id", "meeting-audio");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({ url: res.url, key: res.key });
        } catch {
          reject(new Error("Invalid response from upload"));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.timeout = 120000; // 2 min timeout
    xhr.send(data);
  });
}

export default function MeetingsPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("record");
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [currentNotes, setCurrentNotes] = useState<MeetingNote | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch meeting history from DB
  const meetingsQuery = trpc.meeting.list.useQuery(undefined, {
    staleTime: 30_000,
    enabled: isAuthenticated,
  });
  const pastMeetings = meetingsQuery.data ?? [];

  // tRPC mutations
  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: () => {
      meetingsQuery.refetch();
    },
    onError: (err) => { toast.error("Failed to create meeting: " + err.message); },
  });
  const generateFromTranscript = trpc.meeting.generateFromTranscript.useMutation({
    onSuccess: (data) => {
      meetingsQuery.refetch();
      const note: MeetingNote = {
        id: data.id,
        title: data.title,
        summary: data.summary,
        actionItems: data.actionItems ?? [],
        createdAt: new Date().toISOString(),
        downloadUrl: data.downloadUrl,
        status: "ready",
      };
      setCurrentNotes(note);
      toast.success("Meeting notes generated");
    },
    onError: (err) => {
      toast.error("Failed to generate notes: " + err.message);
    },
  });

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Try webm first, fall back to other formats
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.success("Recording started — speak clearly into your microphone");
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (err.name === "NotFoundError") {
        toast.error("No microphone found. Please connect a microphone and try again.");
      } else if (err.name === "NotReadableError") {
        toast.error("Microphone is in use by another application. Please close it and try again.");
      } else {
        toast.error("Could not start recording: " + err.message);
      }
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return null;

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        resolve(blob);
      };
      recorder.stop();
      setIsRecording(false);
    });
  }, []);

  /** Full pipeline: stop recording → upload to S3 → create meeting → Whisper + AI */
  const handleStopAndProcess = useCallback(async () => {
    const blob = await stopRecording();
    if (!blob || blob.size === 0) {
      toast.error("No audio recorded. Please try again.");
      return;
    }

    if (blob.size > MAX_AUDIO_SIZE) {
      toast.error(`Recording too large (${(blob.size / 1024 / 1024).toFixed(1)}MB). Maximum is 16MB. Try a shorter recording.`);
      return;
    }

    try {
      // Step 1: Upload to S3
      setIsUploading(true);
      setProcessingStatus("Uploading audio...");
      const fileName = `recording-${Date.now()}.webm`;
      const { url } = await uploadAudioToS3(blob, fileName, setUploadProgress);

      // Step 2: Create meeting (triggers async Whisper + AI summarization)
      setIsUploading(false);
      setIsProcessing(true);
      setProcessingStatus("Transcribing audio with Whisper...");

      const result = await createMeeting.mutateAsync({
        title: title || "Meeting " + new Date().toLocaleDateString(),
        audioUrl: url,
      });

      setProcessingStatus("Generating AI summary...");

      // Step 3: Poll for completion
      const pollForResult = async (meetingId: number, attempts = 0): Promise<void> => {
        if (attempts > 60) {
          toast.error("Processing is taking longer than expected. Check back in the meeting history.");
          setIsProcessing(false);
          setProcessingStatus("");
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
        await meetingsQuery.refetch();
        const updated = meetingsQuery.data?.find((m: any) => m.id === meetingId);
        if (updated && (updated as any).status === "ready") {
          setCurrentNotes({
            id: (updated as any).id,
            title: (updated as any).title,
            summary: (updated as any).summary || "",
            actionItems: (updated as any).actionItems || [],
            createdAt: (updated as any).createdAt || new Date().toISOString(),
            downloadUrl: (updated as any).audioUrl,
            status: "ready",
          });
          toast.success("Meeting notes generated successfully!");
          setIsProcessing(false);
          setProcessingStatus("");
        } else if (updated && (updated as any).status === "error") {
          toast.error("Transcription failed. Please try again or paste the transcript manually.");
          setIsProcessing(false);
          setProcessingStatus("");
        } else {
          return pollForResult(meetingId, attempts + 1);
        }
      };

      await pollForResult(result.id);
    } catch (err: any) {
      toast.error("Failed to process recording: " + err.message);
      setIsUploading(false);
      setIsProcessing(false);
      setProcessingStatus("");
    }
  }, [stopRecording, title, createMeeting, meetingsQuery]);

  /** Upload tab: file → S3 → meeting.create → Whisper + AI */
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (file.size > MAX_AUDIO_SIZE) {
        toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 16MB.`);
        return;
      }

      const validTypes = ["audio/mpeg", "audio/wav", "audio/webm", "audio/mp4", "audio/ogg", "audio/x-m4a", "audio/mp3"];
      if (!validTypes.some((t) => file.type.startsWith(t.split("/")[0]))) {
        toast.error("Unsupported file type. Please upload MP3, WAV, WebM, M4A, or OGG.");
        return;
      }

      try {
        setIsUploading(true);
        setProcessingStatus("Uploading audio file...");
        const { url } = await uploadAudioToS3(file, file.name, setUploadProgress);

        setIsUploading(false);
        setIsProcessing(true);
        setProcessingStatus("Transcribing audio with Whisper...");

        const result = await createMeeting.mutateAsync({
          title: title || file.name.replace(/\.[^.]+$/, ""),
          audioUrl: url,
        });

        setProcessingStatus("Generating AI summary...");

        // Poll for result
        const poll = async (id: number, attempts = 0): Promise<void> => {
          if (attempts > 60) {
            toast.error("Processing is taking longer than expected. Check meeting history.");
            setIsProcessing(false);
            setProcessingStatus("");
            return;
          }
          await new Promise((r) => setTimeout(r, 2000));
          await meetingsQuery.refetch();
          const updated = meetingsQuery.data?.find((m: any) => m.id === id);
          if (updated && (updated as any).status === "ready") {
            setCurrentNotes({
              id: (updated as any).id,
              title: (updated as any).title,
              summary: (updated as any).summary || "",
              actionItems: (updated as any).actionItems || [],
              createdAt: (updated as any).createdAt || new Date().toISOString(),
              downloadUrl: (updated as any).audioUrl,
              status: "ready",
            });
            toast.success("Meeting notes generated!");
            setIsProcessing(false);
            setProcessingStatus("");
          } else if (updated && (updated as any).status === "error") {
            toast.error("Transcription failed. Try pasting the transcript manually.");
            setIsProcessing(false);
            setProcessingStatus("");
          } else {
            return poll(id, attempts + 1);
          }
        };

        await poll(result.id);
      } catch (err: any) {
        toast.error("Failed to process audio: " + err.message);
        setIsUploading(false);
        setIsProcessing(false);
        setProcessingStatus("");
      }
    },
    [title, createMeeting, meetingsQuery]
  );

  /** Paste tab: text → generateFromTranscript tRPC */
  const handlePasteTranscript = useCallback(() => {
    if (!transcript.trim()) {
      toast.error("Please enter a transcript first");
      return;
    }
    setIsProcessing(true);
    setProcessingStatus("Generating AI summary...");
    generateFromTranscript.mutate(
      { title: title || undefined, transcript },
      {
        onSettled: () => {
          setIsProcessing(false);
          setProcessingStatus("");
        },
      }
    );
  }, [transcript, title, generateFromTranscript]);

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Meeting Notes</h2>
            <p className="text-muted-foreground mb-4">Sign in to capture and process meeting notes.</p>
            <Button size="lg" className="min-h-[44px] px-8" onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDisabled = isUploading || isProcessing || isRecording;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back to home">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Meeting Notes
            </h1>
            <p className="text-sm text-muted-foreground">
              Record, upload, or paste transcripts for AI-powered meeting summaries
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Capture Meeting</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Meeting title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mb-4"
                  disabled={isDisabled}
                />

                {/* Processing status banner */}
                {(isUploading || isProcessing) && (
                  <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20" aria-live="polite">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm font-medium text-primary">{processingStatus}</span>
                    </div>
                    {isUploading && uploadProgress > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{uploadProgress}% uploaded</p>
                      </div>
                    )}
                  </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="record" className="flex-1" disabled={isDisabled && !isRecording}>
                      <Mic className="w-4 h-4 mr-2" />
                      Record
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="flex-1" disabled={isDisabled}>
                      <Clipboard className="w-4 h-4 mr-2" />
                      Paste
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex-1" disabled={isDisabled}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </TabsTrigger>
                  </TabsList>

                  {/* Record Tab */}
                  <TabsContent value="record" className="mt-4">
                    <div className="text-center py-8">
                      <div
                        className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center transition-all ${
                          isRecording
                            ? "bg-red-500/20 animate-pulse"
                            : "bg-primary/10"
                        }`}
                      >
                        {isRecording ? (
                          <MicOff className="w-8 h-8 text-red-500" />
                        ) : (
                          <Mic className="w-8 h-8 text-primary" />
                        )}
                      </div>

                      {isRecording && (
                        <p className="text-2xl font-mono text-foreground mb-3" aria-live="polite">
                          {formatTime(recordingTime)}
                        </p>
                      )}

                      {isRecording ? (
                        <Button
                          variant="destructive"
                          onClick={handleStopAndProcess}
                          disabled={isUploading || isProcessing}
                        >
                          <MicOff className="w-4 h-4 mr-2" />
                          Stop &amp; Transcribe
                        </Button>
                      ) : (
                        <Button onClick={startRecording} disabled={isUploading || isProcessing}>
                          <Mic className="w-4 h-4 mr-2" />
                          Start Recording
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground mt-3">
                        {isRecording
                          ? "Recording in progress — click Stop to transcribe and generate notes"
                          : "Record audio directly from your microphone (max 16MB)"}
                      </p>
                    </div>
                  </TabsContent>

                  {/* Paste Tab */}
                  <TabsContent value="paste" className="mt-4">
                    <Textarea
                      placeholder="Paste your meeting transcript here..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      rows={10}
                      className="mb-4"
                      disabled={isProcessing}
                    />
                    <Button
                      onClick={handlePasteTranscript}
                      disabled={!transcript.trim() || isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      Generate Meeting Notes
                    </Button>
                  </TabsContent>

                  {/* Upload Tab */}
                  <TabsContent value="upload" className="mt-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/30 transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Upload an audio file for transcription
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        MP3, WAV, WebM, M4A, OGG — max 16MB
                      </p>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav,audio/webm,audio/mp4,audio/ogg,audio/x-m4a,.mp3,.wav,.webm,.m4a,.ogg"
                        className="hidden"
                        id="audio-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                          // Reset input so same file can be re-selected
                          e.target.value = "";
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById("audio-upload")?.click()}
                        disabled={isDisabled}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Generated Notes */}
            {currentNotes && (
              <Card className="bg-card border-border mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {currentNotes.title}
                    </CardTitle>
                    <Badge variant="secondary">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Generated
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-sm">
                    <Streamdown>{currentNotes.summary}</Streamdown>
                  </div>
                  {currentNotes.actionItems && currentNotes.actionItems.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50">
                      <h4 className="text-sm font-medium mb-2">Action Items</h4>
                      <ul className="space-y-1">
                        {currentNotes.actionItems.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentNotes.downloadUrl && (
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <a href={currentNotes.downloadUrl} download>
                        <Download className="w-4 h-4 mr-2" />
                        Download Notes
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* History Panel */}
          <div>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Recent Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                {meetingsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading meetings...</p>
                  </div>
                ) : pastMeetings.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No meetings yet. Record, upload, or paste a transcript to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastMeetings.map((meeting: any) => (
                      <button
                        key={meeting.id}
                        onClick={() =>
                          setCurrentNotes({
                            id: meeting.id,
                            title: meeting.title,
                            summary: meeting.summary || "",
                            actionItems: meeting.actionItems || [],
                            createdAt: meeting.createdAt || new Date().toISOString(),
                            downloadUrl: meeting.audioUrl,
                            status: meeting.status,
                          })
                        }
                        className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">
                            {meeting.title}
                          </p>
                          {meeting.status === "transcribing" || meeting.status === "summarizing" ? (
                            <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                          ) : meeting.status === "error" ? (
                            <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(meeting.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
