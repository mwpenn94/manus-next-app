import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GaugeMeterProps {
  value: number;
  min?: number;
  max?: number;
  thresholds?: {
    green: number;
    yellow: number;
  };
  label?: string;
  unit?: string;
}

const GaugeMeter: React.FC<GaugeMeterProps> = ({
  value,
  min = 0,
  max = 100,
  thresholds = { green: 50, yellow: 80 },
  label = 'CPU Usage',
  unit = '%',
}) => {
  const width = 200;
  const height = 160;
  const cx = width / 2;
  const cy = height - 20;
  const radius = 80;
  const totalAngle = 240;
  const startAngle = -120;

  const valueToAngle = (v: number) => {
    const clampedValue = Math.max(min, Math.min(v, max));
    return startAngle + ((clampedValue - min) / (max - min)) * totalAngle;
  };

  const angleToCoord = (angle: number, r: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number, r: number) => {
    const startPoint = angleToCoord(start, r);
    const endPoint = angleToCoord(end, r);
    const largeArcFlag = end - start <= 180 ? '0' : '1';
    return `M ${startPoint.x} ${startPoint.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`;
  };

  const greenAngle = valueToAngle(thresholds.green);
  const yellowAngle = valueToAngle(thresholds.yellow);
  const redAngle = valueToAngle(max);

  const ticks = Array.from({ length: 11 }, (_, i) => {
    const tickValue = min + i * (max - min) / 10;
    const angle = valueToAngle(tickValue);
    const p1 = angleToCoord(angle, radius - 5);
    const p2 = angleToCoord(angle, radius);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  });

  const needleAngle = valueToAngle(value);
  const needleBase = angleToCoord(needleAngle, 10);
  const needleTip = angleToCoord(needleAngle, radius - 20);


  return (
    <div className="bg-background p-4 rounded-lg w-full max-w-xs mx-auto text-center font-sans">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <g>
          {/* Background Arc */}
          <path d={describeArc(startAngle, redAngle, radius)} stroke="hsl(var(--border))" strokeWidth={12} fill="none" />

          {/* Color Arcs */}
          <path d={describeArc(startAngle, greenAngle, radius)} stroke="hsl(142.1 76.2% 36.3%)" strokeWidth={12} fill="none" strokeLinecap="round" />
          <path d={describeArc(greenAngle, yellowAngle, radius)} stroke="hsl(47.9 95.8% 53.1%)" strokeWidth={12} fill="none" strokeLinecap="round" />
          <path d={describeArc(yellowAngle, valueToAngle(value), radius)} stroke="hsl(0 100% 50%)" strokeWidth={12} fill="none" strokeLinecap="round" />

          {/* Tick Marks */}
          {ticks.map((tick, i) => (
            <line key={i} {...tick} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
          ))}

          {/* Needle */}
          <motion.g
            animate={{ rotate: needleAngle + 90 }}
            initial={{ rotate: startAngle + 90 }}
            transform-origin={`${cx} ${cy}`}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <path
              d={`M ${cx - 4} ${cy} L ${cx} ${cy - (radius - 15)} L ${cx + 4} ${cy} Z`}
              fill="hsl(var(--primary-foreground))"
            />
          </motion.g>
          <circle cx={cx} cy={cy} r={8} fill="hsl(var(--primary-foreground))" />
          <circle cx={cx} cy={cy} r={4} fill="hsl(var(--primary))" />

          {/* Central Text */}
          <text x={cx} y={cy - 15} textAnchor="middle" dominantBaseline="middle" className="fill-foreground">
            <tspan x={cx} className="text-3xl font-bold">{value.toFixed(0)}</tspan>
            <tspan x={cx} dy="1.4em" className="text-sm font-medium text-muted-foreground">{unit}</tspan>
          </text>
        </g>
      </svg>
      <div className="mt-2 text-center">
        <p className="text-lg font-semibold text-foreground">{label}</p>
      </div>
    </div>
  );
};

export default GaugeMeter;
