import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  Timer,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  Globe,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCw,
  Zap,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/** Get the user's IANA timezone string */
function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Format a date in the user's local timezone with explicit TZ label */
function formatLocalTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const tz = getUserTimezone();
  return d.toLocaleString(undefined, {
    timeZone: tz,
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Get a short timezone abbreviation (e.g., "MST", "EST") */
function getTimezoneAbbr(): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date());
    return parts.find(p => p.type === "timeZoneName")?.value ?? getUserTimezone();
  } catch {
    return getUserTimezone();
  }
}

export default function SchedulePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [scheduleType, setScheduleType] = useState<"cron" | "interval">("interval");
  const [cronExpression, setCronExpression] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [repeat, setRepeat] = useState(true);

  const timezone = useMemo(() => getUserTimezone(), []);
  const tzAbbr = useMemo(() => getTimezoneAbbr(), []);

  const schedulesQuery = trpc.schedule.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000, // Auto-refresh every 30s to show status updates
  });

  const createMutation = trpc.schedule.create.useMutation({
    onSuccess: () => {
      toast.success("Schedule created");
      setShowCreate(false);
      setName("");
      setPrompt("");
      schedulesQuery.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const toggleMutation = trpc.schedule.toggle.useMutation({
    onSuccess: () => { schedulesQuery.refetch(); },
    onError: (err) => { toast.error("Toggle failed: " + err.message); },
  });

  const deleteMutation = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      schedulesQuery.refetch();
    },
    onError: (err) => { toast.error("Delete failed: " + err.message); },
  });

  const executeMutation = trpc.automation.execute.useMutation({
    onSuccess: () => {
      toast.success("Schedule executed manually");
      schedulesQuery.refetch();
    },
    onError: (err) => { toast.error("Execute failed: " + err.message); },
  });

  const [expandedScheduleId, setExpandedScheduleId] = useState<number | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Clock className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Sign in to manage scheduled tasks</p>
        <Button size="lg" className="min-h-[44px] px-8" onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
      </div>
    );
  }

  const schedules = schedulesQuery.data ?? [];

  const handleCreate = () => {
    if (!name.trim() || !prompt.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      prompt: prompt.trim(),
      scheduleType,
      cronExpression: scheduleType === "cron" ? cronExpression : undefined,
      intervalSeconds: scheduleType === "interval" ? intervalMinutes * 60 : undefined,
      repeat,
    });
  };

  // Count failed schedules for notification badge
  const failedCount = schedules.filter(s => s.lastStatus === "error").length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Scheduled Tasks
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">
                Automate recurring tasks with cron or interval schedules
              </p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {tzAbbr}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {failedCount > 0 && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-red-500/10 text-red-500 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {failedCount} failed
              </span>
            )}
            <Button onClick={() => setShowCreate(!showCreate)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Schedule
            </Button>
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <Card className="mb-6 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Create Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Schedule name (e.g., Daily Market Report)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Textarea
                placeholder="Task prompt — what should the agent do?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />

              {/* Schedule Type */}
              <div className="flex gap-2">
                <Button
                  variant={scheduleType === "interval" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScheduleType("interval")}
                >
                  <Timer className="w-3.5 h-3.5 mr-1" />
                  Interval
                </Button>
                <Button
                  variant={scheduleType === "cron" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScheduleType("cron")}
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  Cron
                </Button>
              </div>

              {scheduleType === "interval" ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Every</span>
                  <Input
                    type="number"
                    min={1}
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              ) : (
                <div>
                  <Input
                    placeholder="Cron expression (e.g., 0 0 9 * * 1-5)"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    6-field format: seconds minutes hours day-of-month month day-of-week
                    <span className="ml-1 text-muted-foreground/60">
                      (times are in your local timezone: {timezone})
                    </span>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={repeat}
                  onChange={(e) => setRepeat(e.target.checked)}
                  id="repeat"
                  className="rounded"
                />
                <label htmlFor="repeat" className="text-sm text-muted-foreground">
                  Repeat after each execution
                </label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createMutation.isPending || !name.trim() || !prompt.trim()}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Create
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule List */}
        {schedulesQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-7 h-7 text-primary" />}
            title="No scheduled tasks yet"
            description="Create a schedule to automate recurring tasks. Schedules run on a cron or interval basis."
          />
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card
                key={schedule.id}
                className={`${!schedule.enabled ? "opacity-60" : ""} ${
                  schedule.lastStatus === "error" ? "border-red-500/30" : ""
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">{schedule.name}</h3>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            schedule.enabled
                              ? "bg-green-500/10 text-green-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {schedule.enabled ? "Active" : "Paused"}
                        </span>
                        {schedule.lastStatus && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                              schedule.lastStatus === "success"
                                ? "bg-blue-500/10 text-blue-500"
                                : schedule.lastStatus === "error"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            }`}
                          >
                            {schedule.lastStatus === "success" && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {schedule.lastStatus === "error" && <XCircle className="w-2.5 h-2.5" />}
                            {schedule.lastStatus === "running" && <RotateCw className="w-2.5 h-2.5 animate-spin" />}
                            {schedule.lastStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {schedule.prompt}
                      </p>

                      {/* Failure notification banner */}
                      {schedule.lastStatus === "error" && (
                        <div className="mt-2 px-2.5 py-1.5 bg-red-500/5 border border-red-500/20 rounded-md flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <p className="text-xs text-red-400">
                            Last execution failed. Check task history for details.
                            {schedule.enabled && " The schedule will retry at the next scheduled time."}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        {schedule.scheduleType === "cron" ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {schedule.cronExpression}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            Every {Math.round((schedule.intervalSeconds ?? 0) / 60)} min
                          </span>
                        )}
                        {schedule.runCount > 0 && (
                          <span>Runs: {schedule.runCount}</span>
                        )}
                        {schedule.lastRunAt && (
                          <span title={`Last run: ${new Date(schedule.lastRunAt).toISOString()}`}>
                            Last: {formatLocalTime(schedule.lastRunAt)}
                          </span>
                        )}
                        {schedule.nextRunAt && schedule.enabled && (
                          <span
                            className="text-primary/70"
                            title={`Next run: ${new Date(schedule.nextRunAt).toISOString()}`}
                          >
                            Next: {formatLocalTime(schedule.nextRunAt)} {tzAbbr}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary"
                        onClick={() => executeMutation.mutate({ id: schedule.id })}
                        disabled={executeMutation.isPending}
                        title="Execute Now"
                      >
                        {executeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleMutation.mutate({ id: schedule.id })}
                        title={schedule.enabled ? "Pause" : "Resume"}
                      >
                        {schedule.enabled ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedScheduleId(expandedScheduleId === schedule.id ? null : schedule.id)}
                        title="Execution History"
                      >
                        {expandedScheduleId === schedule.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <History className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this schedule?")) {
                            deleteMutation.mutate({ id: schedule.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Execution History Panel */}
                  {expandedScheduleId === schedule.id && (
                    <ScheduleExecutionHistory scheduleId={schedule.id} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">How scheduling works</p>
              <p>
                Scheduled tasks run automatically at the specified interval or cron time.
                Each execution creates a new task with the specified prompt. The scheduler
                checks for due tasks every minute. Minimum interval is 1 minute.
              </p>
              <p className="mt-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                All times shown in your local timezone: <strong>{timezone}</strong> ({tzAbbr})
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EXECUTION HISTORY PANEL
   ═══════════════════════════════════════════════════════ */
function ScheduleExecutionHistory({ scheduleId }: { scheduleId: number }) {
  const historyQuery = trpc.automation.getExecutionHistory.useQuery(
    { scheduleId },
    { refetchInterval: 10_000 }
  );

  if (historyQuery.isLoading) {
    return (
      <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading execution history...
      </div>
    );
  }

  const executions = historyQuery.data ?? [];

  if (executions.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-border/60">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <History className="w-3 h-3" />
          No execution history yet
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <History className="w-3 h-3" />
        Execution History ({executions.length})
      </p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {executions.map((exec: any) => (
          <div
            key={exec.id}
            className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-muted/30"
          >
            <div className="flex items-center gap-2">
              {exec.status === "success" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              {exec.status === "error" && <XCircle className="w-3 h-3 text-red-500" />}
              {exec.status === "running" && <RotateCw className="w-3 h-3 text-blue-500 animate-spin" />}
              {exec.status === "pending" && <Clock className="w-3 h-3 text-amber-500" />}
              <span className="capitalize">{exec.status}</span>
              <span className="text-muted-foreground">
                {exec.triggerType === "manual" ? "Manual" : "Scheduled"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              {exec.durationMs && (
                <span>{(exec.durationMs / 1000).toFixed(1)}s</span>
              )}
              <span>{formatLocalTime(exec.startedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
