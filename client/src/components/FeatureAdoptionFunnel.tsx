import React, { useState, useMemo } from 'react';
import { Users, Target, Heart, Repeat, ChevronDown, ChevronRight } from 'lucide-react';

type FunnelStage = {
  name: 'Discovery' | 'Trial' | 'Adoption' | 'Retention';
  userCount: number;
};

type FunnelData = {
  featureName: string;
  data: FunnelStage[];
};

const mockData: FunnelData[] = [
  {
    featureName: 'New Dashboard',
    data: [
      { name: 'Discovery', userCount: 10000 },
      { name: 'Trial', userCount: 6500 },
      { name: 'Adoption', userCount: 3200 },
      { name: 'Retention', userCount: 1500 },
    ],
  },
  {
    featureName: 'AI Assistant',
    data: [
      { name: 'Discovery', userCount: 12000 },
      { name: 'Trial', userCount: 7200 },
      { name: 'Adoption', userCount: 4800 },
      { name: 'Retention', userCount: 2800 },
    ],
  },
];

const FunnelStageIcon: React.FC<{ name: FunnelStage['name'] }> = ({ name }) => {
  const icons = {
    Discovery: <Users className="w-4 h-4" />,
    Trial: <Target className="w-4 h-4" />,
    Adoption: <Heart className="w-4 h-4" />,
    Retention: <Repeat className="w-4 h-4" />,
  };
  return icons[name];
};

const FunnelChart: React.FC<{ data: FunnelStage[] }> = ({ data }) => {
  const maxUsers = Math.max(...data.map(stage => stage.userCount));
  const colors = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'];

  return (
    <svg viewBox="0 0 300 200" className="w-full h-auto">
      <defs>
        {
          colors.map((color, index) => (
            <linearGradient key={index} id={`grad${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.4 }} />
            </linearGradient>
          ))
        }
      </defs>
      {data.map((stage, index) => {
        const stagePercentage = stage.userCount / maxUsers;
        const prevStagePercentage = index > 0 ? data[index - 1].userCount / maxUsers : 1;
        
        const y = index * 50;
        const topWidth = 300 * prevStagePercentage;
        const bottomWidth = 300 * stagePercentage;
        const topX = (300 - topWidth) / 2;
        const bottomX = (300 - bottomWidth) / 2;

        const points = `${topX},${y} ${topX + topWidth},${y} ${bottomX + bottomWidth},${y + 50} ${bottomX},${y + 50}`;

        return (
          <g key={stage.name}>
            <polygon points={points} fill={`url(#grad${index})`} />
            <text x="150" y={y + 30} textAnchor="middle" fill="white" className="text-sm font-bold">
              {stage.name}
            </text>
            <text x="150" y={y + 45} textAnchor="middle" fill="white/70" className="text-xs">
              {stage.userCount.toLocaleString()} users
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const FeatureAdoptionFunnel: React.FC = () => {
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(true);

  const selectedFeatureData = mockData[selectedFeatureIndex];

  const conversionRates = useMemo(() => {
    const rates: { from: FunnelStage['name']; to: FunnelStage['name']; rate: number }[] = [];
    for (let i = 0; i < selectedFeatureData.data.length - 1; i++) {
      const fromStage = selectedFeatureData.data[i];
      const toStage = selectedFeatureData.data[i + 1];
      rates.push({
        from: fromStage.name,
        to: toStage.name,
        rate: fromStage.userCount > 0 ? (toStage.userCount / fromStage.userCount) * 100 : 0,
      });
    }
    const overallRate = selectedFeatureData.data[0].userCount > 0 ? (selectedFeatureData.data[selectedFeatureData.data.length - 1].userCount / selectedFeatureData.data[0].userCount) * 100 : 0;
    return { stepRates: rates, overallRate };
  }, [selectedFeatureData]);

  return (
    <div className="bg-[#0a0a0a] text-white/90 p-4 sm:p-6 rounded-lg border border-white/10 w-full max-w-2xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Feature Adoption Funnel</h1>
          <p className="text-sm text-white/60">Visualizing user journey from discovery to retention.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select 
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedFeatureIndex(parseInt(e.target.value, 10))}
            className="bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-1.5 text-sm text-white/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={selectedFeatureIndex}
          >
            {mockData.map((feature, index) => (
              <option key={feature.featureName} value={index}>{feature.featureName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3 bg-[#101010] p-4 rounded-md border border-white/10">
          <h2 className="font-semibold text-white/90 mb-4 text-center">{selectedFeatureData.featureName} Funnel</h2>
          <FunnelChart data={selectedFeatureData.data} />
        </div>

        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="bg-[#101010] p-4 rounded-md border border-white/10">
            <h3 className="font-semibold text-white/80 mb-3">Overall Conversion</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-indigo-400">{conversionRates.overallRate.toFixed(1)}%</span>
            </div>
            <p className="text-xs text-white/50 mt-1">From Discovery to Retention</p>
          </div>

          <div className="bg-[#101010] p-4 rounded-md border border-white/10">
            <button 
              className="flex justify-between items-center w-full mb-2" 
              onClick={() => setShowDetails(!showDetails)}
            >
              <h3 className="font-semibold text-white/80">Stage Conversions</h3>
              {showDetails ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronRight className="w-4 h-4 text-white/60" />}
            </button>
            {showDetails && (
              <div className="space-y-3 pt-2">
                {conversionRates.stepRates.map((rate, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center text-xs text-white/70 mb-1">
                      <span>{rate.from} → {rate.to}</span>
                      <span className="font-medium text-white/90">{rate.rate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div 
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${rate.rate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[#101010] p-4 rounded-md border border-white/10">
        <h3 className="font-semibold text-white/80 mb-4">Funnel Stages Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {selectedFeatureData.data.map((stage) => (
            <div key={stage.name} className="bg-[#1a1a1a] p-3 rounded-md border border-transparent hover:border-white/20 transition-colors duration-300">
              <div className="flex justify-center items-center gap-2 mb-2">
                <FunnelStageIcon name={stage.name} />
                <h4 className="text-sm font-medium text-white/80">{stage.name}</h4>
              </div>
              <p className="text-2xl font-bold text-white">{stage.userCount.toLocaleString()}</p>
              <p className="text-xs text-white/50">Users</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureAdoptionFunnel;