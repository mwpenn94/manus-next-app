import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, Search, CheckCircle, XCircle, Clock, AlertCircle, CalendarDays, BarChart, GitCommit, FileText, TrendingUp, AlertTriangle, Timer, Tag, Zap, BrainCircuit } from "lucide-react";

// Type Definitions
type TaskStatus = "completed" | "failed" | "running" | "cancelled";

type TaskAction = {
  id: string;
  name: string;
  type: "tool" | "info" | "error";
  details: string;
};

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  startTime: Date;
  duration: number; // in seconds
  tokenCount: number;
  cost: number; // in USD
  summary: string;
  actions: TaskAction[];
};

// Mock Data
const initialMockTasks: Task[] = [
  {
    id: "task-1",
    title: "Analyze Q1 sales data and generate a report",
    status: "completed",
    startTime: new Date("2024-07-28T10:00:00Z"),
    duration: 125,
    tokenCount: 18000,
    cost: 0.054,
    summary: "Successfully analyzed sales data from Salesforce and generated a comprehensive PDF report highlighting key trends and a 15% increase in YoY growth.",
    actions: [
      { id: "a1", name: "salesforce.query", type: "tool", details: "Queried for Q1 sales records." },
      { id: "a2", name: "data_analysis.summarize", type: "tool", details: "Generated statistical summary." },
      { id: "a3", name: "file.write", type: "tool", details: "Wrote analysis to report.pdf." },
    ],
  },
  {
    id: "task-2",
    title: "Draft a marketing email for the new product launch",
    status: "completed",
    startTime: new Date("2024-07-28T11:30:00Z"),
    duration: 45,
    tokenCount: 5200,
    cost: 0.0156,
    summary: "Drafted a compelling marketing email for the 'Project Phoenix' launch, including three subject line variations and a clear call-to-action.",
    actions: [
        { id: "a1", name: "creative_writing.draft", type: "tool", details: "Generated email body." },
        { id: "a2", name: "creative_writing.variants", type: "tool", details: "Created 3 subject lines." },
    ],
  },
  {
    id: "task-3",
    title: "Fix the authentication bug in the user dashboard",
    status: "failed",
    startTime: new Date("2024-07-27T14:00:00Z"),
    duration: 180,
    tokenCount: 25000,
    cost: 0.075,
    summary: "Attempted to patch the authentication flow but encountered an upstream API dependency failure, preventing successful resolution. The external service was unresponsive.",
    actions: [
        { id: "a1", name: "github.read_file", type: "tool", details: "Read `auth.ts`." },
        { id: "a2", name: "api.call", type: "error", details: "External auth provider API timed out." },
    ],
  },
  {
    id: "task-4",
    title: "Deploying the new feature branch to staging",
    status: "running",
    startTime: new Date(Date.now() - 1000 * 240),
    duration: 240,
    tokenCount: 12000,
    cost: 0.036,
    summary: "Deployment process initiated. Building the container, running tests, and pushing to the staging environment. Currently on step 2 of 4.",
    actions: [
        { id: "a1", name: "git.pull", type: "tool", details: "Pulled latest from `feature/new-ui`." },
        { id: "a2", name: "docker.build", type: "info", details: "Container build in progress..." },
    ],
  },
  {
    id: "task-5",
    title: "Research competitor API documentation",
    status: "completed",
    startTime: new Date("2024-07-27T09:00:00Z"),
    duration: 300,
    tokenCount: 45000,
    cost: 0.135,
    summary: "Conducted a deep-dive into three competitors' API documentation. Extracted key endpoints, authentication methods, and rate limits. A summary has been saved to a markdown file.",
    actions: [
        { id: "a1", name: "web.browse", type: "tool", details: "Visited competitor A's dev portal." },
        { id: "a2", name: "web.browse", type: "tool", details: "Visited competitor B's dev portal." },
        { id: "a3", name: "web.browse", type: "tool", details: "Visited competitor C's dev portal." },
        { id: "a4", name: "file.write", type: "tool", details: "Saved findings to `competitor_api_research.md`." },
    ],
  },
  {
    id: "task-6",
    title: "Generate a logo for the new 'Aquila' project",
    status: "cancelled",
    startTime: new Date("2024-07-26T16:20:00Z"),
    duration: 25,
    tokenCount: 3000,
    cost: 0.009,
    summary: "Task was cancelled by the user before completion. Initial concepts were being explored.",
    actions: [
        { id: "a1", name: "image.generate", type: "info", details: "Generating initial logo concepts..." },
    ],
  },
  {
    id: "task-7",
    title: "Summarize the latest financial news",
    status: "completed",
    startTime: new Date("2024-07-26T08:00:00Z"),
    duration: 90,
    tokenCount: 15000,
    cost: 0.045,
    summary: "Aggregated and summarized top 5 financial news stories from major outlets. Key themes include inflation concerns and tech sector performance.",
    actions: [
        { id: "a1", name: "news.search", type: "tool", details: "Searched for 'financial news'." },
        { id: "a2", name: "web.read", type: "tool", details: "Read 3 articles." },
        { id: "a3", name: "summarize.text", type: "tool", details: "Generated summary." },
    ],
  },
  {
    id: "task-8",
    title: "Refactor the database schema migration script",
    status: "running",
    startTime: new Date(Date.now() - 1000 * 600),
    duration: 600,
    tokenCount: 8000,
    cost: 0.024,
    summary: "Analyzing the existing migration script to identify performance bottlenecks. Planning to optimize query efficiency and add transaction support.",
    actions: [
        { id: "a1", name: "file.read", type: "tool", details: "Reading `V2__update_schema.sql`." },
    ],
  },
  {
    id: "task-9",
    title: "Create a presentation for the weekly sync",
    status: "completed",
    startTime: new Date("2024-07-25T15:00:00Z"),
    duration: 210,
    tokenCount: 32000,
    cost: 0.096,
    summary: "Generated a 10-slide presentation covering project updates, blockers, and next steps. The presentation is ready for review.",
    actions: [
        { id: "a1", name: "slides.create", type: "tool", details: "Created a new presentation." },
        { id: "a2", name: "slides.add_content", type: "tool", details: "Added content for 10 slides." },
    ],
  },
  {
    id: "task-10",
    title: "Translate user documentation from English to Spanish",
    status: "failed",
    startTime: new Date("2024-07-25T10:00:00Z"),
    duration: 300,
    tokenCount: 50000,
    cost: 0.15,
    summary: "Translation process failed due to an unsupported language pair in the translation model. The model returned an error and could not proceed.",
    actions: [
        { id: "a1", name: "file.read", type: "tool", details: "Read `docs/guide.md`." },
        { id: "a2", name: "translation.run", type: "error", details: "Model error: unsupported language pair 'en-es'." },
    ],
  },
  {
    id: "task-11",
    title: "Onboard new user 'alex@example.com'",
    status: "completed",
    startTime: new Date("2024-07-24T13:00:00Z"),
    duration: 15,
    tokenCount: 2000,
    cost: 0.006,
    summary: "Successfully created a new user account for alex@example.com and sent a welcome email.",
    actions: [
        { id: "a1", name: "user.create", type: "tool", details: "Created user in database." },
        { id: "a2", name: "email.send", type: "tool", details: "Sent welcome email." },
    ],
  },
  {
    id: "task-12",
    title: "Analyze server logs for 404 errors",
    status: "cancelled",
    startTime: new Date("2024-07-24T11:00:00Z"),
    duration: 60,
    tokenCount: 7500,
    cost: 0.0225,
    summary: "Task was cancelled. It had started analyzing the logs from the past 24 hours.",
    actions: [
        { id: "a1", name: "logs.stream", type: "info", details: "Streaming logs from production server..." },
    ],
  }
];

