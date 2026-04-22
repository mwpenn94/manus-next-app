/**
 * Home — Manus-Aligned Home Screen
 *
 * P35: ModelSelector top-left, credits top-right, PlusMenu on input,
 * pill input with "Assign a task or ask anything", horizontal scroll cards.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useTask } from "@/contexts/TaskContext";
import {
  Plus,
  ArrowUp,
  Globe,
  BarChart3,
  GraduationCap,
  Rocket,
  Star,
  Mic,
  Code,
  Presentation,
  FileText,
  Image,
  Search as SearchIcon,
  Sparkles,
  X,
  File as FileIcon,
  Upload,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import ModelSelector from "@/components/ModelSelector";
import PlusMenu from "@/components/PlusMenu";

// Quick action chips — Manus-style horizontal row
const QUICK_ACTIONS = [
  { label: "Build a website", icon: Code, prompt: "Build a modern, responsive website" },
  { label: "Create slides", icon: Presentation, prompt: "Create a professional slide deck" },
  { label: "Write a document", icon: FileText, prompt: "Write a well-structured document" },
  { label: "Generate images", icon: Image, prompt: "Generate high-quality images" },
  { label: "Wide Research", icon: SearchIcon, prompt: "Research and summarize" },
];

// Suggestion cards — horizontally scrollable like Manus
const SUGGESTIONS = [
  { icon: Globe, title: "Research AI Agent Architectures", description: "Analyze and compare leading AI agent frameworks." },
  { icon: BarChart3, title: "Analyze Market Trends", description: "Deep-dive into market data with visualizations." },
  { icon: Rocket, title: "Build a Product Landing Page", description: "Create a modern, responsive landing page." },
  { icon: GraduationCap, title: "Create Course Material", description: "Develop engaging educational content." },
  { icon: Globe, title: "Competitive Intelligence", description: "Research competitors and synthesize findings." },
  { icon: Star, title: "Automate Weekly Reports", description: "Set up automated report generation." },
];

const PACKAGES = [
  "browser", "computer", "document", "deck", "billing",
  "share", "replay", "scheduled", "webapp-builder",
  "client-inference", "desktop", "sync", "bridge",
];

export default function Home() {
  let { user, loading: _loading, error: _error, isAuthenticated } = useAuth();

  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      const stored = localStorage.getItem("manus-selected-model");
      if (stored) return stored;
    } catch {}
    return "manus-next-max";
  });
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const { createTask } = useTask();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Global ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!input.trim() && pendingFiles.length === 0) return;
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    const text = input.trim() || (pendingFiles.length > 0 ? `Work with ${pendingFiles.length} file(s): ${pendingFiles.map(f => f.name).join(", ")}` : "");
    const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
    const id = createTask(title, text);
    // Store pending files in sessionStorage so TaskView can pick them up and upload
    if (pendingFiles.length > 0) {
      // We can't pass File objects through sessionStorage, so we store a flag
      // and use a global transfer mechanism
      (window as any).__pendingTaskFiles = pendingFiles;
    }
    setInput("");
    setPendingFiles([]);
    navigate(`/task/${id}`);
  }, [input, pendingFiles, createTask, navigate, isAuthenticated]);

  // ── Clipboard paste handler — supports images, docs, media, any file type ──
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToAdd: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) filesToAdd.push(file);
      }
    }

    if (filesToAdd.length === 0) return; // No files — let normal text paste proceed
    e.preventDefault();

    // Rename generic clipboard filenames
    const renamed = filesToAdd.map(file => {
      if (file.name === "image.png" || file.name === "" || file.name === "blob") {
        const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        return new File([file], `pasted-${timestamp}.${ext}`, { type: file.type });
      }
      return file;
    });
    setPendingFiles(prev => [...prev, ...renamed]);
  }, []);

  // ── Drag-and-drop handlers ──
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragging(false); }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...Array.from(droppedFiles)]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    setPendingFiles(prev => [...prev, ...Array.from(fileList)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="h-full overflow-y-auto relative bg-background" role="region" aria-label="Home" tabIndex={-1}>
      {/* Top header bar — ModelSelector left, Credits right (Manus-style) */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-3 bg-background/80 backdrop-blur-sm">
        <ModelSelector
          selectedModelId={selectedModel}
          onModelChange={(modelId) => {
            setSelectedModel(modelId);
            try { localStorage.setItem("manus-selected-model", modelId); } catch {}
          }}
          compact
        />
        <button
          onClick={() => navigate("/billing")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          aria-label="View credits"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium">Credits</span>
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100%-60px)] px-4 md:px-6 py-8 md:py-12">
        {/* Greeting */}
        <motion.div
          className="text-center mb-10"
          initial={{ y: 16 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1
            className="text-3xl md:text-4xl font-semibold text-foreground mb-2 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {user ? `Hello, ${user.name?.split(" ")[0] || "there"}.` : "Hello."}
          </h1>
          <p className="text-sm text-muted-foreground">
            What can I do for you?
          </p>
        </motion.div>

        {/* Pill-shaped Input — Manus style */}
        <motion.div
          className="w-full max-w-[640px] mb-8"
          initial={{ y: 16 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.md,.py,.js,.ts,.html,.css,audio/*,video/*,.xlsx,.xls,.pptx,.ppt,.zip,.tar,.gz"
          />
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary/40 rounded-2xl backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-primary" />
                <span className="text-sm font-medium text-primary">Drop files here</span>
              </div>
            </div>
          )}
          {/* Pending files preview strip */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2 pt-1 max-w-[640px]">
              {pendingFiles.map((file, i) => {
                const isImage = file.type.startsWith("image/");
                const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
                const sizeKB = Math.round(file.size / 1024);
                const sizeLabel = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
                return (
                  <div key={`${file.name}-${i}`} className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-2 py-1 text-xs group">
                    {isImage ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-6 h-6 rounded object-cover"
                      />
                    ) : (
                      <FileIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                    <span className="text-foreground max-w-[100px] truncate text-[11px]">{file.name}</span>
                    <span className="text-muted-foreground text-[9px] shrink-0">{ext} · {sizeLabel}</span>
                    <button
                      onClick={() => removePendingFile(i)}
                      className="text-muted-foreground hover:text-foreground ml-0.5"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className={cn(
            "relative bg-card border border-border shadow-lg shadow-black/30 focus-within:border-foreground/20 transition-colors",
            pendingFiles.length > 0 ? "rounded-2xl" : "rounded-full"
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onPaste={handlePaste}
              placeholder="Give Manus Next a task to work on..."
              aria-label="Task input"
              rows={1}
              className={cn(
                "w-full resize-none bg-transparent pl-14 pr-24 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none text-[15px] leading-relaxed min-h-[48px] max-h-[120px]",
                pendingFiles.length > 0 ? "rounded-2xl" : "rounded-full"
              )}
            />
            {/* Left side: + button (PlusMenu trigger) */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <div className="relative">
                <button
                  ref={plusButtonRef}
                  onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="More options"
                  aria-label="More options"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <PlusMenu
                  open={plusMenuOpen}
                  onClose={() => setPlusMenuOpen(false)}
                  onAddFiles={() => {
                    fileInputRef.current?.click();
                  }}
                  onShareScreen={() => {
                    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                    const id = createTask("Screen share task", "Screen share session.");
                    navigate(`/task/${id}`);
                  }}
                  onRecordVideo={() => {
                    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                    const id = createTask("Video recording", "Record a video.");
                    navigate(`/task/${id}`);
                  }}
                  onUploadVideo={() => {
                    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                    const id = createTask("Video upload", "Upload a video.");
                    navigate(`/task/${id}`);
                  }}
                  onInjectPrompt={(prompt) => setInput(prompt)}
                  anchorRef={plusButtonRef}
                />
              </div>
            </div>
            {/* Right side: mic + send */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => {
                  if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                  const id = createTask("Voice task", "Voice task — use the microphone button to record.");
                  navigate(`/task/${id}`);
                }}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Voice input"
                aria-label="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={handleSubmit}
                disabled={!input.trim() && pendingFiles.length === 0}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  (input.trim() || pendingFiles.length > 0)
                    ? "bg-foreground text-background hover:opacity-80"
                    : "bg-muted text-muted-foreground"
                )}
                title="Submit task"
                aria-label="Submit task"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick Action Chips — horizontal scroll */}
        <motion.div
          className="w-full max-w-[640px] mb-10"
          initial={{ y: 8 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.prompt)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border bg-transparent text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all whitespace-nowrap shrink-0"
              >
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Suggestion Cards — horizontal scroll like Manus */}
        <motion.div
          className="w-full max-w-4xl"
          initial={{ y: 6 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none px-1">
            {SUGGESTIONS.map((suggestion, i) => (
              <motion.button
                key={suggestion.title}
                initial={{ y: 8 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                onClick={() => setInput(suggestion.title)}
                className="text-left p-4 bg-card border border-border rounded-xl hover:border-foreground/20 transition-all group shrink-0 w-[260px]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent transition-colors">
                    <suggestion.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {suggestion.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Package badges — subtle footer */}
        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-1.5 hidden md:flex"
          initial={{ y: 4 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <span className="text-[10px] text-muted-foreground mr-1.5 uppercase tracking-wider">Powered by</span>
          {PACKAGES.map((pkg) => (
            <span
              key={pkg}
              className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {pkg}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
