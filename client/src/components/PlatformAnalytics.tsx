import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, FileDown, Globe, TrendingUp, Users, Zap, DollarSign, Percent } from 'lucide-react';

// Type definitions
type DailyMetric = {
  date: string;
  dau: number;
  mau: number;
  retention: number;
  revenue: number;
  newUsers: number;
};

type FeatureAdoption = {
  name: string;
  users: number;
};

type GeoData = {
  region: string;
  users: number;
};

type SessionDuration = {
  bucket: string;
  count: number;
};

type TopFeature = {
  name: string;
  usage: number;
};

// Mock Data
const generateAnalyticsData = (days: number): DailyMetric[] => {
  const data: DailyMetric[] = [];
  let mau = 150000;
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dau = mau * (0.3 + Math.random() * 0.1);
    data.push({
      date: date.toISOString().split('T')[0],
      dau: Math.floor(dau),
      mau: Math.floor(mau),
      retention: 0.45 + Math.random() * 0.1,
      revenue: dau * (0.05 + Math.random() * 0.02),
      newUsers: Math.floor(dau * (0.05 + Math.random() * 0.05)),
    });
    mau *= (1 + (Math.random() - 0.48) * 0.02);
  }
  return data;
};

const ALL_DATA = generateAnalyticsData(90);

const featureAdoptionData: FeatureAdoption[] = [
  { name: 'Signed Up', users: 25000 },
  { name: 'Activated Profile', users: 20000 },
  { name: 'Used Feature A', users: 15000 },
  { name: 'Used Feature B', users: 10000 },
  { name: 'Upgraded', users: 5000 },
];

const geoData: GeoData[] = [
  { region: 'NA', users: 120000 },
  { region: 'EU', users: 85000 },
  { region: 'APAC', users: 55000 },
  { region: 'LATAM', users: 30000 },
  { region: 'MEA', users: 15000 },
  { region: 'Other', users: 5000 },
];

const sessionDurationData: SessionDuration[] = [
  { bucket: '0-5m', count: 1200 },
  { bucket: '5-15m', count: 2500 },
  { bucket: '15-30m', count: 1800 },
  { bucket: '30-60m', count: 900 },
  { bucket: '>60m', count: 300 },
];

const topFeaturesData: TopFeature[] = [
  { name: 'Dashboard', usage: 150000 },
  { name: 'Real-time Collaboration', usage: 120000 },
  { name: 'Platform Intelligence', usage: 95000 },
  { name: 'Automated Workflows', usage: 75000 },
  { name: 'API Integration', usage: 50000 },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const MetricCard = ({ title, value, icon, prefix, suffix }: { title: string; value: string; icon: React.ReactNode; prefix?: string; suffix?: string; }) => (
  <motion.div variants={cardVariants}>
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {prefix}{value}{suffix}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const UserGrowthChart = ({ data }: { data: DailyMetric[] }) => {
  const width = 500;
  const height = 250;
  const padding = 40;

  const maxValue = useMemo(() => Math.max(...data.map(d => d.newUsers)), [data]);
  const xScale = (index: number) => padding + (index / (data.length - 1)) * (width - padding * 2);
  const yScale = (value: number) => height - padding - (value / maxValue) * (height - padding * 2);

  const pathData = useMemo(() => {
    if (data.length === 0) return "";
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.newUsers)}`).join(' ');
  }, [data, maxValue]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <AnimatePresence>
        <motion.path
          d={pathData}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </AnimatePresence>
      {data.map((d, i) => (
        <g key={i}>
          <text x={xScale(i)} y={height - padding / 2} textAnchor="middle" className="text-xs fill-muted-foreground">
            {i % Math.floor(data.length / 6) === 0 ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          </text>
        </g>
      ))}
      <text x={padding / 2} y={padding} textAnchor="start" className="text-xs fill-muted-foreground">{maxValue}</text>
      <text x={padding / 2} y={height - padding} textAnchor="start" className="text-xs fill-muted-foreground">0</text>
    </svg>
  );
};

const FeatureAdoptionFunnel = ({ data }: { data: FeatureAdoption[] }) => {
  const maxUsers = data[0]?.users || 1;
  return (
    <div className="w-full h-full flex flex-col justify-center items-center space-y-1">
      {data.map((item, index) => {
        const widthPercentage = (item.users / maxUsers) * 100;
        return (
          <motion.div
            key={item.name}
            className="relative h-8 bg-primary/20 flex items-center justify-center"
            style={{ width: `${widthPercentage}%` }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <span className="text-xs font-medium text-foreground z-10 truncate px-2">{item.name}</span>
            <span className="absolute right-2 text-xs font-bold text-primary-foreground">{item.users.toLocaleString()}</span>
          </motion.div>
        );
      })}
    </div>
  );
};

const GeoDistributionMap = ({ data }: { data: GeoData[] }) => {
  const totalUsers = useMemo(() => data.reduce((sum, item) => sum + item.users, 0), [data]);
  const colors = ['bg-primary/90', 'bg-primary/70', 'bg-primary/50', 'bg-primary/30', 'bg-primary/20', 'bg-primary/10'];

  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-2 w-full h-full p-4">
      {data.map((item, index) => (
        <motion.div
          key={item.region}
          className={`flex flex-col items-center justify-center p-2 rounded-lg ${colors[index % colors.length]}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="font-bold text-lg text-primary-foreground">{item.region}</div>
          <div className="text-sm text-primary-foreground/80">{((item.users / totalUsers) * 100).toFixed(1)}%</div>
        </motion.div>
      ))}
    </div>
  );
};

