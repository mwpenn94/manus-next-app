import React, { useState, useMemo, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Search, Filter, ChevronsUpDown, ChevronDown, ChevronUp, X, PlusCircle, Trash2, Sigma } from "lucide-react";

// --- MOCK DATA & TYPES ---
type DataType = 'string' | 'number' | 'boolean' | 'date' | 'categorical';
interface Column { key: string; label: string; type: DataType; }
type FilterCondition = { column: string; operator: string; value: any };

const columns: Column[] = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'product_name', label: 'Product Name', type: 'string' },
  { key: 'category', label: 'Category', type: 'categorical' },
  { key: 'price', label: 'Price (USD)', type: 'number' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'in_stock', label: 'In Stock', type: 'boolean' },
  { key: 'release_date', label: 'Release Date', type: 'date' },
  { key: 'country_of_origin', label: 'Origin', type: 'categorical' },
];

const generateMockData = (count: number): Record<string, any>[] => {
  const data = [];
  const categories = ['Electronics', 'Books', 'Clothing', 'Home Goods', 'Toys'];
  const countries = ['USA', 'China', 'Germany', 'Japan', 'India', 'UK'];
  const productPrefixes = ['Smart', 'Wireless', 'Ergonomic', 'Portable', 'Heavy-Duty'];
  const productSuffixes = ['Watch', 'Keyboard', 'Chair', 'Speaker', 'Drill'];

  for (let i = 1; i <= count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const productName = `${productPrefixes[Math.floor(Math.random() * productPrefixes.length)]} ${category.slice(0, -1)} ${productSuffixes[Math.floor(Math.random() * productSuffixes.length)]}`;

    data.push({
      id: 1000 + i,
      product_name: Math.random() > 0.05 ? productName : null,
      category: category,
      price: Math.random() > 0.1 ? parseFloat((Math.random() * 500 + 20).toFixed(2)) : null,
      rating: parseFloat((Math.random() * 4 + 1).toFixed(1)),
      in_stock: Math.random() > 0.2,
      release_date: new Date(new Date().getTime() - Math.random() * 1000 * 60 * 60 * 24 * 365 * 3).toISOString().split('T')[0],
      country_of_origin: country,
    });
  }
  return data;
};

const mockData = generateMockData(100);

const getDataTypeBadgeVariant = (type: DataType) => {
    switch (type) {
        case 'number': return 'default';
        case 'string': return 'secondary';
        case 'boolean': return 'outline';
        case 'date': return 'destructive';
        default: return 'default';
    }
}

const Histogram = ({ data }: { data: { bin: number; count: number }[] }) => {
    const width = 280, height = 100, maxCount = Math.max(1, ...data.map(d => d.count)), barWidth = width / data.length;
    return (
        <svg width={width} height={height} className="mt-2 bg-muted/30 rounded-md">
            {data.map((d, i) => (
                <motion.rect key={i} x={i * barWidth} y={height - (d.count / maxCount) * height} width={barWidth - 1} height={(d.count / maxCount) * height} className="fill-primary" initial={{ height: 0, y: height }} animate={{ height: (d.count / maxCount) * height, y: height - (d.count / maxCount) * height }} transition={{ duration: 0.5, delay: i * 0.02 }} />
            ))}
        </svg>
    );
};

