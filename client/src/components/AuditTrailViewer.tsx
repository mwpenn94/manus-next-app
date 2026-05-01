import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, FileDown, Search, Calendar, User, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';

type AuditStatus = 'verified' | 'suspicious';

interface AuditEntry {
  id: string;
  actor: { id: string; name: string; };
  action: string;
  resource: { type: string; id: string; };
  timestamp: string;
  status: AuditStatus;
  changes: Record<string, { oldValue: any; newValue: any; }>;
}

const mockAuditData: AuditEntry[] = [
  { id: 'evt_1', actor: { id: 'usr_1', name: 'Admin' }, action: 'user.login', resource: { type: 'user', id: 'usr_1' }, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), status: 'verified', changes: {} },
  { id: 'evt_2', actor: { id: 'usr_2', name: 'Alice' }, action: 'document.update', resource: { type: 'document', id: 'doc_123' }, timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), status: 'verified', changes: { title: { oldValue: 'Old Title', newValue: 'New Title' } } },
  { id: 'evt_3', actor: { id: 'usr_3', name: 'Bob' }, action: 'billing.subscription_cancelled', resource: { type: 'customer', id: 'cust_456' }, timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), status: 'suspicious', changes: { plan: { oldValue: 'pro', newValue: 'free' } } },
  { id: 'evt_4', actor: { id: 'usr_1', name: 'Admin' }, action: 'settings.update', resource: { type: 'system', id: 'global' }, timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), status: 'verified', changes: { enable_feature_x: { oldValue: false, newValue: true } } },
  { id: 'evt_5', actor: { id: 'usr_4', name: 'Charlie' }, action: 'document.create', resource: { type: 'document', id: 'doc_124' }, timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), status: 'verified', changes: { title: { oldValue: null, newValue: 'A New Hope' } } },
];

const StatusIcon = ({ status }: { status: AuditStatus }) => {
  if (status === 'verified') return <ShieldCheck className="h-5 w-5 text-green-500" />;
  if (status === 'suspicious') return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
  return <Shield className="h-5 w-5 text-gray-500" />;
};

const DiffView = ({ changes }: { changes: AuditEntry['changes'] }) => (
  <div className="bg-muted/50 p-4 rounded-lg text-sm font-mono">
    {Object.entries(changes).map(([field, { oldValue, newValue }]) => (
      <div key={field}>
        <p className="text-muted-foreground">{field}:</p>
        <p className="text-red-500">- {JSON.stringify(oldValue)}</p>
        <p className="text-green-500">+ {JSON.stringify(newValue)}</p>
      </div>
    ))}
  </div>
);

const AuditTrailViewer: React.FC = () => {
  const [logs] = useState<AuditEntry[]>(mockAuditData);
  const [filterActor, setFilterActor] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [verifying, setVerifying] = useState(false);

  const actors = useMemo(() => Array.from(new Set(logs.map(log => log.actor.name))), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map(log => log.action))), [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      (filterActor ? log.actor.name === filterActor : true) &&
      (filterAction ? log.action === filterAction : true)
    );
  }, [logs, filterActor, filterAction]);

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => setVerifying(false), 2000);
  };

  return (
    <Card className="bg-card text-foreground border-border w-full max-w-5xl mx-auto shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border">
        <CardTitle className="text-lg font-semibold">Audit Trail</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleVerify} disabled={verifying} aria-label="Verify log integrity">
            {verifying ? 'Verifying...' : 'Verify Integrity'}
          </Button>
          <Button variant="outline" size="sm" aria-label="Export logs">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 border-b border-border">
          {/* Advanced filter controls will be implemented here */}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {filteredLogs.map((log) => (
                  <motion.tr 
                    key={log.id} 
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-muted/50"
                  >
                    <TableCell><StatusIcon status={log.status} /></TableCell>
                    <TableCell className="font-medium">{log.actor.name}</TableCell>
                    <TableCell><Badge variant={log.status === 'suspicious' ? 'destructive' : 'secondary'}>{log.action}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{log.resource.type}:{log.resource.id}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {Object.keys(log.changes).length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label={`View changes for event ${log.id}`}>View Diff</Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Field Changes</DialogTitle>
                            </DialogHeader>
                            <DiffView changes={log.changes} />
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditTrailViewer;
