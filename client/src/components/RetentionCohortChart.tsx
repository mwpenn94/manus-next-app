
import React, { useState, useMemo } from 'react';
import { Users, Calendar, TrendingUp } from 'lucide-react';

type CohortData = {
  cohort: string;
  totalUsers: number;
  retention: (number | null)[];
};

const generateMockData = (): CohortData[] => {
  const data: CohortData[] = [];
  const startDate = new Date('2023-01-01');
  const numCohorts = 12;

  for (let i = 0; i < numCohorts; i++) {
    const cohortDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const cohortName = cohortDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    const totalUsers = 1000 + Math.floor(Math.random() * 500) - i * 50;
    
    const retention: (number | null)[] = [];
    let currentRetention = 100;
    for (let j = 0; j < numCohorts; j++) {
      if (j > i) {
        retention.push(null);
        continue;
      }
      if (j === 0) {
        retention.push(100);
      } else {
        const dropOff = 5 + Math.random() * 10 + j * 2;
        currentRetention = Math.max(0, currentRetention - dropOff);
        retention.push(Math.round(currentRetention));
      }
    }
    data.push({ cohort: cohortName, totalUsers, retention: retention.reverse() });
  }
  return data.reverse();
};

const getPeriodLabel = (index: number, total: number) => {
    const monthIndex = total - 1 - index;
    if (monthIndex === 0) return 'New';
    return `Month ${monthIndex}`;
}

const RetentionCohortChart: React.FC = () => {
  const [data] = useState<CohortData[]>(generateMockData());
  const [hoveredCell, setHoveredCell] = useState<{ cohort: CohortData; month: number; value: number; x: number; y: number } | null>(null);

  const colorScale = (value: number | null): string => {
    if (value === null || value === undefined) return 'transparent';
    if (value > 80) return 'hsl(142.1 76.2% 41.2%)';
    if (value > 60) return 'hsl(142.1 76.2% 41.2% / 0.8)';
    if (value > 40) return 'hsl(142.1 76.2% 41.2% / 0.6)';
    if (value > 20) return 'hsl(142.1 76.2% 41.2% / 0.4)';
    if (value > 0) return 'hsl(142.1 76.2% 41.2% / 0.2)';
    return 'hsl(215.4 20.2% 65.1% / 0.1)';
  };

  const handleMouseOver = (e: React.MouseEvent<SVGRectElement>, cohort: CohortData, monthIndex: number, value: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCell({
      cohort,
      month: data[0].retention.length - 1 - monthIndex,
      value,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseOut = () => {
    setHoveredCell(null);
  };

  const chartData = useMemo(() => data, [data]);

  return (
    <div className="bg-[#0a0a0a] text-white p-4 sm:p-6 rounded-lg border border-white/10 w-full font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Retention Cohort Analysis</h2>
          <p className="text-sm text-white/60">User retention by monthly cohorts.</p>
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                <span className="text-xs text-white/60">Low Retention</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-white/60">High Retention</span>
            </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <svg width="100%" viewBox={`0 0 ${12 * 80 + 120} ${12 * 40 + 40}`} aria-labelledby="chart-title">
            <title id="chart-title">Retention Cohort Chart</title>
            
            {/* Header row */}
            {chartData[0]?.retention.map((_, index) => (
              <text 
                key={`header-${index}`}
                x={120 + index * 80 + 40}
                y="20"
                textAnchor="middle"
                fontSize="12"
                fill="#a1a1aa"
              >
                {getPeriodLabel(index, chartData[0].retention.length)}
              </text>
            ))}

            {/* Data rows */}
            {chartData.map((cohort, rowIndex) => (
              <g key={cohort.cohort} transform={`translate(0, ${40 + rowIndex * 40})`}>
                <text x="0" y="25" fontSize="12" fill="#a1a1aa" className="w-[120px]">
                  {cohort.cohort}
                </text>
                <text x="60" y="25" fontSize="12" fill="#71717a">
                  {cohort.totalUsers}
                </text>
                {cohort.retention.map((value, colIndex) => (
                  value !== null ? (
                    <rect
                      key={`${cohort.cohort}-${colIndex}`}
                      x={120 + colIndex * 80}
                      y="0"
                      width="75"
                      height="35"
                      rx="4"
                      ry="4"
                      fill={colorScale(value)}
                      onMouseOver={(e) => handleMouseOver(e, cohort, colIndex, value)}
                      onMouseOut={handleMouseOut}
                      className="transition-opacity duration-200 hover:opacity-80 cursor-pointer"
                    />
                  ) : <rect key={`${cohort.cohort}-${colIndex}`} x={120 + colIndex * 80} y="0" width="75" height="35" fill="transparent" />
                ))}
                 {cohort.retention.map((value, colIndex) => (
                  value !== null ? (
                    <text
                      key={`text-${cohort.cohort}-${colIndex}`}
                      x={120 + colIndex * 80 + 37.5}
                      y="22.5"
                      textAnchor="middle"
                      fontSize="12"
                      fill={value > 60 ? '#ffffff' : '#e4e4e7'}
                      pointerEvents="none"
                    >
                      {value}%
                    </text>
                  ) : null
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {hoveredCell && (
        <div 
          className="absolute bg-[#18181b] border border-white/10 rounded-md shadow-lg p-3 text-sm text-white transition-opacity duration-200 pointer-events-none"
          style={{ 
            transform: `translate(-50%, -110%)`,
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y}px`,
          }}
        >
          <div className="font-semibold mb-2 flex items-center gap-2">
            <Calendar size={14} className="text-white/60"/>
            <span>{hoveredCell.cohort.cohort}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-2 text-white/60">
              <Users size={14} />
              <span>Initial Users</span>
            </div>
            <span className="text-right font-mono">{hoveredCell.cohort.totalUsers}</span>
            
            <div className="flex items-center gap-2 text-white/60">
              <TrendingUp size={14} />
              <span>{hoveredCell.month === 0 ? 'New Users' : `Month ${hoveredCell.month}`}</span>
            </div>
            <span className="text-right font-mono">{hoveredCell.value}%</span>
          </div>
          <div 
            className="absolute w-3 h-3 bg-[#18181b] border-b border-r border-white/10"
            style={{ 
              bottom: '-7px', 
              left: '50%', 
              transform: 'translateX(-50%) rotate(45deg)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default RetentionCohortChart;
