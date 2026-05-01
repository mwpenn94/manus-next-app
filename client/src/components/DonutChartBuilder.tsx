import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

type ExpenseCategory = {
  name: string;
  value: number;
  color: string;
};

const mockData: ExpenseCategory[] = [
  { name: "Groceries", value: 450, color: "hsl(var(--primary))" },
  { name: "Utilities", value: 220, color: "hsl(var(--accent))" },
  { name: "Transport", value: 150, color: "hsl(var(--secondary))" },
  { name: "Entertainment", value: 300, color: "hsl(200, 80%, 60%)" },
  { name: "Rent", value: 1200, color: "hsl(30, 80%, 60%)" },
  { name: "Health", value: 80, color: "hsl(270, 80%, 60%)" },
];

const DonutChartBuilder: React.FC = () => {
  const [hoveredSegment, setHoveredSegment] = useState<ExpenseCategory | null>(null);
  const [hiddenSegments, setHiddenSegments] = useState<string[]>([]);

  const visibleData = useMemo(() => {
    return mockData.filter(d => !hiddenSegments.includes(d.name));
  }, [hiddenSegments]);

  const totalValue = useMemo(() => {
    return visibleData.reduce((sum, item) => sum + item.value, 0);
  }, [visibleData]);

  const getArcPath = (
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    isHovered: boolean
  ) => {
    const innerRadius = radius * 0.6;
    const outerRadius = isHovered ? radius * 1.05 : radius;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const osx = cx + outerRadius * Math.cos(startRad);
    const osy = cy + outerRadius * Math.sin(startRad);
    const oex = cx + outerRadius * Math.cos(endRad);
    const oey = cy + outerRadius * Math.sin(endRad);

    const isx = cx + innerRadius * Math.cos(startRad);
    const isy = cy + innerRadius * Math.sin(startRad);
    const iex = cx + innerRadius * Math.cos(endRad);
    const iey = cy + innerRadius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return `
      M ${osx},${osy}
      A ${outerRadius},${outerRadius} 0 ${largeArcFlag} 1 ${oex},${oey}
      L ${iex},${iey}
      A ${innerRadius},${innerRadius} 0 ${largeArcFlag} 0 ${isx},${isy}
      Z
    `;
  };

  const getLabelPosition = (cx: number, cy: number, radius: number, angle: number) => {
      const labelRadius = radius * 0.82;
      const rad = (angle * Math.PI) / 180;
      return {
          x: cx + labelRadius * Math.cos(rad),
          y: cy + labelRadius * Math.sin(rad),
      };
  }

  let currentAngle = -90;

  const toggleSegment = (name: string) => {
    setHiddenSegments(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  return (
    <div className="bg-background text-foreground p-6 rounded-lg shadow-lg w-full max-w-2xl mx-auto flex flex-col md:flex-row items-center">
      <div className="relative w-full md:w-1/2">
        <svg viewBox="0 0 200 200" className="w-full h-auto">
          <AnimatePresence>
            {visibleData.map((item) => {
              const percentage = (item.value / totalValue) * 100;
              const angle = (item.value / totalValue) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              const midAngle = startAngle + angle / 2;
              currentAngle = endAngle;

              const isHovered = hoveredSegment?.name === item.name;
              const labelPos = getLabelPosition(100, 100, 100, midAngle);

              return (
                <g key={item.name}>
                  <motion.path
                    d={getArcPath(100, 100, 90, startAngle, endAngle, isHovered)}
                    fill={item.color}
                    onMouseEnter={() => setHoveredSegment(item)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity: 1, pathLength: 1 }}
                    exit={{ opacity: 0, pathLength: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    stroke="hsl(var(--background))"
                    strokeWidth={1}
                  />
                  {percentage > 5 && (
                    <motion.text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dy=".3em"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      className="pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {`${percentage.toFixed(0)}%`}
                    </motion.text>
                  )}
                </g>
              );
            })}
          </AnimatePresence>
          <g className="text-center">
            <text x="100" y="95" textAnchor="middle" className="fill-foreground text-2xl font-bold">
              {hoveredSegment ? `$${hoveredSegment.value}` : `$${totalValue.toFixed(0)}`}
            </text>
            <text x="100" y="115" textAnchor="middle" className="fill-muted-foreground text-sm">
              {hoveredSegment ? hoveredSegment.name : "Total Expenses"}
            </text>
          </g>
        </svg>
      </div>
      <div className="w-full md:w-1/2 mt-6 md:mt-0 md:pl-8">
        <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
        <ul className="space-y-2">
          {mockData.map(item => (
            <li key={item.name} className="flex items-center justify-between text-sm cursor-pointer" onClick={() => toggleSegment(item.name)}>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: item.color }}></span>
                <span className={cn("transition-opacity", { "opacity-50": hiddenSegments.includes(item.name) })}>{item.name}</span>
              </div>
              <div className="flex items-center">
                 <span className={cn("font-medium mr-3", { "opacity-50": hiddenSegments.includes(item.name) })}>${item.value}</span>
                 {hiddenSegments.includes(item.name) ? <EyeOff size={16} className="text-muted-foreground"/> : <Eye size={16} className="text-muted-foreground"/>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DonutChartBuilder;
