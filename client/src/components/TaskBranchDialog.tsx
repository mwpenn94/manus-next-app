import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitFork, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface TaskBranchDialogProps {
  taskId: string;
  messageId: string;
  messageIndex: number;
  totalMessages: number;
  onBranch: (fromMessageId: string, newPrompt?: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskBranchDialog = ({
  taskId,
  messageId,
  messageIndex,
  totalMessages,
  onBranch,
  isOpen,
  onClose,
}: TaskBranchDialogProps) => {
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setNewPrompt('');
    }
  }, [isOpen]);

  const handleBranch = () => {
    onBranch(messageId, newPrompt.trim() || undefined);
    onClose();
  };

  const messagesToKeep = messageIndex + 1;
  const messagesToDiscard = totalMessages - messagesToKeep;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitFork className="h-5 w-5" />
            Fork this Conversation
          </DialogTitle>
          <DialogDescription>
            Create a new branch starting from message #{messageIndex + 1}. This allows you to explore a different path without losing your current history.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{messagesToKeep}</p>
              <p className="text-xs text-muted-foreground">Messages Kept</p>
            </div>
            <div className="h-20 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{messagesToDiscard}</p>
              <p className="text-xs text-muted-foreground">Messages Discarded</p>
            </div>
          </div>

          <div className="relative flex h-24 w-full items-center justify-center">
            <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-border" />
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' as const, delay: 0.2 }}
                  className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2"
                >
                  <svg width="100%" height="100%" viewBox="0 0 2 96" preserveAspectRatio="none" className="absolute left-0 top-0 h-full w-full">
                    <motion.path
                      d={`M 1 0 V ${48 - 8} C 1 48, 1 48, 20 56`}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] as const, delay: 0.3 }}
                    />
                    <motion.path
                      d={`M 1 0 V 96`}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: (messageIndex + 1) / totalMessages }}
                      transition={{ duration: 0.5, ease: 'easeOut' as const, delay: 0.2 }}
                    />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background" />
          </div>

          <Separator />

          <div>
            <label htmlFor="new-prompt" className="text-sm font-medium">
              Optional: Start branch with a new prompt
            </label>
            <Input
              id="new-prompt"
              placeholder={`e.g., \"Rewrite the last response in a different style...\"`}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="mt-2 flex items-start gap-2 rounded-lg bg-accent/50 p-3 text-accent-foreground">
            <Info className="h-4 w-4 flex-shrink-0 translate-y-0.5" />
            <p className="text-xs">
              Messages after the branch point ({messagesToDiscard} of them) will not be included in the new conversation branch.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleBranch}>
            <GitFork className="mr-2 h-4 w-4" />
            Branch from Message #{messageIndex + 1}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};