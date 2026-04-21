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
  const [selectedModel, setSelectedModel] = useState("sovereign-max");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const { createTask } = useTask();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

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
    if (!input.trim()) return;
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    const title = input.length > 50 ? input.slice(0, 50) + "..." : input;
    const id = createTask(title, input);
    setInput("");
    navigate(`/task/${id}`);
  }, [input, createTask, navigate, isAuthenticated]);

  return (
    <div className="h-full overflow-y-auto relative bg-background" role="region" aria-label="Home">
      {/* Top header bar — ModelSelector left, Credits right (Manus-style) */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-3 bg-background/80 backdrop-blur-sm">
        <ModelSelector
          selectedModelId={selectedModel}
          onModelChange={setSelectedModel}
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1
            className="text-3xl md:text-4xl font-medium text-foreground mb-2 tracking-tight"
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <div className="relative bg-card border border-border rounded-full shadow-lg shadow-black/30 focus-within:border-foreground/20 transition-colors">
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
              placeholder="Assign a task or ask anything"
              aria-label="Task input"
              rows={1}
              className="w-full resize-none bg-transparent pl-14 pr-24 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none text-[15px] leading-relaxed min-h-[48px] max-h-[120px] rounded-full"
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
                    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                    const id = createTask("File upload task", "I'd like to upload and work with some files.");
                    navigate(`/task/${id}`);
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
                disabled={!input.trim()}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  input.trim()
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none px-1">
            {SUGGESTIONS.map((suggestion, i) => (
              <motion.button
                key={suggestion.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <span className="text-[10px] text-muted-foreground mr-1.5 uppercase tracking-wider">Powered by</span>
          {PACKAGES.map((pkg) => (
            <span
              key={pkg}
              className="text-[9px] px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground border border-border/30"
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
