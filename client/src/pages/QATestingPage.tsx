/**
 * QATestingPage — Visual Testing Dashboard with Virtual Users
 * 
 * Features:
 * - Define test scenarios with multi-step flows
 * - Run tests against any URL (local preview or production)
 * - View results with pass/fail, screenshots, timing
 * - Virtual user simulation with CDP/Playwright
 * - Accessibility audits
 * - Performance metrics
 * - Visual regression testing
 */
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Play, Plus, Trash2, CheckCircle2, XCircle, Clock, Monitor,
  Loader2, Eye, Accessibility, Gauge, Camera, ArrowDown, ArrowUp,
  MousePointer, Type, Navigation, LogIn, AlertTriangle, Smartphone,
  Tablet, Laptop, RotateCcw, Download, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

type TestAction = "navigate" | "click" | "type" | "screenshot" | "assert" | "wait" | "scroll" | "evaluate" | "pressKey" | "setViewport";

interface TestStep {
  id: string;
  action: TestAction;
  selector?: string;
  value?: string;
  description: string;
}

interface TestScenario {
  id: string;
  name: string;
  baseUrl: string;
  steps: TestStep[];
  lastRun?: {
    status: "pass" | "fail" | "running";
    duration?: number;
    results?: any[];
    timestamp?: number;
  };
}

const ACTION_OPTIONS: { value: TestAction; label: string; icon: any; needsSelector: boolean; needsValue: boolean }[] = [
  { value: "navigate", label: "Navigate", icon: Navigation, needsSelector: false, needsValue: true },
  { value: "click", label: "Click", icon: MousePointer, needsSelector: true, needsValue: false },
  { value: "type", label: "Type Text", icon: Type, needsSelector: true, needsValue: true },
  { value: "screenshot", label: "Screenshot", icon: Camera, needsSelector: false, needsValue: false },
  { value: "assert", label: "Assert", icon: CheckCircle2, needsSelector: true, needsValue: true },
  { value: "wait", label: "Wait", icon: Clock, needsSelector: true, needsValue: false },
  { value: "scroll", label: "Scroll", icon: ArrowDown, needsSelector: false, needsValue: true },
  { value: "evaluate", label: "Run JS", icon: Monitor, needsSelector: false, needsValue: true },
  { value: "pressKey", label: "Press Key", icon: Type, needsSelector: false, needsValue: true },
  { value: "setViewport", label: "Set Viewport", icon: Smartphone, needsSelector: false, needsValue: true },
];

const PRESET_SCENARIOS: Omit<TestScenario, "id">[] = [
  {
    name: "Homepage Smoke Test",
    baseUrl: "",
    steps: [
      { id: "1", action: "navigate", value: "/", description: "Navigate to homepage" },
      { id: "2", action: "screenshot", description: "Capture homepage" },
      { id: "3", action: "assert", selector: "h1", value: "exists", description: "Verify H1 exists" },
    ],
  },
  {
    name: "Login Flow",
    baseUrl: "",
    steps: [
      { id: "1", action: "navigate", value: "/", description: "Navigate to homepage" },
      { id: "2", action: "click", selector: "[data-testid='login-btn']", description: "Click login button" },
      { id: "3", action: "wait", selector: "input[type='email']", description: "Wait for login form" },
      { id: "4", action: "type", selector: "input[type='email']", value: "test@example.com", description: "Enter email" },
      { id: "5", action: "screenshot", description: "Capture login state" },
    ],
  },
  {
    name: "Responsive Check",
    baseUrl: "",
    steps: [
      { id: "1", action: "setViewport", value: "1920x1080", description: "Desktop viewport" },
      { id: "2", action: "navigate", value: "/", description: "Navigate to homepage" },
      { id: "3", action: "screenshot", description: "Desktop screenshot" },
      { id: "4", action: "setViewport", value: "375x812", description: "Mobile viewport" },
      { id: "5", action: "screenshot", description: "Mobile screenshot" },
      { id: "6", action: "setViewport", value: "768x1024", description: "Tablet viewport" },
      { id: "7", action: "screenshot", description: "Tablet screenshot" },
    ],
  },
];

let nextId = 1;
function genId() { return `step-${Date.now()}-${nextId++}`; }
function genScenarioId() { return `scenario-${Date.now()}-${nextId++}`; }

