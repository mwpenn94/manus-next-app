/**
 * AnalyticsPage — Dashboard analytics with task trends, status breakdown,
 * and performance metrics. Uses recharts for visualizations.
 * Manus-aligned dark theme, consistent with rest of app.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Activity,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const CHART_COLORS = {
  primary: "oklch(0.6565 0.1863 251.8)", /* #1a93fe azure blue */
  completed: "#5eb92d",               /* Manus success green */
  error: "#eb4d4d",                   /* Manus error red */
  pending: "#ffbf36",                 /* Manus warning amber */
  running: "oklch(0.6565 0.1863 251.8)", /* azure blue */
  muted: "oklch(0.40 0 0)",
  grid: "oklch(0.2768 0 0)",            /* matches --border */
  tooltipBg: "oklch(0.2603 0 0)",      /* matches --popover */
};

function formatDuration(ms: number): string {
  if (ms < 1000) return "<1s";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color || CHART_COLORS.primary}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: color || CHART_COLORS.primary }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground mt-0.5">{value}</p>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        )}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 shadow-lg text-sm"
      style={{ backgroundColor: CHART_COLORS.tooltipBg }}
    >
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const statsQuery = trpc.usage.stats.useQuery(undefined, { staleTime: 30_000 });
  const trendsQuery = trpc.usage.taskTrends.useQuery({ days });
  const perfQuery = trpc.usage.performance.useQuery(undefined, { staleTime: 30_000 });
  const strategyQuery = trpc.usage.strategyStats.useQuery(undefined, { staleTime: 30_000 });

  const isLoading = statsQuery.isLoading || trendsQuery.isLoading || perfQuery.isLoading;

  const stats = statsQuery.data;
  const trends = trendsQuery.data ?? [];
  const perf = perfQuery.data;

  // Pie chart data for status breakdown
  const statusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Completed", value: stats.completedTasks ?? 0, color: CHART_COLORS.completed },
      { name: "Running", value: stats.runningTasks ?? 0, color: CHART_COLORS.running },
      { name: "Error", value: stats.errorTasks ?? 0, color: CHART_COLORS.error },
      { name: "Pending", value: (stats.totalTasks ?? 0) - (stats.completedTasks ?? 0) - (stats.runningTasks ?? 0) - (stats.errorTasks ?? 0), color: CHART_COLORS.pending },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Summary totals from trends
  const trendTotals = useMemo(() => {
    let total = 0, completed = 0, errors = 0;
    for (const t of trends) {
      total += t.count;
      completed += t.completed;
      errors += t.errors;
    }
    return { total, completed, errors };
  }, [trends]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Task activity and performance insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  days === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            icon={Activity}
            label="Total Tasks"
            value={String(stats?.totalTasks ?? 0)}
            subtext={`${trendTotals.total} in last ${days} days`}
          />
          <MetricCard
            icon={CheckCircle2}
            label="Completion Rate"
            value={`${((perf?.completionRate ?? 0) * 100).toFixed(1)}%`}
            subtext={`${stats?.completedTasks ?? 0} completed`}
            color={CHART_COLORS.completed}
          />
          <MetricCard
            icon={Clock}
            label="Avg Duration"
            value={formatDuration(perf?.avgDurationMs ?? 0)}
            subtext="Completed tasks only"
            color={CHART_COLORS.pending}
          />
          <MetricCard
            icon={MessageSquare}
            label="Avg Messages/Task"
            value={(perf?.avgMessagesPerTask ?? 0).toFixed(1)}
            subtext={`${perf?.totalMessages ?? 0} total messages`}
            color={CHART_COLORS.primary}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Task Activity Trend — spans 2 cols */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Task Activity
              </h2>
              <span className="text-xs text-muted-foreground">Last {days} days</span>
            </div>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.completed} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.completed} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    stroke={CHART_COLORS.grid}
                    interval={Math.max(0, Math.floor(trends.length / 8) - 1)}
                  />
                  <YAxis
                    tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                    stroke={CHART_COLORS.grid}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Total"
                    stroke={CHART_COLORS.primary}
                    fill="url(#gradTotal)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke={CHART_COLORS.completed}
                    fill="url(#gradCompleted)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No task data for this period
              </div>
            )}
          </div>

          {/* Status Breakdown — 1 col */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-medium text-foreground flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-primary" />
              Status Breakdown
            </h2>
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {statusData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No tasks yet
              </div>
            )}
          </div>
        </div>

        {/* Agent Self-Correction Telemetry */}
        {strategyQuery.data && strategyQuery.data.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6 md:mb-8">
            <h2 className="text-sm font-medium text-foreground flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              Agent Self-Correction Telemetry
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              How effectively the agent recovers when stuck in repetitive loops.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Strategy</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Trigger</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">Uses</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">Resolved</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">Escalated</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">Forced</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium text-xs">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyQuery.data.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-primary" />
                          <span className="font-medium text-foreground">{row.strategyLabel}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{row.triggerPattern}</td>
                      <td className="py-2.5 px-3 text-center text-foreground">{row.totalUses}</td>
                      <td className="py-2.5 px-3 text-center" style={{ color: CHART_COLORS.completed }}>{row.resolvedCount}</td>
                      <td className="py-2.5 px-3 text-center" style={{ color: CHART_COLORS.pending }}>{row.escalatedCount}</td>
                      <td className="py-2.5 px-3 text-center" style={{ color: CHART_COLORS.error }}>{row.forcedFinalCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: row.successRate >= 70 ? `${CHART_COLORS.completed}20` : row.successRate >= 40 ? `${CHART_COLORS.pending}20` : `${CHART_COLORS.error}20`,
                            color: row.successRate >= 70 ? CHART_COLORS.completed : row.successRate >= 40 ? CHART_COLORS.pending : CHART_COLORS.error,
                          }}
                        >
                          {row.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daily Breakdown Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            Daily Breakdown
          </h2>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  stroke={CHART_COLORS.grid}
                  interval={Math.max(0, Math.floor(trends.length / 8) - 1)}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                  stroke={CHART_COLORS.grid}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: CHART_COLORS.muted }}
                />
                <Bar dataKey="completed" name="Completed" fill={CHART_COLORS.completed} radius={[3, 3, 0, 0]} />
                <Bar dataKey="errors" name="Errors" fill={CHART_COLORS.error} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
              No task data for this period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
