import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TaskProvider } from "./contexts/TaskContext";
import { BridgeProvider } from "./contexts/BridgeContext";
import { lazy, Suspense } from "react";
import AppLayout from "./components/AppLayout";

// Eagerly loaded
import Home from "./pages/Home";

// Lazy-loaded pages
const TaskView = lazy(() => import("./pages/TaskView"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SharedTaskView = lazy(() => import("./pages/SharedTaskView"));
const MemoryPage = lazy(() => import("./pages/MemoryPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const ReplayPage = lazy(() => import("./pages/ReplayPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const DesignView = lazy(() => import("./pages/DesignView"));
const SkillsPage = lazy(() => import("./pages/SkillsPage"));
const SlidesPage = lazy(() => import("./pages/SlidesPage"));
const ConnectorsPage = lazy(() => import("./pages/ConnectorsPage"));
const MeetingsPage = lazy(() => import("./pages/MeetingsPage"));
const WebAppBuilderPage = lazy(() => import("./pages/WebAppBuilderPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));

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
      <Route path="/design">
        <Suspense fallback={<PageLoader />}>
          <DesignView />
        </Suspense>
      </Route>
      <Route path="/skills">
        <Suspense fallback={<PageLoader />}>
          <SkillsPage />
        </Suspense>
      </Route>
      <Route path="/slides">
        <Suspense fallback={<PageLoader />}>
          <SlidesPage />
        </Suspense>
      </Route>
      <Route path="/connectors">
        <Suspense fallback={<PageLoader />}>
          <ConnectorsPage />
        </Suspense>
      </Route>
      <Route path="/meetings">
        <Suspense fallback={<PageLoader />}>
          <MeetingsPage />
        </Suspense>
      </Route>
      <Route path="/webapp-builder">
        <Suspense fallback={<PageLoader />}>
          <WebAppBuilderPage />
        </Suspense>
      </Route>
      <Route path="/team">
        <Suspense fallback={<PageLoader />}>
          <TeamPage />
        </Suspense>
      </Route>
      <Route path="/shared/:token">
        <Suspense fallback={<PageLoader />}>
          <SharedTaskView />
        </Suspense>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <BridgeProvider>
          <TaskProvider>
          <TooltipProvider>
            <Toaster
              theme="dark"
              toastOptions={{
                style: {
                  background: 'oklch(0.16 0.005 60)',
                  border: '1px solid oklch(0.25 0.005 60)',
                  color: 'oklch(0.9 0.01 70)',
                },
              }}
            />
            <AppLayout>
              <Router />
            </AppLayout>
          </TooltipProvider>
          </TaskProvider>
        </BridgeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
