import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Cpu, MemoryStick, AlertTriangle, Server, Zap, Clock } from 'lucide-react';

// --- TYPES ---
type SparklineType = 'line' | 'bar' | 'area';

type DataPoint = {
  value: number;
};

type SparklineProps = {
  data: DataPoint[];
  type?: SparklineType;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
};

type SparklineMetric = {
  id: string;
  label: string;
  data: DataPoint[];
  icon: React.ElementType;
  unit: string;
  type: SparklineType;
};

// --- MOCK DATA ---
const mockData: SparklineMetric[] = [
  {
    id: 'cpu',
    label: 'CPU Usage',
    data: [{ value: 30 }, { value: 45 }, { value: 60 }, { value: 55 }, { value: 70 }, { value: 85 }, { value: 75 }],
    icon: Cpu,
    unit: '%',
    type: 'area',
  },
  {
    id: 'memory',
    label: 'Memory',
    data: [{ value: 50 }, { value: 52 }, { value: 48 }, { value: 55 }, { value: 60 }, { value: 58 }, { value: 62 }],
    icon: MemoryStick,
    unit: 'GB',
    type: 'line',
  },
  {
    id: 'requests',
    label: 'Requests',
    data: [{ value: 1200 }, { value: 1500 }, { value: 1300 }, { value: 1800 }, { value: 1600 }, { value: 2200 }, { value: 2000 }],
    icon: Server,
    unit: '',
    type: 'bar',
  },
  {
    id: 'errors',
    label: 'Errors',
    data: [{ value: 5 }, { value: 8 }, { value: 3 }, { value: 12 }, { value: 7 }, { value: 4 }, { value: 9 }],
    icon: AlertTriangle,
    unit: '',
    type: 'line',
  },
  {
    id: 'latency',
    label: 'Latency',
    data: [{ value: 120 }, { value: 150 }, { value: 110 }, { value: 180 }, { value: 160 }, { value: 140 }, { value: 130 }],
    icon: Clock,
    unit: 'ms',
    type: 'area',
  },
  {
    id: 'throughput',
    label: 'Throughput',
    data: [{ value: 500 }, { value: 600 }, { value: 550 }, { value: 700 }, { value: 650 }, { value: 800 }, { value: 750 }],
    icon: Zap,
    unit: 'rpm',
    type: 'bar',
  },
];

// --- SPARKLINE COMPONENT ---
const Sparkline: React.FC<SparklineProps> = ({ 
  data,
  type = 'line',
  width = 120,
  height = 40,
  color = 'hsl(var(--primary))',
  className
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { min, max, avg, minIndex, maxIndex } = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 0, avg: 0, minIndex: -1, maxIndex: -1 };
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { min, max, avg, minIndex: values.indexOf(min), maxIndex: values.indexOf(max) };
  }, [data]);

  const xScale = (index: number) => (index / (data.length > 1 ? data.length - 1 : 1)) * width;
  const yScale = (value: number) => height - ((value - min) / (max - min > 0 ? max - min : 1)) * height;

  const pathData = useMemo(() => {
    if (data.length < 2) return '';
    return data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');
  }, [data, xScale, yScale]);

  const areaPathData = useMemo(() => {
    if (data.length < 2) return '';
    const line = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' L ');
    return `M ${xScale(0)},${height} L ${line} L ${xScale(data.length - 1)},${height} Z`;
  }, [data, xScale, yScale]);

  const renderContent = () => {
    switch (type) {
      case 'bar':
        const barWidth = width / data.length;
        return data.map((d, i) => (
          <motion.rect
            key={i}
            x={i * barWidth}
            y={yScale(d.value)}
            width={barWidth - 2}
            height={height - yScale(d.value)}
            fill={color}
            initial={{ opacity: 0, y: height }}
            animate={{ opacity: 1, y: yScale(d.value) }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          />
        ));
      case 'area':
        return (
          <>
            <motion.path
              d={areaPathData}
              fill={color}
              fillOpacity={0.2}
              stroke="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            />
            <motion.polyline
              points={pathData}
              fill="none"
              stroke={color}
              strokeWidth={2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </>
        );
      case 'line':
      default:
        return (
          <motion.polyline
            points={pathData}
            fill="none"
            stroke={color}
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1 }}
          />
        );
    }
  };

  return (
    <div className={cn('relative', className)} onMouseLeave={() => setHoveredIndex(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="overflow-visible">
        <motion.line x1="0" y1={yScale(avg)} x2={width} y2={yScale(avg)} stroke="hsl(var(--border))" strokeDasharray="2,2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} />
        {renderContent()}
        {data.map((d, i) => (
          <rect
            key={i}
            x={xScale(i) - (width / data.length / 2)}
            y={0}
            width={width / data.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
          />
        ))}
        {minIndex !== -1 && <motion.circle cx={xScale(minIndex)} cy={yScale(data[minIndex].value)} r="3" fill="hsl(var(--destructive))" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 }} />}
        {maxIndex !== -1 && <motion.circle cx={xScale(maxIndex)} cy={yScale(data[maxIndex].value)} r="3" fill={color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 }} />}
        <AnimatePresence>
          {hoveredIndex !== null && (
            <motion.circle 
              cx={xScale(hoveredIndex)} 
              cy={yScale(data[hoveredIndex].value)} 
              r="4" 
              fill={color} 
              stroke="hsl(var(--background))"
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            />
          )}
        </AnimatePresence>
      </svg>
      <AnimatePresence>
        {hoveredIndex !== null && (
          <motion.div 
            className="absolute text-xs p-1 px-2 rounded bg-background border border-border shadow-lg pointer-events-none"
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            style={{ 
              left: `${xScale(hoveredIndex)}px`, 
              top: `${yScale(data[hoveredIndex].value)}px`,
              transform: 'translate(-50%, -150%)',
            }}
          >
            {data[hoveredIndex].value}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MAIN COMPONENT ---
const SparklineCollection = () => {
  return (
    <div className="bg-background text-foreground p-6 rounded-lg border border-border font-sans w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockData.map((metric) => (
          <div key={metric.id} className="bg-background p-4 rounded-md border border-border/50 flex flex-col gap-3 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <metric.icon className="w-4 h-4" />
                <span>{metric.label}</span>
              </div>
              <div className="text-2xl font-bold tracking-tighter">
                {metric.data[metric.data.length - 1].value}
                <span className="text-sm text-muted-foreground font-medium ml-1">{metric.unit}</span>
              </div>
            </div>
            <Sparkline data={metric.data} type={metric.type} height={50} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SparklineCollection;
