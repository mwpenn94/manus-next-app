import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ChevronsRight, Cpu, BrainCircuit, Database, Settings, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';

// --- MOCK DATA AND TYPES ---
type TokenUsage = { input: number; output: number; total: number };
type CostBreakdown = { fast: number; standard: number; deep: number };
type ToolCallCost = { id: string; toolName: string; cost: number; tokens: number };
type ChartDataPoint = { label: string; value: number };

const initialData = {
  currentTaskTokens: { input: 12580, output: 32790, total: 45370 },
  costBreakdown: { fast: 0.018, standard: 0.125, deep: 0.45 },
  cumulativeSessionCost: 12.78,
  budget: { limit: 25, usage: 12.78 },
  toolCallCosts: [
    { id: 't1', toolName: 'search', cost: 0.08, tokens: 8000 },
    { id: 't2', toolName: 'file', cost: 0.02, tokens: 2000 },
    { id: 't3', toolName: 'research-lookup', cost: 0.35, tokens: 15000 },
    { id: 't4', toolName: 'shell', cost: 0.01, tokens: 1000 },
    { id: 't5', toolName: 'generate', cost: 0.135, tokens: 19370 },
  ],
  dailyCosts: [
    { label: 'Mon', value: 1.2 }, { label: 'Tue', value: 2.5 }, { label: 'Wed', value: 1.8 },
    { label: 'Thu', value: 3.1 }, { label: 'Fri', value: 2.2 }, { label: 'Sat', value: 0.9 }, { label: 'Sun', value: 1.1 },
  ],
  weeklyCosts: [
    { label: 'W-3', value: 10.5 }, { label: 'W-2', value: 15.2 }, { label: 'W-1', value: 12.8 }, { label: 'This Wk', value: 18.9 },
  ],
  monthlyCosts: [
    { label: 'Jan', value: 50 }, { label: 'Feb', value: 65 }, { label: 'Mar', value: 82 }, { label: 'Apr', value: 75 },
  ],
  previousPeriodCost: { daily: 2.8, weekly: 14.5, monthly: 78 },
};

// --- SUB-COMPONENTS ---

const TokenUsageDisplay = ({ tokens, totalCost }: { tokens: TokenUsage; totalCost: number }) => (
  <Card className="bg-oklch(99% 0.005 255) border-oklch(95% 0.01 255)">
    <CardHeader className="pb-2 flex-row items-center justify-between">
      <CardTitle className="text-base font-medium">Current Task</CardTitle>
      <Info className="h-4 w-4 text-oklch(60% 0.02 255)" />
    </CardHeader>
    <CardContent>
      <div className="flex justify-between items-baseline">
        <span className="text-2xl font-bold text-oklch(30% 0.02 255)">${totalCost.toFixed(3)}</span>
        <Badge variant="secondary" className="font-mono">{tokens.total.toLocaleString()} tok</Badge>
      </div>
      <div className="text-xs text-oklch(50% 0.02 255) grid grid-cols-2 gap-x-4 mt-2">
        <span>Input: {tokens.input.toLocaleString()}</span>
        <span>Output: {tokens.output.toLocaleString()}</span>
      </div>
    </CardContent>
  </Card>
);

