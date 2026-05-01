import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowUp, ArrowDown, Minus, Shield, KeyRound, Database, Smartphone, Server, ToyBrick, Lightbulb } from 'lucide-react';

// --- TYPES ---
type Trend = 'up' | 'down' | 'stable';

type Recommendation = {
  id: string;
  text: string;
  severity: 'High' | 'Medium' | 'Low';
};

type SecurityCategory = {
  id: string;
  name: string;
  score: number;
  icon: React.ElementType;
  recommendations: Recommendation[];
};

type SecurityData = {
  overallScore: number;
  grade: string;
  trend: Trend;
  lastAssessed: string;
  benchmarkScore: number;
  categories: SecurityCategory[];
};

// --- MOCK DATA ---
const mockData: SecurityData = {
  overallScore: 88,
  grade: 'B+',
  trend: 'up',
  lastAssessed: '2026-04-28',
  benchmarkScore: 82,
  categories: [
    {
      id: 'identity',
      name: 'Identity',
      score: 92,
      icon: KeyRound,
      recommendations: [
        { id: 'rec-i-1', text: 'Enforce MFA for all administrator accounts.', severity: 'High' },
        { id: 'rec-i-2', text: 'Review and prune stale user accounts.', severity: 'Medium' },
      ],
    },
    {
      id: 'data',
      name: 'Data',
      score: 85,
      icon: Database,
      recommendations: [
        { id: 'rec-d-1', text: 'Enable encryption for all sensitive data at rest.', severity: 'High' },
        { id: 'rec-d-2', text: 'Implement data loss prevention (DLP) policies.', severity: 'Medium' },
        { id: 'rec-d-3', text: 'Classify and tag all unstructured data.', severity: 'Low' },
      ],
    },
    {
      id: 'device',
      name: 'Device',
      score: 78,
      icon: Smartphone,
      recommendations: [
        { id: 'rec-dev-1', text: 'Ensure all corporate devices have endpoint protection installed.', severity: 'High' },
      ],
    },
    {
      id: 'infra',
      name: 'Infrastructure',
      score: 95,
      icon: Server,
      recommendations: [
        { id: 'rec-inf-1', text: 'Patch critical vulnerabilities in public-facing servers.', severity: 'High' },
        { id: 'rec-inf-2', text: 'Restrict network access to management ports.', severity: 'Medium' },
      ],
    },
    {
      id: 'app',
      name: 'Application',
      score: 89,
      icon: ToyBrick,
      recommendations: [
        { id: 'rec-app-1', text: 'Conduct regular static application security testing (SAST).', severity: 'Medium' },
      ],
    },
  ],
};

// --- HELPER COMPONENTS ---
const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-400';
    if (s >= 80) return 'text-yellow-400';
    if (s >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeLinecap="round"
          className={getScoreColor(score)}
          transform="rotate(-90 60 60)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'circOut' }}
        />
      </svg>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center"
      >
        <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <p className="text-xs text-muted-foreground">Overall Score</p>
      </motion.div>
    </div>
  );
};

const TrendIcon: React.FC<{ trend: Trend }> = ({ trend }) => {
  const trendInfo = {
    up: { icon: ArrowUp, color: 'text-green-500' },
    down: { icon: ArrowDown, color: 'text-red-500' },
    stable: { icon: Minus, color: 'text-gray-500' },
  };
  const Icon = trendInfo[trend].icon;
  return <Icon className={`w-5 h-5 ${trendInfo[trend].color}`} />;
};

const SeverityBadge: React.FC<{ severity: 'High' | 'Medium' | 'Low' }> = ({ severity }) => {
  const severityClasses = {
    High: 'bg-red-900/50 text-red-300 border-red-700/50',
    Medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
    Low: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  };
  return <Badge variant="outline" className={cn('text-xs', severityClasses[severity])}>{severity}</Badge>;
};

// --- MAIN COMPONENT ---
export default function SecurityScorecard() {
  const [data] = useState<SecurityData>(mockData);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(data.categories[0].id);

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-400';
    if (s >= 80) return 'text-yellow-400';
    if (s >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const selectedCategory = useMemo(
    () => data.categories.find(c => c.id === selectedCategoryId),
    [data.categories, selectedCategoryId]
  );

  const allRecommendations = useMemo(
    () => data.categories.flatMap(c => c.recommendations),
    [data.categories]
  );

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-400';
    if (grade.startsWith('B')) return 'text-yellow-400';
    if (grade.startsWith('C')) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-background text-foreground p-4 font-sans">
      <Card className="w-full max-w-4xl mx-auto bg-card border-border">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Shield className="w-6 h-6 mr-3 text-primary" />
                Security Posture Scorecard
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Last assessment on {new Date(data.lastAssessed).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className={`text-5xl font-bold ${getGradeColor(data.grade)}`}>{data.grade}</p>
                <p className="text-xs text-muted-foreground">Grade</p>
              </div>
              <TrendIcon trend={data.trend} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col items-center space-y-6">
            <ScoreGauge score={data.overallScore} />
            <div className="w-full space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Industry Benchmark</p>
                <div className="flex items-center justify-center space-x-2 mt-1">
                  <p className={`text-lg font-semibold ${getGradeColor(data.grade)}`}>{data.overallScore}</p>
                  <div className="w-20 h-2 bg-muted rounded-full relative">
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${data.benchmarkScore}%` }}></div>
                    <div className="absolute top-0 h-2 w-px bg-foreground" style={{ left: `${data.overallScore}%` }}></div>
                  </div>
                  <p className="text-lg font-semibold text-blue-400">{data.benchmarkScore}</p>
                </div>
              </div>
              <Separator />
              <div className="w-full space-y-2">
                {data.categories.map(category => (
                  <motion.button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={cn(
                      'w-full flex items-center p-3 rounded-lg transition-colors text-left',
                      selectedCategoryId === category.id
                        ? 'bg-muted text-foreground'
                        : 'hover:bg-muted/50 text-muted-foreground'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {React.createElement(category.icon, { className: 'w-5 h-5 mr-3' })}
                    <span className="flex-grow font-medium">{category.name}</span>
                    <span className={`font-semibold ${getScoreColor(category.score)}`}>{category.score}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-muted/30 p-4 rounded-lg">
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />
              Improvement Recommendations
            </h3>
            <div className="relative h-[420px] overflow-y-auto pr-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategoryId || 'all'}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ul className="space-y-3">
                    {(selectedCategory ? selectedCategory.recommendations : allRecommendations).map((rec) => (
                      <li key={rec.id} className="bg-background/50 p-3 rounded-md border border-border/50 flex items-start space-x-3">
                        <div className="flex-shrink-0 pt-1">
                          <SeverityBadge severity={rec.severity} />
                        </div>
                        <p className="text-sm text-foreground/90">{rec.text}</p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
