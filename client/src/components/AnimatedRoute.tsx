/**
 * AnimatedRoute — Wraps page content with a subtle fade/slide entrance animation.
 * Uses framer-motion for smooth page transitions without disrupting layout.
 *
 * IMPORTANT: This component sits inside a flex-column <main> with overflow-hidden.
 * It must use flex:1 + min-height:0 + overflow:hidden so that children's
 * h-full / overflow-y-auto work correctly and content scrolls within the page.
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
};

interface AnimatedRouteProps {
  children: ReactNode;
  className?: string;
}

export default function AnimatedRoute({ children, className }: AnimatedRouteProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
      style={{
        flex: "1 1 0%",
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column" as const,
      }}
    >
      {children}
    </motion.div>
  );
}
