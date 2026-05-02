import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UploadCloud, FileText, X, BrainCircuit, SlidersHorizontal, RefreshCw, AlertTriangle, PlusCircle, Trash2, CheckCircle2, Loader, Sparkles, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Type Definitions
type DocumentStatus = 'processed' | 'pending' | 'processing' | 'failed';
type TrainingStatus = 'idle' | 'training' | 'completed';
type FocusArea = 'General' | 'Financial' | 'Technical' | 'Creative';

interface UploadedFile {
  id: string;
  name: string;
  status: DocumentStatus;
}

interface StyleSettings {
  formality: number;
  verbosity: number;
  technicalDepth: number;
  creativity: number;
}

interface ExamplePair {
  id: string;
  prompt: string;
  response: string;
}

const initialFiles: UploadedFile[] = [
  { id: 'doc1', name: 'project_brief.docx', status: 'processed' },
  { id: 'doc2', name: 'research_paper_final.pdf', status: 'processed' },
  { id: 'doc3', name: 'meeting_notes_q2.txt', status: 'processed' },
  { id: 'doc4', name: 'competitive_analysis.pdf', status: 'pending' },
  { id: 'doc5', name: 'marketing_plan_v3.docx', status: 'pending' },
];

const initialStyleSettings: StyleSettings = {
  formality: 50,
  verbosity: 25,
  technicalDepth: 30,
  creativity: 80,
};

const initialFocusAreas: FocusArea[] = ['Financial', 'Technical'];

const initialExamplePairs: ExamplePair[] = [
    { id: 'ex1', prompt: 'Summarize our Q2 performance.', response: 'We saw a 15% growth in revenue, driven by the new product line...' },
];

