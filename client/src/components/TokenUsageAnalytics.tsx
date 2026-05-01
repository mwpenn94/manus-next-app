import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DollarSign, Cpu, BarChart, PieChart, Download, AlertTriangle, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

type UsageData = {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model: string;
};

interface TokenUsageAnalyticsProps {
  usage: UsageData[];
  totalBudget: number;
  currentSpend: number;
  forecastedSpend: number;
  period: 'day' | 'week' | 'month';
  onPeriodChange: (period: string) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(value);
};

const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
};

interface StatCardProps {
    icon: React.ElementType;
    title: string;
    value: string;
    description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, description }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

const UsageBarChart: React.FC<{ data: UsageData[] }> = ({ data }) => {
    const maxTokens = Math.max(...data.map(d => d.inputTokens + d.outputTokens), 1);
    const maxCost = Math.max(...data.map(d => d.cost), 1);

    return (
        <div className="w-full h-80 bg-card p-4 rounded-lg relative">
            <svg width="100%" height="100%" viewBox={`0 0 ${data.length * 50} 320`} preserveAspectRatio="none">
                <g transform="translate(0, 300)">
                    <text x="-10" y="0" textAnchor="end" dy=".3em" className="text-xs fill-muted-foreground">0</text>
                    <text x="-10" y="-280" textAnchor="end" dy=".3em" className="text-xs fill-muted-foreground">{formatNumber(maxTokens)}</text>
                </g>

                {data.map((d, i) => {
                    const inputHeight = (d.inputTokens / maxTokens) * 280;
                    const outputHeight = (d.outputTokens / maxTokens) * 280;

                    return (
                        <g key={i} transform={`translate(${i * 50}, 0)`}>
                            <motion.rect
                                x="10"
                                y={300 - (inputHeight + outputHeight)}
                                width="30"
                                height={outputHeight}
                                fill="#3b82f6"
                                initial={{ height: 0, y: 300 }}
                                animate={{ height: outputHeight, y: 300 - (inputHeight + outputHeight) }}
                                transition={{ duration: 0.5, delay: i * 0.05, ease: "easeInOut" as const }}
                            />
                            <motion.rect
                                x="10"
                                y={300 - inputHeight}
                                width="30"
                                height={inputHeight}
                                fill="#8b5cf6"
                                initial={{ height: 0, y: 300 }}
                                animate={{ height: inputHeight, y: 300 - inputHeight }}
                                transition={{ duration: 0.5, delay: i * 0.05, ease: "easeInOut" as const }}
                            />
                            <text x="25" y="315" textAnchor="middle" className="text-xs fill-muted-foreground">{new Date(d.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}</text>
                        </g>
                    );
                })}

                <motion.path 
                    d={`M ${data.map((d, i) => `${i * 50 + 25} ${300 - (d.cost / maxCost) * 280}`).join(" L ")}`}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, ease: "easeInOut" as const }}
                />
            </svg>
            <div className="absolute top-4 right-4 text-xs text-muted-foreground flex items-center gap-4">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#8b5cf6] rounded-sm"></div>Input Tokens</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#3b82f6] rounded-sm"></div>Output Tokens</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#f97316] rounded-sm"></div>Cost Trend</div>
            </div>
        </div>
    );
};

