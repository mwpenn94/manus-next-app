import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Zap, ChevronDown, type LucideProps } from 'lucide-react';

type Service = 'Compute' | 'Storage' | 'Database' | 'Networking' | 'AI/ML';
type TimePeriod = 'Monthly' | 'Quarterly' | 'Yearly';

interface CostData {
  id: string;
  service: Service;
  projected: number;
  actual: number;
  date: Date;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  estimatedSavings: number;
  service: Service;
}

const generateMockData = (period: TimePeriod): CostData[] => {
  const data: CostData[] = [];
  const now = new Date();
  const services: Service[] = ['Compute', 'Storage', 'Database', 'Networking', 'AI/ML'];
  let months = 1;
  if (period === 'Quarterly') months = 3;
  if (period === 'Yearly') months = 12;

  for (let i = 0; i < months; i++) {
    for (const service of services) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const projected = Math.random() * 2000 + 1000;
      const actual = projected * (0.8 + Math.random() * 0.4);
      data.push({ id: `${service}-${i}`, service, projected, actual, date });
    }
  }
  return data;
};

const mockRecommendations: Recommendation[] = [
  { id: 'rec1', title: 'Right-size EC2 instances', description: 'Downgrade 15 underutilized t3.large instances to t3.medium.', estimatedSavings: 1250, service: 'Compute' },
  { id: 'rec2', title: 'Implement S3 Lifecycle Policies', description: 'Transition 50TB of infrequent-access data to Glacier.', estimatedSavings: 800, service: 'Storage' },
  { id: 'rec3', title: 'Optimize RDS query performance', description: 'Add indices to high-latency queries to reduce read I/O.', estimatedSavings: 450, service: 'Database' },
  { id: 'rec4', title: 'Utilize Spot Instances for batch jobs', description: 'Leverage spot pricing for non-critical nightly processing.', estimatedSavings: 2100, service: 'Compute' },
];

const ServiceIcon = ({ service, ...props }: { service: Service } & LucideProps) => {
  const icons: Record<Service, React.ElementType> = {
    Compute: Zap,
    Storage: ChevronDown,
    Database: DollarSign,
    Networking: TrendingUp,
    'AI/ML': TrendingUp,
  };
  const Icon = icons[service];
  return <Icon {...props} />;
};

const BarChart = ({ data }: { data: CostData[] }) => {
  const maxCost = useMemo(() => Math.max(...data.map(d => Math.max(d.projected, d.actual))), [data]);
  const barWidth = 32;
  const chartHeight = 120;

  return (
    <svg width="100%" height={chartHeight} className="mt-4">
      <g>
        {data.map((d, i) => {
          const x = i * (barWidth + 8);
          const projectedY = chartHeight - (d.projected / maxCost) * chartHeight;
          const actualY = chartHeight - (d.actual / maxCost) * chartHeight;
          return (
            <g key={d.id} transform={`translate(${x}, 0)`}>
              <rect x="0" y={projectedY} width={barWidth} height={(d.projected / maxCost) * chartHeight} fill="#374151" rx="2" />
              <rect x="0" y={actualY} width={barWidth} height={(d.actual / maxCost) * chartHeight} fill="#10B981" rx="2" />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default function CostOptimizationPanel() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('Monthly');
  const [activeService, setActiveService] = useState<Service | 'All'>('All');

  const data = useMemo(() => generateMockData(timePeriod), [timePeriod]);

  const filteredData = useMemo(() => {
    if (activeService === 'All') {
      const aggregated: { [key: string]: CostData } = {};
      data.forEach(d => {
        const key = d.date.toISOString().slice(0, 7);
        if (!aggregated[key]) {
          aggregated[key] = { ...d, projected: 0, actual: 0 };
        }
        aggregated[key].projected += d.projected;
        aggregated[key].actual += d.actual;
      });
      return Object.values(aggregated).sort((a, b) => a.date.getTime() - b.date.getTime());
    } else {
      return data.filter(d => d.service === activeService).sort((a, b) => a.date.getTime() - b.date.getTime());
    }
  }, [data, activeService]);

  const totalProjected = useMemo(() => filteredData.reduce((sum, d) => sum + d.projected, 0), [filteredData]);
  const totalActual = useMemo(() => filteredData.reduce((sum, d) => sum + d.actual, 0), [filteredData]);
  const savings = totalProjected - totalActual;

  const services: (Service | 'All')[] = ['All', 'Compute', 'Storage', 'Database', 'Networking', 'AI/ML'];

  return (
    <div className="bg-[#0a0a0a] text-white/90 p-4 sm:p-6 rounded-lg border border-white/10 font-sans w-full max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Cost Optimization</h1>
          <p className="text-sm text-white/60">Projected vs. Actual Spend</p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          {(['Monthly', 'Quarterly', 'Yearly'] as TimePeriod[]).map(period => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${timePeriod === period ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}>
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 p-4 rounded-lg">
          <h3 className="text-sm text-white/60">Projected Spend</h3>
          <p className="text-2xl font-semibold">${totalProjected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white/5 p-4 rounded-lg">
          <h3 className="text-sm text-white/60">Actual Spend</h3>
          <p className="text-2xl font-semibold">${totalActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className={`bg-white/5 p-4 rounded-lg ${savings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <h3 className="text-sm text-white/60">Total Savings</h3>
          <p className="text-2xl font-semibold">${savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div>
        <div className="flex gap-2 border-b border-white/10 mb-4 overflow-x-auto pb-2">
          {services.map(service => (
            <button
              key={service}
              onClick={() => setActiveService(service)}
              className={`px-4 py-2 text-sm rounded-t-md whitespace-nowrap transition-colors ${activeService === service ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}>
              {service}
            </button>
          ))}
        </div>
        <BarChart data={filteredData} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-4">Recommendations</h2>
        <div className="space-y-3">
          {mockRecommendations.filter(r => activeService === 'All' || r.service === activeService).map(rec => (
            <div key={rec.id} className="bg-white/5 p-4 rounded-lg flex items-start gap-4">
              <div className="bg-emerald-500/10 p-2 rounded-full">
                <ServiceIcon service={rec.service} className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{rec.title}</h4>
                <p className="text-sm text-white/60">{rec.description}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-400">-${rec.estimatedSavings.toLocaleString()}</p>
                <p className="text-xs text-white/60">per month</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
