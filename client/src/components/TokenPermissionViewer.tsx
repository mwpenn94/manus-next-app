import React, { useState, useMemo, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, CircleX, RefreshCw, ChevronRight, Clock, Calendar, Zap, ShieldAlert } from "lucide-react";

// --- DATA STRUCTURES ---
type Scope = {
  id: string;
  label: string;
  children?: Scope[];
};

type Token = {
  id: string;
  name: string;
  scopes: string[];
  expiresAt: string;
  lastUsed: string;
  createdAt: string;
  usage: number[];
  rateLimit: { used: number; limit: number };
};

// --- MOCK DATA ---
const mockTokens: Token[] = [
  { id: "tok_1", name: "Primary API Key", scopes: ["read:users", "write:users", "read:products"], expiresAt: "2027-05-01T00:00:00Z", lastUsed: "2026-04-30T12:34:56Z", createdAt: "2025-05-01T00:00:00Z", usage: [12, 23, 45, 33, 56, 78, 65, 89, 90, 110, 120, 130], rateLimit: { used: 800, limit: 1000 } },
  { id: "tok_2", name: "Analytics Bot", scopes: ["read:analytics", "read:products"], expiresAt: "2026-08-15T00:00:00Z", lastUsed: "2026-04-29T08:00:00Z", createdAt: "2025-08-15T00:00:00Z", usage: [5, 10, 8, 12, 15, 11, 14, 18, 20, 22, 25, 30], rateLimit: { used: 300, limit: 500 } },
  { id: "tok_3", name: "Admin Full Access", scopes: ["admin:*"], expiresAt: "2028-01-01T00:00:00Z", lastUsed: "2026-04-25T18:20:00Z", createdAt: "2025-01-01T00:00:00Z", usage: [200, 250, 300, 280, 320, 350, 400, 380, 420, 450, 500, 480], rateLimit: { used: 100, limit: 2000 } },
  { id: "tok_4", name: "Read-Only Key", scopes: ["read:users", "read:products", "read:orders"], expiresAt: "2026-06-30T00:00:00Z", lastUsed: "2026-04-28T14:00:00Z", createdAt: "2025-06-30T00:00:00Z", usage: [50, 60, 55, 65, 70, 75, 80, 85, 90, 95, 100, 105], rateLimit: { used: 500, limit: 1000 } },
  { id: "tok_5", name: "CI/CD Pipeline Token", scopes: ["write:deployments", "read:logs"], expiresAt: "2026-12-31T00:00:00Z", lastUsed: "2026-05-01T02:00:00Z", createdAt: "2025-12-31T00:00:00Z", usage: [1, 2, 1, 3, 2, 4, 2, 3, 1, 2, 3, 2], rateLimit: { used: 950, limit: 1000 } },
];

const allScopes: Scope[] = [
  { id: "admin", label: "Admin", children: [{ id: "*", label: "Full Access" }] },
  { id: "read", label: "Read", children: [{ id: "users", label: "Users" }, { id: "products", label: "Products" }, { id: "orders", label: "Orders" }, { id: "analytics", label: "Analytics" }, { id: "logs", label: "Logs" }] },
  { id: "write", label: "Write", children: [{ id: "users", label: "Users" }, { id: "products", label: "Products" }, { id: "deployments", label: "Deployments" }] },
];

