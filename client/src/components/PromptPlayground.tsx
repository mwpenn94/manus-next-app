import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { History, Save, Bot, User, Sparkles, ChevronsLeftRight, Copy, Trash2, Loader, Check, Settings, FileText } from "lucide-react";

// Type Definitions
type Model = "GPT-4" | "Claude" | "Gemini" | "Llama";
type PromptTemplate = { id: string; name: string; systemPrompt: string; userPrompt: string; };
type HistoryItem = { id: string; userPrompt: string; systemPrompt: string; response: APIResponse; timestamp: string; model: Model; };
type APIResponse = { content: string; tokens: number; latency: number; };

// Mock Data
const mockTemplatesData: PromptTemplate[] = [
  { id: "template-1", name: "Creative Story Writer", systemPrompt: "You are a world-renowned fantasy author.", userPrompt: "A lone {{character_type}} discovers a hidden {{object}} in a {{location}}." },
  { id: "template-2", name: "Code Explainer", systemPrompt: "You are an expert software engineer.", userPrompt: "Explain this {{language}} code: {{code_snippet}}" },
  { id: "template-3", name: "Marketing Copy", systemPrompt: "You are a marketing genius.", userPrompt: "Generate a tagline for a {{product}} that helps users {{verb}}." },
];

const mockHistoryData: HistoryItem[] = [
  { id: "hist-1", userPrompt: "Write a poem about the moon.", systemPrompt: "You are a poet.", response: { content: "The moon, a silent pearl in cosmic sea...", tokens: 28, latency: 450 }, model: "GPT-4", timestamp: "2026-05-01 10:30:00" },
  { id: "hist-2", userPrompt: "What is the capital of Australia?", systemPrompt: "You are a helpful assistant.", response: { content: "The capital of Australia is Canberra.", tokens: 8, latency: 120 }, model: "Gemini", timestamp: "2026-05-01 09:15:00" },
];

