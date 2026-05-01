import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Types
type ScoreData = {
  className: string;
  scores: number[];
};

type BoxPlotStats = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  iqr: number;
  lowerWhisker: number;
  upperWhisker: number;
  outliers: number[];
};

// Mock Data
const mockData: ScoreData[] = [
  { className: "Class A", scores: [68, 72, 75, 78, 81, 83, 85, 88, 90, 92, 95, 50, 105] },
  { className: "Class B", scores: [65, 70, 72, 76, 79, 81, 84, 86, 89, 91, 94, 45] },
  { className: "Class C", scores: [70, 75, 78, 80, 82, 85, 88, 90, 93, 96, 99, 60, 110, 112] },
  { className: "Class D", scores: [62, 66, 69, 71, 74, 77, 80, 82, 85, 88, 91] },
  { className: "Class E", scores: [75, 78, 81, 84, 86, 89, 92, 95, 98, 100, 102, 65, 115] },
];

// Helper function to calculate statistics
const calculateStats = (scores: number[]): BoxPlotStats => {
  const sortedScores = [...scores].sort((a, b) => a - b);
  const n = sortedScores.length;

  const quantile = (q: number) => {
    const pos = (n - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedScores[base + 1] !== undefined) {
      return sortedScores[base] + rest * (sortedScores[base + 1] - sortedScores[base]);
    }
    return sortedScores[base];
  };

  const q1 = quantile(0.25);
  const median = quantile(0.5);
  const q3 = quantile(0.75);
  const iqr = q3 - q1;

  const lowerWhisker = Math.max(sortedScores[0], q1 - 1.5 * iqr);
  const upperWhisker = Math.min(sortedScores[n - 1], q3 + 1.5 * iqr);

  const outliers = sortedScores.filter(score => score < lowerWhisker || score > upperWhisker);
  const mean = scores.reduce((acc, val) => acc + val, 0) / n;

  return {
    min: sortedScores[0],
    q1,
    median,
    q3,
    max: sortedScores[n - 1],
    mean,
    iqr,
    lowerWhisker,
    upperWhisker,
    outliers,
  };
};

const Tooltip: React.FC<{ data: { group: string; stats: BoxPlotStats; x: number; y: number } }> = ({ data }) => {
  const { group, stats } = data;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute bg-popover text-popover-foreground rounded-lg shadow-lg p-3 text-sm pointer-events-none"
      style={{ left: data.x, top: data.y - 150, transform: 'translateX(-50%)' }}
    >
      <h4 className="font-bold mb-2">{group}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Q1:</span><span className="text-right">{stats.q1.toFixed(2)}</span>
        <span>Median:</span><span className="text-right">{stats.median.toFixed(2)}</span>
        <span>Q3:</span><span className="text-right">{stats.q3.toFixed(2)}</span>
        <span>Mean:</span><span className="text-right">{stats.mean.toFixed(2)}</span>
        <span>Min:</span><span className="text-right">{stats.min.toFixed(2)}</span>
        <span>Max:</span><span className="text-right">{stats.max.toFixed(2)}</span>
      </div>
    </motion.div>
  );
};

const BoxPlot: React.FC = () => {
  const [hoveredStats, setHoveredStats] = useState<{ group: string; stats: BoxPlotStats; x: number; y: number } | null>(null);

  const statsData = mockData.map(data => ({
    className: data.className,
    stats: calculateStats(data.scores),
  }));

  const allScores = mockData.flatMap(d => d.scores);
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);

  const margin = { top: 40, right: 40, bottom: 40, left: 100 };
  const width = 1000 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const xScale = (value: number) => {
    return margin.left + ((value - minScore) / (maxScore - minScore)) * width;
  };

  const bandHeight = height / statsData.length;
  const boxHeight = bandHeight * 0.6;
  return (
    <div className="relative w-full h-full bg-background text-foreground p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Test Score Distribution</h2>
      
      <div className="w-full h-[500px] flex justify-center items-center">
        <svg width="100%" height="100%" viewBox="0 0 1000 500">
          
          <g className="axes">
            {/* X-Axis Ticks */}
            {Array.from({ length: 11 }, (_, i) => {
              const value = minScore + (i * (maxScore - minScore)) / 10;
              return (
                <g key={`x-tick-${i}`} transform={`translate(${xScale(value)}, ${height + margin.top})`}>
                  <line y2="5" className="stroke-border" />
                  <text dy="20" textAnchor="middle" className="fill-foreground text-xs">
                    {Math.round(value)}
                  </text>
                </g>
              );
            })}
            <text x={margin.left + width / 2} y={height + margin.top + 35} textAnchor="middle" className="fill-foreground font-medium">
              Scores
            </text>
          </g>

          
          <g className="data-points">
            {statsData.map((data, i) => {
              const y = margin.top + i * bandHeight + bandHeight / 2;
              const { q1, median, q3, lowerWhisker, upperWhisker, mean, outliers } = data.stats;

              const xQ1 = xScale(q1);
              const xMedian = xScale(median);
              const xQ3 = xScale(q3);
              const xLowerWhisker = xScale(lowerWhisker);
              const xUpperWhisker = xScale(upperWhisker);
              const xMean = xScale(mean);

              return (
                <g key={data.className} transform={`translate(0, ${y - boxHeight / 2})`}>
                  {/* Y-Axis Label */}
                  <text x={margin.left - 10} y={boxHeight / 2} dy="0.35em" textAnchor="end" className="fill-foreground font-medium">
                    {data.className}
                  </text>

                  {/* Whiskers */}
                  <line x1={xLowerWhisker} y1={boxHeight / 2} x2={xQ1} y2={boxHeight / 2} className="stroke-foreground" />
                  <line x1={xQ3} y1={boxHeight / 2} x2={xUpperWhisker} y2={boxHeight / 2} className="stroke-foreground" />
                  <line x1={xLowerWhisker} y1={0} x2={xLowerWhisker} y2={boxHeight} className="stroke-foreground" />
                  <line x1={xUpperWhisker} y1={0} x2={xUpperWhisker} y2={boxHeight} className="stroke-foreground" />

                  {/* Box */}
                  <motion.rect
                    x={xQ1}
                    y={0}
                    width={xQ3 - xQ1}
                    height={boxHeight}
                    className="fill-primary/30 stroke-primary"
                    onHoverStart={(e) => {
                      const target = e.target as SVGElement;
                      const bbox = target.getBoundingClientRect();
                      setHoveredStats({ group: data.className, stats: data.stats, x: bbox.left + bbox.width / 2, y: bbox.top });
                    }}
                    onHoverEnd={() => setHoveredStats(null)}
                  />

                  {/* Median Line */}
                  <line x1={xMedian} y1={0} x2={xMedian} y2={boxHeight} className="stroke-primary-foreground stroke-2" />

                  {/* Mean Marker */}
                  <path d={`M ${xMean - 3},${boxHeight / 2 - 3} L ${xMean + 3},${boxHeight / 2 + 3} M ${xMean - 3},${boxHeight / 2 + 3} L ${xMean + 3},${boxHeight / 2 - 3}`} className="stroke-red-500 stroke-2" />

                  {/* Outliers */}
                  {outliers.map((outlier, j) => (
                    <circle key={`outlier-${j}`} cx={xScale(outlier)} cy={boxHeight / 2} r="3" className="fill-destructive" />
                  ))}
                </g>
              );
            })}
          </g>

        </svg>
      </div>
      <AnimatePresence>
        {hoveredStats && <Tooltip data={hoveredStats} />}
      </AnimatePresence>
    </div>
  );
};

export default BoxPlot;
