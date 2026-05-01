import * as React from "react"
import { motion } from "framer-motion"

// Define the data structure for each region
type RegionData = {
  id: string;
  name: string;
  value: number;
};

// Mock data for US regions' population density (people per square mile)
const regionData: RegionData[] = [
  { id: "ne", name: "Northeast", value: 359.8 },
  { id: "ma", name: "Mid-Atlantic", value: 450.1 },
  { id: "se", name: "Southeast", value: 198.5 },
  { id: "mw", name: "Midwest", value: 150.7 },
  { id: "sc", name: "South Central", value: 125.2 },
  { id: "mt", name: "Mountain", value: 65.3 },
  { id: "pn", name: "Pacific Northwest", value: 110.9 },
  { id: "ps", name: "Pacific Southwest", value: 280.4 },
  { id: "ak", name: "Alaska", value: 1.3 },
];

const ChoroplethMap = () => {
  const [hoveredRegion, setHoveredRegion] = React.useState<RegionData | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const values = regionData.map(r => r.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const getColor = (value: number) => {
    const t = (value - minValue) / (maxValue - minValue);
    const r = Math.round(50 + 205 * t);
    const g = Math.round(80 - 10 * t);
    const b = Math.round(200 - 150 * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  return (
    <div className="bg-background text-foreground p-4 rounded-lg border border-border w-full max-w-3xl mx-auto" ref={containerRef} onMouseMove={handleMouseMove}>
      <h2 className="text-xl font-semibold mb-4 text-center">US Population Density by Region</h2>
      <div className="w-full aspect-[4/3] relative">
        <svg viewBox="0 0 400 300" className="w-full h-full">
          <defs>
            <linearGradient id="legendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={getColor(minValue)} />
              <stop offset="100%" stopColor={getColor(maxValue)} />
            </linearGradient>
          </defs>
          {regionData.map((region, i) => {
            const x = (i % 3) * 110 + 35;
            const y = Math.floor(i / 3) * 80 + 30;
            return (
              <g 
                key={region.id} 
                onMouseEnter={() => setHoveredRegion(region)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                <motion.rect
                  x={x}
                  y={y}
                  width={100}
                  height={70}
                  rx={8}
                  ry={8}
                  initial={{ fill: "#2d3748" }}
                  animate={{ fill: getColor(region.value) }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  whileHover={{ stroke: "hsl(var(--primary))", strokeWidth: 2, scale: 1.03, transition: { duration: 0.2 } }}
                />
                <text x={x + 50} y={y + 40} textAnchor="middle" fill="#fff" fontSize="12" pointerEvents="none" style={{ mixBlendMode: 'difference' }}>
                  {region.id.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
        {hoveredRegion && (
          <motion.div
            className="absolute bg-gray-900/90 text-white p-2 rounded-md shadow-lg pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ left: mousePosition.x + 15, top: mousePosition.y + 15 }}
          >
            <p className="font-bold text-base">{hoveredRegion.name}</p>
            <p className="text-sm">{hoveredRegion.value.toFixed(1)} people/mi²</p>
          </motion.div>
        )}
      </div>
      <div className="flex items-center justify-center mt-4">
        <span className="mr-2 text-sm text-gray-400">{minValue.toFixed(0)}</span>
        <svg width="200" height="20" className="border border-border rounded-sm">
          <rect x="0" y="0" width="200" height="20" fill="url(#legendGradient)" />
        </svg>
        <span className="ml-2 text-sm text-gray-400">{maxValue.toFixed(0)}</span>
      </div>
    </div>
  );
};

export default ChoroplethMap;
