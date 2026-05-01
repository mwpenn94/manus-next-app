import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare, CornerUpLeft, GitCommitHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface Iteration {
  id: string;
  version: number;
  content: string;
  feedback?: string;
  status: 'draft' | 'reviewing' | 'approved' | 'rejected';
  createdAt: number;
}

interface AgentFeedbackLoopProps {
  iterations: Iteration[];
  onSubmitFeedback: (iterationId: string, feedback: string) => void;
  onApprove: (iterationId: string) => void;
  onReject: (iterationId: string) => void;
  onRequestRevision: (iterationId: string, instructions: string) => void;
  isGenerating: boolean;
}

const DiffView: React.FC<{ oldContent: string; newContent: string }> = ({ oldContent, newContent }) => {
  const diff = useMemo(() => {
    const oldWords = oldContent.split(/(\s+)/);
    const newWords = newContent.split(/(\s+)/);
    const maxLen = Math.max(oldWords.length, newWords.length);
    const result = [];

    for (let i = 0; i < maxLen; i++) {
      if (oldWords[i] !== newWords[i]) {
        if (oldWords[i]) {
          result.push(<del key={`del-${i}`} className="bg-destructive/20 text-destructive-foreground">{oldWords[i]}</del>);
        }
        if (newWords[i]) {
          result.push(<ins key={`ins-${i}`} className="bg-constructive/20 text-constructive-foreground">{newWords[i]}</ins>);
        }
      } else {
        result.push(<span key={`span-${i}`}>{newWords[i]}</span>);
      }
    }
    return result;
  }, [oldContent, newContent]);

  return <pre className="whitespace-pre-wrap font-sans text-sm">{diff}</pre>;
};

export const AgentFeedbackLoop: React.FC<AgentFeedbackLoopProps> = ({ iterations, onSubmitFeedback, onApprove, onReject, onRequestRevision, isGenerating }) => {
  const [activeIterationId, setActiveIterationId] = useState<string | null>(iterations.length > 0 ? iterations[iterations.length - 1].id : null);
  const [feedback, setFeedback] = useState('');
  const [revisionInstructions, setRevisionInstructions] = useState('');

  const activeIteration = useMemo(() => iterations.find(it => it.id === activeIterationId), [iterations, activeIterationId]);
  const previousIteration = useMemo(() => {
    if (!activeIteration) return null;
    const activeIndex = iterations.findIndex(it => it.id === activeIterationId);
    return activeIndex > 0 ? iterations[activeIndex - 1] : null;
  }, [iterations, activeIterationId, activeIteration]);

  const handleFeedbackSubmit = () => {
    if (activeIteration && feedback.trim()) {
      onSubmitFeedback(activeIteration.id, feedback);
      setFeedback('');
    }
  };

  const handleRequestRevision = () => {
    if (activeIteration && revisionInstructions.trim()) {
      onRequestRevision(activeIteration.id, revisionInstructions);
      setRevisionInstructions('');
    }
  };

  const getStatusBadge = (status: Iteration['status']) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="mr-1 h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>;
      case 'reviewing':
        return <Badge variant="secondary"><MessageSquare className="mr-1 h-3 w-3" /> Reviewing</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 font-sans">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Agent Feedback Loop</span>
            <div className="text-sm font-normal text-muted-foreground">
              {iterations.length} Iteration{iterations.length === 1 ? '' : 's'}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-4">
            <div className="w-1/4">
              <h3 className="text-lg font-semibold mb-2">History</h3>
              <div className="relative pl-4">
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
                {iterations.map((iteration, index) => (
                  <motion.div
                    key={iteration.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative mb-4"
                  >
                    <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
                    <button
                      onClick={() => setActiveIterationId(iteration.id)}
                      className={cn(
                        'w-full text-left p-2 rounded-md transition-colors',
                        activeIterationId === iteration.id ? 'bg-accent' : 'hover:bg-accent/50'
                      )}
                    >
                      <div className="font-semibold">Version {iteration.version}</div>
                      <div className="text-xs text-muted-foreground">{new Date(iteration.createdAt).toLocaleString()}</div>
                      <div className="mt-1">{getStatusBadge(iteration.status)}</div>
                    </button>
                  </motion.div>
                ))}
                {isGenerating && (
                  <div className="relative mb-4 pl-6">
                     <Skeleton className="h-12 w-full" />
                  </div>
                )}
              </div>
            </div>

            <Separator orientation="vertical" className="h-auto" />

            <div className="w-3/4">
              <AnimatePresence mode="wait">
                {activeIteration ? (
                  <motion.div
                    key={activeIteration.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' as const }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>Version {activeIteration.version}</span>
                          {getStatusBadge(activeIteration.status)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <h4 className="font-semibold mb-2">Content</h4>
                        {previousIteration ? (
                          <DiffView oldContent={previousIteration.content} newContent={activeIteration.content} />
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans text-sm">{activeIteration.content}</pre>
                        )}

                        {activeIteration.feedback && (
                          <>
                            <Separator className="my-4" />
                            <h4 className="font-semibold mb-2">Feedback</h4>
                            <p className="text-sm text-muted-foreground italic">{activeIteration.feedback}</p>
                          </>
                        )}

                        {activeIteration.status === 'reviewing' && (
                          <>
                            <Separator className="my-4" />
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Provide Feedback</h4>
                                <Textarea
                                  value={feedback}
                                  onChange={(e) => setFeedback(e.target.value)}
                                  placeholder="Provide specific feedback or corrections..."
                                />
                                <Button onClick={handleFeedbackSubmit} className="mt-2" size="sm">Submit Feedback</Button>
                              </div>
                              <Separator className="my-4" />
                              <div>
                                <h4 className="font-semibold mb-2">Request Revision</h4>
                                <Textarea
                                  value={revisionInstructions}
                                  onChange={(e) => setRevisionInstructions(e.target.value)}
                                  placeholder="Provide detailed instructions for the next version..."
                                />
                                <Button onClick={handleRequestRevision} className="mt-2" size="sm" variant="secondary">
                                  <CornerUpLeft className="mr-2 h-4 w-4" />
                                  Request Revision
                                </Button>
                              </div>
                              <Separator className="my-4" />
                              <div className="flex justify-end space-x-2">
                                <Button onClick={() => onReject(activeIteration.id)} variant="destructive">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                                <Button onClick={() => onApprove(activeIteration.id)} className="bg-green-600 hover:bg-green-700">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <GitCommitHorizontal className="h-12 w-12 mb-4" />
                    <p>Select an iteration to view details.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
