/**
 * OnboardingTour — AI-guided platform orientation
 * 
 * Progressive onboarding that adapts to user behavior:
 * - First-time users see a full guided tour
 * - Returning users see contextual hints
 * - Tour state persists in localStorage + preferences
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, Sparkles, MessageSquare, Brain, Zap, Globe, Shield, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string; // CSS selector for highlight
  position?: "center" | "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Sovereign AI",
    description: "Your personal AI command center. Every capability you need — research, creation, analysis, automation — unified under one intelligent roof.",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
    position: "center",
  },
  {
    id: "conversation",
    title: "Start a Conversation",
    description: "The home screen is your conversational interface. Type any task — from writing documents to analyzing data — and Sovereign AI routes it to the best model automatically.",
    icon: <MessageSquare className="w-6 h-6 text-blue-400" />,
    position: "center",
  },
  {
    id: "sovereign-routing",
    title: "Sovereign Intelligence",
    description: "Behind every request, the Sovereign routing engine selects the optimal AI provider based on task type, cost, and performance. You get the best result without choosing a model.",
    icon: <Brain className="w-6 h-6 text-purple-400" />,
    position: "center",
  },
  {
    id: "capabilities",
    title: "Full Capability Suite",
    description: "Access 30+ capabilities from the Apps menu: Documents, Slides, Video, Music, Deep Research, Data Analysis, Browser Automation, Desktop Apps, and more.",
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    position: "center",
  },
  {
    id: "memory",
    title: "Persistent Memory",
    description: "Sovereign AI remembers your preferences, past interactions, and knowledge. The Memory system uses semantic embeddings to surface relevant context automatically.",
    icon: <Brain className="w-6 h-6 text-green-400" />,
    position: "center",
  },
  {
    id: "privacy",
    title: "Your Data, Your Control",
    description: "Full GDPR compliance with data export and deletion. The Aegis security layer monitors every operation. You own your data — always.",
    icon: <Shield className="w-6 h-6 text-red-400" />,
    position: "center",
  },
];

const TOUR_STORAGE_KEY = "sovereign-onboarding-complete";

export function OnboardingTour() {
  const { user, isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      // Show tour after a brief delay for first-time users
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsVisible(false);
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Tour Card */}
      <Card className="relative z-10 w-full max-w-md mx-4 bg-card border-border shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-300">
        <CardContent className="p-6">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-4">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  i === currentStep
                    ? "w-8 bg-primary"
                    : i < currentStep
                    ? "w-4 bg-primary/40"
                    : "w-4 bg-muted"
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            {step.icon}
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {isLast ? (
                  <>
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Contextual hint — shows inline tips for specific features
 */
export function ContextualHint({
  featureId,
  title,
  description,
  className,
}: {
  featureId: string;
  title: string;
  description: string;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `hint-dismissed-${featureId}`;
    if (localStorage.getItem(key)) setDismissed(true);
  }, [featureId]);

  const handleDismiss = () => {
    localStorage.setItem(`hint-dismissed-${featureId}`, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm",
        className
      )}
    >
      <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{description}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 rounded text-muted-foreground hover:text-foreground"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
