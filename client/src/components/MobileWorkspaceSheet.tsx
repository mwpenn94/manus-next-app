
/**
 * MobileWorkspaceSheet is a React component that renders workspace content (like code, browser, or terminal)
 * in a draggable, dismissible bottom sheet, optimized for mobile interfaces.
 */
import * as React from "react";
import { motion, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

interface MobileWorkspaceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "browser" | "code" | "terminal";
  children: React.ReactNode;
}

const MobileWorkspaceSheet: React.FC<MobileWorkspaceSheetProps> = ({ isOpen, onClose, activeTab, children }) => {
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 150 || info.velocity.y > 500) {
      onClose();
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "fixed inset-0 z-40 bg-black/60",
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sheet Content */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col w-full bg-card border-t border-border rounded-t-xl shadow-2xl"
        style={{ maxHeight: "80vh" }}
        initial={{ y: "100%" }}
        animate={{ y: isOpen ? "0%" : "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
      >
        {/* Header with Drag Handle */}
        <div className="flex-shrink-0 pt-3 pb-2 px-4">
          <div className="w-10 h-1.5 mx-auto rounded-full bg-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium text-center text-foreground">{capitalize(activeTab)}</h3>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </motion.div>
    </>
  );
};

export default MobileWorkspaceSheet;