// --- HELPER COMPONENTS ---
const Sparkline = ({ data, width = 100, height = 30, color = "currentColor" }: { data: number[], width?: number, height?: number, color?: string }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - (d / max) * height}`).join(" ");
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><polyline points={points} fill="none" stroke={color} strokeWidth="2" /></svg>;
};

const ScopeTree = ({ scopes, grantedScopes, onScopeChange }: { scopes: Scope[], grantedScopes: string[], onScopeChange: (scopeId: string, checked: boolean) => void }) => {
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({ read: true, write: true });

  const toggleNode = (id: string) => {
    setOpenNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: Scope, parentId?: string) => {
    const fullId = parentId ? `${parentId}:${node.id}` : node.id;
    const isParent = !!node.children && node.children.length > 0;
    const isOpen = openNodes[node.id] ?? false;

    const isWildcard = grantedScopes.some(s => s.endsWith(':*'));
    const isChecked = isWildcard || grantedScopes.includes(fullId);

    return (
      <div key={fullId}>
        <div className="flex items-center space-x-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
          {isParent && (
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="w-4 h-4 cursor-pointer" onClick={() => toggleNode(node.id)} />
            </motion.div>
          )}
          <Checkbox
            id={fullId}
            checked={isChecked}
            onCheckedChange={(checked) => onScopeChange(fullId, !!checked)}
            className="ml-auto-adjust"
            style={{ marginLeft: isParent ? '0' : '1.5rem' }}
          />
          <label htmlFor={fullId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">
            {node.label}
          </label>
        </div>
        {isParent && isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pl-6 border-l border-border ml-4">
            {node.children?.map(child => renderNode(child, node.id))}
          </motion.div>
        )}
      </div>
    );
  };

  return <div className="space-y-1">{scopes.map(scope => renderNode(scope))}</div>;
};

export default function TokenPermissionViewer() {
  const [tokens, setTokens] = useState<Token[]>(mockTokens);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(mockTokens[0].id);

  const selectedToken = useMemo(() => tokens.find(t => t.id === selectedTokenId), [tokens, selectedTokenId]);

  const handleScopeChange = useCallback((scopeId: string, checked: boolean) => {
    if (!selectedTokenId) return;
    setTokens(prevTokens =>
      prevTokens.map(token => {
        if (token.id === selectedTokenId) {
          const newScopes = checked
            ? [...token.scopes, scopeId]
            : token.scopes.filter(s => s !== scopeId);
          return { ...token, scopes: Array.from(new Set(newScopes)) };
        }
        return token;
      })
    );
  }, [selectedTokenId]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <TooltipProvider>
      <div className="w-full max-w-6xl mx-auto p-4 font-sans bg-background text-foreground">
        <h1 className="text-2xl font-bold mb-6">Token Permissions</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <CardHeader><CardTitle>API Tokens</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {tokens.map((token) => (
                    <button key={token.id} onClick={() => setSelectedTokenId(token.id)} className={cn("w-full text-left px-4 py-3 border-b border-border transition-colors", selectedTokenId === token.id ? "bg-muted" : "hover:bg-muted/50")}>
                      <div className="font-semibold">{token.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{token.scopes.join(", ")}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedToken && (
                <motion.div key={selectedToken.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-3"><Wrench className="w-6 h-6 text-primary" /><span>{selectedToken.name}</span></CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
                        <Button variant="destructive" size="sm"><CircleX className="w-4 h-4 mr-2" />Revoke</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="font-medium">Created:</span><span>{formatDate(selectedToken.createdAt)}</span></div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><span className="font-medium">Last Used:</span><span>{formatDate(selectedToken.lastUsed)}</span></div>
                        <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-muted-foreground" /><span className="font-medium">Expires:</span><span>{formatDate(selectedToken.expiresAt)}</span></div>
                      </div>
                      <Separator />
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="text-md font-semibold">Granted Scopes</h3>
                            <Badge variant={selectedToken.scopes.includes('admin:*') ? 'destructive' : 'secondary'}>{selectedToken.scopes.length} scopes</Badge>
                          </div>
                          <div className="p-4 border rounded-lg bg-muted/30 max-h-60 overflow-y-auto">
                            <ScopeTree scopes={allScopes} grantedScopes={selectedToken.scopes} onScopeChange={handleScopeChange} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div>
                                <h3 className="text-md font-semibold mb-2 flex items-center gap-2"><Zap className="w-5 h-5"/>Rate Limit</h3>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className='w-full text-left cursor-pointer'>
                                        <Progress value={(selectedToken.rateLimit.used / selectedToken.rateLimit.limit) * 100} className="w-full" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{selectedToken.rateLimit.used} / {selectedToken.rateLimit.limit} requests</p>
                                    </TooltipContent>
                                </Tooltip>
                                <p className="text-xs text-muted-foreground mt-1">per minute</p>
                            </div>
                            <div>
                                <h3 className="text-md font-semibold mb-2">Usage Analytics</h3>
                                <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-md">
                                    <Sparkline data={selectedToken.usage} width={120} height={40} color="hsl(var(--primary))" />
                                    <div className="text-right flex-1">
                                        <div className="font-bold text-lg">{selectedToken.usage.reduce((a, b) => a + b, 0)}</div>
                                        <div className="text-xs text-muted-foreground">requests last 12h</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
