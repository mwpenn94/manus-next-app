/**
 * A fallback component to display when a React component tree crashes.
 * It provides information about the error and actions to recover.
 */
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
}

const ErrorBoundaryFallback = ({ error, reset }: ErrorBoundaryFallbackProps) => {
  const [, navigate] = useLocation();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-[450px] shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Something went wrong</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. You can try to recover or return to the homepage.
            </p>
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-sm font-mono text-destructive-foreground">
              <code>{error.message}</code>
            </pre>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Try Again
              </Button>
              <Button onClick={() => navigate('/')}>
                Go Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ErrorBoundaryFallback;
