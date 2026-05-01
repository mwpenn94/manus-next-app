import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ThumbsUp, ThumbsDown, Equal, RefreshCw, Bot, Clock, Coins, FileText } from 'lucide-react';

// A simple diffing function to highlight differences between two strings.
// This is a basic implementation and might not be as robust as libraries like diff-match-patch.
const diffStrings = (a: string, b: string) => {
    const aWords = a.split(/(\s+)/);
    const bWords = b.split(/(\s+)/);
    const dp = Array(aWords.length + 1).fill(null).map(() => Array(bWords.length + 1).fill(0));

    for (let i = 1; i <= aWords.length; i++) {
        for (let j = 1; j <= bWords.length; j++) {
            if (aWords[i - 1] === bWords[j - 1]) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const buildDiff = (i: number, j: number): { value: string; type: 'added' | 'removed' | 'common' }[] => {
        if (i > 0 && j > 0 && aWords[i - 1] === bWords[j - 1]) {
            return [...buildDiff(i - 1, j - 1), { value: aWords[i - 1], type: 'common' }];
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            return [...buildDiff(i, j - 1), { value: bWords[j - 1], type: 'added' }];
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            return [...buildDiff(i - 1, j), { value: aWords[i - 1], type: 'removed' }];
        } else {
            return [];
        }
    };

    return buildDiff(aWords.length, bWords.length);
};


export interface AgentResponse {
    id: string;
    modelId: string;
    modelName: string;
    content: string;
    tokens: number;
    duration: number; // in seconds
    cost: number; // in USD
}

interface AgentResponseComparatorProps {
    responses: AgentResponse[];
    prompt: string;
    onRate: (responseId: string, rating: 'better' | 'worse' | 'same') => void;
    onRegenerate: (modelId: string) => void;
    isGenerating: boolean;
}

const MetricDisplay: React.FC<{ icon: React.ReactNode; label: string; value: string | number; className?: string }> = ({ icon, label, value, className }) => (
    <div className={cn("flex items-center text-sm text-muted-foreground", className)}>
        {icon}
        <span className="ml-2 font-medium">{label}:</span>
        <span className="ml-1.5">{value}</span>
    </div>
);

const ResponsePanel: React.FC<{ 
    response: AgentResponse; 
    diffContent: { value: string; type: 'added' | 'removed' | 'common' }[];
    onRate: AgentResponseComparatorProps['onRate'];
    onRegenerate: AgentResponseComparatorProps['onRegenerate'];
    isGenerating: boolean;
}> = ({ response, diffContent, onRate, onRegenerate, isGenerating }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' as const }}
            className="flex-1"
        >
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center">
                                <Bot className="mr-2 h-5 w-5" />
                                {response.modelName}
                            </CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onRegenerate(response.modelId)} disabled={isGenerating}>
                            <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                    <ScrollArea className="flex-grow pr-4 -mr-4 mb-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                            {diffContent.map((part, index) => (
                                <span
                                    key={index}
                                    className={cn({
                                        'bg-green-500/20': part.type === 'added',
                                        'bg-red-500/20 text-decoration-line: line-through': part.type === 'removed',
                                    })}
                                >
                                    {part.value}
                                </span>
                            ))}
                        </div>
                    </ScrollArea>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-2 text-center">
                         <MetricDisplay icon={<FileText className="h-4 w-4" />} label="Tokens" value={response.tokens} />
                         <MetricDisplay icon={<Clock className="h-4 w-4" />} label="Time" value={`${response.duration.toFixed(2)}s`} />
                         <MetricDisplay icon={<Coins className="h-4 w-4" />} label="Cost" value={`$${response.cost.toFixed(6)}`} />
                    </div>
                    <div className="mt-4 flex justify-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => onRate(response.id, 'better')}><ThumbsUp className="h-4 w-4 mr-2" /> Better</Button>
                        <Button variant="outline" size="sm" onClick={() => onRate(response.id, 'worse')}><ThumbsDown className="h-4 w-4 mr-2" /> Worse</Button>
                        <Button variant="outline" size="sm" onClick={() => onRate(response.id, 'same')}><Equal className="h-4 w-4 mr-2" /> Same</Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const MetricComparisonBar: React.FC<{ responses: AgentResponse[] }> = ({ responses }) => {
    if (responses.length < 2) return null;

    const maxTokens = Math.max(...responses.map(r => r.tokens));
    const maxDuration = Math.max(...responses.map(r => r.duration));
    const maxCost = Math.max(...responses.map(r => r.cost));

    const metrics = [
        { label: 'Tokens', max: maxTokens, values: responses.map(r => r.tokens), format: (v: number) => v.toString() },
        { label: 'Speed', max: maxDuration, values: responses.map(r => r.duration), format: (v: number) => `${v.toFixed(2)}s` },
        { label: 'Cost', max: maxCost, values: responses.map(r => r.cost), format: (v: number) => `$${v.toFixed(6)}` },
    ];

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="text-lg">Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {metrics.map(metric => (
                    <div key={metric.label}>
                        <h4 className="text-sm font-medium mb-2">{metric.label}</h4>
                        <div className="flex items-center space-x-4">
                            {responses.map((response, index) => (
                                <div key={response.id} className="flex-1">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>{response.modelName}</span>
                                        <span>{metric.format(metric.values[index])}</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2.5">
                                        <motion.div
                                            className={cn("h-2.5 rounded-full", index === 0 ? 'bg-primary' : 'bg-secondary-foreground')}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(metric.values[index] / metric.max) * 100}%` }}
                                            transition={{ duration: 0.5, ease: 'easeOut' as const }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export const AgentResponseComparator: React.FC<AgentResponseComparatorProps> = ({ responses, prompt, onRate, onRegenerate, isGenerating }) => {
    const diffs = useMemo(() => {
        if (responses.length < 2) {
            const content = responses[0]?.content || '';
            return [
                content.split(/(\s+)/).map(value => ({ value, type: 'common' as const }))
            ];
        }
        const diffResult = diffStrings(responses[0].content, responses[1].content);
        const diffA = diffResult.filter(p => p.type !== 'added');
        const diffB = diffResult.filter(p => p.type !== 'removed');
        return [diffA, diffB];
    }, [responses]);

    return (
        <div className="p-4 bg-background text-foreground">
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle>Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{prompt}</p>
                </CardContent>
            </Card>

            <AnimatePresence>
                {isGenerating && (
                    <motion.div
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="flex flex-col items-center">
                            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                            <p className="mt-4 text-lg">Generating responses...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-4">
                {responses.map((response, index) => (
                    <ResponsePanel
                        key={response.id}
                        response={response}
                        diffContent={diffs[index] || []}
                        onRate={onRate}
                        onRegenerate={onRegenerate}
                        isGenerating={isGenerating}
                    />
                ))}
            </div>

            {responses.length > 1 && <MetricComparisonBar responses={responses} />}
        </div>
    );
};