export default function PersonalAITrainingPanel() {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [styleSettings, setStyleSettings] = useState<StyleSettings>(initialStyleSettings);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>(initialFocusAreas);
  const [examplePairs, setExamplePairs] = useState<ExamplePair[]>(initialExamplePairs);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('idle');
  const [trainingProgress, setTrainingProgress] = useState(0);

  const handleReset = () => {
    setFiles(initialFiles);
    setStyleSettings(initialStyleSettings);
    setFocusAreas(initialFocusAreas);
    setExamplePairs(initialExamplePairs);
    setTrainingStatus('idle');
    setTrainingProgress(0);
  };

  const handleStartTraining = () => {
    setTrainingStatus('training');
    setTrainingProgress(0);
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTrainingStatus('completed');
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 300);
  };

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8 bg-oklch(98.05% 0.0106 248.62) dark:bg-oklch(19.5% 0.024 248.62)">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-oklch(29.23% 0.037 248.62) dark:text-oklch(93.56% 0.019 248.62)">Personal AI Training</h1>
            <p className="mt-2 text-lg text-oklch(59.8% 0.028 248.62) dark:text-oklch(69.71% 0.021 248.62)">Train your Sovereign AI to match your unique style and knowledge.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
              <DocumentUploadSection files={files} setFiles={setFiles} />
              <StylePreferenceSection settings={styleSettings} setSettings={setStyleSettings} />
              <FocusAreaSection selectedAreas={focusAreas} setSelectedAreas={setFocusAreas} />
              <ExampleResponseSection pairs={examplePairs} setPairs={setExamplePairs} />
            </div>

            <div className="space-y-8 lg:sticky lg:top-8">
              <TrainingProgressSection status={trainingStatus} progress={trainingProgress} onStart={handleStartTraining} />
              <ActiveTrainingSessions files={files} trainingStatus={trainingStatus} />
              <ABComparisonSection />
              <ResetDefaultsSection onReset={handleReset} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function DocumentUploadSection({ files, setFiles }: { files: UploadedFile[], setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>> }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({ id: crypto.randomUUID(), name: file.name, status: 'pending' as DocumentStatus }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UploadCloud className="w-6 h-6 text-indigo-500" /> Document Upload</CardTitle>
        <CardDescription>Upload documents to build your AI's knowledge base. Supports PDF, DOCX, TXT.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300',
            isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-105' : 'border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400'
          )}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) {
                const newFiles = Array.from(e.dataTransfer.files).map(file => ({ id: crypto.randomUUID(), name: file.name, status: 'pending' as DocumentStatus }));
                setFiles(prev => [...prev, ...newFiles]);
            }
          }}
          onClick={() => inputRef.current?.click()}
        >
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1}} transition={{ delay: 0.1}}>
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Drag & drop files here, or <span className="font-semibold text-indigo-600 dark:text-indigo-400">click to browse</span></p>
          </motion.div>
          <Input type="file" multiple ref={inputRef} className="hidden" onChange={handleFileChange} />
        </div>
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Uploaded Files ({files.length})</h3>
          <ScrollArea className="h-40 mt-2 -mr-4">
            <ul className="space-y-2 pr-4">
                <AnimatePresence>
                    {files.map(file => (
                        <motion.li
                            key={file.id}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                            className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800/80 rounded-md"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant={file.status === 'processed' ? 'secondary' : 'outline'}>{file.status}</Badge>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={() => removeFile(file.id)}><X className="h-4 w-4 text-gray-500 hover:text-red-500" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Remove File</p></TooltipContent>
                                </Tooltip>
                            </div>
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ul>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

function StylePreferenceSection({ settings, setSettings }: { settings: StyleSettings, setSettings: React.Dispatch<React.SetStateAction<StyleSettings>> }) {
    const sliderOptions = [
        { id: 'formality', label: 'Formality', minLabel: 'Casual', maxLabel: 'Formal', value: settings.formality },
        { id: 'verbosity', label: 'Verbosity', minLabel: 'Concise', maxLabel: 'Detailed', value: settings.verbosity },
        { id: 'technicalDepth', label: 'Technical Depth', minLabel: 'High-Level', maxLabel: 'In-Depth', value: settings.technicalDepth },
        { id: 'creativity', label: 'Creativity', minLabel: 'Conventional', maxLabel: 'Innovative', value: settings.creativity },
    ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="w-6 h-6 text-indigo-500" /> Style Preferences</CardTitle>
        <CardDescription>Fine-tune your AI's personality and communication style.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {sliderOptions.map(opt => (
            <div key={opt.id} className="grid gap-2">
                <div className="flex justify-between items-center">
                    <label className="font-medium text-sm">{opt.label}</label>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{opt.value}%</span>
                </div>
                <Slider 
                    value={[opt.value]} 
                    onValueChange={([v]) => setSettings(s => ({ ...s, [opt.id]: v }))} 
                    max={100} 
                    step={1} 
                    className="[&>span:first-child]:bg-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                    <span>{opt.minLabel}</span>
                    <span>{opt.maxLabel}</span>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FocusAreaSection({ selectedAreas, setSelectedAreas }: { selectedAreas: FocusArea[], setSelectedAreas: React.Dispatch<React.SetStateAction<FocusArea[]>> }) {
    const allAreas: FocusArea[] = ['General', 'Financial', 'Technical', 'Creative'];

    const toggleArea = (area: FocusArea) => {
        setSelectedAreas(prev => 
            prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
        );
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-6 h-6 text-indigo-500" /> Focus Areas</CardTitle>
        <CardDescription>Select areas of expertise to prioritize during training.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {allAreas.map(area => (
            <Button 
                key={area} 
                variant={selectedAreas.includes(area) ? 'default' : 'outline'}
                onClick={() => toggleArea(area)}
                className={cn(
                    "transition-all",
                    selectedAreas.includes(area) && 'bg-indigo-600 hover:bg-indigo-700 text-white'
                )}
            >
                <AnimatePresence>
                {selectedAreas.includes(area) && 
                    <motion.div initial={{opacity: 0, width: 0, marginRight: 0}} animate={{opacity: 1, width: 'auto', marginRight: '0.5rem'}} exit={{opacity: 0, width: 0, marginRight: 0}}><CheckCircle2 className="w-4 h-4" /></motion.div>}
                </AnimatePresence>
                {area}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ExampleResponseSection({ pairs, setPairs }: { pairs: ExamplePair[], setPairs: React.Dispatch<React.SetStateAction<ExamplePair[]>> }) {
    const [newPrompt, setNewPrompt] = useState('');
    const [newResponse, setNewResponse] = useState('');

    const addPair = () => {
        if (!newPrompt || !newResponse) return;
        setPairs(prev => [...prev, { id: crypto.randomUUID(), prompt: newPrompt, response: newResponse }]);
        setNewPrompt('');
        setNewResponse('');
    };

    const removePair = (id: string) => {
        setPairs(pairs.filter(p => p.id !== id));
    };

  return (
    <Collapsible className="w-full" asChild>
        <Card>
            <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between w-full p-6 cursor-pointer">
                    <CardTitle>Example Response Pairs ({pairs.length})</CardTitle>
                    <Button variant="ghost" size="sm"><ChevronDown className="h-4 w-4"/></Button>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                    <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700/50">
                        <div className="space-y-1">
                            <label className="font-medium text-sm">User Prompt</label>
                            <Textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="e.g., Explain the concept of zero-knowledge proofs" />
                        </div>
                        <div className="space-y-1">
                            <label className="font-medium text-sm">Ideal AI Response</label>
                            <Textarea value={newResponse} onChange={e => setNewResponse(e.target.value)} placeholder="e.g., Imagine you want to prove to a friend you know a secret password..." rows={3} />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={addPair} disabled={!newPrompt || !newResponse}><PlusCircle className="w-4 h-4 mr-2" /> Add Example</Button>
                        </div>
                    </div>
                    <Separator />
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 pt-2">Saved Examples</h3>
                    <ScrollArea className="h-40 -mr-4">
                        <div className="space-y-3 pr-4">
                            <AnimatePresence>
                                {pairs.map(pair => (
                                    <motion.div
                                        key={pair.id}
                                        layout
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                                        className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700/50"
                                    >
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prompt: {pair.prompt}</p>
                                        <p className="text-sm mt-1 text-gray-600 dark:text-gray-400 line-clamp-2">Response: "{pair.response}"</p>
                                        <div className="text-right -mb-2 -mr-2 mt-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={() => removePair(pair.id)}><Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Delete Example</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </ScrollArea>
                </CardContent>
            </CollapsibleContent>
        </Card>
    </Collapsible>
  );
}

function TrainingProgressSection({ status, progress, onStart }: { status: TrainingStatus, progress: number, onStart: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Control</CardTitle>
      </CardHeader>
      <CardContent>
        {status !== 'idle' ? (
            <>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full [&>div]:bg-indigo-500" />
                <p className="text-center text-sm text-gray-500 mt-3">
                    {status === 'training' && 'Estimated completion: ~1 minute'}
                    {status === 'completed' && 'Training complete!'}
                </p>
            </>
        ) : (
            <div className="text-center text-gray-500 py-4">
                <p>Ready to start training.</p>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onStart} disabled={status === 'training'} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white">
            {status === 'training' && <Loader className="w-4 h-4 mr-2 animate-spin" />} 
            {status === 'completed' ? 'Retrain' : 'Start Training'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ActiveTrainingSessions({ files, trainingStatus }: { files: UploadedFile[], trainingStatus: TrainingStatus }) {
    const processedFiles = files.filter(f => f.status === 'processed').length;
    const totalFiles = files.length;

    const sessions = [
        { name: 'Style & Focus Tuning', status: trainingStatus === 'completed' ? 'Completed' : trainingStatus === 'training' ? 'In Progress' : 'Queued' },
        { name: `Document Processing (${processedFiles}/${totalFiles})`, status: trainingStatus === 'completed' ? 'Completed' : trainingStatus === 'training' ? 'In Progress' : 'Queued' },
        { name: 'Example Pair Integration', status: trainingStatus === 'completed' ? 'Completed' : 'Queued' },
    ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Training Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sessions.map((session, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="font-medium text-sm">{session.name}</span>
              <Badge variant={session.status === 'Completed' ? 'default' : 'outline'} className={cn(
                  session.status === 'Completed' && 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700',
                  session.status === 'In Progress' && 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
              )}>{session.status}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ABComparisonSection() {
    const [prompt, setPrompt] = useState('Write a short email to the team about the new project kickoff.');
    const [comparison, setComparison] = useState<{ before: string, after: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateComparison = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setComparison({
                before: 'Subject: New Project\n\nHi Team,\nWe are starting a new project. More details will follow.\n\nThanks',
                after: 'Subject: Project Phoenix: Kickoff! 🚀\n\nHi Team,\nExcited to announce the official kickoff of Project Phoenix! This is a major initiative and I can\'t wait to see what we accomplish together.\n\nBest,'
            });
            setIsGenerating(false);
        }, 1000);
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-500"/> A/B Comparison</CardTitle>
        <CardDescription>See the difference your training makes.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <label className="font-medium text-sm">Test Prompt</label>
          <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Enter a prompt to compare responses..." />
        </div>
        <div className="text-center mb-4">
          <Button variant="secondary" onClick={generateComparison} disabled={isGenerating}>
              {isGenerating && <Loader className="w-4 h-4 mr-2 animate-spin" />} 
              Generate Comparison
          </Button>
        </div>
        <AnimatePresence>
        {comparison && (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
                <div className="p-4 border rounded-lg bg-white dark:bg-black/20">
                    <h4 className="font-semibold mb-2 text-center">Before Training</h4>
                    <div className="text-sm p-3 bg-gray-100 dark:bg-gray-800 rounded-md min-h-[120px] whitespace-pre-wrap font-mono">{comparison.before}</div>
                </div>
                <div className="p-4 border-2 rounded-lg border-indigo-500 dark:border-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/10">
                    <h4 className="font-semibold mb-2 text-center text-indigo-600 dark:text-indigo-400">After Training</h4>
                    <div className="text-sm p-3 bg-white dark:bg-gray-800/50 rounded-md min-h-[120px] whitespace-pre-wrap font-mono">{comparison.after}</div>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function ResetDefaultsSection({ onReset }: { onReset: () => void }) {
    const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full"><RefreshCw className="w-4 h-4 mr-2" /> Reset to Defaults</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-red-500" /> Are you sure?</DialogTitle>
          <DialogDescription>
            This will reset all your personal AI training data, including uploaded documents, style preferences, and examples. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onReset(); setOpen(false); }}>Yes, Reset Everything</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
