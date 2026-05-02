import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ThumbsUp, ThumbsDown, MessageSquare, BrainCircuit, History, BarChart3, Download, GitCommit, Bot, User, Zap, CheckCircle2, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// --- TYPES & MOCK DATA ---
type FeedbackRating = 'up' | 'down';

type FeedbackItem = {
  id: string;
  rating: FeedbackRating;
  categories: string[];
  feedbackText?: string;
  correction?: string;
  timestamp: string;
  aiAcknowledgment: string;
  improvementDelta: number; // e.g., 0.15 for +15%
};

const mockFeedbackHistory: FeedbackItem[] = [
  {
    id: 'fb-008',
    rating: 'up',
    categories: ['Helpfulness', 'Completeness'],
    timestamp: '2024-07-20T10:00:00Z',
    aiAcknowledgment: "Thank you! I'm glad the refined structure was helpful.",
    improvementDelta: 0.08,
  },
  {
    id: 'fb-007',
    rating: 'down',
    categories: ['Accuracy'],
    feedbackText: 'The capital of Australia is Canberra, not Sydney.',
    correction: 'The official capital of Australia is Canberra.',
    timestamp: '2024-07-19T15:30:00Z',
    aiAcknowledgment: "You are correct. I have updated my knowledge base to reflect Canberra as the capital of Australia. This was a critical factual error.",
    improvementDelta: 0.25,
  },
  {
    id: 'fb-006',
    rating: 'up',
    categories: ['Tone'],
    feedbackText: 'The more professional tone is much better.',
    timestamp: '2024-07-18T11:00:00Z',
    aiAcknowledgment: "Thank you for the positive reinforcement on the tone adjustment. I will maintain this style for similar queries.",
    improvementDelta: 0.12,
  },
  {
    id: 'fb-005',
    rating: 'down',
    categories: ['Tone', 'Helpfulness'],
    feedbackText: 'The response was a bit too casual and didn\'t provide a direct answer.',
    correction: 'For technical questions, a more direct and professional tone is preferred. Start with the solution, then provide the explanation.',
    timestamp: '2024-07-17T09:20:00Z',
    aiAcknowledgment: "Feedback acknowledged. I will adjust my tone to be more formal and direct for technical topics, prioritizing the solution upfront.",
    improvementDelta: 0.18,
  },
  {
    id: 'fb-004',
    rating: 'down',
    categories: ['Completeness'],
    feedbackText: 'You missed a step in the installation process.',
    correction: 'After `npm install`, you also need to run `npx setup-env`.',
    timestamp: '2024-07-16T18:45:00Z',
    aiAcknowledgment: "My apologies. I\'ve incorporated the missing `npx setup-env` step into my instructions for this process.",
    improvementDelta: 0.10,
  },
  {
    id: 'fb-003',
    rating: 'up',
    categories: ['Speed'],
    feedbackText: 'Wow, that was a fast response!',
    timestamp: '2024-07-15T14:00:00Z',
    aiAcknowledgment: "I'm glad you found the response time satisfactory. I'm continuously optimizing for performance.",
    improvementDelta: 0.05,
  },
  {
    id: 'fb-002',
    rating: 'down',
    categories: ['Accuracy'],
    feedbackText: 'This information seems outdated.',
    timestamp: '2024-07-14T20:10:00Z',
    aiAcknowledgment: "Thank you for pointing that out. I will source more recent data for this topic in the future.",
    improvementDelta: 0.07,
  },
  {
    id: 'fb-001',
    rating: 'down',
    categories: [],
    timestamp: '2024-07-13T12:00:00Z',
    aiAcknowledgment: "I see you were not satisfied. I will strive to provide a better response next time.",
    improvementDelta: 0.02,
  },
];

const feedbackCategories = ['Accuracy', 'Helpfulness', 'Tone', 'Completeness', 'Speed'];

// --- SUB-COMPONENTS ---

