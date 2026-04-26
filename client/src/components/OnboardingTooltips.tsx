/**
 * OnboardingTooltips — Manus-style multi-step welcome walkthrough
 *
 * Matches the Manus desktop video exactly:
 * - Centered modal with sparkle icon
 * - "Welcome to Manus" title with description
 * - Dot pagination at bottom-left
 * - Skip / Next → buttons at bottom-right
 * - 6 steps covering key features
 * - Persists completion to localStorage
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles, MessageSquare, Zap, Brain, Layers, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "manus-onboarding-complete";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Manus",
    description: "Your autonomous AI agent that can research, build, design, and automate — all from a single prompt.",
    icon: Sparkles,
  },
  {
    id: "prompt",
    title: "Start with a Task",
    description: "Type any task in the input box. Try \"Research the latest AI trends\" or \"Build me a landing page\" — the agent handles the rest.",
    icon: MessageSquare,
  },
  {
    id: "modes",
    title: "Choose Your Mode",
    description: "Speed for quick answers, Quality for thorough work, Max for complex multi-step projects, Limitless for recursive optimization until convergence.",
    icon: Zap,
  },
  {
    id: "tools",
    title: "Watch the Agent Work",
    description: "The agent searches the web, generates images, writes code, creates documents, and builds apps — all autonomously. You'll see each step in real time.",
    icon: Brain,
  },
  {
    id: "sidebar",
    title: "Explore the Sidebar",
    description: "Projects, Memory, Skills, Connectors, Analytics, Schedules, and more. Each section extends what the agent can do for you.",
    icon: Layers,
  },
  {
    id: "build",
    title: "Build & Publish Apps",
    description: "Use the Web App Builder to create full-stack applications. Preview live, manage settings, and publish to your own domain — all from within Manus.",
    icon: Globe,
  },
];

export default function OnboardingTooltips() {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable — skip onboarding
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {}
  }, []);

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [currentStep, dismiss]);

  if (!visible) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === STEPS.length - 1;

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

          {/* Modal card — matches Manus video exactly */}
          <motion.div
            key={step.id}
            role="dialog"
            aria-label={step.title}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] max-w-[92vw] bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon — sparkle in rounded square, matching Manus */}
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <Icon className="w-5.5 h-5.5 text-primary" />
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold text-foreground mb-2 tracking-tight">
              {step.title}
            </h2>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Footer: dots left, buttons right */}
            <div className="flex items-center justify-between">
              {/* Dot pagination */}
              <div className="flex items-center gap-2">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      i === currentStep
                        ? "bg-foreground scale-110"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>

              {/* Skip / Next */}
              <div className="flex items-center gap-3">
                <button
                  onClick={dismiss}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 text-sm font-medium bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  {isLast ? "Get Started" : "Next"}
                  {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </aside>
  );
}