const BudgetStatus = ({ budget, onUpdateBudget }: { budget: { limit: number; usage: number }; onUpdateBudget: (newLimit: number) => void }) => {
  const percentage = (budget.usage / budget.limit) * 100;
  const status = percentage > 90 ? 'error' : percentage > 75 ? 'warning' : 'normal';
  const color = status === 'error' ? 'oklch(70% 0.25 25)' : status === 'warning' ? 'oklch(85% 0.2 85)' : 'oklch(75% 0.2 150)';

  return (
    <Card className="bg-oklch(99% 0.005 255) border-oklch(95% 0.01 255)">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Session Budget</CardTitle>
        <BudgetSettings currentLimit={budget.limit} onUpdate={onUpdateBudget} />
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-2xl font-bold text-oklch(30% 0.02 255)">${budget.usage.toFixed(2)}</span>
          <span className="text-sm text-oklch(50% 0.02 255)">/ ${budget.limit.toFixed(2)}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Progress value={percentage} className="w-full h-3 bg-oklch(95% 0.01 255)" style={{ '--indicator-color': color } as React.CSSProperties} />
            </TooltipTrigger>
            <TooltipContent><p>{percentage.toFixed(1)}% of budget used</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {status !== 'normal' && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center text-xs mt-2 font-medium text-[${color}]`}>
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            {status === 'warning' ? 'Nearing budget limit' : 'Budget limit reached'}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

const BudgetSettings = ({ currentLimit, onUpdate }: { currentLimit: number; onUpdate: (newLimit: number) => void }) => {
  const [newLimit, setNewLimit] = useState(currentLimit.toString());
  const handleUpdate = () => {
    const limit = parseFloat(newLimit);
    if (!isNaN(limit) && limit > 0) onUpdate(limit);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6"><Settings className="h-4 w-4 text-oklch(60% 0.02 255)" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Set Budget Limit</DropdownMenuLabel>
        <div className="px-2 py-1.5">
          <Input type="number" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} className="h-8" placeholder="e.g., 50" />
        </div>
        <DropdownMenuItem onSelect={handleUpdate}><Button className="w-full h-8">Update</Button></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const CostBreakdown = ({ breakdown }: { breakdown: CostBreakdown }) => {
  const tiers = [
    { name: 'Fast', cost: breakdown.fast, icon: Cpu, color: 'oklch(75% 0.2 150)' },
    { name: 'Standard', cost: breakdown.standard, icon: BrainCircuit, color: 'oklch(85% 0.2 85)' },
    { name: 'Deep', cost: breakdown.deep, icon: Database, color: 'oklch(70% 0.25 25)' },
  ];
  return (
    <Card className="bg-oklch(99% 0.005 255) border-oklch(95% 0.01 255)">
      <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Cost by Model Tier</CardTitle></CardHeader>
      <CardContent className="space-y-3 pt-2">
        {tiers.map(tier => (
          <div key={tier.name} className="flex items-center justify-between">
            <div className="flex items-center">
              <tier.icon className="h-4 w-4 mr-2" style={{ color: tier.color }} />
              <span className="text-sm">{tier.name}</span>
            </div>
            <span className="font-mono text-sm text-oklch(40% 0.02 255)">${tier.cost.toFixed(3)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const ToolCostList = ({ toolCalls }: { toolCalls: ToolCallCost[] }) => {
  const sortedCalls = useMemo(() => [...toolCalls].sort((a, b) => b.cost - a.cost), [toolCalls]);
  const totalCost = useMemo(() => sortedCalls.reduce((sum, call) => sum + call.cost, 0), [sortedCalls]);

  return (
    <Card className="bg-oklch(99% 0.005 255) border-oklch(95% 0.01 255)">
      <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Per-Tool Cost</CardTitle></CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
          {sortedCalls.map(call => (
            <TooltipProvider key={call.id}>
              <Tooltip>
                <TooltipTrigger className="w-full">
                  <div className="flex justify-between items-center text-sm hover:bg-oklch(95% 0.01 255) p-1.5 rounded-md text-left">
                    <div className="flex items-center truncate">
                      <div className="w-1 h-4 rounded-full mr-2" style={{ backgroundColor: `oklch(75% ${0.05 + (call.cost / totalCost) * 0.2} 200)` }}></div>
                      <span className="truncate text-oklch(40% 0.02 255)">{call.toolName}</span>
                    </div>
                    <span className="font-mono text-xs text-oklch(50% 0.02 255)">${call.cost.toFixed(3)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>{call.tokens.toLocaleString()} tokens</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const CostCharts = ({ data }: { data: typeof initialData }) => {
  const [activeTab, setActiveTab] = useState('daily');

  const chartDataMap = useMemo(() => ({
    daily: data.dailyCosts,
    weekly: data.weeklyCosts,
    monthly: data.monthlyCosts,
  }), [data]);

  const comparisonData = useMemo(() => ({
    daily: data.previousPeriodCost.daily,
    weekly: data.previousPeriodCost.weekly,
    monthly: data.previousPeriodCost.monthly,
  }), [data]);

  const { currentTotal, previousTotal, percentageChange } = useMemo(() => {
    const current = chartDataMap[activeTab as keyof typeof chartDataMap].reduce((sum: number, item: {label: string; value: number}) => sum + item.value, 0);
    const previous = comparisonData[activeTab as keyof typeof comparisonData];
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    return { currentTotal: current, previousTotal: previous, percentageChange: change };
  }, [activeTab, chartDataMap, comparisonData]);

  return (
    <Card className="mt-6 bg-oklch(99% 0.005 255) border-oklch(95% 0.01 255)">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Cost Over Time</CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium flex items-center ${percentageChange >= 0 ? 'text-oklch(65% 0.2 25)' : 'text-oklch(65% 0.2 150)'}`}>
              {percentageChange >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {Math.abs(percentageChange).toFixed(1)}%
            </span>
            <span className="text-xs text-oklch(50% 0.02 255)">vs last period</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-oklch(95% 0.01 255)">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <TabsContent value={activeTab} className="pt-4">
                <BarChart data={chartDataMap[activeTab as keyof typeof chartDataMap]} />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const BarChart = ({ data }: { data: ChartDataPoint[] }) => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 0), [data]);
  const chartHeight = 150;
  const barWidth = 35;
  const barMargin = 15;
  const width = data.length * (barWidth + barMargin);

  return (
    <div className="w-full overflow-x-auto pb-2 -mb-2">
      <svg viewBox={`0 0 ${width} ${chartHeight + 30}`} className="min-w-full font-sans">
        <g>
          {data.map((d, i) => {
            const barHeight = maxValue > 0 ? (d.value / maxValue) * chartHeight : 0;
            return (
              <TooltipProvider key={i}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <g onMouseEnter={() => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
                      <rect
                        x={i * (barWidth + barMargin)}
                        y={chartHeight - barHeight}
                        width={barWidth}
                        height={barHeight}
                        rx={3}
                        className="fill-oklch(75% 0.1 200) hover:fill-oklch(70% 0.15 200) transition-colors cursor-pointer"
                      />
                      <AnimatePresence>
                        {hoveredBar === i && (
                          <motion.text
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            x={i * (barWidth + barMargin) + barWidth / 2}
                            y={chartHeight - barHeight - 8}
                            textAnchor="middle"
                            className="text-xs font-bold fill-oklch(40% 0.02 255)"
                          >
                            ${d.value.toFixed(2)}
                          </motion.text>
                        )}
                      </AnimatePresence>
                    </g>
                  </TooltipTrigger>
                  <text x={i * (barWidth + barMargin) + barWidth / 2} y={chartHeight + 20} textAnchor="middle" className="text-xs fill-oklch(50% 0.02 255)">{d.label}</text>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function TaskCostTracker() {
  const [data, setData] = useState(initialData);

  const totalTaskCost = useMemo(() =>
    Object.values(data.costBreakdown).reduce((sum, cost) => sum + cost, 0),
    [data.costBreakdown]
  );

  const handleUpdateBudget = useCallback((newLimit: number) => {
    setData(prevData => ({
      ...prevData,
      budget: { ...prevData.budget, limit: newLimit },
    }));
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-oklch(98.5% 0.01 255) border-oklch(90% 0.02 255) text-oklch(20% 0.02 255) p-6 shadow-lg shadow-oklch(90% 0.01 255/0.2)">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-1 flex flex-col gap-6">
            <TokenUsageDisplay tokens={data.currentTaskTokens} totalCost={totalTaskCost} />
            <BudgetStatus budget={data.budget} onUpdateBudget={handleUpdateBudget} />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-1">
            <CostBreakdown breakdown={data.costBreakdown} />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-1">
            <ToolCostList toolCalls={data.toolCallCosts} />
          </motion.div>
        </div>

        <motion.div variants={itemVariants}>
          <CostCharts data={data} />
        </motion.div>
      </motion.div>
    </Card>
  );
}
