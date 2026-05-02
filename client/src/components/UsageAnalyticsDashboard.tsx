import React, { useState, useMemo } from 'react';
import type { FC, SVGProps } from 'react';

// --- TYPE DEFINITIONS ---
type TimeRange = '24H' | '7D' | '30D';

type UsageData = {
  timestamp: number;
  activeUsers: number;
  apiCalls: number;
};

type User = {
  id: string;
  name: string;
  avatar: string;
  activity: number;
};

type Feature = {
  id: string;
  name: string;
  adoptionRate: number;
};

// --- MOCK DATA GENERATION ---
const generateUsageData = (days: number): UsageData[] => {
  const data: UsageData[] = [];
  const now = Date.now();
  for (let i = days * 24; i > 0; i--) {
    const timestamp = now - i * 60 * 60 * 1000;
    data.push({
      timestamp,
      activeUsers: Math.floor(Math.random() * 1000) + 500 + Math.sin(i / 50) * 200,
      apiCalls: Math.floor(Math.random() * 50000) + 20000 + Math.cos(i / 30) * 10000,
    });
  }
  return data;
};

const mockUsers: User[] = [
  { id: 'u1', name: 'Alex Johnson', avatar: 'AJ', activity: 98 },
  { id: 'u2', name: 'Maria Garcia', avatar: 'MG', activity: 95 },
  { id: 'u3', name: 'James Smith', avatar: 'JS', activity: 92 },
  { id: 'u4', name: 'Priya Patel', avatar: 'PP', activity: 88 },
  { id: 'u5', name: 'Kenji Tanaka', avatar: 'KT', activity: 85 },
];

const mockFeatures: Feature[] = [
  { id: 'f1', name: 'AI-Powered Code Gen', adoptionRate: 85 },
  { id: 'f2', name: 'Real-time Collaboration', adoptionRate: 72 },
  { id: 'f3', name: 'Automated Deployment', adoptionRate: 65 },
  { id: 'f4', name: 'Advanced Analytics', adoptionRate: 58 },
];

// --- SVG UTILITY COMPONENTS ---
const ChartIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

const UsersIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);

const Sparkline: FC<{ data: number[]; width?: number; height?: number; color: string }> = ({ data, width = 100, height = 30, color }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
};

// --- MAIN COMPONENT ---
export default function UsageAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');

  const fullData = useMemo(() => generateUsageData(30), []);

  const data = useMemo(() => {
    const days = timeRange === '24H' ? 1 : timeRange === '7D' ? 7 : 30;
    return fullData.slice(-days * 24);
  }, [timeRange, fullData]);

  const currentActiveUsers = data[data.length - 1]?.activeUsers ?? 0;
  const currentApiCalls = data[data.length - 1]?.apiCalls ?? 0;
  const totalUsers = 12450;

  const activeUsersData = data.map(d => d.activeUsers);
  const apiCallsData = data.map(d => d.apiCalls);

  const TimeSeriesChart: FC<{ data: UsageData[]; yAccessor: keyof UsageData; color: string }> = ({ data, yAccessor, color }) => {
    const width = 500;
    const height = 200;
    const padding = 20;
    const values = data.map(d => d[yAccessor] as number);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    const points = values.map((val, i) => {
        const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
        const y = (height - padding) - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
  };

  return (
    <div className="bg-[#0a0a0a] text-white/90 p-4 sm:p-6 font-sans min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usage Analytics</h1>
          <p className="text-white/60">Real-time platform metrics and insights.</p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0 bg-[#1a1a1a] border border-white/10 rounded-md p-1">
          {(['24H', '7D', '30D'] as TimeRange[]).map(range => (
            <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 text-sm rounded-md transition-colors ${timeRange === range ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}>
              {range}
            </button>
          ))}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Section */}
        <section className="lg:col-span-2 bg-[#121212] border border-white/10 rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-1">Active Users</h2>
          <p className="text-5xl font-bold tracking-tighter mb-2">{currentActiveUsers.toLocaleString()}</p>
          <div className="h-[200px]">
            <TimeSeriesChart data={data} yAccessor="activeUsers" color="#3b82f6" />
          </div>
        </section>

        {/* Side Panel */}
        <div className="flex flex-col gap-6">
            <div className="bg-[#121212] border border-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-white/90 mb-1">API Calls</h3>
                <p className="text-3xl font-bold tracking-tight">{(currentApiCalls / 1000000).toFixed(2)}M</p>
                <div className="mt-2">
                    <Sparkline data={apiCallsData} color="#8b5cf6" />
                </div>
            </div>
            <div className="bg-[#121212] border border-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-white/90 mb-1">Total Users</h3>
                <p className="text-3xl font-bold tracking-tight">{totalUsers.toLocaleString()}</p>
                 <div className="mt-2 h-[30px] flex items-center">
                    <UsersIcon className="w-5 h-5 text-white/60"/>
                </div>
            </div>
        </div>

        {/* Bottom Row */}
        <section className="lg:col-span-2 bg-[#121212] border border-white/10 rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Top Users</h2>
          <ul className="space-y-3">
            {mockUsers.map(user => (
              <li key={user.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-xs font-bold">{user.avatar}</div>
                  <span>{user.name}</span>
                </div>
                <span className="text-white/60">{user.activity}% activity</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-[#121212] border border-white/10 rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Feature Adoption</h2>
          <ul className="space-y-4">
            {mockFeatures.map(feature => (
              <li key={feature.id}>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-white/90">{feature.name}</span>
                  <span className="text-white/60">{feature.adoptionRate}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${feature.adoptionRate}%` }}></div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