const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: "text-oklch(65% 0.2 130)",
    bgColor: "bg-oklch(65% 0.2 130 / 0.1)",
    timelineColor: "bg-oklch(65% 0.2 130)",
  },
  failed: {
    icon: XCircle,
    color: "text-oklch(65% 0.25 25)",
    bgColor: "bg-oklch(65% 0.25 25 / 0.1)",
    timelineColor: "bg-oklch(65% 0.25 25)",
  },
  running: {
    icon: Clock,
    color: "text-oklch(65% 0.2 250)",
    bgColor: "bg-oklch(65% 0.2 250 / 0.1)",
    timelineColor: "bg-oklch(65% 0.2 250)",
  },
  cancelled: {
    icon: AlertCircle,
    color: "text-oklch(60% 0.02 255)",
    bgColor: "bg-oklch(60% 0.02 255 / 0.1)",
    timelineColor: "bg-oklch(60% 0.02 255)",
  },
};

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
  <Card className="bg-white/80 dark:bg-black/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300 border border-white/20">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-oklch(50% 0.02 255) dark:text-oklch(80% 0.02 255)">{title}</CardTitle>
      <Icon className="h-4 w-4 text-oklch(60% 0.02 255) dark:text-oklch(70% 0.02 255)" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-oklch(30% 0.02 255) dark:text-oklch(95% 0.02 255)">{value}</div>
    </CardContent>
  </Card>
);

