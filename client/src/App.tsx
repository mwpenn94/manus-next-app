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
import FeedbackWidget from "./components/FeedbackWidget";
import OnboardingTooltips from "./components/OnboardingTooltips";

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
const ComputerUsePage = lazy(() => import("./pages/ComputerUsePage"));
const FigmaImportPage = lazy(() => import("./pages/FigmaImportPage"));
const DesktopAppPage = lazy(() => import("./pages/DesktopAppPage"));
const MessagingAgentPage = lazy(() => import("./pages/MessagingAgentPage"));
const ConnectDevicePage = lazy(() => import("./pages/ConnectDevicePage"));
const MobileProjectsPage = lazy(() => import("./pages/MobileProjectsPage"));
const AppPublishPage = lazy(() => import("./pages/AppPublishPage"));
const VideoGeneratorPage = lazy(() => import("./pages/VideoGeneratorPage"));
const GitHubPage = lazy(() => import("./pages/GitHubPage"));
const WebAppProjectPage = lazy(() => import("./pages/WebAppProjectPage"));
const Library = lazy(() => import("./pages/Library"));
const ClientInferencePage = lazy(() => import("./pages/ClientInferencePage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DataControlsPage = lazy(() => import("./pages/DataControlsPage"));
const MailManusPage = lazy(() => import("./pages/MailManusPage"));
const DeployedWebsitesPage = lazy(() => import("./pages/DeployedWebsitesPage"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const WebhooksPage = lazy(() => import("./pages/WebhooksPage"));

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
      <Route path="/computer">
        <Suspense fallback={<PageLoader />}>
          <ComputerUsePage />
        </Suspense>
      </Route>
      <Route path="/figma-import">
        <Suspense fallback={<PageLoader />}>
          <FigmaImportPage />
        </Suspense>
      </Route>
      <Route path="/desktop-app">
        <Suspense fallback={<PageLoader />}>
          <DesktopAppPage />
        </Suspense>
      </Route>
      <Route path="/messaging">
        <Suspense fallback={<PageLoader />}>
          <MessagingAgentPage />
        </Suspense>
      </Route>
      <Route path="/connect-device">
        <Suspense fallback={<PageLoader />}>
          <ConnectDevicePage />
        </Suspense>
      </Route>
      <Route path="/mobile-projects">
        <Suspense fallback={<PageLoader />}>
          <MobileProjectsPage />
        </Suspense>
      </Route>
      <Route path="/app-publish">
        <Suspense fallback={<PageLoader />}>
          <AppPublishPage />
        </Suspense>
      </Route>
      <Route path="/video">
        <Suspense fallback={<PageLoader />}>
          <VideoGeneratorPage />
        </Suspense>
      </Route>
      <Route path="/library">
        <Suspense fallback={<PageLoader />}>
          <Library />
        </Suspense>
      </Route>
      <Route path="/client-inference">
        <Suspense fallback={<PageLoader />}>
          <ClientInferencePage />
        </Suspense>
      </Route>
      <Route path="/github">
        <Suspense fallback={<PageLoader />}>
          <GitHubPage />
        </Suspense>
      </Route>
      <Route path="/github/:repoId">
        <Suspense fallback={<PageLoader />}>
          <GitHubPage />
        </Suspense>
      </Route>
      <Route path="/projects/webapp/:projectId">
        <Suspense fallback={<PageLoader />}>
          <WebAppProjectPage />
        </Suspense>
      </Route>
      <Route path="/shared/:token">
        <Suspense fallback={<PageLoader />}>
          <SharedTaskView />
        </Suspense>
      </Route>
      <Route path="/data-controls">
        <Suspense fallback={<PageLoader />}>
          <DataControlsPage />
        </Suspense>
      </Route>
      <Route path="/mail">
        <Suspense fallback={<PageLoader />}>
          <MailManusPage />
        </Suspense>
      </Route>
      <Route path="/deployments">
        <Suspense fallback={<PageLoader />}>
          <DeployedWebsitesPage />
        </Suspense>
      </Route>
      <Route path="/deployed-websites">
        <Suspense fallback={<PageLoader />}>
          <DeployedWebsitesPage />
        </Suspense>
      </Route>
      <Route path="/discover">
        <Suspense fallback={<PageLoader />}>
          <DiscoverPage />
        </Suspense>
      </Route>
      <Route path="/profile">
        <Suspense fallback={<PageLoader />}>
          <ProfilePage />
        </Suspense>
      </Route>
      <Route path="/webhooks">
        <Suspense fallback={<PageLoader />}>
          <WebhooksPage />
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
            <FeedbackWidget />
            <OnboardingTooltips />
          </TooltipProvider>
          </TaskProvider>
        </BridgeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
