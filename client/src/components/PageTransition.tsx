import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  routeKey: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, routeKey }) => {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