const CorrelationMatrix = ({ data, columns }: { data: Record<string, any>[], columns: Column[] }) => {
    const numericCols = columns.filter(c => c.type === 'number');
    const matrix = useMemo(() => {
        const size = numericCols.length;
        const corrMatrix = Array.from({ length: size }, () => Array(size).fill(0));
        for (let i = 0; i < size; i++) {
            for (let j = i; j < size; j++) {
                const col1 = numericCols[i].key;
                const col2 = numericCols[j].key;
                const values1 = data.map(d => d[col1]).filter(v => v !== null);
                const values2 = data.map(d => d[col2]).filter(v => v !== null);
                if (values1.length === 0 || values2.length === 0) continue;
                const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
                const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
                let numerator = 0, stdDev1 = 0, stdDev2 = 0;
                const commonLength = Math.min(values1.length, values2.length);
                for(let k=0; k < commonLength; k++) {
                    numerator += (values1[k] - mean1) * (values2[k] - mean2);
                    stdDev1 += Math.pow(values1[k] - mean1, 2);
                    stdDev2 += Math.pow(values2[k] - mean2, 2);
                }
                const correlation = numerator / (Math.sqrt(stdDev1) * Math.sqrt(stdDev2));
                corrMatrix[i][j] = isNaN(correlation) ? 0 : correlation;
                corrMatrix[j][i] = isNaN(correlation) ? 0 : correlation;
            }
        }
        return corrMatrix;
    }, [data, numericCols]);

    const getColor = (value: number) => {
        const alpha = Math.abs(value);
        return value > 0 ? `rgba(60, 120, 220, ${alpha})` : `rgba(220, 80, 60, ${alpha})`;
    };

    const cellSize = 70;
    return (
        <div className="p-4 overflow-auto">
            <div style={{ width: numericCols.length * cellSize, height: numericCols.length * cellSize, display: 'grid', gridTemplateColumns: `repeat(${numericCols.length}, 1fr)` }}>
                {matrix.flat().map((cell, index) => {
                    const i = Math.floor(index / numericCols.length);
                    const j = index % numericCols.length;
                    return (
                        <motion.div key={`${i}-${j}`} className="flex items-center justify-center border border-border" style={{ backgroundColor: getColor(cell) }} whileHover={{ scale: 1.1, zIndex: 10, transition: { duration: 0.2 } }}>
                            <span className="font-bold text-white mix-blend-difference text-sm">{cell.toFixed(2)}</span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

// --- COMPONENT --- 
export default function DatasetExplorer() {
  const [data] = useState<Record<string, any>[]>(mockData);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(columns[3]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  const filteredData = useMemo(() => {
    let filtered = data;
    if (searchTerm) {
        filtered = filtered.filter(row => 
            columns.some(col => 
                col.type === 'string' && row[col.key] && String(row[col.key]).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }
    if (filters.length > 0) {
        filtered = filtered.filter(row => {
            return filters.every(filter => {
                const val = row[filter.column];
                if (val === null || val === undefined) return false;
                const filterVal = columns.find(c => c.key === filter.column)?.type === 'number' ? Number(filter.value) : filter.value;
                switch (filter.operator) {
                    case '==': return val == filterVal;
                    case '!=': return val != filterVal;
                    case '>': return val > filterVal;
                    case '<': return val < filterVal;
                    case '>=': return val >= filterVal;
                    case '<=': return val <= filterVal;
                    case 'contains': return String(val).toLowerCase().includes(String(filterVal).toLowerCase());
                    default: return true;
                }
            });
        });
    }
    return filtered;
  }, [data, searchTerm, filters]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn], bVal = b[sortColumn];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const columnStats = useMemo(() => {
    if (!selectedColumn) return null;
    const values = filteredData.map(row => row[selectedColumn.key]).filter(v => v !== null && v !== undefined);
    const nulls = filteredData.length - values.length;

    if (selectedColumn.type === 'number' && values.length > 0) {
        const numericValues = values as number[];
        const sum = numericValues.reduce((s, v) => s + v, 0);
        const mean = sum / numericValues.length;
        const sortedVals = [...numericValues].sort((a, b) => a - b);
        const median = sortedVals.length % 2 === 0 ? (sortedVals[sortedVals.length / 2 - 1] + sortedVals[sortedVals.length / 2]) / 2 : sortedVals[Math.floor(sortedVals.length / 2)];
        const stdDev = Math.sqrt(numericValues.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / numericValues.length);
        const min = Math.min(...numericValues), max = Math.max(...numericValues);
        const numBins = 10, binWidth = (max - min) / numBins;
        const bins = Array.from({ length: numBins }, (_, i) => ({ bin: min + i * binWidth, count: 0 }));
        for (const value of numericValues) {
            const binIndex = binWidth > 0 ? Math.min(Math.floor((value - min) / binWidth), numBins - 1) : 0;
            if(bins[binIndex]) bins[binIndex].count++;
        }
        return { type: 'numeric', stats: { mean, median, stdDev, min, max, nulls }, histogram: bins };
    } else {
        const counts = values.reduce((acc, val) => { const key = String(val); acc[key] = (acc[key] || 0) + 1; return acc; }, {} as Record<string, number>);
        const distribution = Object.entries(counts).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5);
        return { type: 'categorical', stats: { unique: Object.keys(counts).length, nulls }, distribution };
    }
  }, [selectedColumn, filteredData]);

  const renderCell = (row: Record<string, any>, column: Column) => {
    const value = row[column.key];
    if (value === null || value === undefined) return <span className="text-muted-foreground">N/A</span>;
    switch (column.type) {
      case 'boolean': return <Badge variant={value ? 'default' : 'destructive'}>{value ? 'Yes' : 'No'}</Badge>;
      case 'number': return <span className="text-right font-mono">{column.key === 'price' ? `$${value.toFixed(2)}` : value}</span>;
      case 'date': return new Date(value).toLocaleDateString();
      default: return String(value).substring(0, 50);
    }
  };

  const handleSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  return (
    <div className="bg-background text-foreground p-4 lg:p-6 space-y-4 flex flex-col h-[95vh] max-w-screen-2xl mx-auto">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Dataset Explorer</h1>
        <div className="flex items-center space-x-2 flex-wrap">
            <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search text..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="w-48 pl-8" /></div>
            <Popover>
                <PopoverTrigger asChild><Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filters ({filters.length})</Button></PopoverTrigger>
                <PopoverContent className="w-96 p-4 space-y-4">
                    <div className="flex items-center justify-between"><h4 className="font-medium">Filter Builder</h4><Button variant="ghost" size="sm" onClick={() => setFilters([])}><Trash2 className="mr-2 h-4 w-4"/>Clear</Button></div>
                    {filters.map((filter, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Select value={filter.column} onValueChange={(v: string) => setFilters(fs => fs.map((f, fi) => fi === i ? {...f, column: v} : f))}><SelectTrigger className="w-32"><SelectValue/></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select>
                            <Select value={filter.operator} onValueChange={(v: string) => setFilters(fs => fs.map((f, fi) => fi === i ? {...f, operator: v} : f))}><SelectTrigger className="w-20"><SelectValue/></SelectTrigger><SelectContent>{['==', '!=', '>', '<', '>=', '<=', 'contains'].map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select>
                            <Input value={filter.value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(fs => fs.map((f, fi) => fi === i ? {...f, value: e.target.value} : f))} />
                            <Button variant="ghost" size="icon" onClick={() => setFilters(fs => fs.filter((_, fi) => fi !== i))}><X className="h-4 w-4"/></Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setFilters(fs => [...fs, {column: 'price', operator: '>', value: 100}])}><PlusCircle className="mr-2 h-4 w-4"/>Add Filter</Button>
                </PopoverContent>
            </Popover>
            <Dialog><DialogTrigger asChild><Button variant="outline"><Sigma className="mr-2 h-4 w-4" /> Correlation</Button></DialogTrigger><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Numeric Column Correlation Matrix</DialogTitle></DialogHeader><CorrelationMatrix data={data} columns={columns} /></DialogContent></Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
        <div className="lg:col-span-2 flex flex-col min-h-0">
            <Card className="flex-grow flex flex-col">
                <CardHeader><CardTitle>Dataset Overview</CardTitle><CardDescription>{filteredData.length} of {data.length} rows</CardDescription></CardHeader>
                <CardContent className="flex-grow overflow-auto relative">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.key} className="cursor-pointer p-0" onClick={() => setSelectedColumn(col)}>
                                        <motion.div className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors" whileHover={{ backgroundColor: 'hsl(var(--muted))' }}>
                                            <div>
                                                <div className="flex items-center space-x-1" onClick={(e) => { e.stopPropagation(); handleSort(col.key);}}>
                                                    <span>{col.label}</span>
                                                    {sortColumn === col.key ? (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : (<ChevronsUpDown className="h-4 w-4 text-muted-foreground" />)}
                                                </div>
                                                <Badge variant={getDataTypeBadgeVariant(col.type)} className="mt-1 capitalize text-xs font-normal">{col.type}</Badge>
                                            </div>
                                        </motion.div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                            {sortedData.slice(0, 50).map((row) => (
                                <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} layout className="hover:bg-muted/50">
                                    {columns.map((col) => (
                                        <TableCell key={`${row.id}-${col.key}`} className="py-2 px-4 truncate max-w-[200px]">{renderCell(row, col)}</TableCell>
                                    ))}
                                </motion.tr>
                            ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 flex flex-col min-h-0">
            <Card className="flex-grow flex flex-col">
                <CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5"/>Column Statistics</CardTitle>{selectedColumn && <Button variant="ghost" size="icon" onClick={() => setSelectedColumn(null)}><X className="h-4 w-4"/></Button>}</CardHeader>
                <CardContent className="flex-grow overflow-y-auto pt-4">
                    <AnimatePresence mode="wait">
                    {selectedColumn && columnStats ? (
                        <motion.div key={selectedColumn.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <h3 className="font-bold text-lg">{selectedColumn.label} <Badge variant={getDataTypeBadgeVariant(selectedColumn.type)} className="ml-2 capitalize text-xs font-normal">{selectedColumn.type}</Badge></h3>
                            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                                {columnStats.type === 'numeric' && columnStats.stats && (
                                    <>
                                        <div className="flex justify-between"><span>Mean</span><span className="font-mono">{columnStats.stats.mean?.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span>Median</span><span className="font-mono">{columnStats.stats.median?.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span>Std. Dev.</span><span className="font-mono">{columnStats.stats.stdDev?.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span>Min / Max</span><span className="font-mono">{columnStats.stats.min} / {columnStats.stats.max}</span></div>
                                        <div className="flex justify-between"><span>Null Values</span><span className="font-mono">{columnStats.stats.nulls} ({ (columnStats.stats.nulls / filteredData.length * 100).toFixed(1) }%)</span></div>
                                        <h4 className="font-semibold text-foreground pt-4">Distribution</h4>
                                        {columnStats.histogram && <Histogram data={columnStats.histogram} />}
                                    </>
                                )}
                                {columnStats.type === 'categorical' && columnStats.stats && (
                                    <>
                                        <div className="flex justify-between"><span>Unique Values</span><span className="font-mono">{columnStats.stats.unique}</span></div>
                                        <div className="flex justify-between"><span>Null Values</span><span className="font-mono">{columnStats.stats.nulls} ({ (columnStats.stats.nulls / filteredData.length * 100).toFixed(1) }%)</span></div>
                                        <h4 className="font-semibold text-foreground pt-4">Top 5 Values</h4>
                                        <div className="space-y-1">
                                            {columnStats.distribution?.map(([value, count]: [string, unknown]) => (
                                                <div key={value} className="flex items-center justify-between"><span className="truncate" title={value}>{value}</span><Badge variant="secondary">{String(count)}</Badge></div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-full text-muted-foreground text-center">
                            <p>Select a column header to view its statistics.</p>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
