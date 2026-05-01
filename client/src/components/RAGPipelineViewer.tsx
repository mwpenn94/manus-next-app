import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, Cpu, ChevronsRight, Sparkles, Clock, BarChart3, Settings2, Thermometer, Layers } from 'lucide-react';

// Type Definitions
interface Document {
  id: string;
  title: string;
  content: string;
  score: number;
  rerank_score?: number;
  source: string;
}

interface Chunk {
  id: string;
  documentId: string;
  text: string;
  start: number;
  end: number;
}

interface PipelineTimings {
  retrieval: number;
  reranking: number;
  contextAssembly: number;
  generation: number;
}

// Mock Data
const initialDocuments: Document[] = [
  { id: 'doc-1', title: 'The Future of AI in Medicine', content: 'Artificial intelligence is poised to revolutionize medicine, from diagnostics to personalized treatment plans. This will lead to better patient outcomes.', score: 0.92, rerank_score: 0.95, source: 'Nature Reviews' },
  { id: 'doc-2', title: 'Large Language Models Explained', content: 'LLMs are a type of AI that can understand and generate human-like text. They are trained on vast amounts of data from the internet.', score: 0.88, rerank_score: 0.91, source: 'Wikipedia' },
  { id: 'doc-3', title: 'RAG Architectures', content: 'Retrieval-Augmented Generation combines the power of pre-trained language models with external knowledge bases to produce more factual answers.', score: 0.85, rerank_score: 0.93, source: 'ArXiv' },
  { id: 'doc-4', title: 'Advancements in Prompt Engineering', content: 'Crafting effective prompts is crucial for getting the best results from language models. Recent techniques focus on few-shot and chain-of-thought prompting.', score: 0.81, rerank_score: 0.82, source: 'Towards Data Science' },
  { id: 'doc-5', title: 'Ethical Considerations of AI', content: 'As AI becomes more powerful, it is important to consider the ethical implications of its use. Bias, privacy, and accountability are key concerns that need to be addressed.', score: 0.76, rerank_score: 0.75, source: 'AI Ethics Journal' },
];

const mockChunks: Chunk[] = [
  { id: 'chunk-1', documentId: 'doc-3', text: 'external knowledge bases', start: 102, end: 126 },
  { id: 'chunk-2', documentId: 'doc-1', text: 'diagnostics to personalized treatment plans', start: 60, end: 103 },
  { id: 'chunk-3', documentId: 'doc-2', text: 'generate human-like text', start: 49, end: 73 },
];

const mockTimings: PipelineTimings = {
  retrieval: 120,
  reranking: 45,
  contextAssembly: 15,
  generation: 850,
};

