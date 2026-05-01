import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Type definitions
type DataPoint = number;
type Bin = {
  x0: number;
  x1: number;
  count: number;
};

// --- Helper Functions ---

// Box-Muller transform to generate normally distributed random numbers
const generateNormalData = (count: number, mean: number, stdDev: number): DataPoint[] => {
  const data: DataPoint[] = [];
  for (let i = 0; i < count / 2; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    data.push(z1 * stdDev + mean);
    data.push(z2 * stdDev + mean);
  }
  return data;
};

const calculateStats = (data: DataPoint[]) => {
  if (data.length === 0) return { mean: 0, median: 0, stdDev: 0 };
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const sortedData = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sortedData.length / 2);
  const median = sortedData.length % 2 !== 0 ? sortedData[mid] : (sortedData[mid - 1] + sortedData[mid]) / 2;
  const stdDev = Math.sqrt(data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / data.length);
  return { mean, median, stdDev };
};

const normalPDF = (x: number, mean: number, stdDev: number) => {
  if (stdDev === 0) return 0;
  const variance = stdDev * stdDev;
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
};

// --- Main Component ---

const HistogramBuilder: React.FC = () => {
  const [binCount, setBinCount] = useState<number>(10);
  const [showDensity, setShowDensity] = useState<boolean>(true);
  const [hoveredBin, setHoveredBin] = useState<Bin | null>(null);

  const data = useMemo(() => generateNormalData(200, 100, 15), []);
  const stats = useMemo(() => calculateStats(data), [data]);

  const width = 800;
  const height = 500;
  const margin = { top: 20, right: 30, bottom: 70, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const { bins, dataMin, dataMax, maxCount } = useMemo(() => {
    if (data.length === 0) return { bins: [], dataMin: 0, dataMax: 0, maxCount: 0 };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / binCount;

    const newBins: Bin[] = Array.from({ length: binCount }, (_, i) => ({
      x0: min + i * binWidth,
      x1: min + (i + 1) * binWidth,
      count: 0,
    }));

    data.forEach(d => {
      const binIndex = Math.min(Math.floor((d - min) / binWidth), binCount - 1);
      if (newBins[binIndex]) {
        newBins[binIndex].count++;
      }
    });

    const newMaxCount = Math.max(...newBins.map(b => b.count), 1);

    return { bins: newBins, dataMin: min, dataMax: max, maxCount: newMaxCount };
  }, [data, binCount]);

  const densityPath = useMemo(() => {
    if (!showDensity || data.length === 0) return "";
    const binWidth = (dataMax - dataMin) / binCount;
    const points: string[] = [];
    const numPoints = 100;

    for (let i = 0; i <= numPoints; i++) {
      const x = dataMin + (i / numPoints) * (dataMax - dataMin);
      const pdfValue = normalPDF(x, stats.mean, stats.stdDev);
      const scaledY = pdfValue * data.length * binWidth;

      const svgX = ((x - dataMin) / (dataMax - dataMin)) * chartWidth;
      const svgY = chartHeight - (scaledY / maxCount) * chartHeight;

      if (svgY >= 0 && svgY <= chartHeight) {
        points.push(`${svgX.toFixed(2)},${svgY.toFixed(2)}`);
      }
    }
    return `M ${points.join(" L ")}`;
  }, [showDensity, data, stats, binCount, dataMin, dataMax, maxCount, chartWidth, chartHeight]);

  return (
    <Card className="w-full max-w-5xl mx-auto bg-background text-foreground shadow-xl border-border/40 font-sans">
      <CardHeader>
        <CardTitle className="text-2xl">Histogram Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-[3fr_1fr] gap-8">
          <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
              <g transform={`translate(${margin.left}, ${margin.top})`}>
                {/* Axes and Grid Lines */}
                <g className="text-muted-foreground text-xs">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = chartHeight - (i / 4) * chartHeight;
                    const tickValue = (i / 4) * maxCount;
                    return (
                      <g key={`y-tick-${i}`} transform={`translate(0, ${y})`}>
                        <line x1={-5} x2={chartWidth} className="stroke-border/30" strokeDasharray="2,2" />
                        <text x={-10} dy=".32em" textAnchor="end" className="fill-current">{tickValue.toFixed(0)}</text>
                      </g>
                    );
                  })}
                  {bins.map((bin, i) => {
                    if (i % 2 !== 0 && binCount > 10) return null;
                     const x = ((bin.x0 - dataMin) / (dataMax - dataMin)) * chartWidth;
                     return (
                        <g key={`x-tick-${i}`} transform={`translate(${x}, ${chartHeight})`}>
                            <text y={20} textAnchor="middle" className="fill-current">{bin.x0.toFixed(0)}</text>
                        </g>
                     )
                  })}
                  <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} className="stroke-current" />
                </g>

                {/* Bars */}
                <g onMouseLeave={() => setHoveredBin(null)}>
                  {bins.map((bin, i) => {
                    const barWidth = chartWidth / binCount;
                    const barHeight = (bin.count / maxCount) * chartHeight;
                    const x = ((bin.x0 - dataMin) / (dataMax - dataMin)) * chartWidth;
                    const y = chartHeight - barHeight;

                    return (
                      <motion.rect
                        key={`bar-${i}`}
                        x={x + 1}
                        y={y}
                        width={barWidth - 2}
                        height={barHeight}
                        className="fill-primary/60 hover:fill-primary transition-colors cursor-pointer"
                        onMouseEnter={() => setHoveredBin(bin)}
                        initial={{ height: 0, y: chartHeight }}
                        animate={{ height: barHeight, y: y }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                    );
                  })}
                </g>

                {/* Density Curve */}
                {showDensity && (
                  <motion.path
                    d={densityPath}
                    fill="none"
                    className="stroke-amber-400"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                )}

                {/* Axis Labels */}
                <text x={chartWidth / 2} y={chartHeight + 50} textAnchor="middle" className="fill-current text-sm font-medium">Value</text>
                <text transform={`rotate(-90) translate(${-chartHeight / 2}, ${-margin.left + 20})`} textAnchor="middle" className="fill-current text-sm font-medium">Frequency</text>

                {/* Hover Tooltip */}
                <AnimatePresence>
                  {hoveredBin && (
                    <motion.g 
                      transform={`translate(${((hoveredBin.x0 + (hoveredBin.x1 - hoveredBin.x0) / 2 - dataMin) / (dataMax - dataMin)) * chartWidth}, ${chartHeight - (hoveredBin.count / maxCount) * chartHeight - 10})`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-none"
                    >
                      <rect x="-60" y="-45" width="120" height="40" rx="5" className="fill-background/80 stroke-border" />
                      <text x="-50" y="-28" className="text-xs fill-foreground font-bold">{`Range: ${hoveredBin.x0.toFixed(1)}-${hoveredBin.x1.toFixed(1)}`}</text>
                      <text x="-50" y="-13" className="text-xs fill-muted-foreground">{`Count: ${hoveredBin.count}`}</text>
                    </motion.g>
                  )}
                </AnimatePresence>
              </g>
            </svg>
          </div>

          <div className="space-y-6 pt-2">
            <Card className="bg-background/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="bin-slider" className="text-sm">Bin Count: {binCount}</Label>
                  <Slider id="bin-slider" min={5} max={20} step={1} value={[binCount]} onValueChange={(value) => setBinCount(value[0])} />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="density-switch" className="text-sm">Density Curve</Label>
                  <Switch id="density-switch" checked={showDensity} onCheckedChange={setShowDensity} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 pt-4">
                <div className="flex justify-between"><span>Mean:</span> <span className="font-mono text-primary">{stats.mean.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Median:</span> <span className="font-mono text-primary">{stats.median.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Std. Dev:</span> <span className="font-mono text-primary">{stats.stdDev.toFixed(2)}</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HistogramBuilder;
