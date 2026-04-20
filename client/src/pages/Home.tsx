/**
 * Home — "Warm Void" Manus-Authentic Home Screen
 * 
 * Convergence Pass 2: Refined greeting animation, auto-resize textarea,
 * keyboard shortcut hint, smoother category transitions, package badge strip.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation, Link } from "wouter";
import { useTask } from "@/contexts/TaskContext";
import {
  Paperclip,
  ArrowUp,
  Globe,
  Heart,
  BarChart3,
  GraduationCap,
  Rocket,
  Star,
  Mic,
  Plug,
  Code,
  Presentation,
  FileText,
  Image,
  Search as SearchIcon,
  Camera,
  Terminal,
} from "lucide-react";

// Quick action chips (Gap 7) — like Manus "Create slides", "Build website", etc.
const QUICK_ACTIONS = [
  { label: "Build a website", icon: Code, prompt: "Build a modern, responsive website" },
  { label: "Create slides", icon: Presentation, prompt: "Create a professional slide deck" },
  { label: "Write a document", icon: FileText, prompt: "Write a well-structured document" },
  { label: "Generate images", icon: Image, prompt: "Generate high-quality images" },
  { label: "Research a topic", icon: SearchIcon, prompt: "Research and summarize" },
];

// Connector quick-access (Gap 6)
const QUICK_CONNECTORS = [
  { id: "github", name: "GitHub", icon: "🐙" },
  { id: "google-drive", name: "Google Drive", icon: "📁" },
  { id: "slack", name: "Slack", icon: "💬" },
  { id: "notion", name: "Notion", icon: "📝" },
];
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663357378777/mLRoMfUBgPHZe3zeGnUGcR/hero-home-bg-mjLUBLDwZfsU6RgsHAiXRQ.webp";
const AGENT_ILLUSTRATION = "https://d2xsxph8kpxj0f.cloudfront.net/310519663357378777/mLRoMfUBgPHZe3zeGnUGcR/hero-agent-illustration-5xgBeUwbPzjG2QnkwaT4cS.webp";

const CATEGORIES = [
  { id: "featured", label: "Featured", icon: Star },
  { id: "research", label: "Research", icon: Globe },
  { id: "life", label: "Life", icon: Heart },
  { id: "data", label: "Data Analysis", icon: BarChart3 },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "productivity", label: "Productivity", icon: Rocket },
];

interface SuggestionCard {
  icon: typeof Globe;
  title: string;
  description: string;
  category: string;
}

const SUGGESTIONS: SuggestionCard[] = [
  { icon: Globe, title: "Research AI Agent Architectures", description: "Analyze and compare leading AI agent frameworks with detailed technical breakdowns.", category: "featured" },
  { icon: BarChart3, title: "Analyze Market Trends", description: "Deep-dive into market data with visualizations and actionable insights.", category: "featured" },
  { icon: Rocket, title: "Build a Product Landing Page", description: "Create a modern, responsive landing page with compelling copy and design.", category: "featured" },
  { icon: GraduationCap, title: "Create Interactive Course Material", description: "Develop engaging educational content with quizzes and visual aids.", category: "featured" },
  { icon: Globe, title: "Competitive Intelligence Report", description: "Research competitors and synthesize findings into a strategic report.", category: "research" },
  { icon: Globe, title: "Academic Literature Review", description: "Survey recent papers on a topic and produce an annotated bibliography.", category: "research" },
  { icon: Heart, title: "Plan a Trip to Japan", description: "Create a comprehensive travel itinerary with bookings and local tips.", category: "life" },
  { icon: Heart, title: "Weekly Meal Prep Plan", description: "Design a balanced meal plan with shopping list and prep instructions.", category: "life" },
  { icon: BarChart3, title: "Visualize Sales Performance", description: "Transform raw sales data into interactive charts and dashboards.", category: "data" },
  { icon: BarChart3, title: "Customer Cohort Analysis", description: "Segment users by behavior and visualize retention over time.", category: "data" },
  { icon: GraduationCap, title: "Explain Quantum Computing", description: "Break down complex quantum concepts into digestible learning modules.", category: "education" },
  { icon: GraduationCap, title: "Create Flashcard Deck", description: "Generate spaced-repetition flashcards from any study material.", category: "education" },
  { icon: Rocket, title: "Automate Weekly Reports", description: "Set up automated data collection and report generation workflows.", category: "productivity" },
  { icon: Rocket, title: "Draft a Project Proposal", description: "Structure a persuasive project proposal with timeline and budget.", category: "productivity" },
];

const PACKAGES = [
  "browser", "computer", "document", "deck", "billing",
  "share", "replay", "scheduled", "webapp-builder",
  "client-inference", "desktop", "sync", "bridge",
];

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading: _loading, error: _error, isAuthenticated, logout } = useAuth();

  const [input, setInput] = useState("");
  const [activeCategory, setActiveCategory] = useState("featured");
  const [, navigate] = useLocation();
  const { createTask } = useTask();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Global ⌘K shortcut to focus input
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

  const filteredSuggestions = SUGGESTIONS.filter(
    (s) => activeCategory === "featured" ? s.category === "featured" : s.category === activeCategory
  ).slice(0, 4);

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    if (!isAuthenticated) {
      // Redirect to login — task creation requires authentication
      window.location.href = getLoginUrl();
      return;
    }
    const title = input.length > 50 ? input.slice(0, 50) + "..." : input;
    const id = createTask(title, input);
    setInput("");
    navigate(`/task/${id}`);
  }, [input, createTask, navigate, isAuthenticated]);

  return (
    <div className="h-full overflow-y-auto relative" role="region" aria-label="Home">
      {/* Subtle background image */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-4 md:px-6 py-8 md:py-12">
        {/* Agent illustration */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <img
            src={AGENT_ILLUSTRATION}
            alt=""
            className="w-14 h-14 rounded-xl opacity-50"
          />
        </motion.div>

        {/* Greeting */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <h1
            className="text-3xl md:text-[2.5rem] font-semibold text-foreground mb-2 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Hello.
          </h1>
          <p className="text-base text-muted-foreground">
            What can I do for you?
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          className="w-full max-w-[640px] mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          <div className="relative bg-card border border-border rounded-xl shadow-lg shadow-black/20 focus-within:border-primary/30 transition-colors">
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
              placeholder="Give Manus Next a task to work on..."
              aria-label="Task input"
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-4 pb-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0 rounded-xl text-[15px] leading-relaxed min-h-[56px]"
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                    const title = "File upload task";
                    const id = createTask(title, "I'd like to upload and work with some files.");
                    navigate(`/task/${id}`);
                  }}
                  className="p-2 md:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  title="Attach file — creates a new task"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => {
                    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                    const title = "Voice task";
                    const id = createTask(title, "Voice task — use the microphone button to record.");
                    navigate(`/task/${id}`);
                  }}
                  className="p-2 md:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  title="Voice input — creates a new task with voice recording"
                  aria-label="Voice input"
                >
                  <Mic className="w-4 h-4" aria-hidden="true" />  
                </button>
                <button
                  onClick={() => {
                    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                    const id = createTask("Screenshot task", "I'd like to capture or analyze a screenshot.");
                    navigate(`/task/${id}`);
                  }}
                  className="p-2 md:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  title="Screenshot / Camera"
                  aria-label="Screenshot or camera input"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => {
                    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                    const id = createTask("Code task", "I'd like to write or analyze code.");
                    navigate(`/task/${id}`);
                  }}
                  className="p-2 md:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  title="Code / Terminal"
                  aria-label="Code or terminal input"
                >
                  <Terminal className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  input.trim()
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
                title="Submit task"
                aria-label="Submit task"
              >
                <ArrowUp className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Connect your tools — matches Manus "Connect your tools to Manus" row */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Plug className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground/60">Connect your tools to Manus Next</span>
          <div className="flex items-center gap-1 ml-1">
            {QUICK_CONNECTORS.map((c) => (
              <span
                key={c.id}
                className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                title={c.name}
              >
                {c.icon}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          className="flex items-center gap-2 mb-6 flex-wrap justify-center"
          role="tablist"
          aria-label="Task categories"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 md:py-1.5 rounded-full text-sm transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              )}
            >
              <cat.icon className="w-3.5 h-3.5" aria-hidden="true" />
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* Suggestion Cards */}
        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="sync">
            {filteredSuggestions.map((suggestion, i) => (
              <motion.button
                key={`${activeCategory}-${suggestion.title}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                onClick={() => setInput(suggestion.title)}
                className="text-left p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <suggestion.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-tight">
                      {suggestion.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Quick Action Chips — Gap 7 */}
        <motion.div
          className="w-full max-w-[640px] mt-6 mb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95"
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Connector Quick-Access — Gap 6 */}
        <motion.div
          className="w-full max-w-[640px] mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Connect</span>
            {QUICK_CONNECTORS.map((connector) => (
              <Link
                key={connector.id}
                href="/connectors"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 border border-border/40 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                title={`Connect ${connector.name}`}
              >
                <span className="text-xs">{connector.icon}</span>
                {connector.name}
              </Link>
            ))}
            <Link
              href="/connectors"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-primary hover:bg-primary/5 transition-colors"
            >
              <Plug className="w-3 h-3" />
              All
            </Link>
          </div>
        </motion.div>

        {/* Package badges — hidden on mobile for cleaner experience */}
        <motion.div
          className="mt-4 md:mt-8 flex flex-wrap items-center justify-center gap-1.5 hidden md:flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <span className="text-[10px] text-muted-foreground/60 mr-1.5 uppercase tracking-wider">Powered by</span>
          {PACKAGES.map((pkg) => (
            <span
              key={pkg}
              className="text-[9px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground/60 border border-border/50"
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