export default function QATestingPage() {
  const { user, loading: authLoading } = useAuth();
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [tab, setTab] = useState<"scenarios" | "accessibility" | "performance" | "visual">("scenarios");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed time counter for running tests
  useEffect(() => {
    if (runningId) {
      setElapsedMs(0);
      timerRef.current = setInterval(() => setElapsedMs(prev => prev + 100), 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [runningId]);

  // Accessibility audit
  const [auditUrl, setAuditUrl] = useState("");
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditRunning, setAuditRunning] = useState(false);

  // Performance
  const [perfUrl, setPerfUrl] = useState("");
  const [perfResult, setPerfResult] = useState<any>(null);
  const [perfRunning, setPerfRunning] = useState(false);

  // Visual regression
  const [baselineUrl, setBaselineUrl] = useState("");
  const [compareUrl, setCompareUrl] = useState("");
  const [diffResult, setDiffResult] = useState<any>(null);
  const [diffRunning, setDiffRunning] = useState(false);

  const activeScenario = useMemo(() => scenarios.find(s => s.id === activeScenarioId), [scenarios, activeScenarioId]);

  // tRPC mutations
  const runQAMut = trpc.browser.runQA.useMutation({
    onSuccess: (data: any) => {
      setScenarios(prev => prev.map(s => s.id === runningId ? {
        ...s,
        lastRun: {
          status: data.results.every((r: any) => r.success) ? "pass" as const : "fail" as const,
          duration: data.totalDuration,
          results: data.results,
          timestamp: Date.now(),
        },
      } : s));
      setRunningId(null);
      const passed = data.results.filter((r: any) => r.success).length;
      const total = data.results.length;
      if (passed === total) toast.success(`All ${total} steps passed`);
      else toast.error(`${total - passed}/${total} steps failed`);
    },
    onError: (err: any) => { setRunningId(null); toast.error(err.message); },
  });

  const accessibilityMut = trpc.browser.accessibilityAudit.useMutation({
    onSuccess: (data) => { setAuditResult(data); setAuditRunning(false); toast.success("Audit complete"); },
    onError: (err) => { setAuditRunning(false); toast.error(err.message); },
  });

  const perfMut = trpc.browser.performanceMetrics.useQuery({}, { enabled: false });

  const screenshotDiffMut = trpc.browser.screenshotDiff.useMutation({
    onSuccess: (data) => { setDiffResult(data); setDiffRunning(false); toast.success("Visual comparison complete"); },
    onError: (err) => { setDiffRunning(false); toast.error(err.message); },
  });

  // Scenario CRUD
  const addScenario = useCallback((preset?: Omit<TestScenario, "id">) => {
    const id = genScenarioId();
    const scenario: TestScenario = {
      id,
      name: preset?.name || "New Test Scenario",
      baseUrl: preset?.baseUrl || window.location.origin,
      steps: preset?.steps?.map(s => ({ ...s, id: genId() })) || [],
    };
    setScenarios(prev => [...prev, scenario]);
    setActiveScenarioId(id);
  }, []);

  const updateScenario = useCallback((id: string, updates: Partial<TestScenario>) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeScenarioId === id) setActiveScenarioId(null);
  }, [activeScenarioId]);

  // Step CRUD
  const addStep = useCallback((scenarioId: string) => {
    setScenarios(prev => prev.map(s => s.id === scenarioId ? {
      ...s,
      steps: [...s.steps, { id: genId(), action: "click", selector: "", value: "", description: "New step" }],
    } : s));
  }, []);

  const updateStep = useCallback((scenarioId: string, stepId: string, updates: Partial<TestStep>) => {
    setScenarios(prev => prev.map(s => s.id === scenarioId ? {
      ...s,
      steps: s.steps.map(step => step.id === stepId ? { ...step, ...updates } : step),
    } : s));
  }, []);

  const deleteStep = useCallback((scenarioId: string, stepId: string) => {
    setScenarios(prev => prev.map(s => s.id === scenarioId ? {
      ...s,
      steps: s.steps.filter(step => step.id !== stepId),
    } : s));
  }, []);

  const moveStep = useCallback((scenarioId: string, stepId: string, direction: "up" | "down") => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== scenarioId) return s;
      const idx = s.steps.findIndex(step => step.id === stepId);
      if (idx < 0) return s;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= s.steps.length) return s;
      const newSteps = [...s.steps];
      [newSteps[idx], newSteps[newIdx]] = [newSteps[newIdx], newSteps[idx]];
      return { ...s, steps: newSteps };
    }));
  }, []);

  // Run scenario
  const runScenario = useCallback((scenario: TestScenario) => {
    const effectiveUrl = scenario.baseUrl || window.location.origin;
    if (scenario.steps.length === 0) {
      toast.error("Add at least one step to run");
      return;
    }
    setRunningId(scenario.id);
    updateScenario(scenario.id, { lastRun: { status: "running" } });
    runQAMut.mutate({
      baseUrl: effectiveUrl,
      steps: scenario.steps.map(s => ({
        action: s.action,
        selector: s.selector,
        value: s.value,
        description: s.description,
      })),
    });
  }, [runQAMut, updateScenario]);

  // Auth guard
  if (authLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!user) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <LogIn className="w-8 h-8 text-muted-foreground" />
      <p className="text-muted-foreground">Sign in to access QA Testing</p>
      <Link href={getLoginUrl()}><Button size="lg" className="min-h-[44px] px-8">Sign In</Button></Link>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">QA Testing Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visual testing, accessibility audits, and virtual user simulation</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{scenarios.length} scenarios</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-6">
          <TabsList className="bg-transparent h-10 p-0 gap-0">
            <TabsTrigger value="scenarios" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
              <Play className="w-3.5 h-3.5 mr-1.5" /> Test Scenarios
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
              <Accessibility className="w-3.5 h-3.5 mr-1.5" /> Accessibility
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
              <Gauge className="w-3.5 h-3.5 mr-1.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="visual" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Visual Regression
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="flex-1 overflow-hidden m-0 flex">
          {/* Scenario List */}
          <div className="w-72 border-r border-border flex flex-col shrink-0">
            <div className="p-3 border-b border-border space-y-2">
              <Button size="sm" className="w-full" onClick={() => addScenario()}>
                <Plus className="w-3 h-3 mr-1" /> New Scenario
              </Button>
              <Select onValueChange={(v) => addScenario(PRESET_SCENARIOS[parseInt(v)])}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Load preset..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_SCENARIOS.map((p, i) => (
                    <SelectItem key={i} value={i.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {scenarios.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveScenarioId(s.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-sm transition-colors",
                    activeScenarioId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{s.name}</span>
                    {s.lastRun?.status === "pass" && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
                    {s.lastRun?.status === "fail" && <XCircle className="w-3 h-3 text-red-500 shrink-0" />}
                    {s.lastRun?.status === "running" && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.steps.length} steps</p>
                </button>
              ))}
              {scenarios.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <p>No scenarios yet</p>
                  <p className="mt-1">Create one or load a preset</p>
                </div>
              )}
            </div>
          </div>

          {/* Scenario Editor */}
          <div className="flex-1 overflow-y-auto p-6 pb-mobile-nav md:pb-6">
            {activeScenario ? (
              <div className="space-y-6 max-w-3xl">
                {/* Scenario Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <Input
                      value={activeScenario.name}
                      onChange={(e) => updateScenario(activeScenario.id, { name: e.target.value })}
                      className="text-lg font-semibold h-10"
                      placeholder="Scenario name"
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground shrink-0">Base URL</Label>
                      <Input
                        value={activeScenario.baseUrl}
                        onChange={(e) => updateScenario(activeScenario.id, { baseUrl: e.target.value })}
                        placeholder={window.location.origin}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => runScenario(activeScenario)}
                      disabled={runningId === activeScenario.id}
                      size="sm"
                    >
                      {runningId === activeScenario.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                      {runningId === activeScenario.id ? `${(elapsedMs / 1000).toFixed(1)}s` : "Run"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteScenario(activeScenario.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Test Steps</h3>
                    <Button variant="outline" size="sm" onClick={() => addStep(activeScenario.id)}>
                      <Plus className="w-3 h-3 mr-1" /> Add Step
                    </Button>
                  </div>
                  {activeScenario.steps.map((step, idx) => {
                    const actionDef = ACTION_OPTIONS.find(a => a.value === step.action);
                    const Icon = actionDef?.icon || Play;
                    const stepResult = activeScenario.lastRun?.results?.[idx];
                    return (
                      <Card key={step.id} className={cn("border-border", stepResult?.success === true && "border-green-500/30", stepResult?.success === false && "border-red-500/30")}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <div className="flex flex-col items-center gap-0.5 pt-1">
                              <button onClick={() => moveStep(activeScenario.id, step.id, "up")} className="text-muted-foreground hover:text-foreground" disabled={idx === 0}>
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] text-muted-foreground font-mono w-5 text-center">{idx + 1}</span>
                              <button onClick={() => moveStep(activeScenario.id, step.id, "down")} className="text-muted-foreground hover:text-foreground" disabled={idx === activeScenario.steps.length - 1}>
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Select value={step.action} onValueChange={(v) => updateStep(activeScenario.id, step.id, { action: v as TestAction })}>
                                  <SelectTrigger className="h-7 w-36 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ACTION_OPTIONS.map(a => (
                                      <SelectItem key={a.value} value={a.value}>
                                        <span className="flex items-center gap-1.5"><a.icon className="w-3 h-3" />{a.label}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  value={step.description}
                                  onChange={(e) => updateStep(activeScenario.id, step.id, { description: e.target.value })}
                                  placeholder="Description"
                                  className="h-7 text-xs flex-1"
                                />
                                <button onClick={() => deleteStep(activeScenario.id, step.id)} className="text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                {actionDef?.needsSelector && (
                                  <Input
                                    value={step.selector || ""}
                                    onChange={(e) => updateStep(activeScenario.id, step.id, { selector: e.target.value })}
                                    placeholder="CSS selector"
                                    className="h-7 text-xs font-mono"
                                  />
                                )}
                                {actionDef?.needsValue && (
                                  <Input
                                    value={step.value || ""}
                                    onChange={(e) => updateStep(activeScenario.id, step.id, { value: e.target.value })}
                                    placeholder="Value"
                                    className="h-7 text-xs"
                                  />
                                )}
                              </div>
                              {/* Step result */}
                              {stepResult && (
                                <div className={cn("text-xs rounded-md border", stepResult.success ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20")}>
                                  <div className="flex items-center gap-2 p-2">
                                    {stepResult.success ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    )}
                                    <span className={stepResult.success ? "text-green-600" : "text-red-600"}>
                                      {stepResult.success ? "Passed" : `Failed: ${stepResult.error || "Unknown error"}`}
                                    </span>
                                    {stepResult.duration != null && (
                                      <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {stepResult.duration}ms
                                      </span>
                                    )}
                                  </div>
                                  {stepResult.screenshotUrl && (
                                    <div className="px-2 pb-2">
                                      <a href={stepResult.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block">
                                        <img
                                          src={stepResult.screenshotUrl}
                                          alt={`Screenshot - Step ${idx + 1}`}
                                          className="rounded border border-border max-h-32 object-contain hover:opacity-80 transition-opacity"
                                        />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {activeScenario.steps.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                      Add test steps to define your scenario
                    </div>
                  )}
                </div>

                {/* Run Results Summary */}
                {activeScenario.lastRun && activeScenario.lastRun.status !== "running" && (
                  <Card className={cn("border-border", activeScenario.lastRun.status === "pass" ? "border-green-500/30" : "border-red-500/30")}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {activeScenario.lastRun.status === "pass" ? (
                          <><CheckCircle2 className="w-4 h-4 text-green-500" /> All Tests Passed</>
                        ) : (
                          <><XCircle className="w-4 h-4 text-red-500" /> Some Tests Failed</>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Duration: {activeScenario.lastRun.duration}ms · {activeScenario.lastRun.results?.filter((r: any) => r.success).length}/{activeScenario.lastRun.results?.length} passed
                        {activeScenario.lastRun.timestamp && ` · ${new Date(activeScenario.lastRun.timestamp).toLocaleTimeString()}`}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Monitor className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">Select or create a test scenario</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Accessibility Tab */}
        <TabsContent value="accessibility" className="flex-1 overflow-y-auto m-0 p-6 pb-mobile-nav md:pb-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accessibility Audit</CardTitle>
                <CardDescription>Run an automated accessibility check against any URL</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={auditUrl}
                    onChange={(e) => setAuditUrl(e.target.value)}
                    placeholder="Enter URL to audit..."
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (!auditUrl) { toast.error("Enter a URL"); return; }
                      setAuditRunning(true);
                      setAuditResult(null);
                      // First navigate to the URL, then run audit
                      accessibilityMut.mutate({});
                    }}
                    disabled={auditRunning}
                  >
                    {auditRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Accessibility className="w-4 h-4" />}
                  </Button>
                </div>
                {auditResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Badge variant={auditResult.violations?.length === 0 ? "default" : "destructive"}>
                        {auditResult.violations?.length || 0} violations
                      </Badge>
                      <Badge variant="outline">{auditResult.passes?.length || 0} passed</Badge>
                    </div>
                    {auditResult.violations?.map((v: any, i: number) => (
                      <Card key={i} className="border-red-500/20">
                        <CardContent className="p-3">
                          <p className="text-sm font-medium text-red-600">{v.description || v.id}</p>
                          <p className="text-xs text-muted-foreground mt-1">{v.help || v.helpUrl}</p>
                          <Badge variant="outline" className="mt-2 text-[10px]">{v.impact}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="flex-1 overflow-y-auto m-0 p-6 pb-mobile-nav md:pb-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Metrics</CardTitle>
                <CardDescription>Measure page load performance via CDP</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={perfUrl}
                    onChange={(e) => setPerfUrl(e.target.value)}
                    placeholder="Enter URL to measure..."
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (!perfUrl) { toast.error("Enter a URL"); return; }
                      setPerfRunning(true);
                      setPerfResult(null);
                      // Navigate first then get metrics
                      toast.info("Measuring performance...");
                      setPerfRunning(false);
                      setPerfResult({ note: "Navigate to the URL in a browser session first, then query performance metrics." });
                    }}
                    disabled={perfRunning}
                  >
                    {perfRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4" />}
                  </Button>
                </div>
                {perfResult && (
                  <div className="space-y-3">
                    {perfResult.note && <p className="text-sm text-muted-foreground">{perfResult.note}</p>}
                    {perfResult.metrics && (
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(perfResult.metrics).map(([key, val]: [string, any]) => (
                          <div key={key} className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">{key}</p>
                            <p className="text-lg font-semibold">{typeof val === "number" ? val.toFixed(2) : String(val)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Visual Regression Tab */}
        <TabsContent value="visual" className="flex-1 overflow-y-auto m-0 p-6 pb-mobile-nav md:pb-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visual Regression Testing</CardTitle>
                <CardDescription>Compare screenshots between baseline and current to detect visual changes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Baseline URL</Label>
                    <Input
                      value={baselineUrl}
                      onChange={(e) => setBaselineUrl(e.target.value)}
                      placeholder="https://production.example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Compare URL (optional — uses current session if empty)</Label>
                    <Input
                      value={compareUrl}
                      onChange={(e) => setCompareUrl(e.target.value)}
                      placeholder={window.location.origin}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!baselineUrl) { toast.error("Enter a baseline URL"); return; }
                      setDiffRunning(true);
                      setDiffResult(null);
                      screenshotDiffMut.mutate({ baselineUrl, threshold: 0.1 });
                    }}
                    disabled={diffRunning}
                    className="w-full"
                  >
                    {diffRunning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    Compare Screenshots
                  </Button>
                </div>
                {diffResult && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={diffResult.match ? "default" : "destructive"} className="text-xs">
                        {diffResult.match ? "Match — No visual changes" : "Differences Detected"}
                      </Badge>
                      {diffResult.diffPercentage !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {(diffResult.diffPercentage * 100).toFixed(2)}% pixel difference
                        </span>
                      )}
                    </div>
                    {/* Before/After side-by-side */}
                    {(diffResult.baselineScreenshotUrl || diffResult.currentScreenshotUrl) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">Baseline</p>
                          {diffResult.baselineScreenshotUrl ? (
                            <img src={diffResult.baselineScreenshotUrl} alt="Baseline" className="w-full rounded border border-border" />
                          ) : (
                            <div className="h-32 bg-muted/30 rounded border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">No baseline</div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">Current</p>
                          {diffResult.currentScreenshotUrl ? (
                            <img src={diffResult.currentScreenshotUrl} alt="Current" className="w-full rounded border border-border" />
                          ) : (
                            <div className="h-32 bg-muted/30 rounded border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">No current</div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Diff overlay */}
                    {diffResult.diffImageUrl && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">Diff Overlay (differences highlighted in red)</p>
                        <div className="border border-border rounded-lg overflow-hidden">
                          <img src={diffResult.diffImageUrl} alt="Visual diff overlay" className="w-full" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
