import React, { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FeedbackData {
  messageId: string;
  rating: 'positive' | 'negative';
  categories: string[];
  freeformText?: string;
  preferredModel?: string;
}

interface AgentTrainingFeedbackProps {
  messageId: string;
  currentRating?: 'positive' | 'negative' | null;
  onSubmitFeedback: (feedback: FeedbackData) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const POSITIVE_CATEGORIES = ['Accurate', 'Helpful', 'Well-written'];
const NEGATIVE_CATEGORIES = ['Too verbose', 'Incorrect', 'Off-topic', 'Too slow'];

export const AgentTrainingFeedback: React.FC<AgentTrainingFeedbackProps> = ({ 
  messageId, 
  currentRating, 
  onSubmitFeedback, 
  isExpanded, 
  onToggle 
}) => {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(currentRating || null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [freeformText, setFreeformText] = useState('');
  const [preferredModel, setPreferredModel] = useState('no_preference');
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    setRating(currentRating || null);
  }, [currentRating]);

  const handleRating = (newRating: 'positive' | 'negative') => {
    if (rating === newRating && isExpanded) {
      onToggle(); // Collapse if clicking the same rating again while expanded
    } else {
      setRating(newRating);
      setSelectedCategories([]); // Reset categories on new rating
      if (!isExpanded) {
        onToggle();
      }
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleSubmit = () => {
    if (!rating) return;

    const feedback: FeedbackData = {
      messageId,
      rating,
      categories: selectedCategories,
      freeformText: freeformText.trim() || undefined,
      preferredModel: preferredModel !== 'no_preference' ? preferredModel : undefined,
    };
    onSubmitFeedback(feedback);
    setShowThankYou(true);
    setTimeout(() => {
      setShowThankYou(false);
      onToggle(); // Collapse after submission
    }, 2000);
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (event.key === 't') {
      if (event.shiftKey) {
        handleRating('negative');
      } else {
        handleRating('positive');
      }
    }
  }, [handleRating]);

  useEffect(() => {
    // This assumes the parent message component attaches this listener when it's focused.
    // A more robust solution might use a global context or event bus if needed.
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const availableCategories = rating === 'positive' ? POSITIVE_CATEGORIES : NEGATIVE_CATEGORIES;

  return (
    <div className="relative flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => handleRating('positive')} className="h-7 w-7">
        <ThumbsUp className={cn('h-4 w-4', rating === 'positive' ? 'text-primary fill-current' : 'text-muted-foreground')} />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleRating('negative')} className="h-7 w-7">
        <ThumbsDown className={cn('h-4 w-4', rating === 'negative' ? 'text-destructive fill-current' : 'text-muted-foreground')} />
      </Button>

      <AnimatePresence>
        {isExpanded && rating && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto', transition: { type: 'spring', stiffness: 300, damping: 30 } }}
            exit={{ opacity: 0, y: -10, height: 0, transition: { duration: 0.2 } }}
            className="absolute left-0 top-full mt-2 w-96 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-lg z-10"
          >
            {showThankYou ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-full"
              >
                <p className="text-sm text-foreground">Thank you for your feedback!</p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">What did you {rating === 'positive' ? 'like' : 'dislike'}?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {availableCategories.map(category => (
                      <div key={category} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => handleCategoryChange(category)}
                        />
                        <label htmlFor={`cat-${category}`} className="text-sm text-muted-foreground cursor-pointer">
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Textarea
                  placeholder="Provide more detail (optional)"
                  value={freeformText}
                  onChange={e => setFreeformText(e.target.value)}
                  className="min-h-[60px] text-sm"
                />

                <Select value={preferredModel} onValueChange={setPreferredModel}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Model Preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_preference">No preference</SelectItem>
                    <SelectItem value="faster">Prefer faster model</SelectItem>
                    <SelectItem value="smarter">Prefer smarter model</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleSubmit} size="sm" className="w-full">
                  Submit Feedback
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};