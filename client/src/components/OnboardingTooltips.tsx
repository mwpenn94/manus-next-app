/**
 * OnboardingTooltips — Manus-style multi-step welcome walkthrough
 *
 * Pass 7 upgrade:
 * - Contextual tooltips with progressive disclosure
 * - Onboarding completion tracking and progress persistence
 * - Keyboard navigation (Escape to dismiss, Arrow keys to navigate)
 * - Step progress bar instead of just dots
 * - Animated transitions between steps
 * - "Don't show again" option
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Sparkles, MessageSquare, Zap, Brain, Layers, Globe, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "manus-onboarding-complete";
const ONBOARDING_STEP_KEY = "manus-onboarding-step";
const ONBOARDING_HINTS_KEY = "manus-onboarding-hints-seen";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  hint?: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Manus",
    description: "Your autonomous AI agent that can research, build, design, and automate — all from a single prompt.",
    icon: Sparkles,
    hint: "Manus works like a skilled colleague: give it a task and it handles the rest.",
  },
  {
    id: "prompt",
    title: "Start with a Task",
    description: "Type any task in the input box. Try \"Research the latest AI trends\" or \"Build me a landing page\" — the agent handles the rest.",
    icon: MessageSquare,
    hint: "Pro tip: Be specific about what you want. The more detail you give, the better the result.",
  },
  {
    id: "modes",
    title: "Choose Your Mode",
    description: "Lite for quick answers, Standard for thorough work, Max for complex multi-step projects, Limitless for recursive optimization until convergence.",
    icon: Zap,
    hint: "Start with Standard mode — you can always switch mid-task if you need more power.",
  },
  {
    id: "tools",
    title: "Watch the Agent Work",
    description: "The agent searches the web, generates images, writes code, creates documents, and builds apps — all autonomously. You'll see each step in real time.",
    icon: Brain,
    hint: "You can pause or stop the agent at any time if you want to redirect its approach.",
  },
  {
    id: "sidebar",
    title: "Explore the Sidebar",
    description: "Projects, Memory, Skills, Connectors, Analytics, Schedules, and more. Each section extends what the agent can do for you.",
    icon: Layers,
    hint: "The Memory section lets the agent remember context across tasks — try adding key facts about your work.",
  },
  {
    id: "build",
    title: "Build & Publish Apps",
    description: "Use the Web App Builder to create full-stack applications. Preview live, manage settings, and publish to your own domain — all from within Manus.",
    icon: Globe,
    hint: "You can iterate on apps by chatting with the agent — no coding required.",
  },
];

export default function OnboardingTooltips() {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const dialogRef = useRef<HTMLDivElement>(null);

  // Restore progress from localStorage
  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        // Restore last step if user left mid-walkthrough
        const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY);
        if (savedStep) {
          const step = parseInt(savedStep, 10);
          if (step >= 0 && step < STEPS.length) {
            setCurrentStep(step);
          }
        }
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable — skip onboarding
    }
  }, []);

  // Persist current step
  useEffect(() => {
    if (visible) {
      try {
        localStorage.setItem(ONBOARDING_STEP_KEY, String(currentStep));
      } catch {}
    }
  }, [currentStep, visible]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" && currentStep > 0) {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, currentStep]);

  // Focus trap
  useEffect(() => {
    if (visible && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [visible, currentStep]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
      localStorage.removeItem(ONBOARDING_STEP_KEY);
    } catch {}
  }, []);

  const next = useCallback(() => {
    setShowHint(false);
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [currentStep, dismiss]);

  const prev = useCallback(() => {
    setShowHint(false);
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((i: number) => {
    setShowHint(false);
    setDirection(i > currentStep ? 1 : -1);
    setCurrentStep(i);
  }, [currentStep]);

  if (!visible) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <aside aria-label="Onboarding walkthrough">
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px]"
            onClick={dismiss}
          />

          {/* Modal card */}
          <motion.div
            ref={dialogRef}
            key={step.id}
            role="dialog"
            aria-label={step.title}
            aria-describedby={`onboarding-desc-${step.id}`}
            tabIndex={-1}
            initial={{ opacity: 0, x: direction * 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -40, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-w-[92vw] bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 overflow-hidden outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: `${((currentStep) / STEPS.length) * 100}%` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            <div className="p-6">
              {/* Header: step counter + close */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
                <button
                  onClick={dismiss}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Close onboarding"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>

              {/* Title */}
              <h2 className="text-lg font-semibold text-foreground mb-2 tracking-tight">
                {step.title}
              </h2>

              {/* Description */}
              <p id={`onboarding-desc-${step.id}`} className="text-sm text-muted-foreground leading-relaxed mb-3">
                {step.description}
              </p>

              {/* Contextual hint — progressive disclosure */}
              {step.hint && (
                <div className="mb-4">
                  {!showHint ? (
                    <button
                      onClick={() => setShowHint(true)}
                      className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      💡 Show tip
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.2 }}
                      className="bg-primary/5 border border-primary/10 rounded-lg px-3 py-2"
                    >
                      <p className="text-xs text-primary/80 leading-relaxed">
                        {step.hint}
                      </p>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Footer: dots left, buttons right */}
              <div className="flex items-center justify-between pt-2">
                {/* Dot pagination */}
                <div className="flex items-center gap-2">
                  {STEPS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => goToStep(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-200",
                        i === currentStep
                          ? "bg-primary scale-125"
                          : i < currentStep
                            ? "bg-primary/40"
                            : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      )}
                      aria-label={`Go to step ${i + 1}: ${s.title}`}
                    />
                  ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={dismiss}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                  >
                    Skip
                  </button>
                  {!isFirst && (
                    <button
                      onClick={prev}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-1.5 text-sm font-medium bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    {isLast ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Get Started
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Keyboard hint */}
              <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
                Use ← → arrow keys to navigate, Esc to dismiss
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </aside>
  );
}

// ── Contextual Page Hints ──

const PAGE_HINTS: Record<string, { title: string; message: string }> = {
  "/task": { title: "Task View", message: "Type your message below to chat with the agent. Use the workspace tabs to see generated artifacts." },
  "/library": { title: "Library", message: "Your saved artifacts, files, and exports appear here. Use search to find specific items." },
  "/settings": { title: "Settings", message: "Customize your experience: profile, system prompt, capabilities, billing, and more." },
  "/projects": { title: "Projects", message: "Organize related tasks into projects. Each project maintains its own context and knowledge base." },
  "/memory": { title: "Memory", message: "The agent remembers facts you add here across all tasks. Add key context about your work." },
  "/skills": { title: "Skills", message: "Skills extend what the agent can do. Browse and enable skills to unlock new capabilities." },
  "/schedule": { title: "Schedules", message: "Set up recurring tasks that run automatically on a schedule — like a cron job for AI." },
  "/analytics": { title: "Analytics", message: "Track your usage, task completion rates, and agent performance over time." },
};

/**
 * usePageHint — shows a contextual tooltip on first visit to key pages.
 * Returns { hint, dismissHint } — render the hint if non-null.
 */
export function usePageHint(pathname: string) {
  const [hint, setHint] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    try {
      const seenHints: string[] = JSON.parse(localStorage.getItem(ONBOARDING_HINTS_KEY) || "[]");
      const matchedPath = Object.keys(PAGE_HINTS).find(p => pathname.startsWith(p));
      if (matchedPath && !seenHints.includes(matchedPath)) {
        const timer = setTimeout(() => {
          setHint(PAGE_HINTS[matchedPath]);
          // Mark as seen
          seenHints.push(matchedPath);
          localStorage.setItem(ONBOARDING_HINTS_KEY, JSON.stringify(seenHints));
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [pathname]);

  const dismissHint = useCallback(() => setHint(null), []);

  return { hint, dismissHint };
}

/**
 * PageHintBanner — renders a dismissible contextual hint banner.
 * Use in page components: const { hint, dismissHint } = usePageHint(pathname);
 */
export function PageHintBanner({ hint, onDismiss }: { hint: { title: string; message: string }; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="bg-primary/5 border border-primary/15 rounded-lg px-4 py-3 mb-4 flex items-start gap-3"
    >
      <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{hint.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Dismiss hint"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
