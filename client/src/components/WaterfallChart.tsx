"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// --- UTILITY (for self-containment, normally from @/lib/utils) ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- DATA TYPES ---
type WaterfallDataItem = {
  name: string;
  value: number;
};

type ProcessedWaterfallItem = {
  name: string;
  startValue: number;
  endValue: number;
  isPositive: boolean;
  isTotal?: boolean;
};

// --- MOCK DATA ---
const mockData: WaterfallDataItem[] = [
  { name: "Revenue", value: 4200 },
  { name: "COGS", value: -1100 },
  { name: "Marketing", value: -500 },
  { name: "Salaries", value: -1500 },
  { name: "R&D", value: -800 },
  { name: "Other Income", value: 300 },
  { name: "Taxes", value: -450 },
  { name: "Net Profit", value: 0 }, // This will be calculated as the final total
];

// --- COMPONENT PROPS ---
interface WaterfallChartProps {
  data?: WaterfallDataItem[];
  width?: number;
  height?: number;
  className?: string;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({ 
  data = mockData, 
  width = 800, 
  height = 500, 
  className 
}) => {
  const [hoveredBar, setHoveredBar] = React.useState<ProcessedWaterfallItem | null>(null);

  // --- DATA PROCESSING ---
  const processedData = React.useMemo(() => {
    let runningTotal = 0;
    const result: ProcessedWaterfallItem[] = data.map((item, index) => {
      const isTotal = item.value === 0 && index === data.length - 1;
      if (index === 0 || isTotal) { // First item is a total, last item is final total
        const startValue = 0;
        const endValue = isTotal ? runningTotal : item.value;
        const processedItem = { 
          name: item.name, 
          startValue,
          endValue,
          isPositive: endValue >= 0,
          isTotal: true 
        };
        runningTotal = endValue;
        return processedItem;
      } else {
        const startValue = runningTotal;
        const endValue = runningTotal + item.value;
        const processedItem = { 
          name: item.name, 
          startValue,
          endValue,
          isPositive: item.value >= 0,
          isTotal: false
        };
        runningTotal = endValue;
        return processedItem;
      }
    });
    return result;
  }, [data]);

  // --- LAYOUT & SCALE CALCULATIONS ---
  const margin = { top: 40, right: 30, bottom: 50, left: 70 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const { yMin, yMax } = React.useMemo(() => {
    let min = 0;
    let max = 0;
    processedData.forEach(d => {
      min = Math.min(min, d.startValue, d.endValue);
      max = Math.max(max, d.startValue, d.endValue);
    });
    return { yMin: min, yMax: max * 1.1 }; // Add 10% padding to the top
  }, [processedData]);

  const yScale = (value: number) => margin.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

  const barWidth = chartWidth / (processedData.length * 1.5);
  const barPadding = barWidth * 0.5;

  return (
    <div className={cn("w-full h-full bg-background text-foreground p-4 font-sans rounded-lg border", className)}>
      <h2 className="text-lg font-semibold mb-2 text-center">Quarterly Profit & Loss</h2>
      <p className="text-sm text-muted-foreground mb-4 text-center">Cumulative effect of sequential positive and negative values.</p>
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="positive-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--emerald-500))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--emerald-600))" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="negative-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--rose-500))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--rose-600))" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="total-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--primary-foreground))" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* --- AXES AND GRID LINES --- */}
          <line x1={margin.left} y1={yScale(0)} x2={width - margin.right} y2={yScale(0)} stroke="hsl(var(--border))" strokeDasharray="2 2" />
          {[yMin, yMax/2, yMax].map(tick => (
            <g key={tick}>
                <text x={margin.left - 10} y={yScale(tick)} fill="hsl(var(--muted-foreground))" textAnchor="end" alignmentBaseline="middle" fontSize="12">
                    {tick.toLocaleString("en-US", { style: "currency", currency: "USD", notation: "compact"})}
                </text>
                <line x1={margin.left} x2={width - margin.right} y1={yScale(tick)} y2={yScale(tick)} stroke="hsl(var(--border))" strokeOpacity="0.5" strokeDasharray="2 2" />
            </g>
          ))}

          {/* --- BARS and CONNECTING LINES --- */}
          {processedData.map((d, i) => {
            const barY = yScale(Math.max(d.startValue, d.endValue));
            const barHeight = Math.abs(yScale(d.startValue) - yScale(d.endValue));
            const barX = margin.left + i * (barWidth + barPadding);

            const prevItem = i > 0 ? processedData[i - 1] : null;
            const connectorY = prevItem ? yScale(prevItem.endValue) : 0;
            const connectorX1 = prevItem ? margin.left + (i - 1) * (barWidth + barPadding) + barWidth : 0;
            const connectorX2 = barX;

            return (
              <g key={d.name} className="group">
                {prevItem && !prevItem.isTotal && (
                  <motion.line 
                    x1={connectorX1}
                    y1={connectorY}
                    x2={connectorX2}
                    y2={connectorY}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.1 - 0.05 }}
                  />
                )}

                <motion.rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  rx="2"
                  fill={d.isTotal ? "url(#total-gradient)" : d.isPositive ? "url(#positive-gradient)" : "url(#negative-gradient)"}
                  onMouseEnter={() => setHoveredBar(d)}
                  onMouseLeave={() => setHoveredBar(null)}
                  initial={{ height: 0, y: yScale(d.startValue) }}
                  animate={{ height: barHeight, y: barY }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                  className="cursor-pointer stroke-background/20 hover:stroke-primary/80" strokeWidth="1"
                />

                <text 
                  x={barX + barWidth / 2}
                  y={height - margin.bottom + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="hsl(var(--muted-foreground))"
                  className="pointer-events-none"
                >
                  {d.name}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredBar && (
          <div
            className="absolute pointer-events-none p-2.5 rounded-lg bg-popover text-popover-foreground shadow-xl text-sm z-10 border border-border/50"
            style={{
              left: `${margin.left + processedData.indexOf(hoveredBar) * (barWidth + barPadding) + barWidth / 2}px`,
              top: `${yScale(Math.max(hoveredBar.startValue, hoveredBar.endValue)) - 70}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold mb-1">{hoveredBar.name}</div>
            <div className="flex justify-between items-center gap-4">
              <span className="font-medium text-muted-foreground">Change:</span>
              <span className={cn("font-mono font-semibold", hoveredBar.isTotal ? "text-primary" : hoveredBar.isPositive ? "text-emerald-400" : "text-rose-400")}>
                {(hoveredBar.endValue - hoveredBar.startValue).toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="font-medium text-muted-foreground">Total:</span>
              <span className="font-mono font-semibold">
                {hoveredBar.endValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterfallChart;
