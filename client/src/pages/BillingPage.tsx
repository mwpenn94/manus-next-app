/**
 * BillingPage — "Warm Void" Manus-Authentic Usage & Billing
 * 
 * Convergence Pass 3: Added usage chart, refined stats cards,
 * polished transaction table, better tier comparison.
 */
import { useState, useMemo } from "react";
import {
  Sparkles,
  HelpCircle,
  ArrowUpRight,
  TrendingDown,
  Clock,
  Zap,
  CalendarDays,
  CreditCard,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Transaction {
  id: string;
  details: string;
  date: string;
  creditsChange: number;
  type: "task" | "bonus" | "upgrade" | "refund";
}

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: "t1", details: "Research Autonomous AI Systems", date: "2026-04-17 15:30", creditsChange: -476, type: "task" },
  { id: "t2", details: "Build Landing Page for Product Launch", date: "2026-04-16 10:15", creditsChange: -524, type: "task" },
  { id: "t3", details: "Analyze Q4 Sales Data", date: "2026-04-15 14:22", creditsChange: -312, type: "task" },
  { id: "t4", details: "Welcome bonus for early adopters", date: "2026-04-14 09:00", creditsChange: 2500, type: "bonus" },
  { id: "t5", details: "Plan upgrade: Pro tier activation", date: "2026-04-14 09:00", creditsChange: 5000, type: "upgrade" },
];

const DAILY_USAGE = [
  { day: "Mon", credits: 312 },
  { day: "Tue", credits: 524 },
  { day: "Wed", credits: 476 },
  { day: "Thu", credits: 0 },
  { day: "Fri", credits: 0 },
  { day: "Sat", credits: 0 },
  { day: "Sun", credits: 0 },
];

const TIERS = [
  {
    name: "Free",
    credits: "1K",
    price: "$0",
    period: "/mo",
    features: ["5 tasks per day", "Basic browser use", "Standard models", "Community support"],
    cta: "Downgrade",
    highlight: false,
  },
  {
    name: "Pro",
    credits: "10K",
    price: "$39",
    period: "/mo",
    features: ["Unlimited tasks", "Full browser + computer use", "Advanced models", "Priority queue", "Session replay"],
    cta: "Current Plan",
    highlight: true,
    current: true,
  },
  {
    name: "Team",
    credits: "50K",
    price: "$99",
    period: "/mo",
    features: ["Everything in Pro", "5 team members", "Shared workspace", "API access", "Custom models", "Dedicated support"],
    cta: "Upgrade",
    highlight: false,
  },
];

type TabId = "usage" | "plans" | "history";

function MiniBarChart({ data }: { data: typeof DAILY_USAGE }) {
  const max = Math.max(...data.map(d => d.credits), 1);
  return (
    <div className="flex items-end gap-2 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            className="w-full bg-primary/20 rounded-t-sm relative overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max((d.credits / max) * 64, d.credits > 0 ? 4 : 0)}px` }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm"
              style={{ height: "100%" }}
            />
          </motion.div>
          <span className="text-[9px] text-muted-foreground">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function TypeBadge({ type }: { type: Transaction["type"] }) {
  const styles = {
    task: "bg-blue-500/10 text-blue-400",
    bonus: "bg-emerald-500/10 text-emerald-400",
    upgrade: "bg-primary/10 text-primary",
    refund: "bg-amber-500/10 text-amber-400",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize", styles[type])}>
      {type}
    </span>
  );
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<TabId>("usage");
  const currentCredits = 6188;
  const totalCredits = 10000;
  const usagePercent = (currentCredits / totalCredits) * 100;

  const totalUsedThisWeek = useMemo(
    () => DAILY_USAGE.reduce((sum, d) => sum + d.credits, 0),
    []
  );

  return (
    <div className="h-full overflow-y-auto">
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
          <p className="text-sm text-muted-foreground">Manage your plan, credits, and usage history.</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mt-6 mb-6 border-b border-border">
          {([
            { id: "usage" as TabId, label: "Usage", icon: Zap },
            { id: "plans" as TabId, label: "Plans", icon: CreditCard },
            { id: "history" as TabId, label: "History", icon: Receipt },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Usage Tab */}
        {activeTab === "usage" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Plan + Credits Card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    Pro Plan
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                    Active
                  </span>
                </div>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  Manage plan <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              {/* Credits display */}
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Credits remaining</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
                      {currentCredits.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {totalCredits.toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Resets in</p>
                  <p className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-heading)" }}>14 days</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    usagePercent > 50 ? "bg-primary" : usagePercent > 20 ? "bg-amber-500" : "bg-red-500"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {(100 - usagePercent).toFixed(0)}% used this billing cycle
              </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Tasks Today", value: "3", icon: Zap, sub: "12 this week" },
                { label: "Credits Used", value: totalUsedThisWeek.toLocaleString(), icon: TrendingDown, sub: "this week" },
                { label: "Avg per Task", value: "437", icon: Clock, sub: "last 7 days" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-xl font-semibold text-foreground tabular-nums" style={{ fontFamily: "var(--font-heading)" }}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Usage Chart */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  This Week
                </h3>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Apr 14 – Apr 20</span>
                </div>
              </div>
              <MiniBarChart data={DAILY_USAGE} />
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
                Recent Activity
              </h3>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {DEMO_TRANSACTIONS.slice(0, 3).map((tx, i) => (
                  <div key={tx.id} className={cn(
                    "flex items-center justify-between px-4 py-3",
                    i < 2 && "border-b border-border/50"
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      <TypeBadge type={tx.type} />
                      <span className="text-sm text-foreground truncate">{tx.details}</span>
                    </div>
                    <span className={cn(
                      "text-sm font-mono tabular-nums shrink-0 ml-3",
                      tx.creditsChange > 0 ? "text-emerald-400" : "text-foreground/70"
                    )}>
                      {tx.creditsChange > 0 ? "+" : ""}{tx.creditsChange.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Plans Tab */}
        {activeTab === "plans" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className={cn(
                  "bg-card border rounded-xl p-5 relative",
                  tier.highlight ? "border-primary shadow-lg shadow-primary/5" : "border-border"
                )}
              >
                {tier.current && (
                  <div className="absolute -top-2.5 left-4 text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                    Current
                  </div>
                )}
                <h3 className="text-lg font-semibold text-foreground mb-0.5" style={{ fontFamily: "var(--font-heading)" }}>
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    {tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {tier.credits} credits/month
                </p>
                <ul className="space-y-2 mb-5">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={cn(
                    "w-full py-2.5 rounded-lg text-sm font-medium transition-all",
                    tier.current
                      ? "bg-muted text-muted-foreground cursor-default"
                      : tier.highlight
                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                  )}
                >
                  {tier.cta}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[11px] text-muted-foreground font-medium px-4 py-3">Type</th>
                    <th className="text-left text-[11px] text-muted-foreground font-medium px-4 py-3">Details</th>
                    <th className="text-left text-[11px] text-muted-foreground font-medium px-4 py-3">Date</th>
                    <th className="text-right text-[11px] text-muted-foreground font-medium px-4 py-3">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_TRANSACTIONS.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3"><TypeBadge type={tx.type} /></td>
                      <td className="px-4 py-3 text-sm text-foreground">{tx.details}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{tx.date}</td>
                      <td className={cn(
                        "px-4 py-3 text-sm text-right font-mono tabular-nums",
                        tx.creditsChange > 0 ? "text-emerald-400" : "text-foreground/70"
                      )}>
                        {tx.creditsChange > 0 ? "+" : ""}{tx.creditsChange.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
