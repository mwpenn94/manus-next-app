import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, Zap } from 'lucide-react';

// --- TYPES ---
type ActivityData = {
  date: string;
  count: number;
};

type TooltipData = {
  x: number;
  y: number;
  date: string;
  count: number;
} | null;

// --- MOCK DATA GENERATION ---
const generateMockData = (): ActivityData[] => {
  const today = new Date();
  const data: ActivityData[] = [];
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const count = Math.random() > 0.3 ? Math.floor(Math.random() * 25) : 0;
    data.push({ date: date.toISOString().split('T')[0], count });
  }
  return data.reverse();
};

// --- HELPER FUNCTIONS ---
const getColor = (count: number) => {
  if (count === 0) return 'hsl(0 0% 95%)';
  if (count < 5) return 'hsl(140 50% 80%)';
  if (count < 10) return 'hsl(140 50% 60%)';
  if (count < 20) return 'hsl(140 50% 40%)';
  return 'hsl(140 50% 30%)';
};

// --- MAIN COMPONENT ---
export default function ActivityHeatmap() {
  const [tooltip, setTooltip] = useState<TooltipData>(null);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

  const data = useMemo(() => generateMockData(), []);

  const summaryStats = useMemo(() => {
    let total = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    data.forEach(item => {
      total += item.count;
      if (item.count > 0) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 0;
      }
    });
    longestStreak = Math.max(longestStreak, currentStreak); // Final check
    const average = total / data.length;
    return { total, longestStreak, average: average.toFixed(2) };
  }, [data]);

  const today = new Date();
  
  const startDate = new Date(data[0].date);
  const startDay = startDate.getDay();

  const weeks = Array.from({ length: 53 }, (_, weekIndex) => {
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const dayNumber = weekIndex * 7 + dayIndex - startDay;
      if (dayNumber < 0 || dayNumber >= data.length) {
        return null;
      }
      return data[dayNumber];
    });
  });

  const monthLabels = useMemo(() => {
    const labels: { month: string; week: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
        const firstDayOfWeek = week.find(d => d);
        if(firstDayOfWeek) {
            const date = new Date(firstDayOfWeek.date);
            const month = date.getMonth();
            if(month !== lastMonth) {
                labels.push({ month: date.toLocaleString('default', { month: 'short' }), week: weekIndex });
                lastMonth = month;
            }
        }
    });
    return labels;
  }, [weeks]);

    const handleMouseOver = (e: React.MouseEvent, day: ActivityData | null, weekIndex: number, dayIndex: number) => {
    if (!day) return;

    const x = weekIndex * (CELL_SIZE + CELL_GAP) + (CELL_SIZE / 2);
    const y = dayIndex * (CELL_SIZE + CELL_GAP) + 20; // 20 is the g transform

    setTooltip({
      x: x,
      y: y,
      date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      count: day.count,
    });
  };

  const handleMouseOut = () => {
    setTooltip(null);
  };

  const CELL_SIZE = 12;
  const CELL_GAP = 3;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md font-sans w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-4">
        <div>
            <h2 className="text-xl font-bold text-gray-800">Activity Heatmap</h2>
            <p className="text-sm text-gray-500">Contributions in the last year</p>
        </div>
        <div className="flex items-center gap-2 p-1 rounded-md bg-gray-100">
            <button 
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1 text-sm rounded ${viewMode === 'weekly' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>
                Weekly
            </button>
            <button 
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 text-sm rounded ${viewMode === 'monthly' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>
                Monthly
            </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
            <svg width="100%" viewBox={`0 0 ${53 * (CELL_SIZE + CELL_GAP)} ${7 * (CELL_SIZE + CELL_GAP) + 20}`}>
                {/* Month Labels */}
                {monthLabels.map(({ month, week }) => (
                    <text 
                        key={month+week} 
                        x={week * (CELL_SIZE + CELL_GAP)} 
                        y="10" 
                        className="text-xs fill-current text-gray-500">
                        {month}
                    </text>
                ))}
                {/* Day Labels */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    i % 2 !== 0 && <text 
                        key={day} 
                        x={-10} 
                        y={25 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2} 
                        className="text-xs fill-current text-gray-500"
                        style={{dominantBaseline: 'middle', textAnchor: 'end'}}>
                        {day}
                    </text>
                ))}
                {/* Heatmap Cells */}
                {weeks.map((week, weekIndex) => (
                    <g key={weekIndex} transform={`translate(${weekIndex * (CELL_SIZE + CELL_GAP)}, 20)`}>
                        {week.map((day, dayIndex) => (
                            <rect
                                key={day ? day.date : `empty-${weekIndex}-${dayIndex}`}
                                x="0"
                                y={dayIndex * (CELL_SIZE + CELL_GAP)}
                                width={CELL_SIZE}
                                height={CELL_SIZE}
                                fill={day ? getColor(day.count) : 'transparent'}
                                rx="2"
                                ry="2"
                                onMouseOver={(e) => handleMouseOver(e, day, weekIndex, dayIndex)}
                                onMouseOut={handleMouseOut}
                                className="cursor-pointer transition-opacity hover:opacity-80"
                            />
                        ))}
                    </g>
                ))}
            </svg>
            {tooltip && (
                <div 
                    className="absolute bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none shadow-lg"
                    style={{ top: tooltip.y, left: tooltip.x, transform: 'translate(-50%, -120%)' }}>
                    <strong>{tooltip.count} contributions</strong> on {tooltip.date}
                </div>
            )}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600 border-t pt-4 mt-2">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Total: <strong>{summaryStats.total.toLocaleString()}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span>Longest Streak: <strong>{summaryStats.longestStreak} days</strong></span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gray-500" />
                    <span>Average: <strong>{summaryStats.average} / day</strong></span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-gray-500">Less</span>
                <svg width="70" height="10">
                    <rect x="0" y="0" width="10" height="10" fill="hsl(0 0% 95%)" rx="2" />
                    <rect x="15" y="0" width="10" height="10" fill="hsl(140 50% 80%)" rx="2" />
                    <rect x="30" y="0" width="10" height="10" fill="hsl(140 50% 60%)" rx="2" />
                    <rect x="45" y="0" width="10" height="10" fill="hsl(140 50% 40%)" rx="2" />
                    <rect x="60" y="0" width="10" height="10" fill="hsl(140 50% 30%)" rx="2" />
                </svg>
                <span className="text-gray-500">More</span>
            </div>
        </div>
      </div>
    </div>
  );
}