const FeedbackSubmission = ({ onFeedbackSubmit }: { onFeedbackSubmit: (feedback: Omit<FeedbackItem, 'id' | 'aiAcknowledgment' | 'improvementDelta'>) => void }) => {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [aiCorrectionText, setAiCorrectionText] = useState('');

  const handleRating = (newRating: FeedbackRating) => {
    setRating(newRating);
    setShowDetailedFeedback(true);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleSubmitFeedback = () => {
    if (!rating) return;
    onFeedbackSubmit({
      rating,
      categories: selectedCategories,
      feedbackText: feedbackText || undefined,
      correction: aiCorrectionText || undefined,
      timestamp: new Date().toISOString(),
    });
    setRating(null);
    setShowDetailedFeedback(false);
    setSelectedCategories([]);
    setFeedbackText('');
    setAiCorrectionText('');
  };

  return (
    <Card className="bg-card/50 border-border/30" style={{backgroundColor: 'oklch(0.2 0.08 250 / 0.5)'}}>
      <CardHeader>
        <CardTitle className="text-xl">Rate Current AI Response</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <p className="font-semibold text-muted-foreground">Was this response helpful?</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={rating === 'up' ? 'default' : 'outline'} size="icon" onClick={() => handleRating('up')} className={cn("rounded-full h-12 w-12 transition-all duration-200", rating === 'up' && "bg-green-500 hover:bg-green-600 scale-110")}>
                <ThumbsUp />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Good response</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={rating === 'down' ? 'default' : 'outline'} size="icon" onClick={() => handleRating('down')} className={cn("rounded-full h-12 w-12 transition-all duration-200", rating === 'down' && "bg-red-500 hover:bg-red-600 scale-110")}>
                <ThumbsDown />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Bad response</p></TooltipContent>
          </Tooltip>
        </div>

        <AnimatePresence>
          {showDetailedFeedback && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }} className="overflow-hidden">
              <Separator className="my-4 bg-border/30" />
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 text-muted-foreground">What can be improved?</h4>
                  <div className="flex flex-wrap gap-2">
                    {feedbackCategories.map((category) => (
                      <Button key={category} variant="outline" size="sm" onClick={() => toggleCategory(category)} className={cn("transition-colors", selectedCategories.includes(category) && "bg-primary text-primary-foreground hover:bg-primary/90")}>
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center text-muted-foreground"><MessageSquare className="mr-2 h-4 w-4" />Additional Feedback</h4>
                  <Textarea placeholder="Provide more details..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} maxLength={500} className="bg-input/30 border-border/50" />
                  <p className="text-xs text-muted-foreground/70 text-right mt-1">{feedbackText.length} / 500</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center text-muted-foreground"><BrainCircuit className="mr-2 h-4 w-4" />Teach the AI</h4>
                  <Textarea placeholder="Provide a corrected response or a better approach..." value={aiCorrectionText} onChange={(e) => setAiCorrectionText(e.target.value)} maxLength={1000} className="bg-input/30 border-border/50 h-32" />
                  <p className="text-xs text-muted-foreground/70 text-right mt-1">{aiCorrectionText.length} / 1000</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setShowDetailedFeedback(false)}>Cancel</Button>
                    <Button onClick={handleSubmitFeedback} disabled={!rating}>Submit Feedback</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

const FeedbackHistory = ({ history }: { history: FeedbackItem[] }) => {
    return (
    <Card className="bg-card/50 border-border/30" style={{backgroundColor: 'oklch(0.2 0.08 250 / 0.5)'}}>
      <CardHeader>
        <CardTitle className="text-xl flex items-center"><History className="mr-2 h-5 w-5"/>Feedback History</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full space-y-2">
          <AnimatePresence initial={false}>
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AccordionItem value={item.id} className="border border-border/30 rounded-lg overflow-hidden bg-black/10">
                  <AccordionTrigger className="p-3 hover:no-underline hover:bg-black/20 transition-colors">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        {item.rating === 'up' ? <ThumbsUp className="h-5 w-5 text-green-500" /> : <ThumbsDown className="h-5 w-5 text-red-500" />}
                        <span className="font-medium text-sm text-primary-foreground/90 text-left">{item.feedbackText ? `\"${item.feedbackText.substring(0, 40)}...\"` : 'General Feedback'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground mr-2 flex-shrink-0">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2 pb-4 bg-black/20 px-4 border-t border-border/30">
                    <div className="flex items-start gap-3 pt-3">
                      <User className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0"/>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-primary-foreground">Your Feedback</p>
                        <div className="flex flex-wrap gap-2 my-2">
                          {item.categories.length > 0 ? item.categories.map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>) : <Badge variant="outline">No categories</Badge>}
                        </div>
                        {item.feedbackText && <p className="text-sm text-muted-foreground italic">\"{item.feedbackText}\"</p>}
                        {item.correction && (
                            <div className="mt-3 p-3 bg-primary/10 border-l-4 border-primary rounded-r-md">
                                <p className="font-semibold text-xs mb-1 flex items-center text-primary-foreground/80"><BrainCircuit className="h-4 w-4 mr-2"/>Suggested Correction:</p>
                                <p className="text-sm text-primary-foreground/90">{item.correction}</p>
                            </div>
                        )}
                      </div>
                    </div>
                    <Separator className="bg-border/30 my-3"/>
                    <div className="flex items-start gap-3">
                        <Bot className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0"/>
                        <div className="flex-1">
                            <p className="font-semibold text-sm text-primary-foreground">AI Acknowledgment</p>
                            <p className="text-sm text-muted-foreground">{item.aiAcknowledgment}</p>
                        </div>
                    </div>
                    <Separator className="bg-border/30 my-3"/>
                    <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0"/>
                        <div className="flex-1">
                            <p className="font-semibold text-sm text-primary-foreground">Impact</p>
                            <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
                                <GitCommit className="h-4 w-4"/>
                                <span>Subsequent responses improved by <span className="font-bold text-white">{Math.round(item.improvementDelta * 100)}%</span> on this topic.</span>
                            </div>
                        </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </Accordion>
      </CardContent>
    </Card>
  );
};

const FeedbackStats = ({ stats }: { stats: { total: number; acceptedRate: number; improvementDelta: number } }) => {
  return (
    <Card className="bg-card/50 border-border/30 sticky top-6" style={{backgroundColor: 'oklch(0.2 0.08 250 / 0.5)'}}>
      <CardHeader>
        <CardTitle className="text-xl flex items-center"><BarChart3 className="mr-2 h-5 w-5"/>Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md"><MessageSquare className="h-5 w-5 text-primary"/></div>
            <span className="font-medium text-muted-foreground">Total Feedback</span>
          </div>
          <span className="font-bold text-2xl text-primary-foreground">{stats.total}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-md"><Target className="h-5 w-5 text-green-500"/></div>
            <span className="font-medium text-muted-foreground">Accepted Rate</span>
          </div>
          <span className="font-bold text-2xl text-primary-foreground">{stats.acceptedRate.toFixed(0)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 rounded-md"><TrendingUp className="h-5 w-5 text-teal-400"/></div>
            <span className="font-medium text-muted-foreground">Avg. Improvement</span>
          </div>
          <span className="font-bold text-2xl text-primary-foreground">+{stats.improvementDelta.toFixed(1)}%</span>
        </div>
        <div className="pt-2">
            <p className="text-xs text-muted-foreground/80 mb-2">Overall Feedback Quality</p>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Progress value={stats.acceptedRate} className="h-2"/>
                </TooltipTrigger>
                <TooltipContent><p>{stats.acceptedRate.toFixed(0)}% of feedback is positive.</p></TooltipContent>
            </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
};

// --- MAIN COMPONENT ---
export default function FeedbackLoopPanel() {
  const [feedbackHistory, setFeedbackHistory] = useState(mockFeedbackHistory);

  const handleNewFeedback = (feedback: Omit<FeedbackItem, 'id' | 'aiAcknowledgment' | 'improvementDelta'>) => {
    const newFeedbackItem: FeedbackItem = {
      ...feedback,
      id: `fb-${String(Date.now()).slice(-6)}`,
      aiAcknowledgment: "Thank you for your feedback. I am processing this information to improve my future responses.",
      improvementDelta: Math.random() * 0.1 + 0.05, // Mock improvement
    };
    setFeedbackHistory(prev => [newFeedbackItem, ...prev]);
  };

  const feedbackStats = useMemo(() => {
    const total = feedbackHistory.length;
    if (total === 0) return { total: 0, acceptedRate: 0, improvementDelta: 0 };

    const upVotes = feedbackHistory.filter(f => f.rating === 'up').length;
    const acceptedRate = (upVotes / total) * 100;

    const totalImprovement = feedbackHistory.reduce((acc, f) => acc + f.improvementDelta, 0);
    const improvementDelta = (totalImprovement / total) * 100;

    return { total, acceptedRate, improvementDelta };
  }, [feedbackHistory]);

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground font-sans w-full min-h-screen" style={{backgroundColor: 'oklch(0.1 0.05 250)'}}>
        <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-card border-border/40 shadow-2xl shadow-black/30" style={{backgroundColor: 'oklch(0.15 0.08 250 / 0.8)', borderColor: 'oklch(0.3 0.08 250)', backdropFilter: 'blur(12px)'}}>
              <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6 border-b border-border/30">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-primary-foreground">Feedback Loop</CardTitle>
                  <CardDescription className="text-muted-foreground">Improve AI responses through collaborative feedback.</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Training Data
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6">
                <div className="lg:col-span-2 space-y-6">
                  <FeedbackSubmission onFeedbackSubmit={handleNewFeedback} />
                  <FeedbackHistory history={feedbackHistory} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                  <FeedbackStats stats={feedbackStats} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
