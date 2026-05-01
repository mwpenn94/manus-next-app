import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp, Download, BarChart, PlusCircle, MinusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// --- Data Structures ---
type Rating = 'good' | 'average' | 'poor';

interface Benchmark {
  name: string;
  score: number;
}

interface ModelData {
  id: number;
  name: string;
  speed: number;
  accuracy: number;
  cost: number;
  contextWindow: number;
  multimodal: boolean;
  reasoning: boolean;
  benchmarks: Benchmark[];
}

// --- Mock Data ---
const mockModels: ModelData[] = [
  { id: 1, name: 'Gemini 2.5 Pro', speed: 95, accuracy: 92, cost: 70, contextWindow: 8192, multimodal: true, reasoning: true, benchmarks: [{ name: 'MMLU', score: 90.1 }, { name: 'HumanEval', score: 85.2 }] },
  { id: 2, name: 'GPT-5 Omni', speed: 90, accuracy: 95, cost: 80, contextWindow: 16384, multimodal: true, reasoning: true, benchmarks: [{ name: 'MMLU', score: 92.3 }, { name: 'HumanEval', score: 88.0 }] },
  { id: 3, name: 'Claude 4.0', speed: 85, accuracy: 88, cost: 65, contextWindow: 200000, multimodal: false, reasoning: true, benchmarks: [{ name: 'MMLU', score: 86.7 }, { name: 'HumanEval', score: 81.1 }] },
  { id: 4, name: 'Llama 4 70B', speed: 80, accuracy: 85, cost: 50, contextWindow: 8192, multimodal: false, reasoning: false, benchmarks: [{ name: 'MMLU', score: 84.5 }, { name: 'HumanEval', score: 79.5 }] },
  { id: 5, name: 'Mistral Large 2', speed: 88, accuracy: 87, cost: 60, contextWindow: 32768, multimodal: true, reasoning: false, benchmarks: [{ name: 'MMLU', score: 85.0 }, { name: 'HumanEval', score: 80.0 }] },
  { id: 6, name: 'Command R+', speed: 75, accuracy: 82, cost: 45, contextWindow: 128000, multimodal: false, reasoning: true, benchmarks: [{ name: 'MMLU', score: 81.2 }, { name: 'HumanEval', score: 77.8 }] },
];

const dimensions = [
    { key: 'speed', name: 'Speed' },
    { key: 'accuracy', name: 'Accuracy' },
    { key: 'cost', name: 'Cost' },
    { key: 'contextWindow', name: 'Context Window' },
    { key: 'multimodal', name: 'Multimodal' },
    { key: 'reasoning', name: 'Reasoning' },
];

// --- Helper Functions & Components ---
const getRating = (value: number): Rating => {
  if (value >= 90) return 'good';
  if (value >= 80) return 'average';
  return 'poor';
};

const ratingColorClasses: Record<Rating, string> = {
  good: 'text-green-400',
  average: 'text-yellow-400',
  poor: 'text-red-400',
};

interface RadarChartProps {
  data: ModelData[];
  dimensions: { key: string; name: string }[];
  size?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ data, dimensions, size = 300 }) => {
  const center = size / 2;
  const radius = center * 0.8;
  const numAxes = dimensions.length;
  const angleSlice = (Math.PI * 2) / numAxes;

  const normalize = (value: number, key: string) => {
    if (key === 'cost') return 100 - value; // Invert cost
    if (key === 'contextWindow') {
        const maxCtx = Math.max(...data.map(d => d.contextWindow), 1); // Avoid division by zero
        return (value / maxCtx) * 100;
    }
    return value;
  }

  const points = data.map(model => {
    const color = `hsl(${model.id * 60}, 70%, 50%)`;
    const pointString = dimensions.map((dim, i) => {
      const value = normalize(model[dim.key as keyof ModelData] as number, dim.key);
      const angle = angleSlice * i - Math.PI / 2;
      const x = center + (radius * value / 100) * Math.cos(angle);
      const y = center + (radius * value / 100) * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
    return { ...model, points: pointString, color };
  });

  return (
    <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g>{[...Array(5)].map((_, i) => <circle key={`grid-${i}`} cx={center} cy={center} r={radius * ((i + 1) / 5)} fill="none" stroke="hsl(var(--border))" strokeWidth="1" />)}</g>
            <g>
                {dimensions.map((dim, i) => {
                    const angle = angleSlice * i - Math.PI / 2;
                    const x2 = center + radius * Math.cos(angle);
                    const y2 = center + radius * Math.sin(angle);
                    const labelX = center + (radius * 1.1) * Math.cos(angle);
                    const labelY = center + (radius * 1.1) * Math.sin(angle);
                    return (
                        <g key={`axis-${dim.key}`}>
                            <line x1={center} y1={center} x2={x2} y2={y2} stroke="hsl(var(--border))" strokeWidth="1" />
                            <text x={labelX} y={labelY} textAnchor={labelX > center ? 'start' : labelX < center ? 'end' : 'middle'} dominantBaseline="middle" fill="hsl(var(--muted-foreground))" fontSize="10">{dim.name}</text>
                        </g>
                    );
                })}
            </g>
            <g>{points.map(model => <polygon key={model.id} points={model.points} fill={model.color} fillOpacity={0.3} stroke={model.color} strokeWidth={2} />)}</g>
        </svg>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
            {data.map(model => (
                <div key={model.id} className="flex items-center text-sm">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: `hsl(${model.id * 60}, 70%, 50%)` }} />
                    <span>{model.name}</span>
                </div>
            ))}
        </div>
    </div>
  );
};

