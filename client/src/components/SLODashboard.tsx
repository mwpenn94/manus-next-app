
import React, { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, XCircle, TrendingDown, TrendingUp, Clock } from 'lucide-react';

type SLOStatus = 'Healthy' | 'At Risk' | 'Breached';
type TimeRange = '7d' | '30d' | '90d';

interface SLO {
  id: string;
  name: string;
  description: string;
  target: number;
  actual: number;
  status: SLOStatus;
  errorBudgetRemaining: number;
  burnRate: number;
  history: number[];
}

const generateSLOData = (timeRange: TimeRange): SLO[] => {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const baseData: Omit<SLO, 'actual' | 'status' | 'errorBudgetRemaining' | 'burnRate' | 'history'>[] = [
    { id: 'api-latency', name: 'API Latency p99', description: '99% of API requests served < 200ms', target: 99.9 },
    { id: 'api-availability', name: 'API Availability', description: 'API returns successful status codes', target: 99.95 },
    { id: 'job-execution', name: 'Async Job Success', description: 'Jobs complete without errors', target: 99.5 },
    { id: 'db-replication', name: 'DB Replication Lag', description: 'Replication lag under 5 seconds', target: 99.99 },
  ];

  return baseData.map(slo => {
    const history = Array.from({ length: days }, (_, i) => {
      const fluctuation = (Math.random() - 0.5) * 0.1;
      const trend = (i / days - 0.5) * 0.05;
      return slo.target + fluctuation + trend + (slo.id === 'job-execution' ? -0.2 : 0.05);
    });
    const actual = history[history.length - 1];
    const isBreached = actual < slo.target;
    const atRiskThreshold = slo.target + (100 - slo.target) * 0.1;
    const isAtRisk = !isBreached && actual < atRiskThreshold;

    const status: SLOStatus = isBreached ? 'Breached' : isAtRisk ? 'At Risk' : 'Healthy';
    const errorBudgetTotalMinutes = (1 - slo.target / 100) * days * 24 * 60;
    const downtimeMinutes = history.filter(h => h < slo.target).length * (days * 24 * 60 / days);
    const errorBudgetRemaining = Math.max(0, (errorBudgetTotalMinutes - downtimeMinutes) / errorBudgetTotalMinutes * 100);
    const burnRate = downtimeMinutes / (days * 24 * 60) > (1 - slo.target / 100) ? (downtimeMinutes / (days * 24 * 60)) / (1-slo.target/100) : Math.random() * 2;

    return { ...slo, actual, status, errorBudgetRemaining, burnRate, history };
  });
};

const StatusIcon: React.FC<{ status: SLOStatus }> = ({ status }) => {
  if (status === 'Healthy') return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (status === 'At Risk') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
};

const Sparkline: React.FC<{ data: number[], target: number }> = ({ data, target }) => {
  const width = 120;
  const height = 40;
  const min = Math.min(...data, target);
  const max = Math.max(...data, target);
  const range = max - min === 0 ? 1 : max - min;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const targetY = height - ((target - min) / range) * height;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <line x1="0" y1={targetY} x2={width} y2={targetY} strokeDasharray="2,2" className="stroke-white/20" strokeWidth="1" />
      <polyline points={points} fill="none" className="stroke-blue-500" strokeWidth="1.5" />
    </svg>
  );
};

export default function SLODashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const sloData = useMemo(() => generateSLOData(timeRange), [timeRange]);

  const complianceWindowDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Service Level Objectives</h1>
            <p className="text-white/60 mt-1">Tracking reliability and error budget consumption.</p>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0 bg-[#1a1a1a] border border-white/10 rounded-md p-1">
            {(['7d', '30d', '90d'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === range ? 'bg-blue-600 text-white' : 'text-white/60 hover:bg-white/10'}`}>
                {range}
              </button>
            ))}
          </div>
        </header>

        <div className="mb-6 p-4 border border-white/10 rounded-lg bg-[#1a1a1a] flex items-center gap-3">
            <Clock className="w-5 h-5 text-white/60"/>
            <p className="text-sm text-white/80">Compliance Window: <span className="font-semibold text-white">Last {complianceWindowDays} days</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {sloData.map(slo => (
            <div key={slo.id} className="bg-[#1a1a1a] border border-white/10 rounded-lg p-5 flex flex-col justify-between transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-blue-900/20">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={slo.status} />
                    <h2 className="font-semibold text-white text-lg">{slo.name}</h2>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${slo.status === 'Healthy' ? 'bg-green-500/20 text-green-400' : slo.status === 'At Risk' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                    {slo.status}
                  </span>
                </div>
                <p className="text-sm text-white/60 mb-4">{slo.description}</p>
              </div>

              <div className="mb-4 h-10">
                <Sparkline data={slo.history} target={slo.target} />
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Current / Target</span>
                  <span className={`font-mono ${slo.actual >= slo.target ? 'text-green-400' : 'text-red-400'}`}>
                    {slo.actual.toFixed(3)}% / {slo.target}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Error Budget Left</span>
                  <div className="w-2/5 bg-gray-700 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${slo.errorBudgetRemaining > 30 ? 'bg-green-500' : slo.errorBudgetRemaining > 10 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${slo.errorBudgetRemaining}%` }}></div>
                  </div>
                  <span className="font-mono text-white/80">{slo.errorBudgetRemaining.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Burn Rate (24h)</span>
                  <span className={`flex items-center gap-1 font-mono ${slo.burnRate > 1 ? 'text-red-400' : 'text-green-400'}`}>
                    {slo.burnRate > 1 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                    {slo.burnRate.toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