const formatDuration = (seconds: number): string => {
  if (seconds < 0) return `0s`;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const TaskItem = ({ task, onToggle, isExpanded }: { task: Task, onToggle: (id: string) => void, isExpanded: boolean }) => {
  const StatusIcon = statusConfig[task.status].icon;

  return (
    <div className="relative pl-8 ml-4">
      <div className={cn("absolute left-[-1px] top-5 h-[calc(100%_-_2rem)] w-0.5", statusConfig[task.status].timelineColor)} />
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="mb-6"
      >
        <Card
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg border-l-4",
            isExpanded ? "shadow-xl -translate-x-2" : "shadow-md",
            statusConfig[task.status].bgColor
          )}
          style={{ borderColor: `oklch(${statusConfig[task.status].color.match(/oklch\(([^)]+)\)/)?.[1] || ""})` }}
        >
          <div className="p-4 cursor-pointer" onClick={() => onToggle(task.id)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className={cn("mt-1 h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center", statusConfig[task.status].bgColor)}>
                    <StatusIcon className={cn("h-4 w-4", statusConfig[task.status].color, task.status === 'running' && 'animate-spin-slow')} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-oklch(30% 0.02 255) dark:text-oklch(95% 0.02 255) truncate pr-2" title={task.title}>{task.title}</h3>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-oklch(50% 0.02 255) dark:text-oklch(70% 0.02 255) mt-1.5">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1"><Timer className="h-3 w-3" /> {formatDuration(task.duration)}</TooltipTrigger>
                      <TooltipContent><p>Task Duration</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1"><BrainCircuit className="h-3 w-3" /> {task.tokenCount.toLocaleString()} tokens</TooltipTrigger>
                      <TooltipContent><p>Token Usage</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> ${task.cost.toFixed(4)}</TooltipTrigger>
                      <TooltipContent><p>Estimated Cost</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <Badge variant="outline" className={cn("capitalize border text-xs", statusConfig[task.status].color, statusConfig[task.status].bgColor.replace('bg-', 'border-'))}>{task.status}</Badge>
                <ChevronDown className={cn("h-5 w-5 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
              </div>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1, transition: { height: { duration: 0.4, ease: "easeInOut" }, opacity: { duration: 0.3, delay: 0.1 } } }}
                exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.4, ease: "easeInOut" }, opacity: { duration: 0.2 } } }}
                className="overflow-hidden"
              >
                <Separator />
                <div className="p-4 bg-white/50 dark:bg-black/20">
                  <p className="text-sm text-oklch(40% 0.02 255) dark:text-oklch(85% 0.02 255) mb-4">{task.summary}</p>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-oklch(50% 0.02 255) dark:text-oklch(70% 0.02 255) mb-2">Key Actions</h4>
                  <ScrollArea className="h-32 pr-4">
                    <div className="space-y-2">
                      {task.actions.map(action => (
                        <div key={action.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-oklch(95% 0.01 255) dark:bg-black/20">
                          {action.type === 'tool' && <Tooltip><TooltipTrigger><Zap className="h-3 w-3 text-blue-500" /></TooltipTrigger><TooltipContent><p>Tool Call</p></TooltipContent></Tooltip>}
                          {action.type === 'info' && <Tooltip><TooltipTrigger><FileText className="h-3 w-3 text-gray-500" /></TooltipTrigger><TooltipContent><p>Information</p></TooltipContent></Tooltip>}
                          {action.type === 'error' && <Tooltip><TooltipTrigger><AlertTriangle className="h-3 w-3 text-red-500" /></TooltipTrigger><TooltipContent><p>Error</p></TooltipContent></Tooltip>}
                          <span className="font-mono text-oklch(40% 0.02 255) dark:text-oklch(85% 0.02 255)">{action.name}</span>
                          <span className="text-oklch(50% 0.02 255) dark:text-oklch(70% 0.02 255) truncate flex-1" title={action.details}>{action.details}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

export default function TaskHistoryTimeline() {
  const [tasks, setTasks] = useState<Task[]>(initialMockTasks);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(currentTasks =>
        currentTasks.map(task =>
          task.status === 'running'
            ? { ...task, duration: (Date.now() - task.startTime.getTime()) / 1000 }
            : task
        )
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleExpand = useCallback((taskId: string) => {
    setExpandedTaskId(prevId => (prevId === taskId ? null : taskId));
  }, []);

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks
      .filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(task =>
        statusFilter === "all" ? true : task.status === statusFilter
      );

    return filtered.sort((a, b) => {
      const [key, direction] = sortOrder.split('-');
      const dir = direction === 'asc' ? 1 : -1;
      switch (key) {
        case 'date':
          return (a.startTime.getTime() - b.startTime.getTime()) * dir;
        case 'duration':
          return (a.duration - b.duration) * dir;
        case 'cost':
          return (a.cost - b.cost) * dir;
        default:
          return 0;
      }
    });
  }, [tasks, searchTerm, statusFilter, sortOrder]);

  const groupedTasks = useMemo(() => {
    const groups = filteredAndSortedTasks.reduce((acc, task) => {
      const date = task.startTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());

  }, [filteredAndSortedTasks]);

  const stats = useMemo(() => {
    const totalTasks = initialMockTasks.length;
    const completedTasks = initialMockTasks.filter(t => t.status === 'completed').length;
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const totalDuration = initialMockTasks.reduce((sum, t) => sum + t.duration, 0);
    const avgDuration = totalTasks > 0 ? totalDuration / totalTasks : 0;
    const totalCost = initialMockTasks.reduce((sum, t) => sum + t.cost, 0);
    return {
      totalTasks,
      successRate: `${successRate.toFixed(1)}%`,
      avgDuration: formatDuration(avgDuration),
      totalCost: `$${totalCost.toFixed(3)}`,
    };
  }, []);

  return (
    <TooltipProvider>
      <div className="bg-oklch(98.5% 0.01 255) dark:bg-oklch(15% 0.02 255) text-oklch(40% 0.02 255) dark:text-oklch(90% 0.02 255) font-sans min-h-screen p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-oklch(20% 0.02 255) dark:text-oklch(95% 0.02 255) mb-4">Task History</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Tasks" value={stats.totalTasks} icon={BarChart} />
            <StatCard title="Success Rate" value={stats.successRate} icon={CheckCircle} />
            <StatCard title="Avg. Duration" value={stats.avgDuration} icon={Timer} />
            <StatCard title="Total Cost" value={stats.totalCost} icon={TrendingUp} />
          </div>
        </header>

        <Card className="mb-8 bg-white/60 dark:bg-black/30 backdrop-blur-lg shadow-md sticky top-4 z-20 border border-white/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-auto sm:flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by task title..."
                className="pl-10 w-full bg-white/50 dark:bg-black/20 border-white/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-white/50 dark:bg-black/20 border-white/30">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-white/50 dark:bg-black/20 border-white/30">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date-desc">Newest First</SelectItem>
                        <SelectItem value="date-asc">Oldest First</SelectItem>
                        <SelectItem value="duration-desc">Longest First</SelectItem>
                        <SelectItem value="duration-asc">Shortest First</SelectItem>
                        <SelectItem value="cost-desc">Highest Cost</SelectItem>
                        <SelectItem value="cost-asc">Lowest Cost</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <div className="absolute left-4 top-4 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" />
          <AnimatePresence mode="sync">
            {groupedTasks.length > 0 ? (
              groupedTasks.map(([date, tasksInGroup]) => (
                <motion.div 
                  key={date} 
                  layout
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="relative mb-8"
                >
                  <div className="flex items-center mb-4 z-10 relative pl-0.5">
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-8 ring-oklch(98.5% 0.01 255) dark:ring-oklch(15% 0.02 255)">
                      <CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <h2 className="ml-4 font-semibold text-gray-700 dark:text-gray-300">{date}</h2>
                  </div>
                  <div className="ml-0">
                    <AnimatePresence>
                      {tasksInGroup.map(task => (
                        <TaskItem key={task.id} task={task} onToggle={handleToggleExpand} isExpanded={expandedTaskId === task.id} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-gray-500 dark:text-gray-400">
                <p className="mb-2 text-lg font-semibold">No tasks found</p>
                <p className="text-sm">Try adjusting your search or filters.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
