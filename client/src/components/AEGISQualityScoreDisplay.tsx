import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { HelpCircle, TrendingUp, BarChart, Lightbulb, History, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type ScoreDimension = 'Accuracy' | 'Completeness' | 'Relevance' | 'Coherence' | 'Safety';

interface DimensionScore {
  dimension: ScoreDimension;
  score: number;
  explanation: string;
}

interface AegisScore {
  overall: number;
  confidenceInterval: [number, number];
  dimensions: DimensionScore[];
  explanation: string;
  suggestions: string[];
}

interface HistoricalData {
  responseId: string;
  score: number;
}

// --- MOCK DATA ---
const currentResponseScore: AegisScore = {
  overall: 87,
  confidenceInterval: [82, 92],
  dimensions: [
    { dimension: 'Accuracy', score: 92, explanation: 'Factual statements are well-supported by provided sources.' },
    { dimension: 'Completeness', score: 85, explanation: 'Covered the main aspects of the query but could explore more related topics.' },
    { dimension: 'Relevance', score: 95, explanation: 'Directly addresses the user\'s question with high-signal information.' },
    { dimension: 'Coherence', score: 88, explanation: 'The response is well-structured and easy to follow.' },
    { dimension: 'Safety', score: 99, explanation: 'No harmful, biased, or inappropriate content detected.' },
  ],
  explanation: 'This is a high-quality research response that is accurate, relevant, and safe. It provides a comprehensive answer with good structure. Minor improvements in completeness could elevate it further.',
  suggestions: [
    'Consider adding a section on the long-term implications of the topic.',
    'Include a counter-argument or alternative perspective for a more balanced view.',
    'Expand on the methodology of the cited research.',
  ],
};

const sessionAverageScore: AegisScore = {
    overall: 78,
    confidenceInterval: [71, 85],
    dimensions: [
        { dimension: 'Accuracy', score: 85, explanation: 'Generally accurate, with occasional minor unsupported claims.' },
        { dimension: 'Completeness', score: 72, explanation: 'Often misses some parts of the user\'s request.' },
        { dimension: 'Relevance', score: 81, explanation: 'Stays on topic but sometimes includes tangential information.' },
        { dimension: 'Coherence', score: 79, explanation: 'Responses are mostly clear, but can sometimes be disjointed.' },
        { dimension: 'Safety', score: 98, explanation: 'Consistently avoids generating unsafe content.' },
    ],
    explanation: 'The session average reflects solid performance, with room for improvement in completeness and coherence. Accuracy remains a strong point.',
    suggestions: [
        'Focus on fully addressing all parts of the user prompt.',
        'Improve transitions between different sections of the response.',
    ],
};

const historicalData: HistoricalData[] = Array.from({ length: 20 }, (_, i) => ({
  responseId: `resp_${i}`,
  score: 65 + Math.floor(Math.random() * 25) + Math.floor(i * 0.8),
}));
historicalData[19].score = 87;

const platformAverage = 75;

// --- SUB-COMPONENTS ---

const Gauge = ({ score }: { score: number }) => {
  const getScoreColor = (s: number) => {
    if (s < 50) return 'oklch(60% 0.25 25)'; // Red
    if (s < 80) return 'oklch(85% 0.2 85)'; // Yellow
    return 'oklch(70% 0.2 145)'; // Green
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-48 h-48">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <motion.circle
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'circOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-5xl font-bold text-gray-800 dark:text-gray-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Overall Score</span>
      </div>
    </div>
  );
};

const DimensionBars = ({ dimensions }: { dimensions: DimensionScore[] }) => (
  <div className="space-y-3 w-full">
    {dimensions.map((dim, index) => (
      <TooltipProvider key={dim.dimension}>
        <Tooltip>
          <TooltipTrigger className="w-full text-left">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>{dim.dimension}</span>
                <span>{dim.score}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <motion.div
                  className="h-2.5 rounded-full"
                  style={{
                    background: `oklch(70% 0.2 ${145 - dim.score / 2})`,
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${dim.score}%` }}
                  transition={{ duration: 1, delay: 0.2 * index, ease: 'easeOut' }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{dim.explanation}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ))}
  </div>
);

const TrendChart = ({ data }: { data: HistoricalData[] }) => {
  const width = 350;
  const height = 120;
  const padding = 20;

  const points = useMemo(() => {
    const maxX = data.length - 1;
    const maxY = 100;
    return data
      .map((point, i) => {
        const x = (i / maxX) * (width - padding * 2) + padding;
        const y = height - padding - (point.score / maxY) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }, [data, width, height, padding]);

  return (
    <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(70% 0.2 145)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(70% 0.2 145)" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <motion.polyline
                fill="url(#lineGradient)"
                stroke="oklch(70% 0.2 145)"
                strokeWidth="2"
                points={points}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, ease: 'easeInOut' }}
            />
            <g>
              {data.map((point, i) => {
                  const maxX = data.length - 1;
                  const maxY = 100;
                  const x = (i / maxX) * (width - padding * 2) + padding;
                  const y = height - padding - (point.score / maxY) * (height - padding * 2);
                  return (
                    <TooltipProvider key={i}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <circle cx={x} cy={y} r="3" fill="oklch(70% 0.2 145)" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Response {i+1}: {point.score}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
              })}
            </g>
        </svg>
        <div className="flex justify-between text-xs text-gray-500 px-5 -mt-4">
            <span>20 responses ago</span>
            <span>Now</span>
        </div>
    </div>
  );
};

const ImprovementSuggestions = ({ suggestions }: { suggestions: string[] }) => (
    <div className="space-y-3">
        {suggestions.map((suggestion, i) => (
            <motion.div 
                key={i} 
                className="flex items-start space-x-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
            >
                <Lightbulb className="w-5 h-5 mt-1 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</p>
            </motion.div>
        ))}
    </div>
);

// --- MAIN COMPONENT ---
export default function AEGISQualityScoreDisplay() {
  const [isSessionAverage, setIsSessionAverage] = useState(false);

  const activeScore = isSessionAverage ? sessionAverageScore : currentResponseScore;

  const handleToggle = useCallback((checked: boolean) => {
    setIsSessionAverage(checked);
  }, []);

  const getIconForDimension = (dim: ScoreDimension) => {
      switch(dim) {
          case 'Accuracy': return <CheckCircle className="w-4 h-4 mr-2 text-green-500" />;
          case 'Completeness': return <BarChart className="w-4 h-4 mr-2 text-blue-500" />;
          case 'Relevance': return <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />;
          case 'Coherence': return <HelpCircle className="w-4 h-4 mr-2 text-yellow-500" />;
          case 'Safety': return <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />;
          default: return <XCircle className="w-4 h-4 mr-2 text-gray-500" />;
      }
  }

  return (
    <div className="bg-gray-50 dark:bg-black p-4 sm:p-6 lg:p-8 font-sans">
      <Card className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-black/50 rounded-2xl">
        <CardHeader className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">AEGIS Quality Score</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">Adaptive Evaluation & Governance Intelligence System</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${isSessionAverage ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>Current</span>
                    <Switch checked={isSessionAverage} onCheckedChange={handleToggle} aria-label="Toggle between current and session average score" />
                    <span className={`text-sm font-medium ${isSessionAverage ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>Session Avg.</span>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Gauge and Comparison */}
            <div className="lg:col-span-1 flex flex-col items-center space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSessionAverage ? 'session' : 'current'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <Gauge score={activeScore.overall} />
                </motion.div>
              </AnimatePresence>
              <div className="w-full text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Confidence Interval: <strong>{activeScore.confidenceInterval[0]}-{activeScore.confidenceInterval[1]}</strong>
                </p>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Platform Average: <strong>{platformAverage}</strong>
                  <span className={`ml-2 font-semibold ${activeScore.overall > platformAverage ? 'text-green-500' : 'text-red-500'}`}>
                    ({activeScore.overall > platformAverage ? '+' : ''}{activeScore.overall - platformAverage})
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Tabs */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="breakdown" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <TabsTrigger value="breakdown"><BarChart className="w-4 h-4 mr-2"/>Breakdown</TabsTrigger>
                  <TabsTrigger value="history"><History className="w-4 h-4 mr-2"/>History</TabsTrigger>
                  <TabsTrigger value="suggestions"><Lightbulb className="w-4 h-4 mr-2"/>Suggestions</TabsTrigger>
                </TabsList>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isSessionAverage ? 'session-content' : 'current-content'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TabsContent value="breakdown" className="mt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{activeScore.explanation}</p>
                        <DimensionBars dimensions={activeScore.dimensions} />
                    </TabsContent>
                    <TabsContent value="history" className="mt-4 flex flex-col items-center">
                        <h3 className="text-lg font-semibold mb-2 self-start">Score Trend</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 self-start">Historical quality score over the last 20 responses.</p>
                        <TrendChart data={historicalData} />
                    </TabsContent>
                    <TabsContent value="suggestions" className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Improvement Suggestions</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Actionable feedback to enhance the quality of future responses.</p>
                        <ImprovementSuggestions suggestions={activeScore.suggestions} />
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
