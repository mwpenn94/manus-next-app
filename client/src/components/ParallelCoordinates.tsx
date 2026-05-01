import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

// --- TYPE DEFINITIONS ---
type Car = {
  id: number;
  model: string;
  mpg: number;
  cylinders: number;
  horsepower: number;
  weight: number;
  acceleration: number;
  origin: "USA" | "Europe" | "Japan";
};

type Dimension = keyof Omit<Car, "id" | "model" | "origin">;

// --- MOCK DATA ---
const carData: Car[] = [
  { id: 1, model: "Ford Maverick", mpg: 18, cylinders: 8, horsepower: 140, weight: 3630, acceleration: 14, origin: "USA" },
  { id: 2, model: "Chevy Nova", mpg: 15, cylinders: 8, horsepower: 165, weight: 3693, acceleration: 11.5, origin: "USA" },
  { id: 3, model: "Plymouth Duster", mpg: 22, cylinders: 6, horsepower: 95, weight: 2833, acceleration: 15.5, origin: "USA" },
  { id: 4, model: "AMC Hornet", mpg: 21, cylinders: 6, horsepower: 100, weight: 2648, acceleration: 15, origin: "USA" },
  { id: 5, model: "Datsun 1200", mpg: 35, cylinders: 4, horsepower: 69, weight: 1613, acceleration: 18, origin: "Japan" },
  { id: 6, model: "VW Rabbit", mpg: 29, cylinders: 4, horsepower: 90, weight: 1937, acceleration: 14.2, origin: "Europe" },
  { id: 7, model: "Toyota Corolla", mpg: 31, cylinders: 4, horsepower: 71, weight: 1990, acceleration: 19, origin: "Japan" },
  { id: 8, model: "Buick Skylark", mpg: 20.5, cylinders: 6, horsepower: 120, weight: 3430, acceleration: 13, origin: "USA" },
  { id: 9, model: "Audi 100LS", mpg: 24, cylinders: 5, horsepower: 103, weight: 2830, acceleration: 15.9, origin: "Europe" },
  { id: 10, model: "Volvo 245", mpg: 20, cylinders: 6, horsepower: 125, weight: 3140, acceleration: 17, origin: "Europe" },
  { id: 11, model: "Honda Civic", mpg: 33, cylinders: 4, horsepower: 53, weight: 1795, acceleration: 17.4, origin: "Japan" },
  { id: 12, model: "Subaru", mpg: 26, cylinders: 4, horsepower: 92, weight: 2230, acceleration: 13.8, origin: "Japan" },
  { id: 13, model: "Peugeot 504", mpg: 25, cylinders: 4, horsepower: 88, weight: 2720, acceleration: 19, origin: "Europe" },
  { id: 14, model: "Dodge Aspen", mpg: 19, cylinders: 6, horsepower: 100, weight: 3280, acceleration: 15.5, origin: "USA" },
  { id: 15, model: "Pontiac Firebird", mpg: 17.5, cylinders: 8, horsepower: 180, weight: 3880, acceleration: 13, origin: "USA" },
  { id: 16, model: "Ford Mustang II", mpg: 25.5, cylinders: 6, horsepower: 105, weight: 3190, acceleration: 15.1, origin: "USA" },
  { id: 17, model: "Mazda GLC", mpg: 46.6, cylinders: 4, horsepower: 65, weight: 2110, acceleration: 17.9, origin: "Japan" },
  { id: 18, model: "VW Jetta", mpg: 33, cylinders: 4, horsepower: 85, weight: 2190, acceleration: 14.2, origin: "Europe" },
  { id: 19, model: "Renault 18i", mpg: 34.5, cylinders: 4, horsepower: 72, weight: 2150, acceleration: 17, origin: "Europe" },
  { id: 20, model: "Oldsmobile Cutlass", mpg: 19.2, cylinders: 8, horsepower: 145, weight: 3425, acceleration: 13.2, origin: "USA" },
];

const dimensions: Dimension[] = ["mpg", "cylinders", "horsepower", "weight", "acceleration"];

const originColors: Record<Car["origin"], string> = {
  USA: "hsl(var(--primary))",
  Europe: "hsl(var(--chart-2))",
  Japan: "hsl(var(--chart-3))",
};

