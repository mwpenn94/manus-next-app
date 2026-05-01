import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MessageEntryAnimationProps {
  children: React.ReactNode;
  index: number;
  isNew: boolean;
  className?: string;
}

const MessageEntryAnimation: React.FC<MessageEntryAnimationProps> = ({
  children,
  index,
  isNew,
  className,
}) => {
  // If the message is not new, render it without animation.
  if (!isNew) {
    return <div className={className}>{children}</div>;
  }

  const variants = {
    initial: {
      opacity: 0,
      y: 12,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
  };

  const transition = {
    type: "spring" as const,
    damping: 20,
    stiffness: 300,
    delay: Math.min(index * 0.03, 0.3), // 30ms per item, max 300ms
  };

  return (
    <motion.div
      className={cn(className)}
      variants={variants}
      initial="initial"
      animate="animate"
      transition={transition}
      layout
    >
      {children}
    </motion.div>
  );
};

export default MessageEntryAnimation;
