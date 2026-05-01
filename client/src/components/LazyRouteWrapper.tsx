
import React, { Component, Suspense, lazy, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ErrorBoundary to catch chunk loading errors
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ChunkLoadErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Chunk load failed:", error, errorInfo);
  }

  handleRetry = () => {
    // A full page reload is a robust way to handle chunk load errors,
    // as it clears the potentially corrupted state of the module federation/linking.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
          <h2 className="text-xl font-semibold">Something went wrong.</h2>
          <p className="text-sm text-muted-foreground">A component failed to load. This might be due to a network issue.</p>
          <Button onClick={this.handleRetry}>Retry</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading fallback component
const LoadingFallback = ({ name }: { name: string }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background text-foreground">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="text-sm text-muted-foreground">Loading {name}...</span>
  </div>
);

// Props for the main wrapper component
export interface LazyRouteWrapperProps {
  /**
   * A function that returns a dynamic import e.g. () => import('./MyComponent')
   */
  factory: () => Promise<{ default: ComponentType<any> }>;
  /**
   * A descriptive name for the route/component being loaded.
   */
  name: string;
}

/**
 * A wrapper for lazy-loading route components with Suspense and an ErrorBoundary.
 * Handles chunk load failures with a retry mechanism.
 */
const LazyRouteWrapper = ({ factory, name }: LazyRouteWrapperProps) => {
  const LazyComponent = lazy(factory);

  return (
    <ChunkLoadErrorBoundary>
      <Suspense fallback={<LoadingFallback name={name} />}>
        <LazyComponent />
      </Suspense>
    </ChunkLoadErrorBoundary>
  );
};

export default LazyRouteWrapper;
