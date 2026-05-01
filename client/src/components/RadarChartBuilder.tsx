import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Type definitions for the Radar Chart
interface RadarChartDataItem {
  [key: string]: number;
}

interface RadarChartDataset {
  name: string;
  data: RadarChartDataItem;
  color: string;
}

interface RadarChartAxis {
  name: string;
  max: number;
}

interface RadarChartProps {
  data?: RadarChartDataset[];
  axes?: RadarChartAxis[];
  size?: number;
}

// Mock Data
const mockAxes: RadarChartAxis[] = [
  { name: "Reasoning", max: 100 },
  { name: "Speed", max: 100 },
  { name: "Accuracy", max: 100 },
  { name: "Coding", max: 100 },
  { name: "Creativity", max: 100 },
  { name: "Safety", max: 100 },
];

const mockData: RadarChartDataset[] = [
  {
    name: "Model A",
    data: { Reasoning: 80, Speed: 90, Accuracy: 75, Coding: 85, Creativity: 95, Safety: 70 },
    color: "hsl(var(--primary))",
  },
  {
    name: "Model B",
    data: { Reasoning: 95, Speed: 70, Accuracy: 85, Coding: 90, Creativity: 80, Safety: 85 },
    color: "hsl(var(--accent))",
  },
  {
    name: "Model C",
    data: { Reasoning: 70, Speed: 80, Accuracy: 90, Coding: 75, Creativity: 85, Safety: 95 },
    color: "hsl(var(--secondary))",
  },
];

const RadarChartBuilder: React.FC<RadarChartProps> = ({ data = mockData, axes = mockAxes, size = 400 }) => {
  const center = size / 2;
  const radius = size * 0.4;
  const numAxes = axes.length;
  const angleSlice = (Math.PI * 2) / numAxes;

  const getPoint = (angle: number, value: number, max: number) => {
    const r = (value / max) * radius;
    const x = center + r * Math.cos(angle - Math.PI / 2);
    const y = center + r * Math.sin(angle - Math.PI / 2);
    return { x, y };
  };

  const getPath = (points: { x: number; y: number }[]) => {
    return points.map((p, i) => (i === 0 ? "M" : "L") + `${p.x},${p.y}`).join(" ") + " Z";
  };

  const [hoveredDataset, setHoveredDataset] = React.useState<string | null>(null);
  const [visibleDatasets, setVisibleDatasets] = React.useState<string[]>(() => data.map(d => d.name));
  return (
    <div className="bg-background text-foreground p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4">AI Model Capabilities</h2>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <polygon
            key={`grid-${i}`}
            points={axes.map((axis, j) => {
              const point = getPoint(j * angleSlice, ((i + 1) / 5) * axis.max, axis.max);
              return `${point.x},${point.y}`;
            }).join(' ')}
            className="fill-none stroke-border/50"
            strokeWidth="0.5"
          />
        ))}

        {/* Axes lines and labels */}
        {axes.map((axis, i) => {
          const endPoint = getPoint(i * angleSlice, axis.max, axis.max);
          const labelPoint = getPoint(i * angleSlice, axis.max * 1.1, axis.max);
          return (
            <g key={`axis-${i}`}>
              <line x1={center} y1={center} x2={endPoint.x} y2={endPoint.y} className="stroke-border" strokeWidth="1" />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                className="text-xs fill-foreground"
                textAnchor={labelPoint.x > center ? "start" : labelPoint.x < center ? "end" : "middle"}
                dominantBaseline="middle"
              >
                {axis.name}
              </text>
            </g>
          );
        })}

        {/* Data paths */}
        {data.filter(d => visibleDatasets.includes(d.name)).map((dataset, i) => {
          const points = axes.map((axis, i) => getPoint(i * angleSlice, dataset.data[axis.name] || 0, axis.max));
          const path = getPath(points);
          return (
            <motion.path
              key={dataset.name}
              initial={{ d: getPath(axes.map(() => ({ x: center, y: center }))) }}
              animate={{ d: path }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeInOut" }}
              fill={dataset.color}
              stroke={dataset.color}
              strokeWidth="2"
              fillOpacity={hoveredDataset === dataset.name ? 0.4 : 0.2}
              strokeOpacity={hoveredDataset === null || hoveredDataset === dataset.name ? 1 : 0.3}
              onMouseEnter={() => setHoveredDataset(dataset.name)}
              onMouseLeave={() => setHoveredDataset(null)}
            />
          );
        })}
      </svg>
      <div className="flex justify-center space-x-4 mt-4">
        {data.map(dataset => (
          <div key={dataset.name} className="flex items-center cursor-pointer" onClick={() => {
            setVisibleDatasets(prev => 
              prev.includes(dataset.name) 
                ? prev.filter(d => d !== dataset.name) 
                : [...prev, dataset.name]
            );
          }}>
            <div style={{ backgroundColor: dataset.color }} className={cn("w-4 h-4 rounded-sm mr-2", !visibleDatasets.includes(dataset.name) && "opacity-30")} />
            <span className={cn("text-sm", !visibleDatasets.includes(dataset.name) && "opacity-50 line-through")}>{dataset.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadarChartBuilder;