const ModelPieChart: React.FC<{ data: UsageData[] }> = ({ data }) => {
    const modelUsage = useMemo(() => {
        const usageMap = new Map<string, number>();
        data.forEach(d => {
            const current = usageMap.get(d.model) || 0;
            usageMap.set(d.model, current + d.inputTokens + d.outputTokens);
        });
        return Array.from(usageMap.entries()).sort((a, b) => b[1] - a[1]);
    }, [data]);

    const totalTokens = modelUsage.reduce((sum, [, tokens]) => sum + tokens, 0);
    if (totalTokens === 0) return <div className="h-64 flex items-center justify-center text-muted-foreground">No model usage data.</div>;

    const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#ec4899"];
    let accumulatedAngle = 0;

    return (
        <div className="flex items-center justify-around h-64">
            <svg width="200" height="200" viewBox="0 0 100 100">
                {modelUsage.map(([model, tokens], i) => {
                    const percentage = (tokens / totalTokens);
                    const angle = percentage * 360;
                    const largeArcFlag = angle > 180 ? 1 : 0;

                    const startX = 50 + 50 * Math.cos(Math.PI * accumulatedAngle / 180);
                    const startY = 50 + 50 * Math.sin(Math.PI * accumulatedAngle / 180);
                    accumulatedAngle += angle;
                    const endX = 50 + 50 * Math.cos(Math.PI * accumulatedAngle / 180);
                    const endY = 50 + 50 * Math.sin(Math.PI * accumulatedAngle / 180);

                    const pathData = `M 50,50 L ${startX},${startY} A 50,50 0 ${largeArcFlag} 1 ${endX},${endY} Z`;

                    return (
                        <motion.path
                            key={model}
                            d={pathData}
                            fill={colors[i % colors.length]}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        />
                    );
                })}
            </svg>
            <div className="text-sm">
                {modelUsage.map(([model, tokens], i) => (
                    <div key={model} className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span>{model}: {((tokens / totalTokens) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const TokenUsageAnalytics: React.FC<TokenUsageAnalyticsProps> = ({ 
    usage, 
    totalBudget, 
    currentSpend, 
    forecastedSpend, 
    period, 
    onPeriodChange 
}) => {

    const { totalTokens, totalInputTokens, totalOutputTokens } = useMemo(() => {
        const totals = usage.reduce((acc, item) => {
            acc.totalTokens += item.inputTokens + item.outputTokens;
            acc.totalInputTokens += item.inputTokens;
            acc.totalOutputTokens += item.outputTokens;
            return acc;
        }, { totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0 });
        return totals;
    }, [usage]);

    const budgetRemaining = totalBudget - currentSpend;
    const budgetUsagePercentage = totalBudget > 0 ? (currentSpend / totalBudget) * 100 : 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-background text-foreground">
            <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    icon={Cpu}
                    title="Total Tokens"
                    value={formatNumber(totalTokens)}
                    description={`Input: ${formatNumber(totalInputTokens)} | Output: ${formatNumber(totalOutputTokens)}`}
                />
                <StatCard 
                    icon={DollarSign}
                    title="Total Cost"
                    value={formatCurrency(currentSpend)}
                    description="Cost for the selected period"
                />
                <StatCard 
                    icon={TrendingUp}
                    title="Forecasted Spend"
                    value={formatCurrency(forecastedSpend)}
                    description="Estimated cost for next period"
                />
                <StatCard 
                    icon={DollarSign}
                    title="Budget Remaining"
                    value={formatCurrency(budgetRemaining)}
                    description={`of ${formatCurrency(totalBudget)}`}
                />
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Budget Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">{formatCurrency(currentSpend)}</span>
                        <span className="text-muted-foreground">{formatCurrency(totalBudget)}</span>
                    </div>
                    <Progress value={budgetUsagePercentage} className={cn(budgetUsagePercentage > 80 && "[&>div]:bg-destructive")} />
                    <div className="flex items-center justify-center mt-2">
                        {budgetUsagePercentage > 80 ? (
                            <Badge variant="destructive" className="flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Warning: {budgetUsagePercentage.toFixed(1)}% of budget used
                            </Badge>
                        ) : (
                             <p className="text-sm text-muted-foreground">{budgetUsagePercentage.toFixed(1)}% of budget used</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Tabs value={period} onValueChange={onPeriodChange as (value: string) => void} className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="day">Daily</TabsTrigger>
                        <TabsTrigger value="week">Weekly</TabsTrigger>
                        <TabsTrigger value="month">Monthly</TabsTrigger>
                    </TabsList>
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                    </Button>
                </div>
                <TabsContent value={period}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Token Consumption</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <UsageBarChart data={usage} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Model Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ModelPieChart data={usage} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Token Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex flex-col justify-center items-center space-y-4">
                            <div className="flex items-center text-2xl font-semibold">
                                <ArrowDown className="w-6 h-6 mr-2 text-purple-500"/>
                                Input Tokens: 
                                <span className="ml-2 text-purple-400">{formatNumber(totalInputTokens)}</span>
                            </div>
                            <div className="flex items-center text-2xl font-semibold">
                                <ArrowUp className="w-6 h-6 mr-2 text-blue-500"/>
                                Output Tokens: 
                                <span className="ml-2 text-blue-400">{formatNumber(totalOutputTokens)}</span>
                            </div>
                            <div className="text-sm text-muted-foreground pt-4">
                                Ratio: {totalOutputTokens > 0 ? (totalInputTokens / totalOutputTokens).toFixed(2) : 'N/A'} : 1
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
