/**
 * SpecializedInputBar — iOS-style inline input bars for PlusMenu actions
 *
 * When a user selects a "Create" action from the PlusMenu, instead of just
 * injecting a prompt string, this component provides a specialized inline
 * input bar with context-specific fields and controls.
 *
 * Renders above the main textarea as a compact, dismissible bar with:
 * - Action-specific icon and label
 * - Specialized input fields (URL, topic, style, etc.)
 * - Quick-action chips for common options
 * - Submit button that composes the full prompt
 *
 * Inspired by iOS keyboard accessory views and Manus's guided input patterns.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Globe,
  Presentation,
  ImageIcon,
  Paintbrush,
  Table2,
  Video,
  AudioLines,
  Search,
  X,
  ArrowUp,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──

export type SpecializedMode =
  | "build-website"
  | "create-slides"
  | "create-image"
  | "edit-image"
  | "create-spreadsheet"
  | "create-video"
  | "generate-audio"
  | "wide-research"
  | null;

interface SpecializedInputBarProps {
  mode: SpecializedMode;
  onClose: () => void;
  onSubmit: (composedPrompt: string) => void;
  className?: string;
}

// ── Mode configurations ──

interface ModeConfig {
  icon: React.ElementType;
  label: string;
  placeholder: string;
  chips: string[];
  secondaryField?: {
    placeholder: string;
    chips: string[];
  };
}

const MODE_CONFIGS: Record<NonNullable<SpecializedMode>, ModeConfig> = {
  "build-website": {
    icon: Globe,
    label: "Build Website",
    placeholder: "Describe your website or paste a URL for reference...",
    chips: ["Landing page", "Portfolio", "Dashboard", "E-commerce", "Blog"],
    secondaryField: {
      placeholder: "Framework preference (optional)",
      chips: ["React", "Next.js", "Static HTML", "Any"],
    },
  },
  "create-slides": {
    icon: Presentation,
    label: "Create Slides",
    placeholder: "What's the presentation about?",
    chips: ["Business pitch", "Technical talk", "Education", "Report", "Proposal"],
    secondaryField: {
      placeholder: "Number of slides (optional)",
      chips: ["5 slides", "10 slides", "15 slides", "20 slides"],
    },
  },
  "create-image": {
    icon: ImageIcon,
    label: "Create Image",
    placeholder: "Describe the image you want to create...",
    chips: ["Photorealistic", "Illustration", "Logo", "Icon", "Abstract"],
    secondaryField: {
      placeholder: "Style or aspect ratio (optional)",
      chips: ["16:9", "1:1", "9:16", "4:3"],
    },
  },
  "edit-image": {
    icon: Paintbrush,
    label: "Edit Image",
    placeholder: "Describe the edit you want to make...",
    chips: ["Remove background", "Upscale", "Change style", "Add text", "Recolor"],
  },
  "create-spreadsheet": {
    icon: Table2,
    label: "Create Spreadsheet",
    placeholder: "What data should the spreadsheet contain?",
    chips: ["Budget tracker", "Project plan", "Inventory", "Schedule", "Analytics"],
  },
  "create-video": {
    icon: Video,
    label: "Create Video",
    placeholder: "Describe the video you want to create...",
    chips: ["Explainer", "Product demo", "Social media", "Tutorial", "Promo"],
    secondaryField: {
      placeholder: "Duration (optional)",
      chips: ["15s", "30s", "60s", "2min"],
    },
  },
  "generate-audio": {
    icon: AudioLines,
    label: "Generate Audio",
    placeholder: "Describe the audio you want...",
    chips: ["Background music", "Sound effect", "Podcast intro", "Narration", "Jingle"],
  },
  "wide-research": {
    icon: Search,
    label: "Wide Research",
    placeholder: "What topic should I research in depth?",
    chips: ["Market analysis", "Competitor review", "Technical deep-dive", "Literature review", "Trend report"],
  },
};

// ── Component ──

export default function SpecializedInputBar({
  mode,
  onClose,
  onSubmit,
  className,
}: SpecializedInputBarProps) {
  const [primaryValue, setPrimaryValue] = useState("");
  const [secondaryValue, setSecondaryValue] = useState("");
  const primaryRef = useRef<HTMLInputElement>(null);

  // Focus primary input when mode opens
  useEffect(() => {
    if (mode) {
      setPrimaryValue("");
      setSecondaryValue("");
      setTimeout(() => primaryRef.current?.focus(), 100);
    }
  }, [mode]);

  const handleSubmit = useCallback(() => {
    if (!mode || !primaryValue.trim()) return;
    const config = MODE_CONFIGS[mode];
    let prompt = "";

    switch (mode) {
      case "build-website":
        prompt = `Build a website: ${primaryValue.trim()}`;
        if (secondaryValue) prompt += ` (Framework: ${secondaryValue})`;
        break;
      case "create-slides":
        prompt = `Create a slide deck about ${primaryValue.trim()}`;
        if (secondaryValue) prompt += ` — ${secondaryValue}`;
        break;
      case "create-image":
        prompt = `Generate an image: ${primaryValue.trim()}`;
        if (secondaryValue) prompt += ` (Style/ratio: ${secondaryValue})`;
        break;
      case "edit-image":
        prompt = `Edit this image: ${primaryValue.trim()}`;
        break;
      case "create-spreadsheet":
        prompt = `Create a spreadsheet for ${primaryValue.trim()}`;
        break;
      case "create-video":
        prompt = `Create a video: ${primaryValue.trim()}`;
        if (secondaryValue) prompt += ` (Duration: ${secondaryValue})`;
        break;
      case "generate-audio":
        prompt = `Generate audio: ${primaryValue.trim()}`;
        break;
      case "wide-research":
        prompt = `Do wide research on ${primaryValue.trim()}`;
        break;
      default:
        prompt = primaryValue.trim();
    }

    onSubmit(prompt);
    onClose();
  }, [mode, primaryValue, secondaryValue, onSubmit, onClose]);

  const handleChipClick = (chip: string, isSecondary: boolean) => {
    if (isSecondary) {
      setSecondaryValue(chip);
    } else {
      // Append chip as context to primary value
      setPrimaryValue((prev) => {
        if (prev.trim()) return prev;
        return chip + ": ";
      });
    }
  };

  if (!mode) return null;

  const config = MODE_CONFIGS[mode];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "overflow-hidden border-b border-border bg-card/80 backdrop-blur-sm",
          className
        )}
      >
        {/* Header: mode label + close */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">{config.label}</span>
            <Sparkles className="w-3 h-3 text-primary/60" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close specialized input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary input */}
        <div className="px-3 pb-1">
          <div className="flex items-center gap-2">
            <input
              ref={primaryRef}
              type="text"
              value={primaryValue}
              onChange={(e) => setPrimaryValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
                if (e.key === "Escape") onClose();
              }}
              placeholder={config.placeholder}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-1.5"
            />
            <button
              onClick={handleSubmit}
              disabled={!primaryValue.trim()}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0",
                primaryValue.trim()
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground"
              )}
              aria-label="Submit"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary chips */}
        <div className="px-3 pb-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {config.chips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip, false)}
              className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Secondary field (optional) */}
        {config.secondaryField && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <Wand2 className="w-3 h-3 text-muted-foreground shrink-0" />
              {config.secondaryField.chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip, true)}
                  className={cn(
                    "shrink-0 text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap",
                    secondaryValue === chip
                      ? "border-primary/50 bg-primary/10 text-primary font-medium"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
