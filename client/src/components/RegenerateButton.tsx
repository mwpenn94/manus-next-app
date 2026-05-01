import { useState, useCallback } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface RegenerateButtonProps {
  messageId: string;
  messageIndex: number;
  isLastMessage: boolean;
  onRegenerate: (messageId: string, fromIndex: number) => void;
  isRegenerating: boolean;
  disabled?: boolean;
  messageCount: number;
}

export const RegenerateButton = ({
  messageId,
  messageIndex,
  isLastMessage,
  onRegenerate,
  isRegenerating,
  disabled,
  messageCount,
}: RegenerateButtonProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleRegenerateClick = useCallback(() => {
    if (isLastMessage) {
      onRegenerate(messageId, messageIndex);
    } else {
      setIsConfirming(true);
    }
  }, [isLastMessage, messageId, messageIndex, onRegenerate]);

  const handleConfirm = useCallback(() => {
    onRegenerate(messageId, messageIndex);
    setIsConfirming(false);
  }, [messageId, messageIndex, onRegenerate]);

  const messagesToDiscard = messageCount - 1 - messageIndex;

  const buttonContent = (
    <RefreshCw className={cn('h-4 w-4', isRegenerating && 'animate-spin')} />
  );

  if (isLastMessage) {
    return (
      <div className="inline-flex items-center pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled || isRegenerating}
              className="group"
            >
              {buttonContent}
              <span className="ml-2">Regenerate</span>
              <ChevronDown className="h-4 w-4 ml-1 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleRegenerateClick}>
              Regenerate
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Regenerate with different model
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Edit and regenerate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' as const }}
              className="absolute top-2 right-2"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRegenerateClick}
                disabled={disabled || isRegenerating}
                className={cn(
                  'h-7 w-7',
                  disabled && 'opacity-50 pointer-events-none'
                )}
              >
                {buttonContent}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Regenerate from here</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard {messagesToDiscard} message{messagesToDiscard > 1 ? 's' : ''} below. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};