// --- COMPONENT ---
const ParallelCoordinates = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);
  const [hoveredId, setHoveredId] = React.useState<number | null>(null);
  const [opacity, setOpacity] = React.useState(0.7);
  const [filters, setFilters] = React.useState<Record<Dimension, [number, number] | null>>({
    mpg: null, cylinders: null, horsepower: null, weight: null, acceleration: null
  });
  const [brush, setBrush] = React.useState({ active: false, dim: null as Dimension | null, startY: 0, currentY: 0, x: 0, y: 0, height: 0 });
  const [tooltip, setTooltip] = React.useState({ visible: false, content: "", x: 0, y: 0 });

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
      setContainerHeight(containerRef.current.offsetHeight);
    }
  }, []);

  const margin = { top: 30, right: 50, bottom: 30, left: 50 };
  const innerWidth = containerWidth - margin.left - margin.right;
  const innerHeight = containerHeight - margin.top - margin.bottom;

  const scales = React.useMemo(() => {
    const s: Record<Dimension, { domain: [number, number], range: [number, number] }> = {} as any;
    dimensions.forEach(dim => {
      const domain: [number, number] = [
        Math.min(...carData.map(d => d[dim])),
        Math.max(...carData.map(d => d[dim]))
      ];
      s[dim] = { domain, range: [innerHeight, 0] }; // Inverted range for SVG y-axis
    });
    return s;
  }, [innerHeight]);

  const scaleValue = (value: number, dim: Dimension) => {
    const { domain, range } = scales[dim];
    const [dMin, dMax] = domain;
    const [rMin, rMax] = range;
    if (dMax === dMin) return rMin; // Avoid division by zero
    return rMin + (rMax - rMin) * (value - dMin) / (dMax - dMin);
  };

  const xScale = (dim: Dimension) => {
    const index = dimensions.indexOf(dim);
    return index * (innerWidth / (dimensions.length - 1));
  };

    const unscaleValue = (yPos: number, dim: Dimension) => {
    const { domain, range } = scales[dim];
    const [dMin, dMax] = domain;
    const [rMin, rMax] = range; // e.g., [innerHeight, 0]
    const ratio = (yPos - rMin) / (rMax - rMin);
    return dMin + ratio * (dMax - dMin);
  };

  const handleBrushStart = (e: React.MouseEvent, dim: Dimension) => {
    const yPos = e.nativeEvent.offsetY - margin.top;
    setBrush({ active: true, dim, startY: yPos, currentY: yPos, x: xScale(dim), y: yPos, height: 0 });
  };

  const handleBrushMove = React.useCallback((e: MouseEvent) => {
    if (!brush.active || !brush.dim) return;
    const yPos = e.offsetY - margin.top;
    setBrush(prev => ({
      ...prev,
      currentY: yPos,
      y: Math.min(prev.startY, yPos),
      height: Math.abs(yPos - prev.startY),
    }));
  }, [brush.active, brush.dim]);

  const handleBrushEnd = React.useCallback(() => {
    if (!brush.active || !brush.dim) return;
    const { dim, startY, currentY } = brush;
    const y1 = Math.min(startY, currentY);
    const y2 = Math.max(startY, currentY);

    if (Math.abs(y1 - y2) < 5) { // If it's just a click, not a drag, reset the brush
        setBrush({ active: false, dim: null, startY: 0, currentY: 0, x: 0, y: 0, height: 0 });
        return;
    }

    const newDomain: [number, number] = [
      unscaleValue(y2, dim), // y2 is lower on screen, so higher value
      unscaleValue(y1, dim), // y1 is higher on screen, so lower value
    ].sort((a, b) => a - b) as [number, number];

    setFilters(prev => ({ ...prev, [dim]: newDomain }));
    setBrush({ active: false, dim: null, startY: 0, currentY: 0, x: 0, y: 0, height: 0 });
  }, [brush, scales]);

  const resetFilter = (dim: Dimension) => {
      setFilters(prev => ({...prev, [dim]: null}))
  }

  React.useEffect(() => {
    if (brush.active) {
      window.addEventListener('mousemove', handleBrushMove);
      window.addEventListener('mouseup', handleBrushEnd);
    } else {
      window.removeEventListener('mousemove', handleBrushMove);
      window.removeEventListener('mouseup', handleBrushEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleBrushMove);
    window.removeEventListener('mouseup', handleBrushEnd);  };
  }, [brush.active, handleBrushMove, handleBrushEnd]);

  const filteredData = React.useMemo(() => {
    return carData.filter(d => {
      return dimensions.every(dim => {
        const filterRange = filters[dim];
        if (!filterRange) return true;
        const value = d[dim];
        return value >= filterRange[0] && value <= filterRange[1];
      });
    });
  }, [filters]);

  const lineGenerator = (d: Car) => {
    return dimensions.map(dim => `${xScale(dim)},${scaleValue(d[dim], dim)}`).join(" L ");
  };

  return (
    <div className="w-full h-[600px] bg-background text-foreground p-4 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Parallel Coordinates Plot: Car Dataset</h2>
      <p className="text-muted-foreground mb-6">Explore relationships between car attributes. Drag on an axis to filter.</p>
      
      <div className="w-full h-full flex-grow" ref={containerRef}>
        {containerWidth > 0 && (
          <svg width="100%" height="100%" viewBox={`0 0 ${containerWidth} ${containerHeight}`}>
            {tooltip.visible && (
              <foreignObject x={tooltip.x + 10} y={tooltip.y - 20} width="150" height="40">
                <div className="bg-background/80 border border-border rounded-md px-2 py-1 text-sm shadow-lg backdrop-blur-sm">
                  {tooltip.content}
                </div>
              </foreignObject>
            )}
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Render Polylines */}
              {filteredData.map((d) => (
                <motion.path
                  key={d.id}
                  d={lineGenerator(d)!}
                  fill="none"
                  stroke={originColors[d.origin]}
                  strokeWidth={hoveredId === d.id ? 3 : 1.5}
                  strokeOpacity={hoveredId === null ? opacity : hoveredId === d.id ? 1 : 0.3}
                  onMouseEnter={() => {
                    setHoveredId(d.id);
                    setTooltip(prev => ({ ...prev, visible: true }));
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    setTooltip(prev => ({ ...prev, visible: false }));
                  }}
                  onMouseMove={(e) => {
                    if (hoveredId === d.id) {
                      const { clientX, clientY } = e;
                      const containerRect = containerRef.current?.getBoundingClientRect();
                      if (containerRect) {
                        setTooltip({
                          visible: true,
                          content: `${d.model} (${d.origin})`,
                          x: clientX - containerRect.left,
                          y: clientY - containerRect.top,
                        });
                      }
                    }
                  }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-auto"
                />
              ))}

              {/* Render Axes */}
              {dimensions.map((dim, i) => (
                <g
                  key={dim}
                  transform={`translate(${xScale(dim)}, 0)`}
                  className="select-none"
                  onMouseDown={(e) => handleBrushStart(e, dim)}
                >
                  <line y1={0} y2={innerHeight} stroke="hsl(var(--border))" strokeWidth={2} />
                  <text
                    y={-10}
                    textAnchor="middle"
                    className="fill-foreground font-semibold text-sm"
                  >
                    {dim.charAt(0).toUpperCase() + dim.slice(1)}
                  </text>
                  <text y={innerHeight + 15} textAnchor="middle" className="fill-muted-foreground text-xs" onDoubleClick={() => resetFilter(dim)}>
                    {filters[dim] ? filters[dim][0].toFixed(1) : scales[dim].domain[0]}
                  </text>
                   <text y={0} textAnchor="middle" className="fill-muted-foreground text-xs" onDoubleClick={() => resetFilter(dim)}>
                    {filters[dim] ? filters[dim][1].toFixed(1) : scales[dim].domain[1]}
                  </text>
                </g>
              ))}

              {/* Render Active Filters */}
              {dimensions.map(dim => {
                const filterRange = filters[dim];
                if (!filterRange) return null;
                const y1 = scaleValue(filterRange[1], dim);
                const y2 = scaleValue(filterRange[0], dim);
                return (
                  <rect
                    key={`filter-${dim}`}
                    x={xScale(dim) - 4}
                    y={y1}
                    width={8}
                    height={y2 - y1}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.4}
                  />
                );
              })}

              {/* Render Brush Selection */}
              {brush.active && brush.x > 0 && (
                  <rect
                      x={brush.x - 5}
                      y={brush.y}
                      width={10}
                      height={brush.height}
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      stroke="hsl(var(--primary))"
                      strokeWidth={1}
                  />
              )}
            </g>
          </svg>
        )}
      </div>
      <div className="w-full flex justify-center items-center gap-8 p-4">
        <div className="flex items-center gap-4">
            <button onClick={() => setFilters({ mpg: null, cylinders: null, horsepower: null, weight: null, acceleration: null })} className="px-4 py-2 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors text-sm">Reset Filters</button>
            <div className="flex items-center gap-4 text-sm">
                {Object.entries(originColors).map(([origin, color]) => (
                    <div key={origin} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span>{origin}</span>
                    </div>
                ))}
            </div>
        </div>
        <div className="w-full max-w-xs flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Opacity</span>
        <Slider
          min={0.1}
          max={1}
          step={0.1}
          value={[opacity]}
          onValueChange={(value: number[]) => setOpacity(value[0])}
        />
        </div>
      </div>
    </div>
  );
};

export default ParallelCoordinates;
