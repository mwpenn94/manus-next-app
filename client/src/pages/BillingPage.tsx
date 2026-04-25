/**
 * BillingPage — Usage Dashboard + Payment History
 *
 * Shows actual task statistics, subscription status, plan selection,
 * and payment history fetched from Stripe API.
 */
import { useMemo, useState } from "react";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  LogIn,
  CreditCard,
  ExternalLink,
  Receipt,
  Crown,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function BillingPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Real usage stats from the database
  const statsQuery = trpc.usage.stats.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Real task list for recent activity
  const tasksQuery = trpc.task.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Stripe products
  const productsQuery = trpc.payment.products.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Payment history
  const historyQuery = trpc.payment.history.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Subscription details
  const subQuery = trpc.payment.subscription.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const checkoutMutation = trpc.payment.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.success("Redirecting to checkout...");
      window.open(data.url, "_blank");
    },
    onError: (err) => { toast.error("Checkout failed: " + err.message); },
  });
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const handleCheckout = (productId: string) => {
    setCheckingOut(productId);
    checkoutMutation.mutate(
      { productId, origin: window.location.origin },
      { onSettled: () => setCheckingOut(null) }
    );
  };

  const stats = statsQuery.data;
  const recentTasks = useMemo(() => {
    if (!tasksQuery.data) return [];
    const items = (tasksQuery.data as any)?.items ?? tasksQuery.data;
    if (!items || !Array.isArray(items)) return [];
    return items.slice(0, 10);
  }, [tasksQuery.data]);

  const payments = historyQuery.data?.payments ?? [];
  const subscription = subQuery.data;

  // Unauthenticated state
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Usage Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in to view your task usage statistics and activity history.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (statsQuery.isLoading || authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-mobile-nav">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            Usage & Billing
          </h1>
          <p className="text-sm text-muted-foreground">Your task activity, subscription, and payment history.</p>
        </motion.div>

        {/* Active Subscription Banner */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="mt-5 bg-primary/5 border border-primary/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Active Subscription</h3>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                    subscription.status === "active" ? "bg-muted/50 text-muted-foreground" :
                    subscription.status === "trialing" ? "bg-blue-500/10 text-blue-400" :
                    "bg-muted/50 text-foreground"
                  )}>
                    {subscription.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${(subscription.plan.amount / 100).toFixed(2)}/{subscription.plan.interval}
                  {subscription.cancelAtPeriodEnd && " · Cancels at period end"}
                  {" · Renews "}
                  {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Total Tasks", value: stats?.totalTasks ?? 0, icon: Sparkles, color: "text-primary" },
            { label: "Completed", value: stats?.completedTasks ?? 0, icon: CheckCircle2, color: "text-muted-foreground" },
            { label: "Running", value: stats?.runningTasks ?? 0, icon: Zap, color: "text-foreground" },
            { label: "Errors", value: stats?.errorTasks ?? 0, icon: AlertCircle, color: "text-red-400" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
                <span className="text-[11px] text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Completion Rate */}
        {stats && stats.totalTasks > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-5 mt-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                Completion Rate
              </h3>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {Math.round((stats.completedTasks / stats.totalTasks) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-foreground/70"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.completedTasks / stats.totalTasks) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {stats.completedTasks} of {stats.totalTasks} tasks completed successfully
            </p>
          </motion.div>
        )}

        {/* Plans & Credits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="mt-6"
        >
          <h3 className="text-sm font-medium text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            <CreditCard className="w-4 h-4 inline mr-2" />
            Plans & Credits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(productsQuery.data ?? []).map((product: any) => (
              <div key={product.id} className="bg-card border border-border rounded-xl p-4">
                <h4 className="text-sm font-semibold text-foreground">{product.name}</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-3">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">
                    ${product.price}{product.interval ? `/${product.interval === "month" ? "mo" : "yr"}` : ""}
                  </span>
                  <button
                    onClick={() => handleCheckout(product.id)}
                    disabled={checkingOut === product.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {checkingOut === product.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                    {product.mode === "subscription" ? "Subscribe" : "Buy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Test with card 4242 4242 4242 4242. Payments processed by Stripe.
          </p>
        </motion.div>

        {/* Payment History */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-6"
        >
          <h3 className="text-sm font-medium text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            <Receipt className="w-4 h-4 inline mr-2" />
            Payment History
          </h3>
          {historyQuery.isLoading ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto" />
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No payments yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Purchases and subscriptions will appear here.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {payments.map((payment: any, i: number) => (
                <div key={payment.id} className={cn(
                  "flex items-center justify-between px-4 py-3",
                  i < payments.length - 1 && "border-b border-border/50"
                )}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize shrink-0",
                      payment.status === "succeeded" ? "bg-muted/50 text-muted-foreground" :
                      payment.status === "pending" ? "bg-muted/50 text-foreground" :
                      "bg-red-500/10 text-red-400"
                    )}>
                      {payment.status}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm text-foreground block truncate">
                        {payment.description || "Payment"}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(payment.created * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                    </span>
                    {payment.receiptUrl && (
                      <a
                        href={payment.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="View receipt"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="mt-6 mb-8"
        >
          <h3 className="text-sm font-medium text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Recent Activity
          </h3>
          {recentTasks.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No tasks yet. Create your first task from the home page.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {recentTasks.map((task: any, i: number) => (
                <div key={task.id} className={cn(
                  "flex items-center justify-between px-4 py-3",
                  i < recentTasks.length - 1 && "border-b border-border/50"
                )}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize shrink-0",
                      task.status === "completed" ? "bg-muted/50 text-muted-foreground" :
                      task.status === "running" ? "bg-muted/50 text-foreground" :
                      task.status === "error" ? "bg-red-500/10 text-red-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {task.status}
                    </span>
                    <span className="text-sm text-foreground truncate">{task.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
