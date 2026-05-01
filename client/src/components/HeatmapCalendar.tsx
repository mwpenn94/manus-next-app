import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type Contribution = {
  date: string;
  count: number;
};

type TooltipData = {
  x: number;
  y: number;
  date: string;
  count: number;
} | null;

// --- CONSTANTS ---
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CELL_SIZE = 14;
const CELL_GAP = 3;
const SVG_WIDTH = (CELL_SIZE + CELL_GAP) * 53 + 40;
const SVG_HEIGHT = (CELL_SIZE + CELL_GAP) * 7 + 80;

// --- MOCK DATA GENERATION ---
const generateMockData = (year: number): Contribution[] => {
  const data: Contribution[] = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    data.push({
      date: d.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 16),
    });
  }
  return data;
};

// --- HELPER FUNCTIONS ---
const getColor = (count: number): string => {
  if (count === 0) return 'hsl(var(--muted))';
  if (count < 4) return 'hsl(var(--primary) / 0.4)';
  if (count < 8) return 'hsl(var(--primary) / 0.6)';
  if (count < 12) return 'hsl(var(--primary) / 0.8)';
  return 'hsl(var(--primary))';
};

const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// --- COMPONENT IMPLEMENTATION ---
const HeatmapCalendar: React.FC = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState<TooltipData>(null);
  const yearlyData = generateMockData(currentYear);

  const dataMap = yearlyData.reduce((acc, curr) => {
    acc[curr.date] = curr.count;
    return acc;
  }, {} as Record<string, number>);

  const handleYearChange = (direction: 'prev' | 'next') => {
    setCurrentYear(year => year + (direction === 'next' ? 1 : -1));
    setTooltip(null);
  };

  const firstDayOfYear = new Date(currentYear, 0, 1);
  const startingDay = firstDayOfYear.getDay();

  return (
    <div className="bg-background text-foreground p-6 rounded-lg border border-border w-full max-w-4xl flex flex-col items-center relative">
      <div className="flex justify-between w-full items-center mb-4">
        <h2 className="text-lg font-semibold">Contribution Activity</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => handleYearChange('prev')} className="p-1 rounded hover:bg-muted"><ChevronLeft size={20} /></button>
          <span>{currentYear}</span>
          <button onClick={() => handleYearChange('next')} className="p-1 rounded hover:bg-muted"><ChevronRight size={20} /></button>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
        {/* Day Labels (Y-axis) */}
        {WEEK_DAYS.map((day, i) => (
            i % 2 !== 0 && (
                <text
                    key={`day-label-${i}`}
                    x="0"
                    y={30 + (CELL_SIZE + CELL_GAP) * i + CELL_SIZE / 2}
                    dy="0.3em"
                    fontSize={10}
                    className="fill-current text-muted-foreground"
                >
                    {day}
                </text>
            )
        ))}

        {/* Month Labels (X-axis) */}
        {MONTHS.map((month, i) => {
            const firstDayOfMonth = new Date(currentYear, i, 1);
            const weekNumber = getWeekNumber(firstDayOfMonth);
            return (
                <text
                    key={`month-label-${i}`}
                    x={40 + (CELL_SIZE + CELL_GAP) * (weekNumber - 1)}
                    y="15"
                    fontSize={10}
                    className="fill-current text-muted-foreground"
                >
                    {month}
                </text>
            );
        })}

        {/* Heatmap Cells */}
        <g onMouseLeave={() => setTooltip(null)}>
        {Array.from({ length: 53 * 7 }).map((_, index) => {
            const dayIndex = index % 7;
            const weekIndex = Math.floor(index / 7);

            const date = new Date(currentYear, 0, 1 + index - startingDay);
            if (date.getFullYear() !== currentYear) return null;
            const dateString = date.toISOString().split('T')[0];
            const count = dataMap[dateString] ?? 0;

            const x = 40 + weekIndex * (CELL_SIZE + CELL_GAP);
            const y = 30 + dayIndex * (CELL_SIZE + CELL_GAP);

            return (
                <motion.rect
                    key={dateString}
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    fill={getColor(count)}
                    rx={3}
                    ry={3}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.005 }}
                    onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ 
                            x: rect.left + window.scrollX + rect.width / 2,
                            y: rect.top + window.scrollY - 10,
                            date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                            count 
                        });
                    }}
                />
            );
        })}
        </g>
      </svg>
      <div className="flex justify-end items-center w-full mt-4 gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <svg width="88" height="14">
            {[0, 1, 5, 9, 13].map((count, i) => (
                <rect key={i} x={i * (CELL_SIZE + CELL_GAP)} y="0" width={CELL_SIZE} height={CELL_SIZE} fill={getColor(count)} rx={3} ry={3} />
            ))}
        </svg>
        <span>More</span>
      </div>
      <AnimatePresence>
        {tooltip && (
            <motion.div
                initial={{ opacity: 0, y: -10, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -10, x: '-50%' }}
                transition={{ duration: 0.2 }}
                style={{ top: tooltip.y, left: tooltip.x }}
                className="absolute z-10 p-2 bg-background border border-border rounded-md shadow-lg text-xs whitespace-nowrap transform -translate-y-full"
            >
                <strong>{tooltip.count} contributions</strong> on {tooltip.date}
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeatmapCalendar;
