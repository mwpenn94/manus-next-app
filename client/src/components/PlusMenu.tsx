/**
 * PlusMenu — Manus-style "+" bottom sheet / popover
 *
 * Shows a categorized list of agent capabilities that can be invoked
 * from the chat input bar. On mobile, renders as a bottom drawer;
 * on desktop, renders as an anchored popover above the + button.
 *
 * Uses React Portal to render into document.body, bypassing any
 * overflow:hidden or transform ancestors that would clip the menu.
 *
 * Organized into sections: Media, Create, Tools, Connectors
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  X,
  Image as ImageLucide,
  GitBranch,
  Plug,
  Workflow,
  Wrench,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ── Menu item definition ──

interface PlusMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  implemented?: boolean;
  route?: string;
  prompt?: string;
  section: "media" | "create" | "tools" | "connectors";
}

const MENU_ITEMS: PlusMenuItem[] = [
  // Media
  { id: "add-files", label: "Add files", icon: FileUp, implemented: true, section: "media" },
  { id: "share-screen", label: "Share screen", icon: Monitor, implemented: true, section: "media" },
  { id: "record-video", label: "Record video", icon: Camera, implemented: true, section: "media" },
  { id: "upload-video", label: "Upload video", icon: Video, implemented: true, section: "media" },
  // Create
  { id: "build-website", label: "Build website", icon: Globe, implemented: true, prompt: "Build a website for ", section: "create" },
  { id: "create-slides", label: "Create slides", icon: Presentation, badge: "Pro", implemented: true, prompt: "Create a slide deck about ", section: "create" },
  { id: "create-image", label: "Create image", icon: ImageIcon, implemented: true, prompt: "Generate an image of ", section: "create" },
  { id: "edit-image", label: "Edit image", icon: Paintbrush, implemented: true, prompt: "Edit this image: ", section: "create" },
  { id: "create-spreadsheet", label: "Create spreadsheet", icon: Table2, implemented: true, prompt: "Create a spreadsheet for ", section: "create" },
  { id: "create-video", label: "Create video", icon: Video, implemented: true, prompt: "Create a video about ", section: "create" },
  { id: "generate-audio", label: "Generate audio", icon: AudioLines, implemented: true, prompt: "Generate audio for ", section: "create" },
  // Tools
  { id: "wide-research", label: "Wide Research", icon: Search, implemented: true, prompt: "Do wide research on ", section: "tools" },
  { id: "scheduled-tasks", label: "Scheduled tasks", icon: CalendarClock, implemented: true, route: "/schedule", section: "tools" },
  { id: "add-skills", label: "Add Skills", icon: Puzzle, implemented: true, prompt: "Add a skill for ", section: "tools" },
  { id: "playbook", label: "Playbook", icon: BookOpen, implemented: true, route: "/library", section: "tools" },
  { id: "connect-computer", label: "Connect My Computer", icon: Monitor, implemented: true, prompt: "Connect my computer to ", section: "tools" },
  { id: "github-repos", label: "GitHub Repos", icon: GitBranch, implemented: true, route: "/github", section: "tools" },
  { id: "hands-free", label: "Hands-free mode", icon: Headphones, implemented: true, section: "tools" },
];

const SECTIONS = [
  { id: "media" as const, label: "Media" },
  { id: "create" as const, label: "Create" },
  { id: "tools" as const, label: "Tools" },
  { id: "connectors" as const, label: "Connectors" },
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
  onToggleHandsFree?: () => void;
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
  onToggleHandsFree,
  anchorRef,
  className,
}: PlusMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // Fetch connectors to show in the Connectors section
  const connectors = trpc.connector.list.useQuery(undefined, {
    enabled: isAuthenticated && open,
    staleTime: 60_000,
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Calculate anchor position for desktop popover
  useEffect(() => {
    if (!open || isMobile || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setAnchorRect(rect);

    // Recalculate on scroll/resize
    const recalc = () => {
      if (anchorRef.current) {
        setAnchorRect(anchorRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open, isMobile, anchorRef]);

  // Close on outside click (desktop)
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose, anchorRef]);

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
      if (item.id === "hands-free" && onToggleHandsFree) {
        onToggleHandsFree();
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
    [onAddFiles, onShareScreen, onRecordVideo, onUploadVideo, onInjectPrompt, onToggleHandsFree, onClose, navigate]
  );

  const connectedList = (connectors.data || []).filter((c: any) => c.status === "connected");

  if (!open) return null;

  // ── Mobile: bottom sheet via portal ──
  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[9999] bg-black/60"
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
                "fixed inset-x-0 bottom-0 z-[9999] max-h-[80vh] rounded-t-2xl bg-card border-t border-border overflow-hidden",
                className
              )}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="overflow-y-auto max-h-[60vh] pb-safe">
                <CategorizedFeatureList
                  items={MENU_ITEMS}
                  connectors={connectedList}
                  onItemClick={handleItemClick}
                  onConnectorClick={(c: any) => {
                    navigate(c ? `/connectors?highlight=${c.connectorId || c.id}` : "/connectors");
                    onClose();
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  // ── Desktop: anchored popover via portal ──
  // Position above the + button, clamped so it never extends outside viewport
  const popoverStyle: React.CSSProperties = (() => {
    if (!anchorRect) {
      return { position: "fixed" as const, left: 16, bottom: 80, zIndex: 9999 };
    }
    // Anchor the bottom of the popover just above the + button
    const bottomOffset = window.innerHeight - anchorRect.top + 8;
    return {
      position: "fixed" as const,
      left: anchorRect.left,
      bottom: bottomOffset,
      top: 8, // clamp to viewport top so it scrolls internally instead of clipping
      zIndex: 9999,
    };
  })();

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={popoverStyle}
          className={cn(
            "w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20 overflow-hidden flex flex-col",
            className
          )}
        >
          <div className="flex-1 overflow-y-auto">
            <CategorizedFeatureList
              items={MENU_ITEMS}
              connectors={connectedList}
              onItemClick={handleItemClick}
              onConnectorClick={(c: any) => {
                navigate(c ? `/connectors?highlight=${c.connectorId || c.id}` : "/connectors");
                onClose();
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── Categorized Feature List ──

function CategorizedFeatureList({
  items,
  connectors,
  onItemClick,
  onConnectorClick,
}: {
  items: PlusMenuItem[];
  connectors: any[];
  onItemClick: (item: PlusMenuItem) => void;
  onConnectorClick: (connector: any) => void;
}) {
  return (
    <div className="py-1">
      {SECTIONS.map((section) => {
        if (section.id === "connectors") {
          return (
            <div key={section.id}>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </span>
              </div>
              {connectors.length > 0 ? (
                connectors.map((c: any) => (
                  <button
                    key={c.id || c.type}
                    onClick={() => onConnectorClick(c)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-accent/50 active:bg-accent/70"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                      {c.type === "github" ? (
                        <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Plug className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm text-foreground flex-1">{c.name || c.type}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium">
                      Connected
                    </span>
                  </button>
                ))
              ) : (
                <button
                  onClick={() => onConnectorClick(null)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-accent/50 active:bg-accent/70"
                >
                  <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <Workflow className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground flex-1">Manage connectors</span>
                </button>
              )}
            </div>
          );
        }

        const sectionItems = items.filter((i) => i.section === section.id);
        if (sectionItems.length === 0) return null;

        return (
          <div key={section.id}>
            <div className="px-4 pt-2 pb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {section.label}
              </span>
            </div>
            {sectionItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-accent/50 active:bg-accent/70"
                >
                  <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
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
      })}
    </div>
  );
}

export { MENU_ITEMS };
export type { PlusMenuItem };
