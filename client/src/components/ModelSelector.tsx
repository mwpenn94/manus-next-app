/**
 * ModelSelector — Manus-style model tier dropdown
 *
 * Matches the Manus UI pattern: dropdown with model name, description,
 * and checkmark on selected. Shown in task header or home page.
 *
 * Models: Sovereign Max (default), Sovereign Standard, Sovereign Lite
 */
import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Zap, Sparkles, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  icon: typeof Zap;
  tier: "max" | "standard" | "lite";
}

const MODELS: ModelOption[] = [
  {
    id: "sovereign-max",
    name: "Sovereign Max",
    description: "High-performance agent designed for complex tasks.",
    icon: Zap,
    tier: "max",
  },
  {
    id: "sovereign-standard",
    name: "Sovereign 1.0",
    description: "Versatile agent capable of handling most tasks.",
    icon: Sparkles,
    tier: "standard",
  },
  {
    id: "sovereign-lite",
    name: "Sovereign Lite",
    description: "A lightweight agent for everyday tasks.",
    icon: Leaf,
    tier: "lite",
  },
];

interface ModelSelectorProps {
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
  compact?: boolean;
}

export default function ModelSelector({
  selectedModelId = "sovereign-max",
  onModelChange,
  className,
  compact = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = MODELS.find((m) => m.id === selectedModelId) ?? MODELS[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg transition-colors",
          "text-foreground hover:text-foreground/80",
          compact
            ? "px-2 py-1 text-sm"
            : "px-3 py-1.5 text-sm font-medium"
        )}
      >
        <span className="truncate">{selectedModel.name}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-1 z-50 w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20 overflow-hidden"
          >
            <div className="py-1.5">
              {MODELS.map((model) => {
                const isSelected = model.id === selectedModelId;
                const Icon = model.icon;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange?.(model.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                      "hover:bg-accent/50",
                      isSelected && "bg-accent/30"
                    )}
                  >
                    {/* Checkmark column */}
                    <div className="w-5 h-5 mt-0.5 flex items-center justify-center shrink-0">
                      {isSelected ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {model.name}
                        </span>
                        {model.tier === "max" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium border border-primary/20">
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {model.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { MODELS };
