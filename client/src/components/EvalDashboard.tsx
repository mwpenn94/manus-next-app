import React, { useState, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, BarChart2, Sliders, TrendingUp, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { evaluationSets, modelVersions, EvaluationSet, EvaluationSample, ModelVersion, EvaluationMetric } from './eval-dashboard-data';

const FailureCaseBrowser = ({ samples }: { samples: EvaluationSample[] }) => {
  const [sortMetric, setSortMetric] = useState<EvaluationMetric>("BERTScore");

  const sortedSamples = useMemo(() => {
    return [...samples].sort((a, b) => a.scores[sortMetric] - b.scores[sortMetric]);
  }, [samples, sortMetric]);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Select value={sortMetric} onValueChange={(value: EvaluationMetric) => setSortMetric(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by metric" />
          </SelectTrigger>
          <SelectContent>
            {(["BLEU", "ROUGE", "BERTScore", "Human Rating"] as EvaluationMetric[]).map(metric => (
              <SelectItem key={metric} value={metric}>Sort by {metric}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {sortedSamples.slice(0, 10).map((sample, index) => (
            <motion.div
              key={sample.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm flex justify-between items-center">
                    <span>{sample.category} - ID: {sample.id}</span>
                    <span className="text-xs font-mono">{sortMetric}: {sample.scores[sortMetric].toFixed(3)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div>
                    <p className="font-semibold">Input:</p>
                    <p className="text-muted-foreground text-xs font-mono p-2 bg-background rounded">{sample.input}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Output:</p>
                    <p className="text-red-400 text-xs font-mono p-2 bg-background rounded">{sample.output}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Expected:</p>
                    <p className="text-green-400 text-xs font-mono p-2 bg-background rounded">{sample.expected}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const CategoryBreakdown = ({ samples }: { samples: EvaluationSample[] }) => {
  const categoryMetrics = useMemo(() => {
    const metricsByCat: { [key: string]: { totalScores: Record<EvaluationMetric, number>, count: number } } = {};
    samples.forEach(sample => {
      if (!metricsByCat[sample.category]) {
        metricsByCat[sample.category] = { totalScores: { 'BLEU': 0, 'ROUGE': 0, 'BERTScore': 0, 'Human Rating': 0 }, count: 0 };
      }
      (Object.keys(sample.scores) as EvaluationMetric[]).forEach(metric => {
        metricsByCat[sample.category].totalScores[metric] += sample.scores[metric];
      });
      metricsByCat[sample.category].count++;
    });
    return Object.entries(metricsByCat).map(([category, data]) => ({
      category,
      'BLEU': data.totalScores['BLEU'] / data.count,
      'ROUGE': data.totalScores['ROUGE'] / data.count,
      'BERTScore': data.totalScores['BERTScore'] / data.count,
      'Human Rating': data.totalScores['Human Rating'] / data.count,
    }));
  }, [samples]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">BLEU</TableHead>
          <TableHead className="text-right">ROUGE</TableHead>
          <TableHead className="text-right">BERTScore</TableHead>
          <TableHead className="text-right">Human Rating</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categoryMetrics.map(item => (
          <TableRow key={item.category} className="hover:bg-muted/50 transition-colors">
            <TableCell className="font-medium">{item.category}</TableCell>
            <TableCell className="text-right">{item.BLEU.toFixed(3)}</TableCell>
            <TableCell className="text-right">{item.ROUGE.toFixed(3)}</TableCell>
            <TableCell className="text-right">{item.BERTScore.toFixed(3)}</TableCell>
            <TableCell className="text-right">{item["Human Rating"].toFixed(2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const ScoreDistribution = ({ samples }: { samples: EvaluationSample[] }) => {
  const metrics: EvaluationMetric[] = ["BLEU", "ROUGE", "BERTScore"];
  const histograms = useMemo(() => {
    const data: { [key in EvaluationMetric]?: number[] } = {};
    metrics.forEach(metric => {
      const values = samples.map(s => s.scores[metric]);
      const numBuckets = 10;
      const buckets = Array(numBuckets).fill(0);
      values.forEach(v => {
        const bucketIndex = Math.min(Math.floor(v * numBuckets), numBuckets - 1);
        buckets[bucketIndex]++;
      });
      data[metric] = buckets;
    });
    const humanRatingValues = samples.map(s => s.scores["Human Rating"]);
    const humanRatingBucketsData = Array(5).fill(0);
    humanRatingValues.forEach(v => { humanRatingBucketsData[v - 1]++; });
    data["Human Rating"] = humanRatingBucketsData;
    return data;
  }, [samples]);

  const renderHistogram = (metric: EvaluationMetric, buckets: number[]) => {
    const maxCount = Math.max(...buckets, 1);
    const width = 150;
    const height = 80;
    const barWidth = width / buckets.length;

    return (
      <div key={metric}>
        <h4 className="text-sm font-medium mb-2">{metric}</h4>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {buckets.map((count, i) => (
            <motion.rect
              key={i}
              x={i * barWidth}
              y={height - (count / maxCount) * height}
              width={barWidth - 1}
              height={(count / maxCount) * height}
              fill="hsl(var(--primary))"
              initial={{ height: 0, y: height }}
              animate={{ height: (count / maxCount) * height, y: height - (count / maxCount) * height }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {Object.entries(histograms).map(([metric, data]) => renderHistogram(metric as EvaluationMetric, data || []))}
    </div>
  );
};

const TrendChart = ({ data }: { data: ModelVersion[] }) => {
  const width = 500;
  const height = 250;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const metrics: EvaluationMetric[] = ["BLEU", "ROUGE", "BERTScore"];
  const colors: { [key in EvaluationMetric]: string } = { "BLEU": "#3b82f6", "ROUGE": "#10b981", "BERTScore": "#f97316", "Human Rating": "#8b5cf6" };

  const xScale = (index: number) => margin.left + (index / (data.length - 1)) * innerWidth;
  const yScale = (value: number) => margin.top + innerHeight - (value * innerHeight);

  const linePath = (metric: EvaluationMetric) => {
    let path = "M";
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.metrics[metric]);
      path += `${x},${y} `;
      if (i > 0) path = path.replace("M", "L");
    });
    return path.replace("L", "M");
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {Array.from({ length: 5 }).map((_, i) => <line key={i} x1={margin.left} x2={width - margin.right} y1={margin.top + (i / 4) * innerHeight} y2={margin.top + (i / 4) * innerHeight} stroke="hsl(var(--border))" strokeWidth="1" />)}
        {metrics.map(metric => <motion.path key={metric} d={linePath(metric)} stroke={colors[metric]} fill="none" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />)}
        {data.map((d, i) => <g key={d.id}>{metrics.map(metric => <motion.circle key={metric} cx={xScale(i)} cy={yScale(d.metrics[metric])} r="3" fill={colors[metric]} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} />)}</g>)}
        {data.map((d, i) => <text key={d.id} x={xScale(i)} y={height - 10} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">{d.name}</text>)}
        {Array.from({ length: 5 }).map((_, i) => <text key={i} x={margin.left - 8} y={margin.top + (i / 4) * innerHeight + 3} textAnchor="end" fontSize="10" fill="hsl(var(--muted-foreground))">{(1 - i / 4).toFixed(1)}</text>)}
      </svg>
      <div className="flex justify-center space-x-4 mt-2">
        {metrics.map(metric => <div key={metric} className="flex items-center"><div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[metric] }} /><span className="text-xs text-muted-foreground">{metric}</span></div>)}
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) => (
  <motion.div whileHover={{ y: -5 }} className="h-full">
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function EvalDashboard() {
  const [selectedSetId, setSelectedSetId] = useState<string>(evaluationSets[0].id);

  const selectedSet = useMemo(() => evaluationSets.find((s: EvaluationSet) => s.id === selectedSetId) || evaluationSets[0], [selectedSetId]);

  const averageMetrics = useMemo(() => {
    if (!selectedSet) return { BLEU: 0, ROUGE: 0, BERTScore: 0, 'Human Rating': 0 };
    const totalScores: Record<EvaluationMetric, number> = { 'BLEU': 0, 'ROUGE': 0, 'BERTScore': 0, 'Human Rating': 0 };
    selectedSet.samples.forEach((sample: EvaluationSample) => { (Object.keys(totalScores) as EvaluationMetric[]).forEach(metric => { totalScores[metric] += sample.scores[metric]; }); });
    const numSamples = selectedSet.samples.length;
    return { 'BLEU': totalScores['BLEU'] / numSamples, 'ROUGE': totalScores['ROUGE'] / numSamples, 'BERTScore': totalScores['BERTScore'] / numSamples, 'Human Rating': totalScores['Human Rating'] / numSamples };
  }, [selectedSet]);

  return (
    <div className="bg-background text-foreground min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2 sm:mb-0">LLM Evaluation Dashboard</h1>
          <div className="flex items-center space-x-4">
            <Select value={selectedSetId} onValueChange={(value: string) => setSelectedSetId(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select an evaluation set" />
              </SelectTrigger>
              <SelectContent>{evaluationSets.map((set: EvaluationSet) => <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline"><FileText className="mr-2 h-4 w-4" />Export Report</Button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="wait">
            <motion.div key={selectedSetId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <MetricCard title="BLEU" value={averageMetrics.BLEU.toFixed(3)} icon={BarChart2} />
              <MetricCard title="ROUGE" value={averageMetrics.ROUGE.toFixed(3)} icon={Sliders} />
              <MetricCard title="BERTScore" value={averageMetrics.BERTScore.toFixed(3)} icon={TrendingUp} />
              <MetricCard title="Human Rating" value={averageMetrics["Human Rating"].toFixed(2)} icon={CheckCircle} />
            </motion.div>
          </AnimatePresence>

          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card><CardHeader><CardTitle>Trend Over Model Versions</CardTitle></CardHeader><CardContent><TrendChart data={modelVersions} /></CardContent></Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card><CardHeader><CardTitle>Score Distribution</CardTitle></CardHeader><CardContent><ScoreDistribution samples={selectedSet.samples} /></CardContent></Card>
          </motion.div>

          <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card><CardHeader><CardTitle>Per-Category Breakdown</CardTitle></CardHeader><CardContent><CategoryBreakdown samples={selectedSet.samples} /></CardContent></Card>
          </motion.div>

          <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card><CardHeader><CardTitle>Failure Case Browser</CardTitle></CardHeader><CardContent><FailureCaseBrowser samples={selectedSet.samples} /></CardContent></Card>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
