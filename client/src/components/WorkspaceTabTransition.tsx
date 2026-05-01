import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceTabTransitionProps {
  activeTab: string;
  children: React.ReactNode;
}

const WorkspaceTabTransition: React.FC<WorkspaceTabTransitionProps> = ({ activeTab, children }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkspaceTabTransition;
