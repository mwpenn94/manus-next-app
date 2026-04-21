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
  primary: "oklch(0.72 0.19 250)",
  completed: "#22c55e",
  error: "#ef4444",
  pending: "#f59e0b",
  running: "oklch(0.72 0.19 250)",
  muted: "oklch(0.40 0.01 250)",
  grid: "oklch(0.25 0.01 250)",
  tooltipBg: "oklch(0.18 0.01 250)",
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

  const statsQuery = trpc.usage.stats.useQuery();
  const trendsQuery = trpc.usage.taskTrends.useQuery({ days });
  const perfQuery = trpc.usage.performance.useQuery();

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
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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
          <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Task Activity Trend — spans 2 cols */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
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
