
import React, { useState, useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

type WebVital = 'LCP' | 'FID' | 'CLS' | 'TTFB';

interface VitalDataPoint {
  value: number;
  budget: number;
}

interface DailyVitalData {
  day: number;
  LCP: VitalDataPoint;
  FID: VitalDataPoint;
  CLS: VitalDataPoint;
  TTFB: VitalDataPoint;
}

const generateMockData = (): DailyVitalData[] => {
  const data: DailyVitalData[] = [];
  for (let i = 30; i >= 0; i--) {
    data.push({
      day: i,
      LCP: { value: 1.8 + Math.random() * 1.5, budget: 2.5 },
      FID: { value: 50 + Math.random() * 100, budget: 100 },
      CLS: { value: 0.05 + Math.random() * 0.2, budget: 0.1 },
      TTFB: { value: 400 + Math.random() * 400, budget: 600 },
    });
  }
  return data;
};

const initialData = generateMockData();

const VitalStatCard: React.FC<{ vital: WebVital; data: VitalDataPoint; }> = ({ vital, data }) => {
  const isOverBudget = data.value > data.budget;
  const percentage = (data.value / data.budget) * 100;

  const getUnit = (v: WebVital) => {
    if (v === 'LCP') return 's';
    if (v === 'FID' || v === 'TTFB') return 'ms';
    return '';
  };

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-white/10 flex flex-col justify-between">
      <div className="flex justify-between items-center text-white/60 text-sm">
        <span>{vital}</span>
        {isOverBudget ? (
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-400" />
        )}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-white">{data.value.toFixed(vital === 'CLS' ? 3 : 2)}</span>
        <span className="text-sm text-white/60">{getUnit(vital)}</span>
      </div>
      <div className="text-xs text-white/60 mt-1">Budget: {data.budget}{getUnit(vital)}</div>
      <div className="w-full bg-white/10 rounded-full h-1.5 mt-3">
        <div
          className={`h-1.5 rounded-full ${isOverBudget ? 'bg-yellow-400' : 'bg-green-400'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

const SparkLine: React.FC<{ data: number[]; budget: number; width: number; height: number; vital: WebVital; }> = ({ data, budget, width, height, vital }) => {
    const values = data;
    const maxVal = Math.max(...values, budget);
    const minVal = 0;

    const points = values
        .map((val, i) => {
            const x = (i / (values.length - 1)) * width;
            const y = height - ((val - minVal) / (maxVal - minVal)) * height;
            return `${x},${y}`;
        })
        .join(' ');

    const budgetY = height - ((budget - minVal) / (maxVal - minVal)) * height;

    const isCLS = vital === 'CLS';
    const lastValue = values[values.length - 1];
    const isOver = lastValue > budget;

    return (
        <svg width={width} height={height} className="overflow-visible">
            <line x1="0" y1={budgetY} x2={width} y2={budgetY} strokeDasharray="2 2" className="stroke-white/20" strokeWidth="1"/>
            <polyline fill="none" className={isOver ? "stroke-yellow-400" : "stroke-green-400"} strokeWidth="1.5" points={points} />
            <circle cx={(values.length - 1) * (width / (values.length - 1))} cy={height - ((lastValue - minVal) / (maxVal - minVal)) * height} r="2" className={isOver ? "fill-yellow-400" : "fill-green-400"} />
        </svg>
    );
};

export default function PerformanceBudgetTracker() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('30d');
  const [vitalsData] = useState<DailyVitalData[]>(initialData);

  const filteredData = useMemo(() => {
    const days = timeframe === '7d' ? 7 : 30;
    return vitalsData.slice(0, days).reverse();
  }, [timeframe, vitalsData]);

  const latestData = filteredData[filteredData.length - 1];

  const vitalKeys: WebVital[] = ['LCP', 'FID', 'CLS', 'TTFB'];

  return (
    <div className="bg-[#0a0a0a] text-white p-4 sm:p-6 md:p-8 font-sans min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Performance Budget Tracker</h1>
            <p className="text-white/60 mt-1">Web Vitals budget monitoring and historical trends.</p>
          </div>
          <div className="flex items-center space-x-2 bg-[#1a1a1a] border border-white/10 p-1 rounded-lg mt-4 sm:mt-0">
            <button onClick={() => setTimeframe('7d')} className={`px-3 py-1 text-sm rounded-md ${timeframe === '7d' ? 'bg-white/10 text-white' : 'text-white/60'}`}>7 Days</button>
            <button onClick={() => setTimeframe('30d')} className={`px-3 py-1 text-sm rounded-md ${timeframe === '30d' ? 'bg-white/10 text-white' : 'text-white/60'}`}>30 Days</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {latestData && vitalKeys.map(key => (
            <VitalStatCard key={key} vital={key} data={latestData[key]} />
          ))}
        </div>

        <div className="bg-[#1a1a1a] p-4 sm:p-6 rounded-lg border border-white/10">
            <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 mr-2 text-white/60"/>
                <h2 className="text-lg font-semibold text-white">Historical Trends</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                {vitalKeys.map(vital => {
                    const chartData = filteredData.map(d => d[vital].value);
                    const budget = filteredData[0][vital].budget;
                    return (
                        <div key={vital}>
                            <div className="flex justify-between items-baseline mb-2">
                                <h3 className="font-semibold text-white">{vital}</h3>
                                <p className="text-xs text-white/60">Budget: {budget}{vital === 'LCP' ? 's' : vital === 'CLS' ? '' : 'ms'}</p>
                            </div>
                            <div className="w-full h-20">
                                <SparkLine data={chartData} budget={budget} width={300} height={80} vital={vital} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
}
