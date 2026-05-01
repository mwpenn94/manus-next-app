import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { TaskProvider } from "./contexts/TaskContext";
import { BridgeProvider } from "./contexts/BridgeContext";
import { lazy, Suspense } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import AppLayout from "./components/AppLayout";
import OnboardingTooltips from "./components/OnboardingTooltips";
// OnboardingTour removed — replaced by OnboardingTooltips (Pass 52)
import AnimatedRoute from "./components/AnimatedRoute";

// Eagerly loaded
import Home from "./pages/Home";

// Lazy-loaded pages — Manus-aligned core surfaces only
const TaskView = lazy(() => import("./pages/TaskView"));
import TaskViewSkeleton from "./components/TaskViewSkeleton";
const BillingPage = lazy(() => import("./pages/BillingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SharedTaskView = lazy(() => import("./pages/SharedTaskView"));
const MemoryPage = lazy(() => import("./pages/MemoryPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const ReplayPage = lazy(() => import("./pages/ReplayPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const GitHubPage = lazy(() => import("./pages/GitHubPage"));
const WebAppProjectPage = lazy(() => import("./pages/WebAppProjectPage"));
const Library = lazy(() => import("./pages/Library"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

// Tools & Management surfaces (Manus-aligned)
const ConnectorsPage = lazy(() => import("./pages/ConnectorsPage"));
const ConnectorDetailPage = lazy(() => import("./pages/ConnectorDetailPage"));
const SkillsPage = lazy(() => import("./pages/SkillsPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const WebhooksPage = lazy(() => import("./pages/WebhooksPage"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const DataControlsPage = lazy(() => import("./pages/DataControlsPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const DeployedWebsitesPage = lazy(() => import("./pages/DeployedWebsitesPage"));
const DesignView = lazy(() => import("./pages/DesignView"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SuspenseRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}><AnimatedRoute>{children}</AnimatedRoute></Suspense>;
}

/** Admin-only route wrapper */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">Admin Access Required</h2>
        <p className="text-muted-foreground text-center max-w-md">This page requires administrator privileges. Contact your admin for access.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/task/:id">
        {() => <Suspense fallback={<TaskViewSkeleton />}><TaskView /></Suspense>}
      </Route>

      {/* Core Manus pages */}
      <Route path="/billing">
        <SuspenseRoute><BillingPage /></SuspenseRoute>
      </Route>
      <Route path="/settings">
        <SuspenseRoute><SettingsPage /></SuspenseRoute>
      </Route>
      <Route path="/memory">
        <SuspenseRoute><MemoryPage /></SuspenseRoute>
      </Route>
      <Route path="/schedule">
        <SuspenseRoute><SchedulePage /></SuspenseRoute>
      </Route>
      <Route path="/replay/:taskId">
        <SuspenseRoute><ReplayPage /></SuspenseRoute>
      </Route>
      <Route path="/replay">
        <SuspenseRoute><ReplayPage /></SuspenseRoute>
      </Route>
      <Route path="/projects/webapp/:projectId">
        <SuspenseRoute><WebAppProjectPage /></SuspenseRoute>
      </Route>
      <Route path="/projects">
        <SuspenseRoute><ProjectsPage /></SuspenseRoute>
      </Route>
      <Route path="/project/:id">
        <SuspenseRoute><ProjectsPage /></SuspenseRoute>
      </Route>
      <Route path="/library">
        <SuspenseRoute><Library /></SuspenseRoute>
      </Route>
      <Route path="/github/:repoId">
        <SuspenseRoute><GitHubPage /></SuspenseRoute>
      </Route>
      <Route path="/github">
        <SuspenseRoute><GitHubPage /></SuspenseRoute>
      </Route>
      <Route path="/share/:token">
        <SuspenseRoute><SharedTaskView /></SuspenseRoute>
      </Route>
      <Route path="/shared/:token">
        <SuspenseRoute><SharedTaskView /></SuspenseRoute>
      </Route>
      <Route path="/profile">
        <SuspenseRoute><ProfilePage /></SuspenseRoute>
      </Route>
      <Route path="/discover">
        <SuspenseRoute><DiscoverPage /></SuspenseRoute>
      </Route>
      <Route path="/help">
        <SuspenseRoute><HelpPage /></SuspenseRoute>
      </Route>

      {/* Management surfaces */}
      <Route path="/connectors">
        <SuspenseRoute><ConnectorsPage /></SuspenseRoute>
      </Route>
      <Route path="/connector/:id">
        <SuspenseRoute><ConnectorDetailPage /></SuspenseRoute>
      </Route>
      <Route path="/skills">
        <SuspenseRoute><SkillsPage /></SuspenseRoute>
      </Route>
      <Route path="/team">
        <SuspenseRoute><TeamPage /></SuspenseRoute>
      </Route>
      <Route path="/deployed-websites">
        <SuspenseRoute><DeployedWebsitesPage /></SuspenseRoute>
      </Route>
      <Route path="/design/:id">
        <SuspenseRoute><DesignView /></SuspenseRoute>
      </Route>

      {/* Admin-only */}
      <Route path="/webhooks">
        <SuspenseRoute><AdminRoute><WebhooksPage /></AdminRoute></SuspenseRoute>
      </Route>
      <Route path="/data-controls">
        <SuspenseRoute><AdminRoute><DataControlsPage /></AdminRoute></SuspenseRoute>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      toastOptions={{
        style: theme === 'dark' ? {
          background: 'oklch(0.2603 0 0)',
          border: '1px solid oklch(0.2768 0 0)',
          color: 'oklch(0.8884 0 0)',
        } : {
          background: 'oklch(0.98 0.001 80)',
          border: '1px solid oklch(0.88 0.002 80)',
          color: 'oklch(0.24 0.01 70)',
        },
      }}
    />
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <BridgeProvider>
          <TaskProvider>
          <TooltipProvider>
            <nav aria-label="Skip navigation" className="contents">
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Skip to main content
              </a>
            </nav>
            <ThemedToaster />
            <AppLayout>
              <Router />
            </AppLayout>
            <OnboardingTooltips />
          </TooltipProvider>
          </TaskProvider>
        </BridgeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
