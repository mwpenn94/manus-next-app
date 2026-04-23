/**
 * PlusMenu — Manus-style "+" bottom sheet / popover
 *
 * Shows a categorized list of agent capabilities that can be invoked
 * from the chat input bar. On mobile, renders as a bottom drawer;
 * on desktop, renders as an anchored popover above the + button.
 *
 * All items are wired to real navigation or actions.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Camera,
  FileUp,
  Monitor,
  Puzzle,
  Globe,
  Presentation,
  ImageIcon,
  Paintbrush,
  Search,
  CalendarClock,
  Table2,
  Video,
  AudioLines,
  BookOpen,
  Sparkles,
  X,
  Image as ImageLucide,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ── Menu item definition ──

interface PlusMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  implemented?: boolean;
  route?: string;
  prompt?: string;
}

const MENU_ITEMS: PlusMenuItem[] = [
  { id: "add-files", label: "Add files", icon: FileUp, implemented: true },
  { id: "share-screen", label: "Share screen", icon: Monitor, implemented: true },
  { id: "record-video", label: "Record video", icon: Camera, implemented: true },
  { id: "upload-video", label: "Upload video", icon: Video, implemented: true },
  { id: "connect-computer", label: "Connect My Computer", icon: Monitor, implemented: true, route: "/connect-device" },
  { id: "add-skills", label: "Add Skills", icon: Puzzle, implemented: true, route: "/skills" },
  { id: "build-website", label: "Build website", icon: Globe, implemented: true, route: "/webapp-builder" },
  { id: "create-slides", label: "Create slides", icon: Presentation, badge: "Pro", implemented: true, prompt: "Create a slide deck about " },
  { id: "create-image", label: "Create image", icon: ImageIcon, implemented: true, prompt: "Generate an image of " },
  { id: "edit-image", label: "Edit image", icon: Paintbrush, implemented: true, prompt: "Edit this image: " },
  { id: "wide-research", label: "Wide Research", icon: Search, implemented: true, prompt: "Do wide research on " },
  { id: "scheduled-tasks", label: "Scheduled tasks", icon: CalendarClock, implemented: true, route: "/schedule" },
  { id: "create-spreadsheet", label: "Create spreadsheet", icon: Table2, implemented: true, prompt: "Create a spreadsheet for " },
  { id: "create-video", label: "Create video", icon: Video, implemented: true, route: "/video" },
  { id: "generate-audio", label: "Generate audio", icon: AudioLines, implemented: true, route: "/client-inference" },
  { id: "playbook", label: "Playbook", icon: BookOpen, implemented: true, route: "/library" },
];

// ── Component ──

interface PlusMenuProps {
  open: boolean;
  onClose: () => void;
  onAddFiles: () => void;
  onShareScreen?: () => void;
  onRecordVideo?: () => void;
  onUploadVideo?: () => void;
  onInjectPrompt?: (prompt: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export default function PlusMenu({
  open,
  onClose,
  onAddFiles,
  onShareScreen,
  onRecordVideo,
  onUploadVideo,
  onInjectPrompt,
  anchorRef,
  className,
}: PlusMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isMobile, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleItemClick = useCallback(
    (item: PlusMenuItem) => {
      if (item.id === "add-files") {
        onAddFiles();
        onClose();
        return;
      }
      if (item.id === "share-screen" && onShareScreen) {
        onShareScreen();
        onClose();
        return;
      }
      if (item.id === "record-video" && onRecordVideo) {
        onRecordVideo();
        onClose();
        return;
      }
      if (item.id === "upload-video" && onUploadVideo) {
        onUploadVideo();
        onClose();
        return;
      }
      if (item.route) {
        navigate(item.route);
        onClose();
        return;
      }
      if (item.prompt) {
        if (onInjectPrompt) {
          onInjectPrompt(item.prompt);
        } else {
          toast.info(`Type your request: "${item.prompt}..."`);
        }
        onClose();
        return;
      }
      onClose();
    },
    [onAddFiles, onShareScreen, onRecordVideo, onUploadVideo, onInjectPrompt, onClose, navigate]
  );

  if (!open) return null;

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={onClose}
            />
            <motion.div
              ref={menuRef}
              role="dialog"
              aria-label="Add content"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={cn(
                "fixed inset-x-0 bottom-0 z-50 max-h-[80vh] rounded-t-2xl bg-card border-t border-border overflow-hidden",
                className
              )}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <PhotosSection onAddFiles={onAddFiles} onClose={onClose} />
              <div className="overflow-y-auto max-h-[60vh] pb-safe">
                <FeatureList items={MENU_ITEMS} onItemClick={handleItemClick} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "absolute bottom-full left-0 mb-2 z-50 w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20 overflow-hidden",
            className
          )}
        >
          <PhotosSection compact onAddFiles={onAddFiles} onClose={onClose} />
          <div className="max-h-[50vh] overflow-y-auto">
            <FeatureList items={MENU_ITEMS} onItemClick={handleItemClick} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Photos Section ──

function PhotosSection({
  compact = false,
  onAddFiles,
  onClose,
}: {
  compact?: boolean;
  onAddFiles: () => void;
  onClose: () => void;
}) {
  return (
    <div className={cn("px-4", compact ? "py-2" : "py-3")}>
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Photos
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => { onAddFiles(); onClose(); }}
          className={cn(
            "rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center transition-colors hover:bg-muted hover:border-border",
            compact ? "w-12 h-12" : "w-14 h-14"
          )}
          aria-label="Take photo or upload image"
        >
          <Camera className="w-4 h-4 text-muted-foreground" />
        </button>
        {[1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => { onAddFiles(); onClose(); }}
            className={cn(
              "rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center transition-colors hover:bg-muted hover:border-border",
              compact ? "w-12 h-12" : "w-14 h-14"
            )}
            aria-label="Add image from library"
          >
            <ImageLucide className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Feature List ──

function FeatureList({
  items,
  onItemClick,
}: {
  items: PlusMenuItem[];
  onItemClick: (item: PlusMenuItem) => void;
}) {
  return (
    <div className="py-1">
      <div className="mx-4 border-t border-border/50 mb-1" />
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50 active:bg-accent/70"
          >
            <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-foreground flex-1">{item.label}</span>
            {item.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium border border-primary/20">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { MENU_ITEMS };
export type { PlusMenuItem };
