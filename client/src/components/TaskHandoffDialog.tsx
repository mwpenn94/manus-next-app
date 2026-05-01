
/**
 * A dialog component for transferring a running task to a different AI model.
 * It displays the current model, a list of available models for selection,
 * and handles the handoff process.
 */
import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, BrainCircuit, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Define model and component props
interface Model {
  id: string;
  name: string;
  description: string;
  speed: 'fast' | 'balanced' | 'powerful';
}

interface TaskHandoffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  availableModels: Model[];
  onHandoff: (modelId: string) => void;
}

const speedIcons = {
  fast: <Zap className="h-4 w-4 text-green-400" />,
  balanced: <ChevronsUpDown className="h-4 w-4 text-yellow-400" />,
  powerful: <BrainCircuit className="h-4 w-4 text-purple-400" />,
};

const TaskHandoffDialog: React.FC<TaskHandoffDialogProps> = ({ isOpen, onClose, currentModel, availableModels, onHandoff }) => {
  const [selectedModel, setSelectedModel] = useState<string | undefined>(
    availableModels.find(m => m.id !== currentModel)?.id
  );

  const handleHandoff = () => {
    if (selectedModel) {
      onHandoff(selectedModel);
      onClose();
    }
  };

  const currentModelDetails = availableModels.find(m => m.id === currentModel);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Transfer Task</DialogTitle>
          <DialogDescription>
            Select a new model to handoff the current task to. The context will be summarized.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {currentModelDetails && (
            <div className="text-sm text-muted-foreground">
              Currently using: <span className="font-semibold text-foreground">{currentModelDetails.name}</span>
            </div>
          )}

          <RadioGroup value={selectedModel} onValueChange={setSelectedModel} className="space-y-3">
            {availableModels
              .filter(model => model.id !== currentModel)
              .map(model => (
                <motion.div key={model.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Label
                    htmlFor={model.id}
                    className={cn(
                      'flex items-center space-x-4 rounded-lg border p-4 cursor-pointer transition-colors',
                      'border-border bg-transparent hover:bg-muted/50',
                      selectedModel === model.id && 'border-primary bg-muted/50'
                    )}
                  >
                    <RadioGroupItem value={model.id} id={model.id} className="sr-only" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground">{model.name}</p>
                        <div className="flex items-center gap-2 text-xs capitalize text-muted-foreground">
                          {speedIcons[model.speed]}
                          {model.speed}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{model.description}</p>
                    </div>
                  </Label>
                </motion.div>
              ))}
          </RadioGroup>

          <p className="text-xs text-amber-500/80 text-center px-4">
            Warning: Transferring the task may result in some context loss as the conversation is summarized for the new model.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleHandoff} disabled={!selectedModel}>
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskHandoffDialog;
