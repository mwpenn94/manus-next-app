import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Copy, Check } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional fallback UI */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report error to server for observability (B5)
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

  handleCopyError = () => {
    const text = this.state.error?.stack || this.state.error?.message || "Unknown error";
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">An unexpected error occurred. The error has been reported automatically.</p>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6 relative group">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack || this.state.error?.message}
              </pre>
              <button
                onClick={this.handleCopyError}
                className="absolute top-2 right-2 p-1.5 rounded bg-background/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy error"
              >
                {this.state.copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-muted text-muted-foreground",
                  "hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                )}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Reload Page
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
