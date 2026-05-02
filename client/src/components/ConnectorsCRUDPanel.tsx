import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Globe,
  Database,
  Cloud,
  MessageSquare,
  Mail,
  CreditCard,
  Shield,
  Loader2,
  Zap,
  Link2,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  api: Zap,
  database: Database,
  cloud: Cloud,
  messaging: MessageSquare,
  email: Mail,
  payment: CreditCard,
  auth: Shield,
};

export default function ConnectorsCRUDPanel(): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: catalog = [], isLoading: catalogLoading } = trpc.connector.catalog.useQuery();
  const { data: userConnectors = [], isLoading: connectorsLoading } = trpc.connector.list.useQuery();

  const connectMutation = trpc.connector.connect.useMutation({
    onSuccess: () => utils.connector.list.invalidate(),
  });
  const disconnectMutation = trpc.connector.disconnect.useMutation({
    onSuccess: () => utils.connector.list.invalidate(),
  });
  const testMutation = trpc.connector.test.useMutation();

  const isLoading = catalogLoading || connectorsLoading;

  const getConnectorStatus = useCallback((connectorId: string) => {
    const conn = userConnectors.find((c: any) => c.connectorId === connectorId);
    return conn?.status || "disconnected";
  }, [userConnectors]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error": return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending": return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      default: return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      connected: "bg-green-500/10 text-green-500",
      error: "bg-red-500/10 text-red-500",
      pending: "bg-amber-500/10 text-amber-500",
      disconnected: "bg-muted text-muted-foreground",
    };
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full capitalize", styles[status] || styles.disconnected)}>
        {status}
      </span>
    );
  };

  const filteredCatalog = catalog.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const connectedCount = userConnectors.filter((c: any) => c.status === "connected").length;

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Connectors</h2>
            <p className="text-xs text-muted-foreground">
              {connectedCount} connected · {catalog.length} available
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search connectors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <div className="space-y-2">
            {/* Connected connectors first */}
            {userConnectors.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Connected</h3>
                {userConnectors.map((conn: any) => (
                  <div
                    key={conn.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all cursor-pointer",
                      selectedConnector === conn.connectorId
                        ? "bg-card border-primary/30 ring-1 ring-primary/20"
                        : "bg-card border-border hover:border-primary/20"
                    )}
                    onClick={() => setSelectedConnector(selectedConnector === conn.connectorId ? null : conn.connectorId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(conn.status)}
                        <div>
                          <h4 className="text-sm font-medium">{conn.name || conn.connectorId}</h4>
                          <p className="text-[10px] text-muted-foreground">
                            {conn.lastSyncAt ? `Last sync: ${new Date(conn.lastSyncAt).toLocaleString()}` : "Never synced"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(conn.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => { e.stopPropagation(); testMutation.mutate({ connectorId: conn.connectorId }); }}
                          disabled={testMutation.isPending}
                        >
                          {testMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); disconnectMutation.mutate({ connectorId: conn.connectorId }); }}
                          disabled={disconnectMutation.isPending}
                        >
                          <Unlink className="w-3 h-3" />
                          Disconnect
                        </Button>
                      </div>
                    </div>

                    {selectedConnector === conn.connectorId && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <span className="ml-2 font-medium capitalize">{conn.status}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type:</span>
                            <span className="ml-2 font-medium">{conn.connectorId}</span>
                          </div>
                          {conn.tokenExpiresAt && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Token expires:</span>
                              <span className="ml-2 font-medium">{new Date(conn.tokenExpiresAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Catalog */}
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 mt-4">Available Connectors</h3>
            {filteredCatalog.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No connectors match your search.</p>
              </div>
            )}
            {filteredCatalog.map((connector: any) => {
              const status = getConnectorStatus(connector.id);
              const isConnected = status === "connected";
              const Icon = CATEGORY_ICONS[connector.category] || Globe;
              return (
                <div
                  key={connector.id}
                  className="p-4 rounded-lg bg-card border border-border hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{connector.name}</h4>
                        <p className="text-[10px] text-muted-foreground">{connector.description}</p>
                      </div>
                    </div>
                    {isConnected ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Connected</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          if (connector.authType === "oauth") {
                            window.open(`/api/connectors/${connector.id}/oauth`, "_blank", "noopener,noreferrer");
                          } else {
                            connectMutation.mutate({
                              connectorId: connector.id,
                              name: connector.name,
                              config: {},
                            });
                          }
                        }}
                        disabled={connectMutation.isPending}
                      >
                        <Plus className="w-3 h-3" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