const mockGeneratedText = "Based on the retrieved documents, Retrieval-Augmented Generation (RAG) is a key architecture for enhancing Large Language Models (LLMs). It combines pre-trained models with external knowledge bases [3], allowing AI to provide more accurate and contextually relevant answers. This is particularly impactful in fields like medicine, where it can aid in diagnostics and personalized treatment plans [1].";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function RAGPipelineViewer() {
  const [query, setQuery] = useState('What is Retrieval-Augmented Generation?');
  const [useReranking, setUseReranking] = useState(true);
  const [temperature, setTemperature] = useState([0.7]);
  const [isRunning, setIsRunning] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  const sortedDocuments = useMemo(() => {
    const docsCopy = [...documents];
    if (useReranking) {
      return docsCopy.sort((a, b) => (b.rerank_score ?? b.score) - (a.rerank_score ?? a.score));
    } 
    return docsCopy.sort((a, b) => b.score - a.score);
  }, [documents, useReranking]);

  const handleRunPipeline = useCallback(() => {
    setIsRunning(true);
    setDisplayedText('');
    const words = mockGeneratedText.split(' ');
    let currentText = '';
    words.forEach((word, index) => {
      setTimeout(() => {
        currentText += (index > 0 ? ' ' : '') + word;
        setDisplayedText(currentText);
        if (index === words.length - 1) {
          setIsRunning(false);
        }
      }, index * (30 / (temperature[0] + 0.1)));
    });
  }, [temperature]);

  useEffect(() => {
    handleRunPipeline();
  }, []);

  const getHighlightedContent = (doc: Document) => {
    const chunk = mockChunks.find(c => c.documentId === doc.id);
    if (!chunk) return doc.content;
    const { start, end } = chunk;
    return (
      <>
        {doc.content.substring(0, start)}
        <mark className="bg-primary/20 text-primary-foreground rounded px-1">
          {doc.content.substring(start, end)}
        </mark>
        {doc.content.substring(end)}
      </>
    );
  };

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground p-4 lg:p-6 font-sans flex flex-col lg:flex-row gap-6 max-w-screen-2xl mx-auto">
        
        <aside className="w-full lg:w-1/3 lg:max-w-md flex flex-col gap-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5"/> Query & Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input type="text" placeholder="Enter your query..." value={query} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} className="pr-10" disabled={isRunning} />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleRunPipeline} disabled={isRunning}>
                    <ChevronsRight className="w-5 h-5" />
                  </Button>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reranking-switch" className="flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Reranking</Label>
                    <Switch id="reranking-switch" checked={useReranking} onCheckedChange={setUseReranking} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperature-slider" className="flex items-center gap-2"><Thermometer className="w-4 h-4"/> Temperature: {temperature[0]}</Label>
                    <Slider id="temperature-slider" min={0} max={1} step={0.1} value={temperature} onValueChange={setTemperature} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5"/> Pipeline Latency</CardTitle>
                <CardDescription>Total: {Object.values(mockTimings).reduce((a, b) => a + b, 0)}ms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {Object.entries(mockTimings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{width: `${(value / 1000) * 100}%`}}></div></div>
                      <span className="font-mono text-primary w-12 text-right">{value}ms</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </aside>

        <main className="flex-1 flex flex-col gap-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> Retrieval</CardTitle>
                <CardDescription>Found {sortedDocuments.length} relevant documents. {useReranking && "(Reranked)"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <AnimatePresence>
                    {sortedDocuments.map((doc, index) => (
                      <motion.div key={doc.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                              <div className="flex justify-between items-start">
                                <p className="font-medium flex-1 pr-4 truncate">{doc.title}</p>
                                <Badge variant={(useReranking ? doc.rerank_score! : doc.score) > 0.9 ? "default" : "secondary"}>{(useReranking ? doc.rerank_score! : doc.score).toFixed(2)}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Source: {doc.source}</p>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-96 max-h-72 overflow-y-auto scrollbar-thin">
                            <h4 className="font-bold mb-2">Chunk Viewer</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{getHighlightedContent(doc)}</p>
                          </PopoverContent>
                        </Popover>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.6 }}>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5"/> Context Assembly</CardTitle>
                <CardDescription>Top {mockChunks.length} chunks selected for generation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockChunks.map((chunk, index) => (
                  <motion.div key={chunk.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + index * 0.1 }}>
                    <div className="text-xs border border-dashed border-border/50 rounded-md p-2 bg-muted/30">
                      <p className="truncate text-muted-foreground">...{chunk.text}...</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.8 }}>
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5"/> Generation</CardTitle>
                <CardDescription>Synthesizing answer from assembled context.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none p-4 border border-border rounded-lg bg-muted/20 min-h-[120px]">
                  <p>
                    {displayedText.split(/(\d+\])/g).map((part, i) =>
                      /(\d+\])/.test(part) ? (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <span className="text-primary font-bold cursor-pointer transition-colors hover:text-primary/80">{part}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Source: {initialDocuments[parseInt(part.replace(/[\[\]]/g, '')) - 1]?.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        part
                      )
                    )}
                    {isRunning && <span className="animate-pulse">▋</span>}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </TooltipProvider>
  );
}
