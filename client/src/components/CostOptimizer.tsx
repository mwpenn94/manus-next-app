import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, BarChart, Lightbulb, Bell, AlertTriangle, PieChart } from 'lucide-react';

// Mock Data Generation
const generateMockData = () => {
    const data: { date: string; compute: number; storage: number; inference: number; training: number }[] = [];
    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
            date: date.toISOString().split('T')[0],
            compute: Math.random() * 1000 + 500,
            storage: Math.random() * 200 + 100,
            inference: Math.random() * 800 + 300,
            training: Math.random() * 1200 + 600,
        });
    }
    return data.reverse();
};

const mockData = generateMockData();
const mockModels = [
    { name: 'GPT-4.1-mini', cost: 1200 },
    { name: 'Gemini-2.5-flash', cost: 950 },
    { name: 'Claude-3.5-Sonnet', cost: 1500 },
];

const recommendations = [
    { id: 1, text: 'Switch to spot instances for training jobs.', savings: 350 },
    { id: 2, text: 'Archive old data to cold storage.', savings: 80 },
    { id: 3, text: 'Optimize inference batch sizes.', savings: 120 },
];

const anomalies = [
    { id: 1, date: '2026-04-28', description: 'Unusual spike in compute costs.' },
];

const CostOptimizer: React.FC = () => {
    const [timeframe, setTimeframe] = useState('30d');

    const filteredData = useMemo(() => {
        const days = parseInt(timeframe);
        return mockData.slice(-days);
    }, [timeframe]);

    const totalCost = useMemo(() => filteredData.reduce((acc, day) => acc + day.compute + day.storage + day.inference + day.training, 0), [filteredData]);

    const costBreakdown = useMemo(() => {
        const totals = filteredData.reduce((acc, day) => {
            acc.compute += day.compute;
            acc.storage += day.storage;
            acc.inference += day.inference;
            acc.training += day.training;
            return acc;
        }, { compute: 0, storage: 0, inference: 0, training: 0 });
        return [
            { name: 'Compute', value: totals.compute, color: 'hsl(var(--primary))' },
            { name: 'Storage', value: totals.storage, color: 'hsl(var(--secondary))' },
            { name: 'Inference', value: totals.inference, color: 'hsl(var(--accent))' },
            { name: 'Training', value: totals.training, color: 'hsl(var(--destructive))' },
        ];
    }, [filteredData]);

    const LineChart = ({ data }: LineChartProps) => {
        const maxVal = useMemo(() => Math.max(...data.map(d => d.compute + d.storage + d.inference + d.training)), [data]);
        const points = useMemo(() => data.map((d, i) => {
            const total = d.compute + d.storage + d.inference + d.training;
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (total / maxVal) * 100;
            return `${x},${y}`;
        }).join(' '), [data, maxVal]);

        return (
            <div className="h-64 w-full">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                    <motion.polyline
                        points={points}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5 }}
                    />
                </svg>
            </div>
        );
    };

    const BarChart = ({ data }: BarChartProps) => {
        const maxCost = Math.max(...data.map(d => d.cost));
        return (
            <div className="h-48 w-full flex justify-around items-end gap-2">
                {data.map((d, i) => (
                    <motion.div
                        key={i}
                        className="w-full bg-primary rounded-t-sm flex flex-col justify-end items-center"
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.cost / maxCost) * 100}%` }}
                        transition={{ duration: 1, delay: i * 0.2 }}
                    >
                       <span className="text-xs text-primary-foreground transform -rotate-90 whitespace-nowrap origin-bottom-left relative left-4 bottom-2">{d.name}</span>
                    </motion.div>
                ))}
            </div>
        );
    };

    const PieChartComponent = ({ data }: PieChartProps) => {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let cumulative = 0;
        return (
            <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {data.map((item, index) => {
                        const percentage = (item.value / total) * 100;
                        const offset = (cumulative / total) * 100;
                        cumulative += item.value;
                        return (
                            <circle
                                key={index}
                                cx="50" cy="50" r="45"
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth="10"
                                strokeDasharray={`${percentage} ${100 - percentage}`}
                                strokeDashoffset={-offset}
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold">${(totalCost / 1000).toFixed(1)}k</span>
                    <span className="text-muted-foreground text-sm">Total Cost</span>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-background text-foreground p-6 font-sans">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Cost Optimizer</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline">Export Report</Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Cost Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <LineChart data={filteredData} />
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Cost per Model</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BarChart data={mockModels} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Cost Comparison</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-48 flex flex-col justify-center items-center space-y-2">
                                    <div className="w-full flex justify-between items-center px-4">
                                        <span className="text-sm font-semibold">Manus AI</span>
                                        <span className="text-lg font-bold text-primary">$4,850</span>
                                    </div>
                                    <div className="w-full flex justify-between items-center px-4">
                                        <span className="text-sm font-semibold">Competitor X</span>
                                        <span className="text-lg font-bold">$6,200</span>
                                    </div>
                                    <p className="text-xs text-green-400 pt-2">You are saving 22% with Manus AI</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cost Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center">
                             <PieChartComponent data={costBreakdown} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-400" /> Optimization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {recommendations.map(rec => (
                                    <li key={rec.id} className="text-sm flex justify-between">
                                        <span>{rec.text}</span>
                                        <span className="font-bold text-green-400">-${rec.savings}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Budget Alerts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="budget-input" className="text-sm">Monthly Budget</label>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                                        <input id="budget-input" type="number" defaultValue={5000} className="w-24 bg-transparent text-right font-bold" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Notify at 80%</span>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                     <Card className="border-yellow-500/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-500"><AlertTriangle className="w-5 h-5" /> Anomalies</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {anomalies.map(anomaly => (
                                <div key={anomaly.id} className="text-sm">
                                    <span className="font-semibold">[{anomaly.date}]</span> {anomaly.description}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CostOptimizer;

// Type definitions for props
type PieChartProps = {
  data: { name: string; value: number; color: string }[];
};

type LineChartProps = {
  data: { date: string; compute: number; storage: number; inference: number; training: number }[];
};

type BarChartProps = {
  data: { name: string; cost: number }[];
};
