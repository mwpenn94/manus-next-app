import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, Undo2, Eye, X, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// --- TYPES ---
type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastAction = {
  label: string;
  onClick: () => void;
};

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
}

// --- CONSTANTS ---
const MAX_VISIBLE_TOASTS = 4;
const TOAST_LIFETIME = 5000; // 5 seconds

const toastIcons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

// --- TOAST ITEM COMPONENT ---
const ToastItem: React.FC<{ 
  toast: Toast; 
  onDismiss: (id: string) => void; 
  isPaused: boolean;
}> = ({ toast, onDismiss, isPaused }) => {
  const [startTime] = useState(Date.now());
  const [remainingTime, setRemainingTime] = useState(toast.duration || TOAST_LIFETIME);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [isPaused, remainingTime, onDismiss, toast.id]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setRemainingTime(Math.max((toast.duration || TOAST_LIFETIME) - elapsed, 0));
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, startTime, toast.duration]);

  const Icon = toastIcons[toast.type];
  const progressValue = (remainingTime / (toast.duration || TOAST_LIFETIME)) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-full max-w-sm rounded-lg shadow-lg bg-card border border-border"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={cn('h-6 w-6', toastColors[toast.type])} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-foreground">{toast.title}</p>
            {toast.message && <p className="mt-1 text-sm text-muted-foreground">{toast.message}</p>}
            <div className="mt-3 flex gap-2">
              {toast.action && (
                <Button size="sm" onClick={toast.action.onClick} className="bg-background hover:bg-muted">
                  {toast.action.label === 'Undo' && <Undo2 className="mr-2 h-4 w-4" />}
                  {toast.action.label === 'View' && <Eye className="mr-2 h-4 w-4" />}
                  {toast.action.label}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onDismiss(toast.id)} className="text-muted-foreground hover:text-foreground">
                Dismiss
              </Button>
            </div>
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              onClick={() => onDismiss(toast.id)}
              className="inline-flex rounded-md bg-card text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card"
              aria-label="Close notification"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <Progress value={progressValue} className="h-1 w-full rounded-b-lg rounded-t-none bg-muted" />
    </motion.div>
  );
};

// --- MAIN COMPONENT ---
const NotificationToastStack: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = new Date().toISOString() + Math.random();
    setToasts((currentToasts) => [{ ...toast, id }, ...currentToasts]);
  }, []);

  // --- MOCK DATA & DEMO CONTROLS ---
  const createDemoToast = () => {
    const types: ToastType[] = ['success', 'error', 'warning', 'info'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const actions: Array<ToastAction | undefined> = [
      undefined,
      { label: 'Undo', onClick: () => console.log('Undo clicked') },
      { label: 'View', onClick: () => console.log('View clicked') },
    ];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    addToast({
      type: randomType,
      title: `${randomType.charAt(0).toUpperCase() + randomType.slice(1)} Notification`,
      message: 'This is a sample message for the toast.',
      duration: 5000 + Math.random() * 2000,
      action: randomAction,
    });
  };

  useEffect(() => {
    // Add initial toasts for demonstration
    addToast({ type: 'info', title: 'Welcome!', message: 'Hover over a toast to pause it.' });
    setTimeout(() => addToast({ type: 'success', title: 'Setup Complete', message: 'Your profile is ready.' }), 1000);
  }, [addToast]);

  const visibleToasts = useMemo(() => toasts.slice(0, MAX_VISIBLE_TOASTS), [toasts]);
  const hiddenToastsCount = useMemo(() => Math.max(0, toasts.length - MAX_VISIBLE_TOASTS), [toasts]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2" 
         onMouseEnter={() => setIsHovered(true)} 
         onMouseLeave={() => setIsHovered(false)}
         role="region"
         aria-live="assertive"
         aria-label="Notification Toast Stack"
    >
      {/* Demo Button - For development/showcase purposes */}
      <Button onClick={createDemoToast} size="sm" className="mb-2">
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Toast
      </Button>

      <AnimatePresence initial={false}>
        {visibleToasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            layout
            className="relative"
            style={{ zIndex: toasts.length - index }}
            animate={{ 
              y: index * -10, 
              scale: 1 - index * 0.05,
              opacity: 1 - index * 0.1
            }}
          >
            <ToastItem toast={toast} onDismiss={dismissToast} isPaused={isHovered} />
          </motion.div>
        ))}
      </AnimatePresence>
      {hiddenToastsCount > 0 && (
        <div className="flex items-center justify-center w-full max-w-sm px-4 py-2 mt-2 text-xs font-medium text-center rounded-full bg-muted text-muted-foreground">
          + {hiddenToastsCount} more notification{hiddenToastsCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default NotificationToastStack;
