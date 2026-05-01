import React, { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- DATA TYPES ---
type CountryData = {
  name: string;
  gdp: number; // in trillions USD
  lifeExpectancy: number; // in years
  population: number; // in millions
  continent: string;
};

// --- MOCK DATA ---
const mockData: CountryData[] = [
  { name: "USA", gdp: 25.46, lifeExpectancy: 77.2, population: 331.9, continent: "North America" },
  { name: "China", gdp: 19.91, lifeExpectancy: 78.2, population: 1425.7, continent: "Asia" },
  { name: "Japan", gdp: 4.23, lifeExpectancy: 84.5, population: 125.1, continent: "Asia" },
  { name: "Germany", gdp: 4.07, lifeExpectancy: 81.0, population: 83.2, continent: "Europe" },
  { name: "India", gdp: 3.39, lifeExpectancy: 70.2, population: 1407.6, continent: "Asia" },
  { name: "UK", gdp: 3.07, lifeExpectancy: 80.7, population: 67.3, continent: "Europe" },
  { name: "France", gdp: 2.78, lifeExpectancy: 82.3, population: 65.6, continent: "Europe" },
  { name: "Brazil", gdp: 1.92, lifeExpectancy: 75.9, population: 215.3, continent: "South America" },
  { name: "Canada", gdp: 2.14, lifeExpectancy: 82.0, population: 38.2, continent: "North America" },
  { name: "Russia", gdp: 2.24, lifeExpectancy: 71.3, population: 144.7, continent: "Europe" },
  { name: "Australia", gdp: 1.68, lifeExpectancy: 83.2, population: 26.0, continent: "Australia" },
  { name: "South Korea", gdp: 1.67, lifeExpectancy: 83.5, population: 51.8, continent: "Asia" },
  { name: "Nigeria", gdp: 0.51, lifeExpectancy: 53.8, population: 213.4, continent: "Africa" },
  { name: "South Africa", gdp: 0.42, lifeExpectancy: 64.9, population: 59.9, continent: "Africa" },
  { name: "Mexico", gdp: 1.41, lifeExpectancy: 75.0, population: 126.7, continent: "North America" },
];

// --- COLOR MAPPING ---
const continentColors: { [key: string]: string } = {
  "North America": "hsl(var(--primary))",
  "South America": "hsl(200, 80%, 60%)",
  Europe: "hsl(120, 70%, 50%)",
  Asia: "hsl(30, 90%, 60%)",
  Africa: "hsl(300, 70%, 60%)",
  Australia: "hsl(60, 80%, 55%)",
};

// --- COMPONENT PROPS ---
interface BubbleChartProps {
  width?: number;
  height?: number;
  data?: CountryData[];
}

// --- HELPER FUNCTIONS for SCALING ---
const linearScale = (domain: [number, number], range: [number, number]) => {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    if (d1 - d0 === 0) return () => r0;
    return (value: number) => r0 + (r1 - r0) * ((value - d0) / (d1 - d0));
};

const BubbleChart: React.FC<BubbleChartProps> = ({ 
    width = 800, 
    height = 600, 
    data = mockData 
}) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: CountryData } | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const margin = { top: 40, right: 120, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const { xScale, yScale, radiusScale, xTicks, yTicks, popMax } = useMemo(() => {
    const xMax = Math.max(...data.map(d => d.gdp));
    const yMax = Math.max(...data.map(d => d.lifeExpectancy));
    const yMin = Math.min(...data.map(d => d.lifeExpectancy));
    const popMax = Math.max(...data.map(d => d.population));

    const xScale = linearScale([0, xMax * 1.05], [0, innerWidth]);
    const yScale = linearScale([yMin - 5, yMax + 5], [innerHeight, 0]);
    const radiusScale = linearScale([0, Math.sqrt(popMax)], [4, 40]);

    // Generate ticks manually
    const xTicks = Array.from({ length: 6 }, (_, i) => (xMax * 1.05 / 5) * i);
    const yTicks = Array.from({ length: 6 }, (_, i) => (yMin - 5) + ((yMax + 5 - (yMin - 5)) / 5) * i);

    return { xScale, yScale, radiusScale, xTicks, yTicks, popMax };
  }, [data, innerWidth, innerHeight]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const newScale = e.deltaY < 0 ? transform.k * zoomFactor : transform.k / zoomFactor;
    setTransform(prev => ({ ...prev, k: Math.max(0.5, Math.min(newScale, 10)) }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-background text-foreground rounded-lg border border-border p-4 w-full h-full flex flex-col" ref={containerRef}>
      <h2 className="text-xl font-bold mb-2">GDP vs. Life Expectancy by Country</h2>
      <p className="text-sm text-muted-foreground mb-4">Bubble size represents population. Scroll to zoom, drag to pan.</p>
      <div className="relative flex-grow overflow-hidden border border-border rounded-md">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${width} ${height}`} 
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* Clip Path for zooming/panning */}
          <defs>
            <clipPath id="chart-area">
              <rect x="0" y="0" width={innerWidth} height={innerHeight} />
            </clipPath>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* X Axis Grid Lines */}
            {xTicks.map((tick, i) => (
              <g key={`x-grid-${i}`} transform={`translate(${xScale(tick)}, 0)`}>
                <line y1={0} y2={innerHeight} stroke="currentColor" strokeOpacity={0.1} />
                <text y={innerHeight + 20} textAnchor="middle" fontSize={12} fill="currentColor" opacity={0.7}>
                  {tick.toFixed(0)}
                </text>
              </g>
            ))}
            <text x={innerWidth / 2} y={innerHeight + 40} textAnchor="middle" fontSize={14} fontWeight="bold" fill="currentColor">
              GDP (Trillions USD)
            </text>

            {/* Y Axis Grid Lines */}
            {yTicks.map((tick, i) => (
              <g key={`y-grid-${i}`} transform={`translate(0, ${yScale(tick)})`}>
                <line x1={0} x2={innerWidth} stroke="currentColor" strokeOpacity={0.1} />
                <text x={-10} y={4} textAnchor="end" fontSize={12} fill="currentColor" opacity={0.7}>
                  {tick.toFixed(0)}
                </text>
              </g>
            ))}
            <text x={-innerHeight / 2} y={-40} transform="rotate(-90)" textAnchor="middle" fontSize={14} fontWeight="bold" fill="currentColor">
              Life Expectancy (Years)
            </text>

            {/* Chart Area with Zoom/Pan */}
            <g clipPath="url(#chart-area)">
              <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                {/* Bubbles */}
                {data.map((d, i) => (
                  <motion.circle
                    key={d.name}
                    cx={xScale(d.gdp)}
                    cy={yScale(d.lifeExpectancy)}
                    r={radiusScale(Math.sqrt(d.population)) / transform.k} // Keep radius constant relative to screen
                    fill={continentColors[d.continent]}
                    fillOpacity={0.7}
                    stroke={continentColors[d.continent]}
                    strokeWidth={2 / transform.k}
                    onMouseEnter={(e) => {
                      if (!containerRef.current) return;
                      const rect = containerRef.current.getBoundingClientRect();
                      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, data: d });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    initial={{ r: 0, opacity: 0 }}
                    animate={{ r: radiusScale(Math.sqrt(d.population)) / transform.k, opacity: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                  />
                ))}
              </g>
            </g>

            {/* Legend */}
            <g transform={`translate(${innerWidth + 20}, 0)`}>
              <text x={0} y={0} fontSize={14} fontWeight="bold" fill="currentColor">Continents</text>
              {Object.entries(continentColors).map(([continent, color], i) => (
                <g key={continent} transform={`translate(0, ${i * 20 + 20})`}>
                  <circle cx={5} cy={-4} r={6} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={2} />
                  <text x={20} y={0} fontSize={12} fill="currentColor">{continent}</text>
                </g>
              ))}
              
              <text x={0} y={Object.keys(continentColors).length * 20 + 40} fontSize={14} fontWeight="bold" fill="currentColor">Population</text>
              {[popMax, popMax / 4, popMax / 10].map((pop, i) => {
                const r = radiusScale(Math.sqrt(pop));
                return (
                  <g key={`pop-legend-${i}`} transform={`translate(0, ${Object.keys(continentColors).length * 20 + 60 + i * 30})`}>
                    <circle cx={20} cy={0} r={r} fill="none" stroke="currentColor" strokeOpacity={0.5} />
                    <text x={50} y={4} fontSize={12} fill="currentColor">{pop.toFixed(0)}M</text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
        {tooltip && (
          <div 
            className="absolute bg-background border border-border rounded-md shadow-lg p-3 text-sm pointer-events-none z-10"
            style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
          >
            <p className="font-bold text-base mb-1">{tooltip.data.name}</p>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: continentColors[tooltip.data.continent] }}></div>
                <span>{tooltip.data.continent}</span>
            </div>
            <p>GDP: ${tooltip.data.gdp.toFixed(2)}T</p>
            <p>Life Expectancy: {tooltip.data.lifeExpectancy.toFixed(1)} years</p>
            <p>Population: {tooltip.data.population.toFixed(1)}M</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BubbleChart;
