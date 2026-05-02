import React, { useState, useMemo, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Zap, Gauge, ChevronsUpDown, History, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

const SpeedQualityChart = ({ depth }: { depth: number }) => {
  const quality = useMemo(() => Math.min(100, 10 + (depth - 1) * 10), [depth]);
  const speed = useMemo(() => Math.max(10, 110 - (depth - 1) * 10), [depth]);

  return (
    <div className="space-y-2">
      <h3 className="text-base font-medium text-center text-neutral-300">Speed vs. Quality Trade-off</h3>
      <div className="w-full h-28 p-4 rounded-lg bg-neutral-900/50 border border-neutral-800">
        <svg width="100%" height="100%" viewBox="0 0 300 80">
          <defs>
            <linearGradient id="qualityGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#84cc16" />
            </linearGradient>
            <linearGradient id="speedGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Quality Bar */}
          <text x="0" y="15" fill="#a3a3a3" fontSize="12">Quality</text>
          <rect x="60" y="5" width="240" height="10" rx="5" fill="#404040" />
          <motion.rect
            x="60"
            y="5"
            height="10"
            rx="5"
            fill="url(#qualityGradient)"
            initial={{ width: 0 }}
            animate={{ width: (quality / 100) * 240 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />

          {/* Speed Bar */}
          <text x="0" y="45" fill="#a3a3a3" fontSize="12">Speed</text>
          <rect x="60" y="35" width="240" height="10" rx="5" fill="#404040" />
          <motion.rect
            x="60"
            y="35"
            height="10"
            rx="5"
            fill="url(#speedGradient)"
            initial={{ width: 0 }}
            animate={{ width: (speed / 100) * 240 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />

          <g transform={`translate(${60 + (quality / 100) * 240}, 0)`}>
            <motion.line
              x1={0} y1={20} x2={0} y2={28}
              stroke="#a3a3a3" strokeWidth="1" strokeDasharray="2 2"
              initial={{ y2: 20 }}
              animate={{ y2: 28 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </g>

          <g transform={`translate(${60 + (speed / 100) * 240}, 0)`}>
            <motion.line
              x1={0} y1={50} x2={0} y2={58}
              stroke="#a3a3a3" strokeWidth="1" strokeDasharray="2 2"
              initial={{ y2: 50 }}
              animate={{ y2: 58 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </g>

          <text x="0" y="75" fill="#737373" fontSize="10">Lower</text>
          <text x="270" y="75" fill="#737373" fontSize="10" textAnchor="end">Higher</text>
        </svg>
      </div>
    </div>
  );
};

// Mock data and types
type DepthPreset = 'Quick' | 'Standard' | 'Deep' | 'Exhaustive';

interface PresetConfig {
  name: DepthPreset;
  depth: number;
  description: string;
  time: string;
  cost: number;
}

const presets: PresetConfig[] = [
  { name: 'Quick', depth: 2, description: 'Fastest, surface-level answer.', time: '~1-3s', cost: 0.5 },
  { name: 'Standard', depth: 5, description: 'Balanced speed and detail.', time: '~4-8s', cost: 1.2 },
  { name: 'Deep', depth: 8, description: 'Thorough and comprehensive.', time: '~10-20s', cost: 3.0 },
  { name: 'Exhaustive', depth: 10, description: 'Maximum reasoning and exploration.', time: '>25s', cost: 7.5 },
];

interface HistoryItem {
  id: string;
  query: string;
  depth: number;
  timestamp: string;
}

const mockHistory: HistoryItem[] = [
  { id: 'h1', query: 'What is Sovereign AI?', depth: 5, timestamp: '2m ago' },
  { id: 'h2', query: 'Summarize the latest AI news', depth: 8, timestamp: '15m ago' },
  { id: 'h3', query: 'Write a poem about robots', depth: 2, timestamp: '1h ago' },
];

export default function ResponseDepthController() {
  const [selectedPreset, setSelectedPreset] = useState<DepthPreset>('Standard');
  const [customDepth, setCustomDepth] = useState<number>(5);
  const [isAutoDepth, setIsAutoDepth] = useState<boolean>(false);
  const [tokenBudget, setTokenBudget] = useState<number>(4096);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentTokenCount, setCurrentTokenCount] = useState<number>(0);

  const activeDepth = useMemo(() => isAutoDepth ? 5 : customDepth, [isAutoDepth, customDepth]); // Mock auto-depth as 'Standard'

  const activePreset = useMemo(() => {
    return presets.find(p => p.depth === activeDepth) || presets.find(p => p.name === selectedPreset) || presets[1];
  }, [activeDepth, selectedPreset]);

  const handleGeneration = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setCurrentTokenCount(0);

    let count = 0;
    const interval = setInterval(() => {
      count += Math.floor(Math.random() * 50) + 50; // Simulate variable token generation
      if (count >= tokenBudget) {
        count = tokenBudget;
        clearInterval(interval);
        setIsGenerating(false);
      } else {
        setCurrentTokenCount(count);
      }
    }, 200);

    setTimeout(() => {
        if(isGenerating) {
            clearInterval(interval);
            setIsGenerating(false);
            setCurrentTokenCount(tokenBudget);
        }
    }, 10000); // 10 second generation simulation
  };

  const handlePresetChange = useCallback((preset: PresetConfig) => {
    setSelectedPreset(preset.name);
    setCustomDepth(preset.depth);
    if (isAutoDepth) setIsAutoDepth(false);
  }, [isAutoDepth]);

  const handleSliderChange = (value: number[]) => {
    setCustomDepth(value[0]);
    const matchingPreset = presets.find(p => p.depth === value[0]);
    setSelectedPreset(matchingPreset ? matchingPreset.name : 'Standard');
    if (isAutoDepth) setIsAutoDepth(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-transparent border-neutral-800 text-neutral-200">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-6 h-6 text-neutral-400" />
          <CardTitle className="text-xl font-semibold">Response Depth</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <label htmlFor="auto-depth" className="flex items-center gap-2 cursor-pointer text-sm text-neutral-400">
                  <Zap className="w-4 h-4" />
                  <span>Auto</span>
                </label>
              </TooltipTrigger>
              <TooltipContent className="bg-neutral-900 border-neutral-700 text-neutral-300">
                <p>Let AI adjust depth based on query</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Switch
            id="auto-depth"
            checked={isAutoDepth}
            onCheckedChange={setIsAutoDepth}
            className="data-[state=checked]:bg-oklch(0.68 0.26 264) data-[state=unchecked]:bg-neutral-700"
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-400 mb-6">Control the AI's reasoning and generation effort for each response.</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {presets.map((preset) => (
            <TooltipProvider key={preset.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedPreset === preset.name && !isAutoDepth ? 'default' : 'outline'}
                    onClick={() => handlePresetChange(preset)}
                    className={cn(
                      "w-full h-auto text-left flex flex-col items-start p-3 transition-all duration-200",
                      "border-neutral-700 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed",
                      selectedPreset === preset.name && !isAutoDepth
                        ? "bg-oklch(0.68 0.26 264) border-oklch(0.68 0.26 264) text-white shadow-[0_0_15px_rgba(138,92,245,0.3)]"
                        : "bg-neutral-800/50"
                    )}
                    disabled={isAutoDepth}
                  >
                    <span className="font-semibold text-base">{preset.name}</span>
                    <span className={cn("text-xs mt-1", selectedPreset === preset.name && !isAutoDepth ? "text-white/80" : "text-neutral-400")}>
                      {preset.description}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-neutral-900 border-neutral-700 text-neutral-300">
                  <p>Time: {preset.time}, Est. Cost: ${preset.cost.toFixed(2)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        <Separator className="my-6 bg-neutral-700" />

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-neutral-400" />
              <h3 className="text-base font-medium">Custom Depth</h3>
            </div>
            <motion.div
              key={activeDepth}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="px-3 py-1 rounded-md bg-neutral-700 text-white font-mono text-sm"
            >
              {activeDepth}
            </motion.div>
          </div>
          <Slider
            value={[customDepth]}
            onValueChange={handleSliderChange}
            min={1}
            max={10}
            step={1}
            className={cn("w-full", isAutoDepth && "opacity-50")}
            disabled={isAutoDepth}
          />
        </div>

        <Separator className="my-6 bg-neutral-700" />

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-neutral-800 border-neutral-700">
            <TabsTrigger value="settings" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white">
              <ChevronsUpDown className="w-4 h-4 mr-2" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="settings" className="mt-6 space-y-6">
            <SpeedQualityChart depth={activeDepth} />
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-neutral-400" />
                        <h3 className="text-base font-medium">Token Budget</h3>
                    </div>
                    <Input
                        type="number"
                        value={tokenBudget}
                        onChange={(e) => setTokenBudget(Number(e.target.value))}
                        className="w-28 bg-neutral-900 border-neutral-700 text-white font-mono text-right"
                        step={256}
                    />
                </div>
                <div className="relative h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <AnimatePresence>
                        {isGenerating && (
                            <motion.div
                                className="absolute top-0 left-0 h-full bg-oklch(0.68 0.26 264)"
                                initial={{ width: '0%' }}
                                animate={{ width: `${(currentTokenCount / tokenBudget) * 100}%` }}
                                exit={{ width: `${(currentTokenCount / tokenBudget) * 100}%` }}
                                transition={{ duration: 10, ease: 'linear' }}
                            />
                        )}
                    </AnimatePresence>
                </div>
                <div className="text-xs text-neutral-400 text-right font-mono">
                    {isGenerating ? `${currentTokenCount} / ${tokenBudget}` : `Limit: ${tokenBudget} tokens`}
                </div>
            </div>
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <div className="space-y-3 pr-2 h-40 overflow-y-auto">
              {mockHistory.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-neutral-800/50">
                  <p className="truncate text-neutral-300 w-4/6">{item.query}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-400 text-xs">{item.timestamp}</span>
                    <span className="font-mono text-white bg-neutral-700 rounded px-2 py-0.5 text-xs">{item.depth}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6 bg-neutral-700" />

        <div className="flex flex-col items-center gap-4">
            <div className="text-center">
                <p className="text-sm text-neutral-400">Estimated Cost for this Response</p>
                <p className="text-2xl font-bold text-white">${activePreset.cost.toFixed(2)}</p>
            </div>
            <Button 
                onClick={handleGeneration}
                disabled={isGenerating}
                className="w-full bg-oklch(0.68 0.26 264) hover:bg-oklch(0.65 0.26 264) text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-neutral-600 disabled:hover:scale-100"
            >
                {isGenerating ? 'Generating...' : 'Start Generation'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
