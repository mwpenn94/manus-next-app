import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { TaskProvider } from "./contexts/TaskContext";
import { BridgeProvider } from "./contexts/BridgeContext";
import { lazy, Suspense } from "react";
import AppLayout from "./components/AppLayout";
// FeedbackWidget removed from global layout — feedback moved to Settings page (Manus alignment)
import OnboardingTooltips from "./components/OnboardingTooltips";

// Eagerly loaded
import Home from "./pages/Home";

// Lazy-loaded pages — Manus-aligned only
const TaskView = lazy(() => import("./pages/TaskView"));
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
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const BrowserPage = lazy(() => import("./pages/BrowserPage"));
const WebAppBuilderPage = lazy(() => import("./pages/WebAppBuilderPage"));
// DataControlsPage and MailManusPage removed — not in Manus navigation
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/task/:id">
        {(params) => (
          <Suspense fallback={<PageLoader />}>
            <TaskView />
          </Suspense>
        )}
      </Route>
      <Route path="/billing">
        <Suspense fallback={<PageLoader />}>
          <BillingPage />
        </Suspense>
      </Route>
      <Route path="/analytics">
        <Suspense fallback={<PageLoader />}>
          <AnalyticsPage />
        </Suspense>
      </Route>
      <Route path="/settings">
        <Suspense fallback={<PageLoader />}>
          <SettingsPage />
        </Suspense>
      </Route>
      <Route path="/memory">
        <Suspense fallback={<PageLoader />}>
          <MemoryPage />
        </Suspense>
      </Route>
      <Route path="/schedule">
        <Suspense fallback={<PageLoader />}>
          <SchedulePage />
        </Suspense>
      </Route>
      <Route path="/replay/:taskId">
        <Suspense fallback={<PageLoader />}>
          <ReplayPage />
        </Suspense>
      </Route>
      <Route path="/replay">
        <Suspense fallback={<PageLoader />}>
          <ReplayPage />
        </Suspense>
      </Route>
      <Route path="/projects/webapp/:projectId">
        <Suspense fallback={<PageLoader />}>
          <WebAppProjectPage />
        </Suspense>
      </Route>
      <Route path="/projects">
        <Suspense fallback={<PageLoader />}>
          <ProjectsPage />
        </Suspense>
      </Route>
      <Route path="/project/:id">
        <Suspense fallback={<PageLoader />}>
          <ProjectsPage />
        </Suspense>
      </Route>
      <Route path="/library">
        <Suspense fallback={<PageLoader />}>
          <Library />
        </Suspense>
      </Route>
      <Route path="/github/:repoId">
        <Suspense fallback={<PageLoader />}>
          <GitHubPage />
        </Suspense>
      </Route>
      <Route path="/github">
        <Suspense fallback={<PageLoader />}>
          <GitHubPage />
        </Suspense>
      </Route>
      <Route path="/shared/:token">
        <Suspense fallback={<PageLoader />}>
          <SharedTaskView />
        </Suspense>
      </Route>
      <Route path="/browser">
        <Suspense fallback={<PageLoader />}>
          <BrowserPage />
        </Suspense>
      </Route>
      <Route path="/webapp-builder">
        <Suspense fallback={<PageLoader />}>
          <WebAppBuilderPage />
        </Suspense>
      </Route>
      {/* /data-controls and /mail removed — not in Manus navigation */}
      <Route path="/profile">
        <Suspense fallback={<PageLoader />}>
          <ProfilePage />
        </Suspense>
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
          background: 'oklch(0.16 0.005 60)',
          border: '1px solid oklch(0.25 0.005 60)',
          color: 'oklch(0.9 0.01 70)',
        } : {
          background: 'oklch(0.99 0.002 70)',
          border: '1px solid oklch(0.88 0.005 70)',
          color: 'oklch(0.18 0.01 60)',
        },
      }}
    />
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <BridgeProvider>
          <TaskProvider>
          <TooltipProvider>
            {/* Skip-to-content link for keyboard navigation */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Skip to main content
            </a>
            <ThemedToaster />
            <AppLayout>
              <Router />
            </AppLayout>
            {/* FeedbackWidget FAB removed — feedback accessible via Settings page (Manus alignment) */}
            <OnboardingTooltips />
          </TooltipProvider>
          </TaskProvider>
        </BridgeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
