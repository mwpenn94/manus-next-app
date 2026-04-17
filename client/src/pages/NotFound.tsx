import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1
          className="text-5xl font-bold text-foreground mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          404
        </h1>
        <p className="text-muted-foreground mb-6">
          This page doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Home className="w-4 h-4" />
          Go Home
        </button>
      </div>
    </div>
  );
}
