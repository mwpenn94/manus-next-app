/**
 * OnboardingTooltips — Lightweight first-time user onboarding
 *
 * Shows a sequence of floating tooltip-style hints that highlight key features.
 * Persists completion to localStorage so it only shows once.
 * Dismissible at any point. Non-blocking — user can interact with the app while tips show.
 *
 * VU-03 fix: Addresses the "no formal onboarding" finding from Virtual User Assessment.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles, MessageSquare, Zap, Brain, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "manus-onboarding-complete";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  position: "center" | "bottom-center";
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Manus",
    description: "Your autonomous AI agent that can research, build, design, and automate — all from a single prompt.",
    icon: Sparkles,
    position: "center",
  },
  {
    id: "prompt",
    title: "Start with a Task",
    description: "Type any task in the input below. Try \"Research the latest AI trends\" or \"Build me a landing page.\"",
    icon: MessageSquare,
    position: "bottom-center",
  },
  {
    id: "modes",
    title: "Choose Your Mode",
    description: "Speed for quick answers, Quality for thorough work, Max for complex projects, Limitless for recursive optimization until convergence.",
    icon: Zap,
    position: "center",
  },
  {
    id: "tools",
    title: "The Agent Uses Tools",
    description: "Watch as the agent searches the web, generates images, writes code, and creates documents — all autonomously.",
    icon: Brain,
    position: "center",
  },
  {
    id: "sidebar",
    title: "Explore the Sidebar",
    description: "Projects, Memory, Skills, Connectors, Analytics, and more. Each section extends what the agent can do for you.",
    icon: Layers,
    position: "center",
  },
];

export default function OnboardingTooltips() {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        // Small delay so the page renders first
        const timer = setTimeout(() => setVisible(true), 800);
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
    <AnimatePresence>
      {visible && (
        <>
          {/* Subtle backdrop — click to dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[1px]"
            onClick={dismiss}
          />

          {/* Tooltip card */}
          <motion.div
            key={step.id}
            role="dialog"
            aria-label={step.title}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn(
              "fixed z-[101] w-[340px] max-w-[90vw] bg-card border border-border rounded-xl shadow-2xl shadow-black/30 p-5",
              step.position === "center" && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              step.position === "bottom-center" && "bottom-32 left-1/2 -translate-x-1/2"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Dismiss onboarding"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-primary" />
            </div>

            {/* Content */}
            <h2 className="text-base font-semibold text-foreground mb-1.5">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      i === currentStep ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={dismiss}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                >
                  Skip
                </button>
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  {isLast ? "Get Started" : "Next"}
                  {!isLast && <ArrowRight className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
