import DOMPurify from "dompurify";
import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Code, GitCommit, GitPullRequest, LifeBuoy, ShieldAlert, ShieldCheck, Sunset } from 'lucide-react';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock Data
const apiVersions = [
  {
    version: "2024-05-01",
    status: "stable",
    endpoints: [
      { name: "/users", methods: ["GET", "POST"] },
      { name: "/products", methods: ["GET"] },
      { name: "/orders", methods: ["GET", "POST", "PUT"] },
    ],
    deprecationDate: null,
    sunsetDate: null,
    clientUsage: 1250000,
  },
  {
    version: "2024-01-15",
    status: "deprecated",
    endpoints: [
      { name: "/users", methods: ["GET"] },
      { name: "/products", methods: ["GET", "POST"] },
      { name: "/inventory", methods: ["GET"] },
    ],
    deprecationDate: "2024-04-01",
    sunsetDate: "2024-07-15",
    clientUsage: 320000,
  },
  {
    version: "2023-10-01",
    status: "sunset",
    endpoints: [
      { name: "/customers", methods: ["GET", "POST"] },
      { name: "/items", methods: ["GET"] },
    ],
    deprecationDate: "2023-12-01",
    sunsetDate: "2024-01-31",
    clientUsage: 5000,
  },
];

const migrationGuide = `
## Migrating from 2024-01-15 to 2024-05-01

### Key Changes
- the inventory endpoint is removed.
- the users endpoint now supports POST.
- the products endpoint no longer supports POST.

### Action Required
1. Update your code to use the new the orders endpoint endpoint for creating orders.
2. Switch from the inventory to the new inventory management system.
`;

const DiffView = () => (
  <div className="p-4 bg-gray-900/50 rounded-lg font-mono text-sm">
    <pre>
      <code className="text-red-400">- /products: [GET, POST]</code>
      <br />
      <code className="text-green-400">+ /products: [GET]</code>
      <br />
      <code className="text-red-400">- /inventory: [GET]</code>
      <br />
      <code className="text-green-400">+ /orders: [GET, POST, PUT]</code>
    </pre>
  </div>
);

const ApiVersioningPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(apiVersions[0].version);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "stable":
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30"><ShieldCheck className="w-3 h-3 mr-1" />Stable</Badge>;
      case "deprecated":
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30"><ShieldAlert className="w-3 h-3 mr-1" />Deprecated</Badge>;
      case "sunset":
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30"><Sunset className="w-3 h-3 mr-1" />Sunset</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const selectedVersion = useMemo(() => apiVersions.find(v => v.version === activeTab), [activeTab]);

  return (
    <Card className="w-full max-w-4xl mx-auto bg-card text-foreground border-border shadow-2xl shadow-black/20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-2xl">
            <GitCommit className="w-6 h-6 mr-3 text-primary" />
            API Version Management
          </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4" /> Compare Versions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border">
              <DialogHeader>
                <DialogTitle>Version Comparison</DialogTitle>
              </DialogHeader>
              <DiffView />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card-deep">
            {apiVersions.map((v) => (
              <TabsTrigger key={v.version} value={v.version} className="flex flex-col h-auto py-2">
                <span className="font-semibold">{v.version}</span>
                {getStatusBadge(v.status)}
              </TabsTrigger>
            ))}
          </TabsList>
          <AnimatePresence mode="wait">
            {selectedVersion && (
              <motion.div
                key={selectedVersion.version}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TabsContent value={selectedVersion.version} className="mt-4 p-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-lg font-semibold">Endpoints</h3>
                      <div className="border border-border rounded-lg p-4 bg-card-deep/50 max-h-60 overflow-y-auto">
                        {selectedVersion.endpoints.map((ep) => (
                          <div key={ep.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
                            <span className="font-mono text-sm">{ep.name}</span>
                            <div className="flex gap-1.5">
                              {ep.methods.map(m => <Badge key={m} variant="secondary" className="font-mono text-xs">{m}</Badge>)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedVersion.status === 'deprecated' && selectedVersion.sunsetDate && (
                        <div className="p-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-200 flex items-start gap-3">
                          <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold">Deprecation Notice</h4>
                            <p className="text-sm">This version is deprecated and will be sunset on <span className="font-semibold">{selectedVersion.sunsetDate}</span>.</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Details</h3>
                      <div className="border border-border rounded-lg p-4 bg-card-deep/50 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Client Usage</span>
                          <span className="font-bold">{selectedVersion.clientUsage.toLocaleString()} req/day</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Lifecycle</span>
                          <div className="flex items-center gap-2">
                            <Button size="sm" className="text-xs">Stable</Button>
                            <Button size="sm" variant="outline" className="text-xs">Deprecate</Button>
                          </div>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full"><LifeBuoy className="w-4 h-4 mr-2" /> Migration Guide</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-card border-border">
                          <DialogHeader>
                            <DialogTitle>Migration Guide</DialogTitle>
                          </DialogHeader>
                          <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(migrationGuide) }} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </TabsContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ApiVersioningPanel;