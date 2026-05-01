import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Maximize, Minimize } from "lucide-react";

// --- TYPE DEFINITIONS ---
type DataPoint = {
  v1: number;
  v2: number;
  v3: number;
  category: "A" | "B";
};

type ScatterPlotMatrixProps = {
  data: DataPoint[];
};

// --- MOCK DATA ---
const mockData: DataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  v1: Math.random() * 100,
  v2: Math.random() * 80 + 10,
  v3: Math.random() * 120 - 10,
  category: i % 2 === 0 ? "A" : "B",
}));

// --- HELPER FUNCTIONS ---
const linearScale = (domain: [number, number], range: [number, number]) => {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return (value: number) => r0 + (r1 - r0) * ((value - d0) / (d1 - d0));
};

const calculateCorrelation = (data: DataPoint[], keyX: keyof DataPoint, keyY: keyof DataPoint): number => {
    const n = data.length;
    if (n === 0) return 0;

    const filteredData = data.map(d => ({ x: d[keyX] as number, y: d[keyY] as number }));

    const sumX = filteredData.reduce((acc, d) => acc + d.x, 0);
    const sumY = filteredData.reduce((acc, d) => acc + d.y, 0);
    const sumXY = filteredData.reduce((acc, d) => acc + d.x * d.y, 0);
    const sumX2 = filteredData.reduce((acc, d) => acc + d.x * d.x, 0);
    const sumY2 = filteredData.reduce((acc, d) => acc + d.y * d.y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;

    return numerator / denominator;
};

// --- COMPONENT ---
const ScatterPlotMatrix: React.FC<ScatterPlotMatrixProps> = ({ data = mockData }) => {
  const [zoomedCell, setZoomedCell] = useState<[number, number] | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint & { x: number; y: number; keyX: string; keyY: string; } | null>(null);
  const [activeCategories, setActiveCategories] = useState<("A" | "B")[]>(["A", "B"]);

  const variables: (keyof DataPoint)[] = ["v1", "v2", "v3"];
  const numVars = variables.length;
  const size = 600;
  const padding = 30;
  const cellSize = (size - padding * (numVars + 1)) / numVars;

  const colorScale = {
    A: "hsl(var(--primary))",
    B: "hsl(var(--accent))",
  };

    const filteredData = useMemo(() => data.filter(d => activeCategories.includes(d.category)), [data, activeCategories]);

  const domains = useMemo(() => {
    return variables.reduce((acc, key) => {
      const values = data.map(d => d[key] as number);
      acc[key] = [Math.min(...values), Math.max(...values)];
      return acc;
    }, {} as Record<keyof DataPoint, [number, number]>);
  }, [data, variables]);

  const handleCellClick = (row: number, col: number) => {
    if (zoomedCell && zoomedCell[0] === row && zoomedCell[1] === col) {
      setZoomedCell(null);
    } else {
      setZoomedCell([row, col]);
    }
  };

    const toggleCategory = (category: "A" | "B") => {
    setActiveCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  return (
    <div className="relative w-full max-w-[600px] aspect-square bg-background text-foreground rounded-lg border p-4 flex flex-col">
      <div className="flex items-center justify-center gap-4 mb-2">
        <button onClick={() => toggleCategory("A")} className={cn("px-3 py-1 text-sm rounded-md transition-colors", activeCategories.includes("A") ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>Category A</button>
        <button onClick={() => toggleCategory("B")} className={cn("px-3 py-1 text-sm rounded-md transition-colors", activeCategories.includes("B") ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>Category B</button>
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        <defs>
          <clipPath id="cell-clip">
            <rect x="0" y="0" width={cellSize} height={cellSize} />
          </clipPath>
        </defs>
        {variables.map((keyY, row) => (
          variables.map((keyX, col) => {
            const isDiagonal = row === col;
            const cellX = padding + col * (cellSize + padding);
            const cellY = padding + row * (cellSize + padding);

            const xScale = linearScale(domains[keyX], [0, cellSize]);
            const yScale = linearScale(domains[keyY], [cellSize, 0]);

            const correlation = useMemo(() => calculateCorrelation(filteredData, keyX, keyY), [filteredData, keyX, keyY]);

            return (
              <motion.g
                key={`${row}-${col}`}
                transform={`translate(${cellX}, ${cellY})`}
                className="cursor-pointer"
                onClick={() => handleCellClick(row, col)}
              >
                <rect width={cellSize} height={cellSize} fill="hsl(var(--muted)/0.2)" stroke="hsl(var(--border))" rx="4" />
                {isDiagonal ? (
                  <text
                    x={cellSize / 2}
                    y={cellSize / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground font-semibold text-sm"
                  >
                    {keyX}
                  </text>
                ) : (
                  <g clipPath="url(#cell-clip)">
                    {filteredData.map((d, i) => (
                      <motion.circle
                        key={i}
                        cx={xScale(d[keyX] as number)}
                        cy={yScale(d[keyY] as number)}
                        r={3}
                        fill={colorScale[d.category]}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        transition={{ delay: i * 0.01 }}
                        onMouseEnter={() => setHoveredPoint({ ...d, x: cellX + xScale(d[keyX] as number), y: cellY + yScale(d[keyY] as number), keyX, keyY })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                    <text
                        x={cellSize - 8}
                        y={cellSize - 8}
                        textAnchor="end"
                        className="fill-foreground/50 text-xs font-mono"
                    >
                        {correlation.toFixed(2)}
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })
        ))}
      </svg>

      {/* Zoomed View */}
      {zoomedCell && (
        <motion.div
          className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-[90%] h-[90%] p-8 bg-background border rounded-lg shadow-xl">
            <button onClick={() => setZoomedCell(null)} className="absolute top-2 right-2 p-1 text-foreground/70 hover:text-foreground">
              <Minimize size={20} />
            </button>
            <h3 className="text-lg font-semibold text-center">{`${variables[zoomedCell[1]]} vs ${variables[zoomedCell[0]]}`}</h3>
            <div className="w-full h-full flex flex-col items-center justify-center">
                <svg viewBox={`-40 -20 ${size} ${size}`} className="w-full h-full">
                    {
                        (() => {
                            const [row, col] = zoomedCell;
                            const keyX = variables[col];
                            const keyY = variables[row];
                            const plotSize = size - 80;

                            const xScale = linearScale(domains[keyX], [0, plotSize]);
                            const yScale = linearScale(domains[keyY], [plotSize, 0]);

                            const xTicks = [domains[keyX][0], (domains[keyX][0] + domains[keyX][1]) / 2, domains[keyX][1]];
                            const yTicks = [domains[keyY][0], (domains[keyY][0] + domains[keyY][1]) / 2, domains[keyY][1]];

                            return (
                                <g transform="translate(30, 10)">
                                    {/* Axes and Ticks */}
                                    <line x1="0" y1={plotSize} x2={plotSize} y2={plotSize} stroke="hsl(var(--border))" />
                                    <line x1="0" y1="0" x2="0" y2={plotSize} stroke="hsl(var(--border))" />
                                    {xTicks.map((tick, i) => (
                                        <g key={i} transform={`translate(${xScale(tick)}, ${plotSize})`}>
                                            <line y2="5" stroke="hsl(var(--border))" />
                                            <text y="20" textAnchor="middle" className="fill-foreground text-xs">{tick.toFixed(0)}</text>
                                        </g>
                                    ))}
                                    {yTicks.map((tick, i) => (
                                        <g key={i} transform={`translate(0, ${yScale(tick)})`}>
                                            <line x2="-5" stroke="hsl(var(--border))" />
                                            <text x="-10" dominantBaseline="middle" textAnchor="end" className="fill-foreground text-xs">{tick.toFixed(0)}</text>
                                        </g>
                                    ))}

                                    {/* Data Points */}
                                    {filteredData.map((d, i) => (
                                        <motion.circle
                                            key={i}
                                            cx={xScale(d[keyX] as number)}
                                            cy={yScale(d[keyY] as number)}
                                            r={5}
                                            fill={colorScale[d.category]}
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 0.8, scale: 1 }}
                                            transition={{ delay: i * 0.015 }}
                                        />
                                    ))}
                                </g>
                            );
                        })()
                    }
                </svg>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tooltip */}
      {hoveredPoint && (
        <motion.div
          className="absolute pointer-events-none bg-popover text-popover-foreground p-2 rounded-md shadow-lg text-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ left: hoveredPoint.x + 10, top: hoveredPoint.y + 10 }}
        >
          <div><strong>Category:</strong> {hoveredPoint.category}</div>
          <div><strong>{hoveredPoint.keyX}:</strong> {(hoveredPoint[hoveredPoint.keyX as keyof DataPoint] as number).toFixed(2)}</div>
          <div><strong>{hoveredPoint.keyY}:</strong> {(hoveredPoint[hoveredPoint.keyY as keyof DataPoint] as number).toFixed(2)}</div>
        </motion.div>
      )}
    </div>
  );
};

export default ScatterPlotMatrix;
