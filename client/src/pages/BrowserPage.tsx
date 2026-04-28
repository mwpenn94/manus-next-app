/**
 * BrowserPage — Manus-Style Interactive Browser Automation Panel
 *
 * A first-class browser automation interface providing:
 * - URL bar with navigation controls (back, forward, reload, go)
 * - Live screenshot display with auto-refresh after actions
 * - Click/type interaction via coordinate overlays on screenshot
 * - Console logs panel with real-time updates
 * - Network requests panel with status/timing
 * - Session management (create, switch, close)
 * - Virtual User QA mode with test step builder
 *
 * Uses tRPC browser.* procedures backed by Playwright/Chromium.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Globe, ArrowLeft, ArrowRight, RotateCw, Play, Square,
  Camera, Terminal, Network, MousePointer2, Type, ChevronDown,
  ChevronUp, Loader2, LogIn, X, Plus, Monitor, Eye,
  Maximize2, Minimize2, AlertCircle, CheckCircle2, Clock,
  Trash2, RefreshCw, Code, Crosshair, Hand, Keyboard,
  ArrowUpDown, Layers, FileText, Wifi, WifiOff, Minus,
  Smartphone, Tablet, BarChart3,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "wouter";
import HeroIllustration from "@/components/HeroIllustration";

// ── Types ──
interface BrowserSessionInfo {
  id: string;
  url: string;
  title?: string;
  createdAt: number;
  lastActivityAt: number;
  screenshotCount: number;
  consoleLogCount?: number;
  networkRequestCount?: number;
}

interface ConsoleLogEntry {
  type: string;
  text: string;
  timestamp: number;
}

interface NetworkRequestEntry {
  url: string;
  method: string;
  status?: number;
  timestamp: number;
}

type InteractionMode = "navigate" | "click" | "type" | "scroll" | "inspect";

// ── QA Test Step Types ──
interface QATestStep {
  id: string;
  action: "navigate" | "click" | "type" | "screenshot" | "wait" | "assert" | "scroll" | "pressKey";
  selector?: string;
  value?: string;
  description: string;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  screenshotUrl?: string;
  error?: string;
  duration?: number;
}

interface QATestSuite {
  id: string;
  name: string;
  steps: QATestStep[];
  status: "idle" | "running" | "passed" | "failed";
  startedAt?: number;
  completedAt?: number;
}

// ── Pre-built QA Scenarios ──
const PREBUILT_SCENARIOS: Omit<QATestSuite, "id" | "status">[] = [
  {
    name: "Homepage Load & Navigation",
    steps: [
      { id: "s1", action: "navigate", value: "/", description: "Navigate to homepage", status: "pending" },
      { id: "s2", action: "screenshot", description: "Capture homepage screenshot", status: "pending" },
      { id: "s3", action: "wait", selector: "h1", description: "Wait for main heading", status: "pending" },
      { id: "s4", action: "assert", selector: "h1", description: "Verify heading exists", status: "pending" },
    ],
  },
  {
    name: "Task Creation Flow",
    steps: [
      { id: "s1", action: "navigate", value: "/", description: "Navigate to homepage", status: "pending" },
      { id: "s2", action: "wait", selector: "textarea", description: "Wait for input area", status: "pending" },
      { id: "s3", action: "type", selector: "textarea", value: "Test task from QA automation", description: "Type task prompt", status: "pending" },
      { id: "s4", action: "screenshot", description: "Capture filled input", status: "pending" },
      { id: "s5", action: "pressKey", value: "Enter", description: "Submit task", status: "pending" },
      { id: "s6", action: "wait", selector: "[data-testid='task-view']", description: "Wait for task view", status: "pending" },
      { id: "s7", action: "screenshot", description: "Capture task view", status: "pending" },
    ],
  },
  {
    name: "Settings Page Validation",
    steps: [
      { id: "s1", action: "navigate", value: "/settings", description: "Navigate to settings", status: "pending" },
      { id: "s2", action: "screenshot", description: "Capture settings page", status: "pending" },
      { id: "s3", action: "wait", selector: "button", description: "Wait for settings controls", status: "pending" },
      { id: "s4", action: "assert", selector: "button", description: "Verify settings buttons exist", status: "pending" },
    ],
  },
  {
    name: "Responsive Layout Check",
    steps: [
      { id: "s1", action: "navigate", value: "/", description: "Navigate to homepage", status: "pending" },
      { id: "s2", action: "screenshot", description: "Desktop viewport screenshot", status: "pending" },
      { id: "s3", action: "scroll", value: "down", description: "Scroll down to see more content", status: "pending" },
      { id: "s4", action: "screenshot", description: "Below-fold screenshot", status: "pending" },
    ],
  },
];

// ── Utility ──
const nanoid = () => Math.random().toString(36).slice(2, 10);
const formatTimestamp = (ts: number) => new Date(ts).toLocaleTimeString();
const statusColor = (status?: number) => {
  if (!status) return "text-muted-foreground";
  if (status >= 200 && status < 300) return "text-emerald-500";
  if (status >= 300 && status < 400) return "text-amber-500";
  return "text-red-500";
};

export default function BrowserPage() {
  const { user, isAuthenticated } = useAuth();

  // ── Read URL from query params (e.g., /browser?url=https://...) ──
  const queryUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("url") || "";
  }, []);

  // ── State ──
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(queryUrl);
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("navigate");
  const [typeSelector, setTypeSelector] = useState("");
  const [typeText, setTypeText] = useState("");
  const [clickSelector, setClickSelector] = useState("");
  const [evalCode, setEvalCode] = useState("");
  const [evalResult, setEvalResult] = useState<string | null>(null);
  const [bottomPanel, setBottomPanel] = useState<"console" | "network" | "elements" | "qa" | "a11y" | "perf" | "coverage">("console");
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequestEntry[]>([]);
  const [scannedElements, setScannedElements] = useState<Array<{ tag: string; text: string; selector: string }>>([]);
  const [a11yResults, setA11yResults] = useState<{ violations: any[]; passes: number; score: number } | null>(null);
  const [perfMetrics, setPerfMetrics] = useState<Record<string, number | undefined> | null>(null);
  const [coverageData, setCoverageData] = useState<{ js: any[]; css: any[] } | null>(null);
  const [coverageRunning, setCoverageRunning] = useState(false);
  const [sessions, setSessions] = useState<BrowserSessionInfo[]>([]);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [currentViewport, setCurrentViewport] = useState<{ name: string; width: number; height: number } | null>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);

  // ── QA State ──
  const [qaMode, setQaMode] = useState(false);
  const [qaSuites, setQaSuites] = useState<QATestSuite[]>([]);
  const [activeQaSuiteId, setActiveQaSuiteId] = useState<string | null>(null);
  const [showAddStepDialog, setShowAddStepDialog] = useState(false);
  const [newStepAction, setNewStepAction] = useState<QATestStep["action"]>("navigate");
  const [newStepSelector, setNewStepSelector] = useState("");
  const [newStepValue, setNewStepValue] = useState("");
  const [newStepDescription, setNewStepDescription] = useState("");

  // ── tRPC mutations ──
  const navigateMut = trpc.browser.navigate.useMutation();
  const clickMut = trpc.browser.click.useMutation();
  const typeMut = trpc.browser.type.useMutation();
  const screenshotMut = trpc.browser.screenshot.useMutation();
  const scrollMut = trpc.browser.scroll.useMutation();
  const evaluateMut = trpc.browser.evaluate.useMutation();
  const waitForSelectorMut = trpc.browser.waitForSelector.useMutation();
  const pressKeyMut = trpc.browser.pressKey.useMutation();
  const goBackMut = trpc.browser.goBack.useMutation();
  const goForwardMut = trpc.browser.goForward.useMutation();
  const reloadMut = trpc.browser.reload.useMutation();
  const closeMut = trpc.browser.close.useMutation();
  const setViewportMut = trpc.browser.setViewport.useMutation();

  // ── tRPC queries ──
  const sessionsQuery = trpc.browser.sessions.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 10000,
  });
  const viewportPresetsQuery = trpc.browser.viewportPresets.useQuery(undefined, {
    enabled: !!user,
  });

  // Sync sessions from query
  useEffect(() => {
    if (sessionsQuery.data) {
      setSessions((sessionsQuery.data || []).filter(Boolean) as BrowserSessionInfo[]);
    }
  }, [sessionsQuery.data]);

  // ── Helpers ──
  const updateAfterAction = useCallback((result: {
    success: boolean;
    url: string;
    title: string;
    screenshotUrl?: string | null;
    error?: string | null;
  }) => {
    if (result.url) {
      setCurrentUrl(result.url);
      setUrlInput(result.url);
    }
    if (result.title) setCurrentTitle(result.title);
    if (result.screenshotUrl) setScreenshotUrl(result.screenshotUrl);
    if (result.error) toast.error(result.error);
  }, []);

  const refreshConsoleLogs = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      const resp = await fetch(`/api/trpc/browser.consoleLogs?input=${encodeURIComponent(JSON.stringify({ json: { sessionId: activeSessionId } }))}`).then(r => r.json());
      if (resp?.result?.data?.json) setConsoleLogs(resp.result.data.json);
    } catch { /* ignore */ }
  }, [activeSessionId]);

  const refreshNetworkRequests = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      const resp = await fetch(`/api/trpc/browser.networkRequests?input=${encodeURIComponent(JSON.stringify({ json: { sessionId: activeSessionId } }))}`).then(r => r.json());
      if (resp?.result?.data?.json) setNetworkRequests(resp.result.data.json);
    } catch { /* ignore */ }
  }, [activeSessionId]);

  // ── Navigation Actions ──
  const handleNavigate = useCallback(async (url?: string) => {
    const targetUrl = url || urlInput;
    if (!targetUrl.trim()) return;
    // Auto-prepend https:// if no protocol
    const fullUrl = /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`;
    setIsLoading(true);
    try {
      const result = await navigateMut.mutateAsync({
        sessionId: activeSessionId || undefined,
        url: fullUrl,
      });
      if (!activeSessionId && result.url) {
        // New session was created — get the session ID
        sessionsQuery.refetch();
      }
      updateAfterAction(result);
    } catch (err: unknown) {
      toast.error(`Navigation failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [urlInput, activeSessionId, navigateMut, updateAfterAction, sessionsQuery]);

  // Auto-navigate when ?url= query param is present
  const autoNavigatedRef = useRef(false);
  useEffect(() => {
    if (queryUrl && !autoNavigatedRef.current && isAuthenticated) {
      autoNavigatedRef.current = true;
      // Small delay to let tRPC client initialize
      const timer = setTimeout(() => handleNavigate(queryUrl), 500);
      return () => clearTimeout(timer);
    }
  }, [queryUrl, isAuthenticated, handleNavigate]);

  const handleGoBack = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await goBackMut.mutateAsync({ sessionId: activeSessionId || undefined });
      updateAfterAction(result);
    } catch (err: unknown) {
      toast.error(`Go back failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, goBackMut, updateAfterAction]);

  const handleGoForward = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await goForwardMut.mutateAsync({ sessionId: activeSessionId || undefined });
      updateAfterAction(result);
    } catch (err: unknown) {
      toast.error(`Go forward failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, goForwardMut, updateAfterAction]);

  const handleReload = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await reloadMut.mutateAsync({ sessionId: activeSessionId || undefined });
      updateAfterAction(result);
    } catch (err: unknown) {
      toast.error(`Reload failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, reloadMut, updateAfterAction]);

  const handleScreenshot = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await screenshotMut.mutateAsync({
        sessionId: activeSessionId || undefined,
        fullPage: false,
      });
      updateAfterAction(result);
      toast.success("Screenshot captured");
    } catch (err: unknown) {
      toast.error(`Screenshot failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, screenshotMut, updateAfterAction]);

  // ── Interaction Actions ──
  const handleClick = useCallback(async (selector: string) => {
    if (!selector.trim()) return;
    setIsLoading(true);
    try {
      const result = await clickMut.mutateAsync({
        sessionId: activeSessionId || undefined,
        selector,
      });
      updateAfterAction(result);
      toast.success(`Clicked: ${selector}`);
    } catch (err: unknown) {
      toast.error(`Click failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, clickMut, updateAfterAction]);

  const handleType = useCallback(async (selector: string, text: string) => {
    if (!selector.trim() || !text) return;
    setIsLoading(true);
    try {
      const result = await typeMut.mutateAsync({
        sessionId: activeSessionId || undefined,
        selector,
        text,
        clear: true,
      });
      updateAfterAction(result);
      toast.success(`Typed into: ${selector}`);
    } catch (err: unknown) {
      toast.error(`Type failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, typeMut, updateAfterAction]);

  const handleScroll = useCallback(async (direction: "up" | "down") => {
    setIsLoading(true);
    try {
      const result = await scrollMut.mutateAsync({
        sessionId: activeSessionId || undefined,
        direction,
        amount: 500,
      });
      updateAfterAction(result);
    } catch (err: unknown) {
      toast.error(`Scroll failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, scrollMut, updateAfterAction]);

  const handleEvaluate = useCallback(async () => {
    if (!evalCode.trim()) return;
    setIsLoading(true);
    try {
      const result = await evaluateMut.mutateAsync({
        sessionId: activeSessionId || undefined,
        code: evalCode,
      });
      setEvalResult(result.content || "undefined");
      updateAfterAction(result);
    } catch (err: unknown) {
      setEvalResult(`Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, evalCode, evaluateMut, updateAfterAction]);

  const handlePressKey = useCallback(async (key: string) => {
    setIsLoading(true);
    try {
      const result = await pressKeyMut.mutateAsync({
        sessionId: activeSessionId || undefined,
        key,
      });
      updateAfterAction(result);
    } catch (err: unknown) {
      toast.error(`Key press failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, pressKeyMut, updateAfterAction]);

  // ── Session Management ──
  const handleCloseSession = useCallback(async (sessionId: string) => {
    try {
      await closeMut.mutateAsync({ sessionId });
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setScreenshotUrl(null);
        setCurrentUrl("");
        setCurrentTitle("");
        setUrlInput("");
      }
      sessionsQuery.refetch();
      toast.success("Session closed");
    } catch (err: unknown) {
      toast.error(`Close session failed: ${(err as Error).message}`);
    }
  }, [activeSessionId, closeMut, sessionsQuery]);

  const handleSwitchSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    // Clear stale data from previous session
    setConsoleLogs([]);
    setNetworkRequests([]);
    setScannedElements([]);
    setEvalResult(null);
    // Take a fresh screenshot of the session
    setIsLoading(true);
    try {
      const result = await screenshotMut.mutateAsync({ sessionId });
      updateAfterAction(result);
      // Refresh console/network for the new session
      refreshConsoleLogs();
      refreshNetworkRequests();
    } catch { /* ignore */ }
    setIsLoading(false);
  }, [screenshotMut, updateAfterAction, refreshConsoleLogs, refreshNetworkRequests]);

  // ── QA Mode ──
  const activeQaSuite = useMemo(() =>
    qaSuites.find(s => s.id === activeQaSuiteId) || null,
    [qaSuites, activeQaSuiteId]
  );

  const loadPrebuiltScenario = useCallback((scenario: typeof PREBUILT_SCENARIOS[0]) => {
    const suite: QATestSuite = {
      id: nanoid(),
      name: scenario.name,
      steps: scenario.steps.map(s => ({ ...s, id: nanoid(), status: "pending" as const })),
      status: "idle",
    };
    setQaSuites(prev => [...prev, suite]);
    setActiveQaSuiteId(suite.id);
    toast.success(`Loaded: ${scenario.name}`);
  }, []);

  const addCustomStep = useCallback(() => {
    if (!activeQaSuiteId || !newStepDescription.trim()) return;
    const step: QATestStep = {
      id: nanoid(),
      action: newStepAction,
      selector: newStepSelector || undefined,
      value: newStepValue || undefined,
      description: newStepDescription,
      status: "pending",
    };
    setQaSuites(prev => prev.map(s =>
      s.id === activeQaSuiteId ? { ...s, steps: [...s.steps, step] } : s
    ));
    setNewStepSelector("");
    setNewStepValue("");
    setNewStepDescription("");
    setShowAddStepDialog(false);
  }, [activeQaSuiteId, newStepAction, newStepSelector, newStepValue, newStepDescription]);

  const createCustomSuite = useCallback(() => {
    const suite: QATestSuite = {
      id: nanoid(),
      name: `Custom Test ${qaSuites.length + 1}`,
      steps: [],
      status: "idle",
    };
    setQaSuites(prev => [...prev, suite]);
    setActiveQaSuiteId(suite.id);
  }, [qaSuites.length]);

  const runQaSuite = useCallback(async (suiteId: string) => {
    const suite = qaSuites.find(s => s.id === suiteId);
    if (!suite) return;

    // Reset all steps
    setQaSuites(prev => prev.map(s =>
      s.id === suiteId ? {
        ...s,
        status: "running" as const,
        startedAt: Date.now(),
        completedAt: undefined,
        steps: s.steps.map(st => ({ ...st, status: "pending" as const, error: undefined, screenshotUrl: undefined, duration: undefined })),
      } : s
    ));

    const baseUrl = window.location.origin;
    let allPassed = true;
    // Track the session ID across QA steps — may be null at start
    let qaSessionId = activeSessionId;

    for (let i = 0; i < suite.steps.length; i++) {
      const step = suite.steps[i];
      const startTime = Date.now();

      // Mark step as running
      setQaSuites(prev => prev.map(s =>
        s.id === suiteId ? {
          ...s,
          steps: s.steps.map((st, idx) => idx === i ? { ...st, status: "running" as const } : st),
        } : s
      ));

      try {
        let result: { success: boolean; url: string; title: string; screenshotUrl?: string | null; error?: string | null; content?: string | null } | undefined;

        switch (step.action) {
          case "navigate": {
            const url = step.value?.startsWith("/") ? `${baseUrl}${step.value}` : (step.value || baseUrl);
            result = await navigateMut.mutateAsync({
              sessionId: qaSessionId || undefined,
              url,
            });
            // After first navigate, capture the new session ID
            if (!qaSessionId && result) {
              const refreshed = await sessionsQuery.refetch();
              const latestSessions = refreshed.data || [];
              if (latestSessions.length > 0) {
                // Pick the most recently active session
                const sorted = [...latestSessions].sort((a, b) => (b?.lastActivityAt || 0) - (a?.lastActivityAt || 0));
                qaSessionId = sorted[0]?.id || null;
                if (qaSessionId) setActiveSessionId(qaSessionId);
              }
            }
            break;
          }
          case "click":
            if (step.selector) {
              result = await clickMut.mutateAsync({
                sessionId: qaSessionId || undefined,
                selector: step.selector,
              });
            }
            break;
          case "type":
            if (step.selector && step.value) {
              result = await typeMut.mutateAsync({
                sessionId: qaSessionId || undefined,
                selector: step.selector,
                text: step.value,
                clear: true,
              });
            }
            break;
          case "screenshot":
            result = await screenshotMut.mutateAsync({
              sessionId: qaSessionId || undefined,
              fullPage: false,
            });
            break;
          case "wait":
            if (step.selector) {
              result = await waitForSelectorMut.mutateAsync({
                sessionId: qaSessionId || undefined,
                selector: step.selector,
                state: "visible",
                timeout: 10000,
              });
            }
            break;
          case "assert":
            if (step.selector) {
              result = await evaluateMut.mutateAsync({
                sessionId: qaSessionId || undefined,
                code: `!!document.querySelector('${step.selector.replace(/'/g, "\\'")}')`,
              });
              if (result?.content === "false") {
                throw new Error(`Assertion failed: selector "${step.selector}" not found`);
              }
            }
            break;
          case "scroll":
            result = await scrollMut.mutateAsync({
              sessionId: qaSessionId || undefined,
              direction: (step.value as "up" | "down") || "down",
              amount: 500,
            });
            break;
          case "pressKey":
            if (step.value) {
              result = await pressKeyMut.mutateAsync({
                sessionId: qaSessionId || undefined,
                key: step.value,
              });
            }
            break;
        }

        if (result) updateAfterAction(result);

        const duration = Date.now() - startTime;
        setQaSuites(prev => prev.map(s =>
          s.id === suiteId ? {
            ...s,
            steps: s.steps.map((st, idx) => idx === i ? {
              ...st,
              status: "passed" as const,
              screenshotUrl: result?.screenshotUrl || undefined,
              duration,
            } : st),
          } : s
        ));
      } catch (err: unknown) {
        allPassed = false;
        const duration = Date.now() - startTime;
        setQaSuites(prev => prev.map(s =>
          s.id === suiteId ? {
            ...s,
            steps: s.steps.map((st, idx) =>
              idx === i ? { ...st, status: "failed" as const, error: (err as Error).message, duration }
                : idx > i ? { ...st, status: "skipped" as const }
                  : st
            ),
          } : s
        ));
        break;
      }
    }

    setQaSuites(prev => prev.map(s =>
      s.id === suiteId ? {
        ...s,
        status: allPassed ? "passed" as const : "failed" as const,
        completedAt: Date.now(),
      } : s
    ));

    if (allPassed) {
      toast.success(`QA Suite "${suite.name}" passed`);
    } else {
      toast.error(`QA Suite "${suite.name}" failed`);
    }
  }, [qaSuites, activeSessionId, navigateMut, clickMut, typeMut, screenshotMut,
    scrollMut, evaluateMut, waitForSelectorMut, pressKeyMut, updateAfterAction, sessionsQuery]);

  const deleteQaSuite = useCallback((suiteId: string) => {
    setQaSuites(prev => prev.filter(s => s.id !== suiteId));
    if (activeQaSuiteId === suiteId) setActiveQaSuiteId(null);
  }, [activeQaSuiteId]);

  // ── Auth guard ──
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Browser Automation</h2>
            <p className="text-sm text-muted-foreground">Sign in to use the interactive browser</p>
            <Button asChild>
              <a href={getLoginUrl()}>
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Hero Header - compact for browser tool */}
      <div className="shrink-0 px-3 pt-3">
        <HeroIllustration
          type="hero-browser"
          title="Browser"
          subtitle="Interactive browser automation with live screenshots and session management"
          icon={<Globe className="w-5 h-5 text-primary" />}
          className="mb-0 rounded-lg"
        />
      </div>
      {/* ── Top Bar: URL + Navigation ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        {/* Nav buttons */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleGoBack} disabled={isLoading}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleGoForward} disabled={isLoading}>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReload} disabled={isLoading}>
            <RotateCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* URL bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 relative">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleNavigate(); }}
              placeholder="Enter URL or search..."
              className="h-8 pl-8 pr-2 text-sm bg-background"
            />
          </div>
          <Button size="sm" className="h-8" onClick={() => handleNavigate()} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleScreenshot} disabled={isLoading} title="Take screenshot">
            <Camera className="w-4 h-4" />
          </Button>

          {/* Session selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative" title="Sessions">
                <Layers className="w-4 h-4" />
                {sessions.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center">
                    {sessions.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Browser Sessions</div>
              <DropdownMenuSeparator />
              {sessions.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">No active sessions</div>
              ) : (
                sessions.map(s => (
                  <DropdownMenuItem key={s.id} className="flex items-center justify-between gap-2">
                    <button
                      className="flex-1 text-left truncate text-xs"
                      onClick={() => handleSwitchSession(s.id)}
                    >
                      <span className={cn("font-medium", activeSessionId === s.id && "text-primary")}>
                        {s.title || "New Tab"}
                      </span>
                      <br />
                      <span className="text-muted-foreground truncate">{s.url || "about:blank"}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={e => { e.stopPropagation(); handleCloseSession(s.id); }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* QA Mode toggle */}
          <Button
            variant={qaMode ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => { setQaMode(!qaMode); setBottomPanel("qa"); setBottomPanelOpen(true); }}
            title="Virtual User QA"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {/* Viewport / Device Preset Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Device viewport">
                {currentViewport && currentViewport.width <= 430 ? (
                  <Smartphone className="w-4 h-4" />
                ) : currentViewport && currentViewport.width <= 820 ? (
                  <Tablet className="w-4 h-4" />
                ) : (
                  <Monitor className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Device Presets</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  setCurrentViewport(null);
                  if (activeSessionId) {
                    try {
                      await setViewportMut.mutateAsync({ sessionId: activeSessionId, width: 1280, height: 800 });
                      await handleScreenshot();
                    } catch { /* ignore */ }
                  }
                }}
              >
                <Monitor className="w-3.5 h-3.5 mr-2" />
                <span className="flex-1">Desktop (default)</span>
                <span className="text-[10px] text-muted-foreground">1280×800</span>
              </DropdownMenuItem>
              {viewportPresetsQuery.data && Object.entries(viewportPresetsQuery.data).map(([name, dims]) => {
                const { width, height } = dims as { width: number; height: number };
                return (
                  <DropdownMenuItem
                    key={name}
                    onClick={async () => {
                      setCurrentViewport({ name, width, height });
                      if (activeSessionId) {
                        try {
                          await setViewportMut.mutateAsync({ sessionId: activeSessionId, width, height });
                          await handleScreenshot();
                        } catch { /* ignore */ }
                      }
                    }}
                  >
                    {width <= 430 ? (
                      <Smartphone className="w-3.5 h-3.5 mr-2" />
                    ) : width <= 820 ? (
                      <Tablet className="w-3.5 h-3.5 mr-2" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5 mr-2" />
                    )}
                    <span className="flex-1">{name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <span className="text-[10px] text-muted-foreground">{width}×{height}</span>
                  </DropdownMenuItem>
                );
              })}
              {currentViewport && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-[10px] text-muted-foreground">
                    Current: {currentViewport.name} ({currentViewport.width}×{currentViewport.height})
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Interaction Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/50 shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mr-1">Mode:</span>
        {([
          { mode: "navigate" as const, icon: Globe, label: "Navigate" },
          { mode: "click" as const, icon: MousePointer2, label: "Click" },
          { mode: "type" as const, icon: Type, label: "Type" },
          { mode: "scroll" as const, icon: ArrowUpDown, label: "Scroll" },
          { mode: "inspect" as const, icon: Code, label: "Evaluate" },
        ] as const).map(({ mode, icon: Icon, label }) => (
          <Button
            key={mode}
            variant={interactionMode === mode ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setInteractionMode(mode)}
          >
            <Icon className="w-3 h-3" />
            {label}
          </Button>
        ))}

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Mode-specific controls */}
        {interactionMode === "click" && (
          <div className="flex items-center gap-1.5 flex-1">
            <Input
              value={clickSelector}
              onChange={e => setClickSelector(e.target.value)}
              placeholder="CSS selector (e.g., button.submit)"
              className="h-7 text-xs flex-1 max-w-xs"
            />
            <Button size="sm" className="h-7 text-xs" onClick={() => handleClick(clickSelector)} disabled={isLoading || !clickSelector.trim()}>
              Click
            </Button>
          </div>
        )}

        {interactionMode === "type" && (
          <div className="flex items-center gap-1.5 flex-1">
            <Input
              value={typeSelector}
              onChange={e => setTypeSelector(e.target.value)}
              placeholder="Selector"
              className="h-7 text-xs w-40"
            />
            <Input
              value={typeText}
              onChange={e => setTypeText(e.target.value)}
              placeholder="Text to type"
              className="h-7 text-xs flex-1 max-w-xs"
              onKeyDown={e => { if (e.key === "Enter") handleType(typeSelector, typeText); }}
            />
            <Button size="sm" className="h-7 text-xs" onClick={() => handleType(typeSelector, typeText)} disabled={isLoading || !typeSelector.trim() || !typeText}>
              Type
            </Button>
          </div>
        )}

        {interactionMode === "scroll" && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" className="h-7 text-xs" onClick={() => handleScroll("up")} disabled={isLoading}>
              <ChevronUp className="w-3 h-3 mr-1" /> Up
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => handleScroll("down")} disabled={isLoading}>
              <ChevronDown className="w-3 h-3 mr-1" /> Down
            </Button>
          </div>
        )}

        {interactionMode === "inspect" && (
          <div className="flex items-center gap-1.5 flex-1">
            <Input
              value={evalCode}
              onChange={e => setEvalCode(e.target.value)}
              placeholder="JavaScript expression..."
              className="h-7 text-xs flex-1 max-w-md font-mono"
              onKeyDown={e => { if (e.key === "Enter") handleEvaluate(); }}
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleEvaluate} disabled={isLoading || !evalCode.trim()}>
              Run
            </Button>
            {evalResult !== null && (
              <code className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded max-w-xs truncate">
                → {evalResult}
              </code>
            )}
          </div>
        )}

        {/* Current page info */}
        {currentTitle && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span className="truncate max-w-[200px]">{currentTitle}</span>
          </div>
        )}
      </div>

      {/* ── Main Content: Screenshot + Bottom Panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Screenshot viewport */}
        <div ref={screenshotRef} className="flex-1 overflow-auto bg-muted/30 relative">
          {screenshotUrl ? (
            <div className="p-4 flex items-start justify-center min-h-full">
              <div className="relative border border-border rounded-lg overflow-hidden shadow-lg bg-card max-w-full">
                <img
                  src={screenshotUrl}
                  alt="Browser screenshot"
                  className="max-w-full h-auto"
                  style={{ maxHeight: "calc(100vh - 300px)" }}
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Globe className="w-16 h-16 mx-auto text-muted-foreground/30" />
                <div>
                  <h3 className="text-lg font-medium text-foreground">No page loaded</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter a URL above to start browsing, or load a QA scenario
                  </p>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => { setUrlInput("https://example.com"); handleNavigate("https://example.com"); }}>
                    <Globe className="w-3.5 h-3.5 mr-1.5" />
                    Try example.com
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setQaMode(true); setBottomPanel("qa"); setBottomPanelOpen(true); }}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Open QA Mode
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Panel Toggle ── */}
        <div
          className="flex items-center gap-1 px-3 py-1 border-t border-border bg-card cursor-pointer shrink-0"
          onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
        >
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {bottomPanelOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
          <div className="flex items-center gap-0.5">
            {(["console", "network", "elements", "qa", "a11y", "perf", "coverage"] as const).map(tab => (
              <button
                key={tab}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-colors capitalize",
                  bottomPanel === tab
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={e => { e.stopPropagation(); setBottomPanel(tab); setBottomPanelOpen(true); }}
              >
                {tab === "qa" ? "QA Tests" : tab === "a11y" ? "A11y" : tab === "perf" ? "Perf" : tab}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
            {consoleLogs.length > 0 && (
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3" /> {consoleLogs.length}
              </span>
            )}
            {networkRequests.length > 0 && (
              <span className="flex items-center gap-1">
                <Network className="w-3 h-3" /> {networkRequests.length}
              </span>
            )}
          </div>
        </div>

        {/* ── Bottom Panel Content ── */}
        {bottomPanelOpen && (
          <div className="h-[180px] md:h-[240px] border-t border-border bg-card shrink-0 overflow-hidden">
            {/* Console Panel */}
            {bottomPanel === "console" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-medium">Console</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refreshConsoleLogs} title="Refresh">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setConsoleLogs([])} title="Clear">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {consoleLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-8">
                      No console logs yet. Navigate to a page to capture logs.
                    </div>
                  ) : (
                    <div className="p-2 space-y-0.5 font-mono text-[11px]">
                      {consoleLogs.map((log, i) => (
                        <div key={i} className={cn(
                          "flex items-start gap-2 px-2 py-0.5 rounded",
                          log.type === "error" && "bg-red-500/10 text-red-400",
                          log.type === "warn" && "bg-amber-500/10 text-amber-400",
                          log.type === "info" && "text-blue-400",
                          log.type === "log" && "text-foreground",
                        )}>
                          <span className="text-muted-foreground shrink-0 w-16">{formatTimestamp(log.timestamp)}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{log.type}</Badge>
                          <span className="break-all">{log.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Network Panel */}
            {bottomPanel === "network" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-medium">Network</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refreshNetworkRequests} title="Refresh">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNetworkRequests([])} title="Clear">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {networkRequests.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-8">
                      No network requests yet. Navigate to a page to capture requests.
                    </div>
                  ) : (
                    <div className="p-2 font-mono text-[11px]">
                      <div className="grid grid-cols-[60px_50px_1fr_80px] gap-2 px-2 py-1 text-muted-foreground border-b border-border mb-1">
                        <span>Status</span>
                        <span>Method</span>
                        <span>URL</span>
                        <span>Time</span>
                      </div>
                      {networkRequests.map((req, i) => (
                        <div key={i} className="grid grid-cols-[60px_50px_1fr_80px] gap-2 px-2 py-0.5 hover:bg-accent/50 rounded">
                          <span className={statusColor(req.status)}>{req.status || "—"}</span>
                          <span className="text-muted-foreground">{req.method}</span>
                          <span className="truncate text-foreground" title={req.url}>{req.url}</span>
                          <span className="text-muted-foreground">{formatTimestamp(req.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Elements Panel */}
            {bottomPanel === "elements" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-medium">Interactive Elements</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={async () => {
                    if (!activeSessionId) return;
                    try {
                      const resp = await fetch(`/api/trpc/browser.getElements?input=${encodeURIComponent(JSON.stringify({ json: { sessionId: activeSessionId } }))}`).then(r => r.json());
                      const elements = resp?.result?.data?.json?.elements || [];
                      setScannedElements(elements.map((el: { tag?: string; text?: string; selector?: string }) => ({
                        tag: el.tag || "unknown",
                        text: el.text || "",
                        selector: el.selector || "",
                      })));
                      toast.success(`Found ${elements.length} interactive elements`);
                    } catch { toast.error("Failed to get elements"); }
                  }}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Scan
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  {scannedElements.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-8">
                      Click "Scan" to detect interactive elements on the current page.
                    </div>
                  ) : (
                    <div className="p-2 font-mono text-[11px]">
                      <div className="grid grid-cols-[60px_1fr_1fr] gap-2 px-2 py-1 text-muted-foreground border-b border-border mb-1">
                        <span>Tag</span>
                        <span>Text</span>
                        <span>Selector</span>
                      </div>
                      {scannedElements.map((el, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[60px_1fr_1fr] gap-2 px-2 py-0.5 hover:bg-accent/50 rounded cursor-pointer"
                          onClick={() => {
                            setClickSelector(el.selector);
                            setInteractionMode("click");
                            toast.info(`Selector copied: ${el.selector}`);
                          }}
                          title="Click to use this selector"
                        >
                          <Badge variant="outline" className="text-[9px] px-1 py-0 w-fit">{el.tag}</Badge>
                          <span className="truncate text-foreground">{el.text || "—"}</span>
                          <span className="truncate text-muted-foreground">{el.selector}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* QA Tests Panel */}
            {bottomPanel === "qa" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-medium">Virtual User QA</span>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 text-xs gap-1">
                          <Plus className="w-3 h-3" /> Load Scenario
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {PREBUILT_SCENARIOS.map((scenario, i) => (
                          <DropdownMenuItem key={i} onClick={() => loadPrebuiltScenario(scenario)}>
                            {scenario.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={createCustomSuite}>
                          <Plus className="w-3 h-3 mr-2" /> Custom Test Suite
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {qaSuites.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-8">
                      <div className="text-center space-y-2">
                        <Eye className="w-8 h-8 mx-auto text-muted-foreground/30" />
                        <p>No QA test suites loaded.</p>
                        <p>Use "Load Scenario" to add pre-built or custom tests.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 space-y-3">
                      {qaSuites.map(suite => (
                        <div key={suite.id} className="border border-border rounded-lg overflow-hidden">
                          {/* Suite header */}
                          <div
                            className={cn(
                              "flex items-center justify-between px-3 py-2 cursor-pointer",
                              suite.status === "passed" && "bg-emerald-500/10",
                              suite.status === "failed" && "bg-red-500/10",
                              suite.status === "running" && "bg-blue-500/10",
                            )}
                            onClick={() => setActiveQaSuiteId(activeQaSuiteId === suite.id ? null : suite.id)}
                          >
                            <div className="flex items-center gap-2">
                              {suite.status === "passed" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              {suite.status === "failed" && <AlertCircle className="w-4 h-4 text-red-500" />}
                              {suite.status === "running" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                              {suite.status === "idle" && <Clock className="w-4 h-4 text-muted-foreground" />}
                              <span className="text-xs font-medium">{suite.name}</span>
                              <Badge variant="outline" className="text-[9px]">
                                {suite.steps.filter(s => s.status === "passed").length}/{suite.steps.length}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={e => { e.stopPropagation(); runQaSuite(suite.id); }}
                                disabled={suite.status === "running"}
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={e => { e.stopPropagation(); setActiveQaSuiteId(suite.id); setShowAddStepDialog(true); }}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={e => { e.stopPropagation(); deleteQaSuite(suite.id); }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Suite steps (expanded) */}
                          {activeQaSuiteId === suite.id && (
                            <div className="border-t border-border">
                              {suite.steps.map((step, i) => (
                                <div key={step.id} className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border last:border-b-0",
                                  step.status === "passed" && "bg-emerald-500/5",
                                  step.status === "failed" && "bg-red-500/5",
                                  step.status === "running" && "bg-blue-500/5",
                                  step.status === "skipped" && "opacity-50",
                                )}>
                                  <span className="text-muted-foreground w-5 text-right">{i + 1}</span>
                                  {step.status === "passed" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                  {step.status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                  {step.status === "running" && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />}
                                  {step.status === "pending" && <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                  {step.status === "skipped" && <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                                  <Badge variant="outline" className="text-[9px] px-1 shrink-0">{step.action}</Badge>
                                  <span className="flex-1 truncate">{step.description}</span>
                                  {step.duration !== undefined && (
                                    <span className="text-muted-foreground shrink-0">{step.duration}ms</span>
                                  )}
                                  {step.error && (
                                    <span className="text-red-400 truncate max-w-[200px]" title={step.error}>{step.error}</span>
                                  )}
                                  {step.screenshotUrl && (
                                    <a href={step.screenshotUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                      <Camera className="w-3 h-3 text-primary" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* ── A11y Audit Panel ── */}
            {bottomPanel === "a11y" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-medium">Accessibility Audit</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={async () => {
                      try {
                        const resp = await fetch(`/api/trpc/browser.accessibilityAudit`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ json: { sessionId: activeSessionId } }),
                          credentials: "include",
                        }).then(r => r.json());
                        if (resp?.result?.data?.json) {
                          const data = resp.result.data.json;
                          setA11yResults({ violations: data.violations || [], passes: data.passes || 0, score: data.score || 0 });
                        }
                      } catch (err) {
                        console.error("A11y audit failed:", err);
                      }
                    }}
                  >
                    Run Audit
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  {!a11yResults ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-8">
                      <div className="text-center space-y-2">
                        <Eye className="w-8 h-8 mx-auto text-muted-foreground/30" />
                        <p>Click "Run Audit" to check accessibility.</p>
                        <p className="text-[10px]">Checks WCAG rules: alt text, labels, headings, ARIA, contrast, skip links.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      <div className="flex items-center gap-3 px-2 py-1">
                        <div className={cn(
                          "text-2xl font-bold",
                          a11yResults.score >= 90 ? "text-emerald-500" : a11yResults.score >= 70 ? "text-yellow-500" : "text-red-500"
                        )}>
                          {a11yResults.score}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>{a11yResults.violations.length} violation{a11yResults.violations.length !== 1 ? "s" : ""}</p>
                          <p>{a11yResults.passes} checks passed</p>
                        </div>
                      </div>
                      {a11yResults.violations.map((v: any, i: number) => (
                        <div key={i} className="border border-border rounded px-2 py-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant={v.impact === "critical" ? "destructive" : "outline"} className="text-[9px]">
                              {v.impact}
                            </Badge>
                            <span className="font-medium">{v.rule}</span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">{v.description}</p>
                          <code className="text-[10px] text-muted-foreground block mt-0.5 truncate">{v.selector}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* ── Performance Metrics Panel ── */}
            {bottomPanel === "perf" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-medium">Performance Metrics (CDP)</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={async () => {
                      try {
                        const resp = await fetch(`/api/trpc/browser.performanceMetrics?input=${encodeURIComponent(JSON.stringify({ json: { sessionId: activeSessionId } }))}`).then(r => r.json());
                        if (resp?.result?.data?.json?.metrics) {
                          setPerfMetrics(resp.result.data.json.metrics);
                        }
                      } catch (err) {
                        console.error("Perf metrics failed:", err);
                      }
                    }}
                  >
                    Measure
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  {!perfMetrics ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-8">
                      <div className="text-center space-y-2">
                        <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground/30" />
                        <p>Click "Measure" to capture Core Web Vitals.</p>
                        <p className="text-[10px]">LCP, CLS, FCP, TTFB, JS heap, layout counts via CDP.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "LCP", value: perfMetrics.lcp, unit: "ms", good: 2500 },
                          { label: "CLS", value: perfMetrics.cls, unit: "", good: 0.1 },
                          { label: "FCP", value: perfMetrics.fcp, unit: "ms", good: 1800 },
                          { label: "TTFB", value: perfMetrics.ttfb, unit: "ms", good: 800 },
                          { label: "DOM Loaded", value: perfMetrics.domContentLoaded, unit: "ms", good: 3000 },
                          { label: "Load", value: perfMetrics.loadComplete, unit: "ms", good: 5000 },
                          { label: "JS Heap", value: perfMetrics.jsHeapUsedSize ? Math.round(perfMetrics.jsHeapUsedSize / 1024 / 1024) : undefined, unit: "MB", good: 50 },
                          { label: "Layouts", value: perfMetrics.layoutCount, unit: "", good: 100 },
                          { label: "Script Time", value: perfMetrics.scriptDuration ? Math.round(perfMetrics.scriptDuration * 1000) : undefined, unit: "ms", good: 2000 },
                        ].map(m => (
                          <div key={m.label} className="border border-border rounded p-2 text-center">
                            <div className="text-[10px] text-muted-foreground">{m.label}</div>
                            <div className={cn(
                              "text-sm font-mono font-bold",
                              m.value === undefined ? "text-muted-foreground" :
                              (typeof m.value === "number" && m.value <= m.good) ? "text-emerald-500" : "text-yellow-500"
                            )}>
                              {m.value !== undefined ? `${typeof m.value === "number" ? m.value.toFixed(m.unit === "" ? 3 : 0) : m.value}${m.unit}` : "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* ── Code Coverage Panel ── */}
            {bottomPanel === "coverage" && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-medium">Code Coverage (CDP)</span>
                  <div className="flex items-center gap-1">
                    {!coverageRunning ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={async () => {
                          try {
                            await fetch(`/api/trpc/browser.startCoverage`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ json: { sessionId: activeSessionId } }),
                              credentials: "include",
                            });
                            setCoverageRunning(true);
                          } catch (err) {
                            console.error("Start coverage failed:", err);
                          }
                        }}
                      >
                        Start Recording
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={async () => {
                          try {
                            const resp = await fetch(`/api/trpc/browser.stopCoverage`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ json: { sessionId: activeSessionId } }),
                              credentials: "include",
                            }).then(r => r.json());
                            if (resp?.result?.data?.json) {
                              const data = resp.result.data.json;
                              setCoverageData({ js: data.jsCoverage || [], css: data.cssCoverage || [] });
                            }
                            setCoverageRunning(false);
                          } catch (err) {
                            console.error("Stop coverage failed:", err);
                            setCoverageRunning(false);
                          }
                        }}
                      >
                        <Loader2 className="w-3 h-3 animate-spin mr-1" /> Stop & Analyze
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {!coverageData ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-8">
                      <div className="text-center space-y-2">
                        <Code className="w-8 h-8 mx-auto text-muted-foreground/30" />
                        <p>{coverageRunning ? "Recording coverage... navigate and interact, then click Stop." : "Click \"Start Recording\" to begin coverage collection."}</p>
                        <p className="text-[10px]">Tracks JS and CSS usage via CDP Profiler.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 space-y-3">
                      <div>
                        <div className="text-xs font-medium mb-1">JavaScript ({coverageData.js.length} files)</div>
                        {coverageData.js.slice(0, 20).map((file: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                            <div className="w-10 text-right font-mono font-bold" style={{ color: file.usedPercent >= 70 ? "#22c55e" : file.usedPercent >= 40 ? "#eab308" : "#ef4444" }}>
                              {file.usedPercent}%
                            </div>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${file.usedPercent}%`, backgroundColor: file.usedPercent >= 70 ? "#22c55e" : file.usedPercent >= 40 ? "#eab308" : "#ef4444" }} />
                            </div>
                            <span className="text-muted-foreground truncate max-w-[200px]">{file.url.split("/").pop() || file.url}</span>
                          </div>
                        ))}
                      </div>
                      {coverageData.css.length > 0 && (
                        <div>
                          <div className="text-xs font-medium mb-1">CSS ({coverageData.css.length} sheets)</div>
                          {coverageData.css.slice(0, 10).map((file: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                              <div className="w-10 text-right font-mono font-bold" style={{ color: file.usedPercent >= 70 ? "#22c55e" : "#eab308" }}>
                                {file.usedPercent}%
                              </div>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${file.usedPercent}%`, backgroundColor: file.usedPercent >= 70 ? "#22c55e" : "#eab308" }} />
                              </div>
                              <span className="text-muted-foreground truncate max-w-[200px]">{file.url}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Step Dialog ── */}
      <Dialog open={showAddStepDialog} onOpenChange={setShowAddStepDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Test Step</DialogTitle>
            <DialogDescription>Define a new step for the QA test suite.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Action</label>
              <select
                value={newStepAction}
                onChange={e => setNewStepAction(e.target.value as QATestStep["action"])}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="navigate">Navigate</option>
                <option value="click">Click</option>
                <option value="type">Type</option>
                <option value="screenshot">Screenshot</option>
                <option value="wait">Wait for Selector</option>
                <option value="assert">Assert Element Exists</option>
                <option value="scroll">Scroll</option>
                <option value="pressKey">Press Key</option>
              </select>
            </div>
            {["click", "type", "wait", "assert"].includes(newStepAction) && (
              <div>
                <label className="text-xs font-medium mb-1 block">CSS Selector</label>
                <Input
                  value={newStepSelector}
                  onChange={e => setNewStepSelector(e.target.value)}
                  placeholder="e.g., button.submit, #login-form input[type='email']"
                  className="text-sm"
                />
              </div>
            )}
            {["navigate", "type", "scroll", "pressKey"].includes(newStepAction) && (
              <div>
                <label className="text-xs font-medium mb-1 block">Value</label>
                <Input
                  value={newStepValue}
                  onChange={e => setNewStepValue(e.target.value)}
                  placeholder={
                    newStepAction === "navigate" ? "URL (e.g., /settings)" :
                    newStepAction === "type" ? "Text to type" :
                    newStepAction === "scroll" ? "up or down" :
                    "Key name (e.g., Enter, Tab)"
                  }
                  className="text-sm"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block">Description</label>
              <Input
                value={newStepDescription}
                onChange={e => setNewStepDescription(e.target.value)}
                placeholder="What this step does..."
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStepDialog(false)}>Cancel</Button>
            <Button onClick={addCustomStep} disabled={!newStepDescription.trim()}>Add Step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
