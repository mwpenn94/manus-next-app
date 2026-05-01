"use client";

import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Maximize, Minimize } from "lucide-react";

// Define the types for the funnel data
type FunnelStage = {
  name: string;
  value: number;
};

type FunnelData = FunnelStage[];

// Mock data for the e-commerce checkout funnel
const mockData: FunnelData = [
  { name: "Visited Site", value: 10000 },
  { name: "Viewed Product", value: 7500 },
  { name: "Added to Cart", value: 3000 },
  { name: "Started Checkout", value: 1500 },
  { name: "Completed Purchase", value: 900 },
];

const mockCompareData: FunnelData = [
  { name: "Visited Site", value: 12000 },
  { name: "Viewed Product", value: 8500 },
  { name: "Added to Cart", value: 3200 },
  { name: "Started Checkout", value: 1800 },
  { name: "Completed Purchase", value: 1100 },
];

interface FunnelChartProps {
  data?: FunnelData;
  compareData?: FunnelData;
  className?: string;
}

const FunnelChart: React.FC<FunnelChartProps> = ({ data = mockData, compareData, className }) => {
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [hoveredStage, setHoveredStage] = useState<{ funnel: number; stage: number } | null>(null);

  const renderFunnel = (funnelData: FunnelData, funnelIndex: number, isComparison: boolean) => {
    const maxValue = Math.max(funnelData[0]?.value || 0, (compareData && compareData[0]?.value) || 0);
    if (maxValue === 0) return null;

    const width = 500;
    const height = 300;

    return (
      <g transform={isComparison ? `translate(${funnelIndex * (width / 2)}, 0)` : ''}>
        {funnelData.map((stage, i) => {
          const stageWidth = orientation === 'vertical' ? width / (isComparison ? 2 : 1) : width / funnelData.length;
          const stageHeight = orientation === 'vertical' ? height / funnelData.length : height;

          const topValue = stage.value;
          const bottomValue = i < funnelData.length - 1 ? funnelData[i + 1].value : 0;

          let pathData = "";
          if (orientation === 'vertical') {
            const topW = (topValue / maxValue) * stageWidth;
            const bottomW = (bottomValue / maxValue) * stageWidth;
            const y1 = i * stageHeight;
            const y2 = (i + 1) * stageHeight;
            const x1_top = (stageWidth - topW) / 2;
            const x2_top = x1_top + topW;
            const x1_bottom = (stageWidth - bottomW) / 2;
            const x2_bottom = x1_bottom + bottomW;
            pathData = `M ${x1_top},${y1} L ${x2_top},${y1} L ${x2_bottom},${y2} L ${x1_bottom},${y2} Z`;
          } else {
            const topH = (topValue / maxValue) * stageHeight;
            const bottomH = (bottomValue / maxValue) * stageHeight;
            const x1 = i * stageWidth;
            const x2 = (i + 1) * stageWidth;
            const y1_top = (stageHeight - topH) / 2;
            const y2_top = y1_top + topH;
            const y1_bottom = (stageHeight - bottomH) / 2;
            const y2_bottom = y1_bottom + bottomH;
            pathData = `M ${x1},${y1_top} L ${x2},${y1_bottom} L ${x2},${y2_bottom} L ${x1},${y2_top} Z`;
          }

          return (
            <g key={i} onMouseEnter={() => setHoveredStage({ funnel: funnelIndex, stage: i })} onMouseLeave={() => setHoveredStage(null)}>
              <motion.path
                d={pathData}
                className="stroke-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, fill: `hsl(var(--primary) / ${0.6 - i * 0.1})` }}
                whileHover={{ fill: `hsl(var(--primary) / ${0.8 - i * 0.1})` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
              <text 
                x={orientation === 'vertical' ? stageWidth / 2 : i * stageWidth + stageWidth / 2}
                y={orientation === 'vertical' ? i * stageHeight + stageHeight / 2 : stageHeight / 2 - 10}
                textAnchor="middle" dy=".3em" className="fill-foreground font-semibold text-sm pointer-events-none">
                {stage.name}
              </text>
              <text 
                x={orientation === 'vertical' ? stageWidth / 2 : i * stageWidth + stageWidth / 2}
                y={orientation === 'vertical' ? i * stageHeight + stageHeight / 2 + 20 : stageHeight / 2 + 10}
                textAnchor="middle" dy=".3em" className="fill-foreground/80 text-xs pointer-events-none">
                {stage.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderTooltip = () => {
    if (!hoveredStage) return null;
    const { funnel, stage } = hoveredStage;
    const currentData = funnel === 0 ? data : compareData;
    if (!currentData) return null;

    const stageData = currentData[stage];
    const totalValue = currentData[0].value;
    const prevValue = stage > 0 ? currentData[stage - 1].value : totalValue;
    const percentageOfTotal = ((stageData.value / totalValue) * 100).toFixed(1);
    const conversionRate = ((stageData.value / prevValue) * 100).toFixed(1);
    const dropOff = stage > 0 ? prevValue - stageData.value : 0;
    const dropOffPercentage = stage > 0 ? ((dropOff / prevValue) * 100).toFixed(1) : "0.0";

    return (
        <motion.div 
            className="absolute bg-background/80 backdrop-blur-sm border rounded-lg p-3 text-sm text-foreground shadow-lg pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ top: `20%`, left: `${(hoveredStage.funnel * 50) + 25}%`, transform: 'translateX(-50%)' }}
        >
            <div className="font-bold mb-2">{stageData.name}</div>
            <div>Value: <span className="font-semibold">{stageData.value.toLocaleString()}</span></div>
            <div>Overall Conversion: <span className="font-semibold">{percentageOfTotal}%</span></div>
            {stage > 0 && <div>Stage Conversion: <span className="font-semibold">{conversionRate}%</span></div>}
            {stage > 0 && <div>Drop-off: <span className="font-semibold text-red-400">{dropOff.toLocaleString()} ({dropOffPercentage}%)</span></div>}
        </motion.div>
    );
  }

  return (
    <div className={cn("bg-background rounded-lg border p-4 w-full max-w-4xl mx-auto", className)}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">Conversion Funnel</h3>
            <div className="flex items-center gap-2">
                <button onClick={() => setOrientation(o => o === 'vertical' ? 'horizontal' : 'vertical')} className="p-2 rounded-md hover:bg-muted">
                    <ChevronsUpDown className="w-4 h-4" />
                </button>
            </div>
        </div>
        <div className="relative w-full aspect-[5/3]">
            <svg
                viewBox={`0 0 500 300`}
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
            >
                {renderFunnel(data, 0, !!compareData)}
                {compareData && renderFunnel(compareData, 1, true)}
            </svg>
            <AnimatePresence>
                {renderTooltip()}
            </AnimatePresence>
        </div>
    </div>
  );
};

export default FunnelChart;
