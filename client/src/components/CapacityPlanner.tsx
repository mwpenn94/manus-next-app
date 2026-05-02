
import React, { useState, useMemo } from 'react';
import { Cpu, MemoryStick, HardDrive, Scale, AlertTriangle, ArrowRight } from 'lucide-react';

type ResourceType = 'CPU' | 'Memory' | 'Storage';
type ForecastPeriod = '6m' | '12m' | '24m';

interface ForecastDataPoint {
  month: number;
  usage: number; 
}

interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  region: string;
  currentUsage: number;
  capacity: number;
  forecast: ForecastDataPoint[];
}

interface ScalingRecommendation {
  resourceId: string;
  action: 'Scale Up' | 'Scale Down' | 'Maintain';
  reason: string;
  projectedCapacity: number;
}

const generateMockData = (): Resource[] => {
  const resources = [
    { name: 'Primary DB Cluster', type: 'CPU', region: 'us-east-1', capacity: 96, baseUsage: 60 },
    { name: 'API Gateway Fleet', type: 'CPU', region: 'eu-west-2', capacity: 128, baseUsage: 45 },
    { name: 'Data Warehouse', type: 'Memory', region: 'us-west-2', capacity: 512, baseUsage: 70 },
    { name: 'Cache Layer', type: 'Memory', region: 'ap-southeast-1', capacity: 256, baseUsage: 55 },
    { name: 'Log Archives', type: 'Storage', region: 'us-east-1', capacity: 10240, baseUsage: 80 },
    { name: 'Object Storage', type: 'Storage', region: 'eu-central-1', capacity: 20480, baseUsage: 65 },
  ];

  return resources.map((r, i) => ({
    id: `res-${i + 1}`,
    name: r.name,
    type: r.type as ResourceType,
    region: r.region,
    capacity: r.capacity,
    currentUsage: r.baseUsage + Math.random() * 5 - 2.5,
    forecast: Array.from({ length: 24 }, (_, month) => ({
      month: month + 1,
      usage: Math.min(98, r.baseUsage + (month + 1) * (1 + Math.random() * 0.5) + Math.sin(month / 3) * 5),
    })),
  }));
};

const mockResources = generateMockData();

const getRecommendation = (resource: Resource, periodMonths: number): ScalingRecommendation => {
  const finalForecast = resource.forecast[periodMonths - 1];
  let action: 'Scale Up' | 'Scale Down' | 'Maintain' = 'Maintain';
  let reason = 'Usage within optimal range.';
  let projectedCapacity = resource.capacity;

  if (finalForecast.usage > 85) {
    action = 'Scale Up';
    projectedCapacity = Math.ceil(resource.capacity * 1.5 / 16) * 16;
    reason = `Projected usage hits ${finalForecast.usage.toFixed(1)}%, exceeding 85% threshold.`
  } else if (finalForecast.usage < 40) {
    action = 'Scale Down';
    projectedCapacity = Math.max(16, Math.floor(resource.capacity * 0.75 / 16) * 16);
    reason = `Projected usage is low at ${finalForecast.usage.toFixed(1)}%.`;
  } 

  return { resourceId: resource.id, action, reason, projectedCapacity };
};

const ResourceIcon: React.FC<{ type: ResourceType }> = ({ type }) => {
  const props = { className: "w-4 h-4 text-white/60" };
  if (type === 'CPU') return <Cpu {...props} />;
  if (type === 'Memory') return <MemoryStick {...props} />;
  if (type === 'Storage') return <HardDrive {...props} />;
  return null;
};

const ForecastChart: React.FC<{ data: ForecastDataPoint[]; period: number }> = ({ data, period }) => {
  const width = 100, height = 40, threshold = 85;
  const filteredData = data.slice(0, period);
  const maxUsage = Math.max(...filteredData.map(p => p.usage), threshold);
  const points = filteredData.map((p, i) => {
    const x = (i / (period - 1)) * width;
    const y = height - (p.usage / maxUsage) * height;
    return `${x},${y}`;
  }).join(' ');

  const thresholdY = height - (threshold / maxUsage) * height;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
      <line x1="0" y1={thresholdY} x2={width} y2={thresholdY} stroke="rgba(239, 68, 68, 0.4)" strokeWidth="0.5" strokeDasharray="2 2" />
      <polyline points={points} fill="none" stroke="rgba(59, 130, 246, 0.8)" strokeWidth="1" />
    </svg>
  );
};

export default function CapacityPlanner() {
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>('12m');
  const [visibleTypes, setVisibleTypes] = useState<Set<ResourceType>>(new Set<ResourceType>(['CPU', 'Memory', 'Storage']));

  const periodMonths = parseInt(forecastPeriod.replace('m', ''), 10);

  const filteredResources = useMemo(() => 
    mockResources.filter(r => visibleTypes.has(r.type)), 
    [visibleTypes]
  );

  const recommendations = useMemo(() => 
    filteredResources.map(r => getRecommendation(r, periodMonths)),
    [filteredResources, periodMonths]
  );

  const toggleType = (type: ResourceType) => {
    setVisibleTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Capacity Planner</h1>
          <p className="text-sm text-white/60 mt-1">Resource utilization forecasts and scaling recommendations.</p>
        </header>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['CPU', 'Memory', 'Storage'] as ResourceType[]).map(type => (
              <button key={type} onClick={() => toggleType(type)} className={`px-3 py-1 text-xs sm:text-sm rounded-full transition-colors ${visibleTypes.has(type) ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                {type}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-md">
            {(['6m', '12m', '24m'] as ForecastPeriod[]).map(period => (
              <button key={period} onClick={() => setForecastPeriod(period)} className={`px-3 py-1 text-xs sm:text-sm rounded transition-colors ${forecastPeriod === period ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/10'}`}>
                {`Next ${period}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource, index) => {
            const recommendation = recommendations[index];
            const recommendationColor = recommendation.action === 'Scale Up' ? 'text-red-400' : recommendation.action === 'Scale Down' ? 'text-green-400' : 'text-yellow-400';

            return (
              <div key={resource.id} className="bg-[#111] border border-white/10 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="font-semibold text-white">{resource.name}</h2>
                      <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                        <ResourceIcon type={resource.type} />
                        <span>{resource.region}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{resource.currentUsage.toFixed(1)}%</div>
                      <div className="text-xs text-white/60">Current Use</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-xs text-white/50 mb-1">Forecasted Usage ({forecastPeriod})</p>
                    <ForecastChart data={resource.forecast} period={periodMonths} />
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-md mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`flex items-center gap-2 text-sm font-semibold ${recommendationColor}`}>
                      {recommendation.action === 'Scale Up' && <AlertTriangle className="w-4 h-4" />}
                      {recommendation.action !== 'Scale Up' && <Scale className="w-4 h-4" />}
                      {recommendation.action} Recommendation
                    </p>
                    {recommendation.action !== 'Maintain' && (
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <span>{resource.capacity}</span>
                        <ArrowRight className="w-3 h-3 text-white/40"/>
                        <span className="font-bold">{recommendation.projectedCapacity}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/60">{recommendation.reason}</p>
                </div>
              </div>
            );
          })}
        </div>
        {filteredResources.length === 0 && (
            <div className="text-center py-16 text-white/40">
                <p>No resources to display.</p>
                <p className="text-sm">Select a resource type to view capacity data.</p>
            </div>
        )}
      </div>
    </div>
  );
}
