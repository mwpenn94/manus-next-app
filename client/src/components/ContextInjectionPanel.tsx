import React, { useState, useCallback, useMemo } from 'react';
import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, Link as LinkIcon, Upload, Trash2, GripVertical, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface InjectedContext {
  id: string;
  type: 'text' | 'url' | 'file';
  content: string;
  label: string;
  tokens: number;
  addedAt: number;
}

interface ContextInjectionPanelProps {
  injectedContexts: InjectedContext[];
  onAddContext: (context: { type: string; content: string; label: string }) => void;
  onRemoveContext: (id: string) => void;
  onReorder: (ids: string[]) => void;
  totalTokens: number;
  maxTokens: number;
}

const ContextItem = ({ 
    context, 
    onRemove, 
    isExpanded, 
    onToggleExpand 
}: { 
    context: InjectedContext, 
    onRemove: (id: string) => void, 
    isExpanded: boolean, 
    onToggleExpand: () => void 
}) => {
    const dragControls = useDragControls();

    const getIcon = () => {
        switch (context.type) {
            case 'text': return <FileText className="h-4 w-4 mr-2" />;
            case 'url': return <LinkIcon className="h-4 w-4 mr-2" />;
            case 'file': return <Upload className="h-4 w-4 mr-2" />;
            default: return null;
        }
    };

    return (
        <Reorder.Item
            value={context}
            id={context.id}
            dragListener={false}
            dragControls={dragControls}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="bg-card p-2 rounded-lg mb-2 border border-border"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center flex-grow">
                    <div onPointerDown={(e) => dragControls.start(e)} className="cursor-grab p-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {getIcon()}
                    <span className="font-medium text-sm truncate flex-grow" title={context.label}>{context.label}</span>
                </div>
                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                    <Badge variant="secondary">{context.tokens} tokens</Badge>
                    <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-8 w-8">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(context.id)} className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="text-sm text-muted-foreground bg-background/50 p-2 mt-2 rounded-md break-words max-h-48 overflow-y-auto">{context.content}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </Reorder.Item>
    );
};

export const ContextInjectionPanel: React.FC<ContextInjectionPanelProps> = ({ 
    injectedContexts, 
    onAddContext, 
    onRemoveContext, 
    onReorder, 
    totalTokens, 
    maxTokens 
}) => {
    const [activeTab, setActiveTab] = useState('text');
    const [textInput, setTextInput] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const handleAddContext = useCallback(() => {
        if (activeTab === 'text' && textInput.trim()) {
            onAddContext({ type: 'text', content: textInput, label: `Text snippet (${textInput.substring(0, 20)}...)` });
            setTextInput('');
        } else if (activeTab === 'url' && urlInput.trim()) {
            onAddContext({ type: 'url', content: urlInput, label: urlInput });
            setUrlInput('');
        }
    }, [activeTab, textInput, urlInput, onAddContext]);

    const handleReorder = (newOrder: InjectedContext[]) => {
        onReorder(newOrder.map(item => item.id));
    };

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const tokenPercentage = (totalTokens / maxTokens) * 100;
    const tokenStatusColor = useMemo(() => {
        if (tokenPercentage > 90) return "bg-destructive";
        if (tokenPercentage > 75) return "bg-yellow-500";
        return "bg-primary";
    }, [tokenPercentage]);

    const isApproachingLimit = tokenPercentage > 75;

    return (
        <Card className="w-full h-full flex flex-col">
            <CardHeader>
                <CardTitle>Context Injection</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab as (value: string) => void} className="mb-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="text">Paste Text</TabsTrigger>
                        <TabsTrigger value="url">Enter URL</TabsTrigger>
                        <TabsTrigger value="file">Upload File</TabsTrigger>
                    </TabsList>
                    <TabsContent value="text" className="mt-4">
                        <Textarea 
                            placeholder="Paste any text content here..." 
                            value={textInput} 
                            onChange={(e) => setTextInput(e.target.value)}
                            className="h-24"
                        />
                    </TabsContent>
                    <TabsContent value="url" className="mt-4">
                        <Input 
                            type="url" 
                            placeholder="https://example.com/article" 
                            value={urlInput} 
                            onChange={(e) => setUrlInput(e.target.value)}
                        />
                    </TabsContent>
                    <TabsContent value="file" className="mt-4 text-center text-muted-foreground text-sm">
                        <p>File upload reference is not yet implemented.</p>
                        <Button variant="outline" className="mt-2" disabled><Upload className="h-4 w-4 mr-2" />Select File</Button>
                    </TabsContent>
                </Tabs>
                <Button onClick={handleAddContext} disabled={ (activeTab === 'text' && !textInput.trim()) || (activeTab === 'url' && !urlInput.trim()) } className="w-full mb-4">
                    Add to Context
                </Button>

                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    <Reorder.Group axis="y" values={injectedContexts} onReorder={handleReorder} className="list-none p-0 m-0">
                        <AnimatePresence>
                            {injectedContexts.map(context => (
                                <ContextItem 
                                    key={context.id} 
                                    context={context} 
                                    onRemove={onRemoveContext} 
                                    isExpanded={expandedItems.has(context.id)}
                                    onToggleExpand={() => toggleExpand(context.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </Reorder.Group>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="font-medium">Total Tokens</span>
                        <span className={cn("font-bold", { "text-destructive": tokenPercentage > 90, "text-yellow-500": tokenPercentage > 75 && tokenPercentage <= 90 })}>
                            {totalTokens} / {maxTokens}
                        </span>
                    </div>
                    <Progress value={tokenPercentage} className={cn("h-2", tokenStatusColor)} />
                    {isApproachingLimit && (
                        <div className="mt-2 flex items-center text-yellow-500 text-xs">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {tokenPercentage > 100 
                                ? `Token limit exceeded. Content will be truncated.`
                                : `Approaching token limit. Older or lower priority context may be truncated.`
                            }
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
