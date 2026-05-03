import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional fallback UI */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * User-friendly error message mapping.
 * Converts raw technical errors into actionable guidance.
 * NEVER exposes stack traces or technical details to end users.
 */
function getUserFriendlyMessage(error: Error | null): { title: string; description: string } {
  if (!error) return { title: "Something went wrong", description: "An unexpected error occurred." };

  const msg = error.message || "";

  if (msg.includes("Cannot read properties of undefined") || msg.includes("Cannot read properties of null")) {
    return {
      title: "Something went wrong",
      description: "A temporary issue occurred while processing your request. This usually resolves on its own — try refreshing the page.",
    };
  }
  if (msg.includes("NetworkError") || msg.includes("Failed to fetch") || msg.includes("Load failed")) {
    return {
      title: "Connection issue",
      description: "We're having trouble connecting to the server. Please check your internet connection and try again.",
    };
  }
  if (msg.includes("ChunkLoadError") || msg.includes("Loading chunk") || msg.includes("dynamically imported module")) {
    return {
      title: "Update available",
      description: "A new version of the app is available. Please reload the page to get the latest version.",
    };
  }
  if (msg.includes("out of memory") || msg.includes("Maximum call stack")) {
    return {
      title: "Resource limit reached",
      description: "The operation exceeded available resources. Try breaking your task into smaller parts, or reload the page.",
    };
  }
  if (msg.includes("timeout") || msg.includes("Timeout")) {
    return {
      title: "Request timed out",
      description: "The operation took longer than expected. Please try again — if the issue persists, try a simpler request.",
    };
  }
  if (msg.includes("Task not found") || msg.includes("not found")) {
    return {
      title: "Page not found",
      description: "The page or task you were looking for couldn't be found. It may have been moved or deleted.",
    };
  }

  return {
    title: "Something went wrong",
    description: "An unexpected error occurred. The error has been reported automatically. You can try again or reload the page.",
  };
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report error to server for observability — but NEVER expose to user
    try {
      fetch("/api/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack?.slice(0, 2000),
          componentStack: errorInfo.componentStack?.slice(0, 2000),
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
        credentials: "include",
      }).catch(() => {});
    } catch { /* silently ignore */ }
  }

  handleGoHome = () => {
    // Navigate to home and clear error state
    window.location.href = "/";
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { title, description } = getUserFriendlyMessage(this.state.error);

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-lg p-8">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertTriangle
                size={28}
                className="text-destructive flex-shrink-0"
              />
            </div>

            <h2 className="text-xl font-semibold mb-2 text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center leading-relaxed max-w-md">
              {description}
            </p>

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
                  "bg-muted text-muted-foreground",
                  "hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                )}
              >
                <RotateCcw size={14} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <Home size={14} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