// --- Main Component ---
export default function ModelComparisonTable() {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [filters, setFilters] = useState<{ multimodal: boolean; reasoning: boolean }>({ multimodal: false, reasoning: false });

    const handleSort = (key: string) => {
        setSortConfig(prev => (prev?.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' }));
    };

    const handleFilterChange = (filterName: keyof typeof filters) => {
        setFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
    };

    const filteredAndSortedModels = useMemo(() => {
        let processedModels = [...mockModels];
        if (filters.multimodal) processedModels = processedModels.filter(m => m.multimodal);
        if (filters.reasoning) processedModels = processedModels.filter(m => m.reasoning);

        if (sortConfig) {
            processedModels.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof ModelData];
                const bValue = b[sortConfig.key as keyof ModelData];
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return processedModels;
    }, [sortConfig, filters]);

    const toggleRowExpansion = (key: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
            return newSet;
        });
    };

    const exportToCSV = () => {
        const headers = ['Dimension', ...filteredAndSortedModels.map(m => m.name)];
        const rows = dimensions.map(dim => {
            const rowData = filteredAndSortedModels.map(model => {
                const value = model[dim.key as keyof ModelData];
                if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                if (dim.key === 'contextWindow') return `${(model.contextWindow / 1000).toFixed(0)}k`;
                return value;
            });
            return [dim.name, ...rowData];
        });
        const csvContent = `data:text/csv;charset=utf-8,${headers.join(',')}\n${rows.map(e => e.join(',')).join('\n')}`;
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', 'model_comparison.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-background text-foreground p-4 sm:p-6 rounded-lg border border-border font-sans">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
                <h2 className="text-xl font-bold">Model Comparison</h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center space-x-4 text-sm">
                        <span className="font-medium shrink-0">Filter:</span>
                        <div className="flex items-center space-x-2"><Checkbox id="multimodal" checked={filters.multimodal} onCheckedChange={() => handleFilterChange('multimodal')} /><label htmlFor="multimodal" className="text-sm font-medium leading-none">Multimodal</label></div>
                        <div className="flex items-center space-x-2"><Checkbox id="reasoning" checked={filters.reasoning} onCheckedChange={() => handleFilterChange('reasoning')} /><label htmlFor="reasoning" className="text-sm font-medium leading-none">Reasoning</label></div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><BarChart className="h-4 w-4 mr-2" /> Radar</Button></DialogTrigger><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Model Radar Chart</DialogTitle></DialogHeader><div className="flex justify-center p-4"><RadarChart data={filteredAndSortedModels} dimensions={dimensions.filter(d => typeof mockModels[0][d.key as keyof ModelData] === 'number')} size={400} /></div></DialogContent></Dialog>
                        <Button variant="outline" size="sm" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" /> Export</Button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
                        <TableRow>
                            <TableHead className="w-48 min-w-48">Dimension</TableHead>
                            {filteredAndSortedModels.map(model => <TableHead key={model.id} className="text-center min-w-32">{model.name}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dimensions.map(dim => (
                            <React.Fragment key={dim.key}>
                                <TableRow onClick={() => toggleRowExpansion(dim.key)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <TableCell onClick={(e) => { e.stopPropagation(); handleSort(dim.key); }} className="font-medium flex items-center cursor-pointer hover:text-primary transition-colors select-none">
                                        {expandedRows.has(dim.key) ? <MinusCircle className="h-4 w-4 mr-2 text-muted-foreground" /> : <PlusCircle className="h-4 w-4 mr-2 text-muted-foreground" />}
                                        {dim.name}
                                        {sortConfig?.key === dim.key && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}</motion.div>}
                                    </TableCell>
                                    {filteredAndSortedModels.map(model => (
                                        <TableCell key={`${model.id}-${dim.key}`} className="text-center">
                                            {typeof model[dim.key as keyof ModelData] === 'boolean' ? (
                                                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', model[dim.key as keyof ModelData] ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300')}>{model[dim.key as keyof ModelData] ? 'Yes' : 'No'}</span>
                                            ) : typeof model[dim.key as keyof ModelData] === 'number' ? (
                                                <span className={cn('font-semibold', ratingColorClasses[getRating(model[dim.key as keyof ModelData] as number)])}>
                                                    {dim.key === 'contextWindow' ? `${(model.contextWindow / 1000).toFixed(0)}k` : String(model[dim.key as keyof ModelData])}
                                                </span>
                                            ) : null}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <AnimatePresence>
                                    {expandedRows.has(dim.key) && (
                                        <TableRow className="bg-muted/20 hover:bg-muted/30">
                                            <TableCell colSpan={filteredAndSortedModels.length + 1} className="p-0">
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                                                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                                        {filteredAndSortedModels.map(model => (
                                                            <div key={model.id} className="bg-background/50 p-3 rounded-md border border-border">
                                                                <h4 className="font-bold text-sm mb-2 text-center text-primary">{model.name}</h4>
                                                                <ul className="text-xs space-y-1 text-muted-foreground">
                                                                    {model.benchmarks.map(b => <li key={b.name} className="flex justify-between"><span className="font-medium">{b.name}:</span><span className="font-mono text-foreground">{b.score.toFixed(1)}</span></li>)}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
