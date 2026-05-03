/**
 * GitHubAuthHealth — Dashboard widget showing the health status of all
 * GitHub authentication layers. Displays the failover chain with live
 * status indicators.
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Key, Globe, Terminal, Cpu, ArrowDown
} from "lucide-react";

interface AuthLayer {
  name: string;
  available: boolean;
  valid: boolean | null;
  username?: string;
  expiresAt?: string | null;
}

const LAYER_ICONS: Record<string, typeof Key> = {
  "OAuth Token": Globe,
  "Smart PAT": Key,
  "Classic PAT": Terminal,
  "Environment Fallback": Cpu,
  "App Installation": Shield,
};

const STATUS_CONFIG: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  healthy: { icon: ShieldCheck, color: "text-emerald-400", label: "Healthy" },
  degraded: { icon: ShieldAlert, color: "text-amber-400", label: "Degraded" },
  unavailable: { icon: ShieldX, color: "text-red-400", label: "Unavailable" },
  unknown: { icon: Shield, color: "text-muted-foreground", label: "Unknown" },
};

export function GitHubAuthHealth() {
  const { data, isLoading, error } = trpc.connector.githubAuthHealth.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            GitHub Auth Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldX className="w-4 h-4 text-red-400" />
            GitHub Auth Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Unable to check auth health. {error?.message || ""}
          </p>
        </CardContent>
      </Card>
    );
  }

  const layers: AuthLayer[] = data.layers || [];
  // Derive overall status from layers
  const healthyCount = layers.filter(l => l.valid === true).length;
  const overallStatus = healthyCount > 0 ? "healthy" : layers.some(l => l.available) ? "degraded" : "unavailable";
  const OverallIcon = STATUS_CONFIG[overallStatus]?.icon || Shield;
  const overallColor = STATUS_CONFIG[overallStatus]?.color || "text-muted-foreground";

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <OverallIcon className={cn("w-4 h-4", overallColor)} />
            GitHub Auth Failover
          </CardTitle>
          <Badge
            variant={overallStatus === "healthy" ? "secondary" : overallStatus === "degraded" ? "outline" : "destructive"}
            className="text-xs"
          >
            {STATUS_CONFIG[overallStatus]?.label || "Unknown"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {layers.filter(l => l.valid === true).length} of {layers.length} layers active
        </p>
      </CardHeader>

      <CardContent className="space-y-1">
        {layers.map((layer, i) => {
          const Icon = LAYER_ICONS[layer.name] || Key;
          const layerStatus = layer.valid === true ? "healthy" : layer.available ? "degraded" : "unavailable";
          const statusCfg = STATUS_CONFIG[layerStatus] || STATUS_CONFIG.unknown;
          const StatusIcon = statusCfg.icon;

          return (
            <div key={layer.name}>
              <div
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md border transition-colors",
                  layerStatus === "healthy" && "border-emerald-500/20 bg-emerald-500/5",
                  layerStatus === "degraded" && "border-amber-500/20 bg-amber-500/5",
                  layerStatus === "unavailable" && "border-border bg-muted/30"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", statusCfg.color)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{layer.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                      L{i + 1}
                    </Badge>
                  </div>
                  {layer.username && (
                    <p className="text-[10px] text-muted-foreground">@{layer.username}</p>
                  )}
                </div>
                <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", statusCfg.color)} />
              </div>
              {i < layers.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="w-3 h-3 text-muted-foreground/40" />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
