import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, HelpCircle, Zap, Compass, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Suggestion = {
  id: string;
  text: string;
  type: 'follow_up' | 'clarification' | 'action' | 'explore';
  confidence: number;
};

interface SmartSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: string) => void;
  isVisible: boolean;
  maxVisible?: number;
}

const iconMap: Record<Suggestion['type'], React.ReactNode> = {
  follow_up: <ArrowRight className="h-4 w-4 shrink-0" />,
  clarification: <HelpCircle className="h-4 w-4 shrink-0" />,
  action: <Zap className="h-4 w-4 shrink-0" />,
  explore: <Compass className="h-4 w-4 shrink-0" />,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.5, 
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }
  },
};

export const SmartSuggestions = ({ 
  suggestions,
  onSelect,
  isVisible,
  maxVisible = 3
}: SmartSuggestionsProps) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const activeSuggestions = useMemo(() => 
    suggestions.filter(s => !dismissedIds.has(s.id)), 
    [suggestions, dismissedIds]
  );

  const displayedSuggestions = useMemo(() => 
    showAll ? activeSuggestions : activeSuggestions.slice(0, maxVisible),
    [activeSuggestions, showAll, maxVisible]
  );

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const handleDismissAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = new Set(suggestions.map(s => s.id));
    setDismissedIds(allIds);
  };

  useEffect(() => {
    if (isVisible) {
      setDismissedIds(new Set());
      setShowAll(false);
    }
  }, [isVisible, suggestions]);

  return (
    <AnimatePresence>
      {isVisible && activeSuggestions.length > 0 && (
        <motion.div 
          className="relative w-full py-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
            <AnimatePresence mode="popLayout">
              {displayedSuggestions.map((suggestion) => (
                <motion.div
                  key={suggestion.id}
                  layout
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={cn(
                    'group relative flex items-center whitespace-nowrap rounded-full bg-card border border-border cursor-pointer transition-colors hover:border-primary/80',
                  )}
                  style={{ opacity: 0.5 + suggestion.confidence * 0.5 }}
                  onClick={() => onSelect(suggestion.text)}
                >
                  <div className="flex items-center gap-2 pl-3 pr-8 py-1.5">
                    {iconMap[suggestion.type]}
                    <span className="text-sm text-foreground font-medium">{suggestion.text}</span>
                  </div>
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDismiss(e, suggestion.id)}
                    className="absolute top-1/2 right-0 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            {activeSuggestions.length > maxVisible && !showAll && (
              <motion.div layout variants={itemVariants}>
                <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => setShowAll(true)}>
                  Show more
                </Button>
              </motion.div>
            )}

            <motion.div layout variants={itemVariants}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={handleDismissAll}>
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};