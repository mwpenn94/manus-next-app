import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Timer,
  Play,
  Pause,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function SchedulePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [scheduleType, setScheduleType] = useState<"cron" | "interval">("interval");
  const [cronExpression, setCronExpression] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [repeat, setRepeat] = useState(true);

  const schedulesQuery = trpc.schedule.list.useQuery(undefined, {
    enabled: isAuthenticated,
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
  });

  const deleteMutation = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      schedulesQuery.refetch();
    },
  });

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
        <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Scheduled Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automate recurring tasks with cron or interval schedules
            </p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Schedule
          </Button>
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
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No scheduled tasks yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a schedule to automate recurring tasks
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className={!schedule.enabled ? "opacity-60" : ""}>
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
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              schedule.lastStatus === "success"
                                ? "bg-blue-500/10 text-blue-500"
                                : schedule.lastStatus === "error"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            }`}
                          >
                            {schedule.lastStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {schedule.prompt}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
                          <span>Last: {new Date(schedule.lastRunAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
