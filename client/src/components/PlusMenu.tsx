/**
 * PlusMenu — Manus-style "+" bottom sheet / popover
 *
 * Shows a categorized list of agent capabilities that can be invoked
 * from the chat input bar. On mobile, renders as a bottom drawer;
 * on desktop, renders as an anchored popover above the + button.
 *
 * Items that are not yet implemented show a "Feature coming soon" toast.
 * "Add files" triggers the parent's file picker.
 *
 * Matches the Manus UI pattern from screenshots IMG_6903-6913:
 * - Photos section at top (camera icon + recent images grid)
 * - Feature list with icons, labels, and optional badges
 */
import { useCallback, useEffect, useRef, useState } from "react";
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
  /** If true, this item has real functionality wired up */
  implemented?: boolean;
}

const MENU_ITEMS: PlusMenuItem[] = [
  { id: "add-files", label: "Add files", icon: FileUp, implemented: true },
  { id: "share-screen", label: "Share screen", icon: Monitor, implemented: true },
  { id: "record-video", label: "Record video", icon: Camera, implemented: true },
  { id: "upload-video", label: "Upload video", icon: Video, implemented: true },
  { id: "connect-computer", label: "Connect My Computer", icon: Monitor },
  { id: "add-skills", label: "Add Skills", icon: Puzzle },
  { id: "build-website", label: "Build website", icon: Globe },
  { id: "create-slides", label: "Create slides", icon: Presentation, badge: "Pro" },
  { id: "create-image", label: "Create image", icon: ImageIcon },
  { id: "edit-image", label: "Edit image", icon: Paintbrush },
  { id: "wide-research", label: "Wide Research", icon: Search },
  { id: "scheduled-tasks", label: "Scheduled tasks", icon: CalendarClock },
  { id: "create-spreadsheet", label: "Create spreadsheet", icon: Table2 },
  { id: "create-video", label: "Create video", icon: Video },
  { id: "generate-audio", label: "Generate audio", icon: AudioLines },
  { id: "playbook", label: "Playbook", icon: BookOpen },
];

// ── Component ──

interface PlusMenuProps {
  open: boolean;
  onClose: () => void;
  /** Called when "Add files" is selected — parent should open file picker */
  onAddFiles: () => void;
  /** Called when "Share screen" is selected */
  onShareScreen?: () => void;
  /** Called when "Record video" is selected */
  onRecordVideo?: () => void;
  /** Called when "Upload video" is selected */
  onUploadVideo?: () => void;
  /** Anchor element ref for desktop popover positioning */
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
  anchorRef,
  className,
}: PlusMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close on outside click (desktop popover)
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

  // Close on Escape
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
      // Not implemented — show toast
      toast.info(`${item.label} — Feature coming soon`);
      onClose();
    },
    [onAddFiles, onShareScreen, onRecordVideo, onUploadVideo, onClose]
  );

  if (!open) return null;

  // ── Mobile: bottom drawer ──
  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={onClose}
            />
            {/* Drawer */}
            <motion.div
              ref={menuRef}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={cn(
                "fixed inset-x-0 bottom-0 z-50 max-h-[80vh] rounded-t-2xl bg-card border-t border-border overflow-hidden",
                className
              )}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Photos section */}
              <PhotosSection />

              {/* Scrollable feature list */}
              <div className="overflow-y-auto max-h-[60vh] pb-safe">
                <FeatureList items={MENU_ITEMS} onItemClick={handleItemClick} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // ── Desktop: popover above the + button ──
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
          {/* Photos section */}
          <PhotosSection compact />

          {/* Feature list */}
          <div className="max-h-[50vh] overflow-y-auto">
            <FeatureList items={MENU_ITEMS} onItemClick={handleItemClick} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Photos Section ──

function PhotosSection({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("px-4", compact ? "py-2" : "py-3")}>
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Photos
        </span>
      </div>
      {/* Placeholder grid for recent images */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => toast.info("Photo library — Feature coming soon")}
            className={cn(
              "rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center transition-colors hover:bg-muted hover:border-border",
              compact ? "w-12 h-12" : "w-14 h-14"
            )}
          >
            {i === 0 ? (
              <Camera className="w-4 h-4 text-muted-foreground/60" />
            ) : (
              <ImageLucide className="w-4 h-4 text-muted-foreground/30" />
            )}
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
      {/* Separator */}
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
              <Icon className="w-4 h-4 text-foreground/70" />
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
