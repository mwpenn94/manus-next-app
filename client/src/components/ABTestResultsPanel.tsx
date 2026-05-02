import React, { useState, useMemo } from 'react';
import { CheckCircle, Zap, Users, Target, Scale, Percent, ArrowUp, ArrowDown, X } from 'lucide-react';

type Variant = 'A' | 'B';

type ExperimentData = {
  id: string;
  name: string;
  variants: {
    [key in Variant]: {
      visitors: number;
      conversions: number;
    };
  };
  startDate: string;
  endDate: string;
  primaryMetric: string;
};

const mockExperiment: ExperimentData = {
  id: 'exp-001',
  name: 'New Checkout Flow Efficacy',
  variants: {
    A: { visitors: 10250, conversions: 820 },
    B: { visitors: 10310, conversions: 990 },
  },
  startDate: '2026-04-15',
  endDate: '2026-04-29',
  primaryMetric: 'Conversion Rate',
};

const calculateMetrics = (visitors: number, conversions: number) => {
  const conversionRate = visitors > 0 ? (conversions / visitors) * 100 : 0;
  return { conversionRate };
};

const calculateStatisticalSignificance = (c1: number, n1: number, c2: number, n2: number) => {
  const p1 = c1 / n1;
  const p2 = c2 / n2;
  const p_pool = (c1 + c2) / (n1 + n2);
  const se = Math.sqrt(p_pool * (1 - p_pool) * (1 / n1 + 1 / n2));
  const z_score = (p2 - p1) / se;
  const p_value = 1 - (0.5 * (1 + erf(z_score / Math.sqrt(2))));
  const significance = p_value < 0.05;
  const confidence = (1 - p_value) * 100;
  return { z_score, p_value, significance, confidence };
};

// Approximation of the error function
const erf = (x: number) => {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = (x >= 0) ? 1 : -1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
};

const ABTestResultsPanel: React.FC = () => {
  const [experiment] = useState<ExperimentData>(mockExperiment);

  const metricsA = useMemo(() => calculateMetrics(experiment.variants.A.visitors, experiment.variants.A.conversions), [experiment]);
  const metricsB = useMemo(() => calculateMetrics(experiment.variants.B.visitors, experiment.variants.B.conversions), [experiment]);

  const uplift = metricsB.conversionRate - metricsA.conversionRate;

  const stats = useMemo(() => calculateStatisticalSignificance(
    experiment.variants.A.conversions, experiment.variants.A.visitors,
    experiment.variants.B.conversions, experiment.variants.B.visitors
  ), [experiment]);

  const winner: Variant | null = stats.significance && uplift > 0 ? 'B' : null;

  const SvgIcon = ({ icon: Icon }: { icon: React.ElementType }) => <Icon className="w-4 h-4" />;

  const StatCard = ({ icon, label, value, change, isSignificant }: { icon: React.ElementType, label: string, value: string, change?: number, isSignificant?: boolean }) => (
    <div className="bg-white/5 p-4 rounded-lg">
      <div className="flex items-center text-white/60 mb-2">
        <SvgIcon icon={icon} />
        <span className="ml-2 text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center text-xs mt-1 ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          <span className="ml-1">{Math.abs(change).toFixed(2)}% {isSignificant && "(Significant)"}</span>
        </div>
      )}
    </div>
  );

  const Bar = ({ rate, color, label }: { rate: number, color: string, label: string }) => (
    <div className="w-full">
        <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-white/80">Variant {label}</span>
            <span className="text-sm font-bold text-white">{rate.toFixed(2)}%</span>
        </div>
        <div className="h-2.5 w-full bg-white/10 rounded-full">
            <div className={`${color} h-2.5 rounded-full`} style={{ width: `${rate}%` }}></div>
        </div>
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] text-white/90 p-4 sm:p-6 rounded-xl border border-white/10 font-sans w-full max-w-4xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">A/B Test Results</h1>
          <p className="text-sm text-white/60">{experiment.name}</p>
        </div>
        {winner && (
          <div className="mt-2 sm:mt-0 flex items-center bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span>Variant {winner} is winning</span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} label="Total Visitors" value={`${((experiment.variants.A.visitors + experiment.variants.B.visitors)/1000).toFixed(1)}k`} />
        <StatCard icon={Target} label="Primary Metric" value={experiment.primaryMetric} />
        <StatCard icon={Percent} label="Uplift" value={`${uplift.toFixed(2)}%`} change={uplift} isSignificant={stats.significance} />
      </div>

      <div className="bg-white/5 p-4 sm:p-6 rounded-lg border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">Performance Comparison</h2>
        <div className="space-y-6">
          <Bar rate={metricsA.conversionRate} color="bg-blue-500" label="A" />
          <Bar rate={metricsB.conversionRate} color="bg-green-500" label="B" />
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-white/60">
            <div className="flex items-center">
                <Scale className="w-4 h-4 mr-2"/>
                <p>Statistical Significance</p>
            </div>
            <div className="mt-2 sm:mt-0 text-right">
                <p className={`font-bold ${stats.significance ? 'text-green-400' : 'text-amber-400'}`}>
                    {stats.confidence.toFixed(2)}% Confidence
                </p>
                <p className="text-xs">P-value: {stats.p_value.toFixed(4)}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ABTestResultsPanel;