const SessionDurationHistogram = ({ data }: { data: SessionDuration[] }) => {
  const maxCount = useMemo(() => Math.max(...data.map(d => d.count)), [data]);
  return (
    <div className="flex justify-around items-end w-full h-full pt-4 px-2">
      {data.map((item, index) => (
        <div key={item.bucket} className="flex flex-col items-center space-y-1 w-1/5">
          <motion.div
            className="w-full bg-primary rounded-t-sm"
            initial={{ height: 0 }}
            animate={{ height: `${(item.count / maxCount) * 100}%` }}
            transition={{ delay: index * 0.1, type: 'spring', stiffness: 50 }}
          />
          <span className="text-xs text-muted-foreground">{item.bucket}</span>
        </div>
      ))}
    </div>
  );
};

export default function PlatformAnalytics() {
  const [timeRange, setTimeRange] = useState<string>('30');

  const analyticsData = useMemo(() => {
    const days = parseInt(timeRange, 10);
    return ALL_DATA.slice(-days);
  }, [timeRange]);

  const metrics = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) return { dau: 0, mau: 0, retention: 0, revenue: 0 };
    const latest = analyticsData[analyticsData.length - 1];
    return {
      dau: latest.dau,
      mau: latest.mau,
      retention: latest.retention,
      revenue: analyticsData.reduce((sum, d) => sum + d.revenue, 0),
    };
  }, [analyticsData]);

  const handleExport = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ metrics, analyticsData }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "platform_analytics.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, [metrics, analyticsData]);

  return (
    <div className="bg-background text-foreground min-h-screen p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Platform Analytics</h1>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}><FileDown className="mr-2 h-4 w-4" /> Export Report</Button>
        </div>
      </header>

      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <MetricCard title="Daily Active Users" value={metrics.dau.toLocaleString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Monthly Active Users" value={metrics.mau.toLocaleString()} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Total Revenue" value={metrics.revenue.toLocaleString()} prefix="$" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Retention Rate" value={(metrics.retention * 100).toFixed(1)} suffix="%" icon={<Percent className="h-4 w-4 text-muted-foreground" />} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>User Growth (New Users)</CardTitle></CardHeader>
          <CardContent className="h-[250px]"><UserGrowthChart data={analyticsData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Feature Adoption Funnel</CardTitle></CardHeader>
          <CardContent className="h-[250px]"><FeatureAdoptionFunnel data={featureAdoptionData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Geographic Distribution</CardTitle></CardHeader>
          <CardContent className="h-[250px]"><GeoDistributionMap data={geoData} /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Top Features by Usage</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Usage Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topFeaturesData.map(feature => (
                  <TableRow key={feature.name}>
                    <TableCell className="font-medium">{feature.name}</TableCell>
                    <TableCell className="text-right">{feature.usage.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Session Duration</CardTitle></CardHeader>
          <CardContent className="h-[250px]"><SessionDurationHistogram data={sessionDurationData} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