// Main Component
export default function PromptPlayground() {
  const [model, setModel] = useState<Model>('GPT-4');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(512);
  const [systemPrompt, setSystemPrompt] = useState<string>("You are a helpful assistant.");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>(mockHistoryData);
  const [templates, setTemplates] = useState<PromptTemplate[]>(mockTemplatesData);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [response2, setResponse2] = useState<APIResponse | null>(null);

  const extractedVariables = useMemo(() => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(userPrompt)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  }, [userPrompt]);

  const interpolatedPrompt = useMemo(() => {
    return extractedVariables.reduce((prompt, v) => {
      return prompt.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), variables[v] || `{{${v}}}`);
    }, userPrompt);
  }, [userPrompt, variables, extractedVariables]);

  const handleRunPrompt = useCallback(async () => {
    if (!interpolatedPrompt) return;
    setIsLoading(true);
    setResponse(null);
    if(compareMode) setResponse2(null);

    const run = (m: Model, isCompare = false) => new Promise<APIResponse>(resolve => {
        setTimeout(() => {
            const mockResponse: APIResponse = {
                content: `Mock response for \"${interpolatedPrompt}\" from ${m}. Temp: ${temperature}, Max Tokens: ${maxTokens}`,
                tokens: Math.floor(Math.random() * 100) + 50,
                latency: Math.floor(Math.random() * 500) + 200 + (isCompare ? 500 : 0),
            };
            resolve(mockResponse);
        }, 1000 + (isCompare ? 500 : 0));
    });

    const mainResponse = await run(model);
    setResponse(mainResponse);
    const newHistoryItem: HistoryItem = {
        id: `hist-${Date.now()}`,
        userPrompt: interpolatedPrompt, systemPrompt, response: mainResponse, model,
        timestamp: new Date().toISOString(),
    };
    setHistory(prev => [newHistoryItem, ...prev]);

    if (compareMode) {
        const otherModel = model === 'GPT-4' ? 'Claude' : 'GPT-4';
        const compareResponse = await run(otherModel, true);
        setResponse2(compareResponse);
    }

    setIsLoading(false);
  }, [interpolatedPrompt, systemPrompt, model, compareMode, temperature, maxTokens]);

  const handleLoadTemplate = (template: PromptTemplate) => {
    setSystemPrompt(template.systemPrompt);
    setUserPrompt(template.userPrompt);
    setVariables({});
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setSystemPrompt(item.systemPrompt);
    setUserPrompt(item.userPrompt);
    setResponse(item.response);
    setModel(item.model);
  };

  const handleSaveTemplate = () => {
    const newTemplate: PromptTemplate = {
      id: `template-${Date.now()}`,
      name: `New Template - ${new Date().toLocaleTimeString()}`,
      systemPrompt,
      userPrompt,
    };
    setTemplates(prev => [newTemplate, ...prev]);
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  return (
    <TooltipProvider>
      <div className="flex h-[95vh] max-w-7xl mx-auto bg-background text-foreground font-sans rounded-lg border border-border overflow-hidden shadow-2xl">
        <aside className="w-72 border-r border-border p-3 flex flex-col gap-4 bg-card">
          <h2 className="text-lg font-semibold flex items-center gap-2 px-1"><FileText className="w-5 h-5" /> Templates</h2>
          <div className="flex-1 overflow-y-auto pr-1 space-y-1">
            {templates.map((template) => (
              <motion.div key={template.id} onClick={() => handleLoadTemplate(template)} className="text-sm p-2 rounded-md hover:bg-muted cursor-pointer" whileTap={{ scale: 0.98 }}>{template.name}</motion.div>
            ))}
          </div>
          <Separator />
           <h2 className="text-lg font-semibold flex items-center gap-2 px-1"><History className="w-5 h-5" /> History</h2>
          <div className="flex-1 overflow-y-auto pr-1 space-y-1">
              {history.map((item) => (
                <motion.div key={item.id} onClick={() => handleSelectHistory(item)} className="text-sm p-2 rounded-md hover:bg-muted cursor-pointer truncate" whileTap={{ scale: 0.98 }}>{item.userPrompt}</motion.div>
              ))}
          </div>
           <Button variant="outline" size="sm" onClick={() => setHistory([])}><Trash2 className="w-4 h-4 mr-2" /> Clear History</Button>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="border-b border-border p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-4 ml-2">
                <Switch id="compare-mode" checked={compareMode} onCheckedChange={setCompareMode} />
                <Label htmlFor="compare-mode" className="text-sm">Compare Mode</Label>
            </div>
            <div className="flex items-center gap-2">
              <Select value={model} onValueChange={(value: Model) => setModel(value)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GPT-4">GPT-4</SelectItem>
                  <SelectItem value="Claude">Claude</SelectItem>
                  <SelectItem value="Gemini">Gemini</SelectItem>
                  <SelectItem value="Llama">Llama</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleRunPrompt} disabled={isLoading || !userPrompt} className="w-24">
                <AnimatePresence mode="wait">
                  <motion.span key={isLoading ? "loading" : "ready"} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                    {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> Run</>}
                  </motion.span>
                </AnimatePresence>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Save className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent><DropdownMenuItem onClick={handleSaveTemplate}>Save as Template</DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className={cn("flex-1 grid gap-4 p-4", compareMode ? "grid-cols-3" : "grid-cols-2")}>
            <div className={cn("flex flex-col gap-4", compareMode ? "col-span-1" : "col-span-1")}>
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-lg"><span><User className="w-5 h-5 mr-2 inline-block" /> Prompt</span>
                            <div className="flex items-center gap-3">
                                <Tooltip><TooltipTrigger asChild><Label className="text-sm font-normal">T: {temperature.toFixed(1)}</Label></TooltipTrigger><TooltipContent><Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} max={2} step={0.1} className="w-24" /></TooltipContent></Tooltip>
                                <Tooltip><TooltipTrigger asChild><Label className="text-sm font-normal">MT: {maxTokens}</Label></TooltipTrigger><TooltipContent><Slider value={[maxTokens]} onValueChange={([v]) => setMaxTokens(v)} max={4096} step={64} className="w-24" /></TooltipContent></Tooltip>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                        <Textarea placeholder="System prompt..." value={systemPrompt} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemPrompt(e.target.value)} className="h-24 resize-none bg-muted/30 text-sm" />
                        <Separator />
                        <Textarea placeholder="User prompt with {{variables}}..." value={userPrompt} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserPrompt(e.target.value)} className="flex-1 resize-none text-sm" />
                    </CardContent>
                    {extractedVariables.length > 0 && (
                        <CardFooter className="flex flex-col gap-2 items-start border-t pt-4">
                            <h4 className="font-semibold text-sm">Variables</h4>
                            <div className="grid grid-cols-2 gap-2 w-full">
                                {extractedVariables.map(v => (
                                    <div key={v} className="flex flex-col gap-1.5">
                                        <Label htmlFor={`var-${v}`} className="text-xs text-muted-foreground">{v}</Label>
                                        <Input id={`var-${v}`} value={variables[v] || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariableChange(v, e.target.value)} placeholder={`Enter ${v}...`} />
                                    </div>
                                ))}
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>

            <AnimatePresence>
              {compareMode ? (
                <>
                  <ResponsePanel key="resp1" model={model} response={response} isLoading={isLoading} />
                  <ResponsePanel key="resp2" model={model === 'GPT-4' ? 'Claude' : 'GPT-4'} response={response2} isLoading={isLoading} />
                </>
              ) : (
                <ResponsePanel key="resp-single" model={model} response={response} isLoading={isLoading} className="col-span-1" />
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

interface ResponsePanelProps { model: Model; response: APIResponse | null; isLoading: boolean; className?: string; }

function ResponsePanel({ model, response, isLoading, className }: ResponsePanelProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }} className={className}>
      <Card className="flex-1 flex flex-col h-full relative group">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg"><span><Bot className="w-5 h-5 mr-2 inline-block" /> {model}</span>
            {response && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{response.tokens} tokens</span><span>{response.latency}ms</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto relative text-sm">
          {isLoading && !response && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 rounded-b-lg">
              <Loader className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {response ? (
            <p className="whitespace-pre-wrap">{response.content}</p>
          ) : (
            !isLoading && <p className="text-muted-foreground">The model's response will appear here.</p>
          )}
        </CardContent>
        {response && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(response.content)}>
                    {hasCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
            </div>
        )}
      </Card>
    </motion.div>
  );
}
