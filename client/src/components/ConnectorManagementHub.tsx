import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Zap, ZapOff, Clock, Shield, BarChart2, MoreVertical, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const connectorIcons = {
  Google: (props: any) => <svg {...props} viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35 11.1h-9.2v2.8h5.3c-.2 1.9-1.6 3.3-3.5 3.3-2.1 0-3.8-1.7-3.8-3.8s1.7-3.8 3.8-3.8c1.1 0 2.1.4 2.8 1.2l2.2-2.2C19.1 6.6 16.9 5.5 14 5.5c-4.7 0-8.5 3.8-8.5 8.5s3.8 8.5 8.5 8.5c4.9 0 8.3-3.5 8.3-8.3 0-.7-.1-1.1-.2-1.6z"/></svg>,
  Microsoft: (props: any) => <svg {...props} viewBox="0 0 24 24"><path fill="#F25022" d="M11.4 11.4H2V2h9.4v9.4zm0 10.6H2v-9.4h9.4v9.4zm10.6-10.6h-9.4V2h9.4v9.4zm0 10.6h-9.4v-9.4h9.4v9.4z"/></svg>,
  Slack: (props: any) => <svg {...props} viewBox="0 0 24 24"><path fill="#36C5F0" d="M9.3 14.7c0 1.2-1 2.2-2.2 2.2s-2.2-1-2.2-2.2 1-2.2 2.2-2.2h2.2v2.2zm0-5.4c-1.2 0-2.2-1-2.2-2.2s1-2.2 2.2-2.2 2.2 1 2.2 2.2v4.4H7.1c-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2h2.2V14.7z"/><path fill="#2EB67D" d="M14.7 9.3c-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-1 2.2-2.2V9.3h-2.2zm5.4 0c0-1.2-1-2.2-2.2-2.2s-2.2 1-2.2 2.2v2.2h4.4c1.2 0 2.2-1 2.2-2.2s-1-2.2-2.2-2.2h-2.2V7.1z"/><path fill="#ECB22E" d="M9.3 14.7c0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2-1-2.2-2.2-2.2H9.3v2.2zm0 5.4c1.2 0 2.2 1 2.2 2.2s-1 2.2-2.2 2.2-2.2-1-2.2-2.2v-4.4h2.2c1.2 0 2.2-1 2.2-2.2s-1-2.2-2.2-2.2H7.1v2.2z"/><path fill="#E01E5A" d="M14.7 9.3c-1.2 0-2.2-1-2.2-2.2s1-2.2 2.2-2.2 2.2 1 2.2 2.2v2.2h-2.2zm-5.4 0c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2v-2.2H9.3c-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2h2.2V9.3z"/></svg>,
  GitHub: (props: any) => <svg {...props} viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.69c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10z"/></svg>,
  Salesforce: (props: any) => <svg {...props} viewBox="0 0 24 24"><path fill="#00A1E0" d="M11.5 22.5c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm0-14c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6z"/><path fill="#00A1E0" d="M11.5 13.3c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-2.5c-.3 0-.5.2-.5.5s.2.5.5.5.5-.2.5-.5-.2-.5-.5-.5z"/></svg>,
  HubSpot: (props: any) => <svg {...props} viewBox="0 0 24 24"><path fill="#FF7A59" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.28 13.72c-.3.3-.77.3-1.06 0l-2.94-2.94-2.94 2.94c-.3.3-.77.3-1.06 0s-.3-.77 0-1.06l2.94-2.94-2.94-2.94c-.3-.3-.3-.77 0-1.06s.77-.3 1.06 0l2.94 2.94 2.94-2.94c.3-.3.77-.3 1.06 0s.3.77 0 1.06l-2.94 2.94 2.94 2.94c.3.3.3.77 0 1.06z"/></svg>,
  Notion: (props: any) => <svg {...props} viewBox="0 0 24 24"><path fill="currentColor" d="M14.5 2h-10C3.12 2 2 3.12 2 4.5v15C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5v-10L14.5 2zM15 10h-4v10H9V4h1.5l5.5 5.5V10z"/></svg>,
  Zapier: (props: any) => <svg {...props} viewBox="0 0 24 24"><path fill="#FF4A00" d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10zm-10 8c4.41 0 8-3.59 8-8s-3.59-8-8-8-8 3.59-8 8 3.59 8 8 8z"/><path fill="#FF4A00" d="M12 6v2h-2v2h2v2h2v-2h2V8h-2V6h-2zm-2 8v2h6v-2H10z"/></svg>,
};

const initialConnectors = [
  { id: 'google', name: 'Google', status: 'connected', account: { email: 'dev@sovereign.ai', avatar: 'https://i.pravatar.cc/150?u=dev@sovereign.ai' }, lastSync: new Date(Date.now() - 3600000), permissions: ['Read/Write Calendar', 'Read Emails'], syncFrequency: 'hourly', dataScope: ['calendar', 'email'], syncHistory: Array(10).fill(0).map((_, i) => ({ time: new Date(Date.now() - (i + 1) * 3600000), status: Math.random() > 0.1 ? 'success' : 'failed' })), rateLimit: { used: 1200, limit: 10000 } },
  { id: 'github', name: 'GitHub', status: 'connected', account: { email: 'dev-ci@sovereign.ai', avatar: 'https://i.pravatar.cc/150?u=dev-ci@sovereign.ai' }, lastSync: new Date(Date.now() - 7200000), permissions: ['Read/Write Repos', 'Read/Write Issues'], syncFrequency: 'real-time', dataScope: ['repos', 'issues'], syncHistory: Array(10).fill(0).map((_, i) => ({ time: new Date(Date.now() - (i + 1) * 1200000), status: 'success' })), rateLimit: { used: 4500, limit: 5000 } },
  { id: 'slack', name: 'Slack', status: 'connected', account: { email: 'engineering@sovereign.ai', avatar: 'https://i.pravatar.cc/150?u=engineering@sovereign.ai' }, lastSync: new Date(Date.now() - 86400000), permissions: ['Read Channels', 'Send Messages'], syncFrequency: 'daily', dataScope: ['channels'], syncHistory: Array(10).fill(0).map((_, i) => ({ time: new Date(Date.now() - (i + 1) * 86400000), status: 'success' })), rateLimit: { used: 50, limit: 200 } },
  { id: 'salesforce', name: 'Salesforce', status: 'error', account: { email: 'sales@sovereign.ai', avatar: 'https://i.pravatar.cc/150?u=sales@sovereign.ai' }, lastSync: new Date(Date.now() - 172800000), permissions: ['Read/Write Contacts'], syncFrequency: 'manual', dataScope: ['contacts'], syncHistory: Array(10).fill(0).map((_, i) => ({ time: new Date(Date.now() - (i + 1) * 600000), status: i === 0 ? 'failed' : 'success' })), rateLimit: { used: 18000, limit: 20000 } },
  { id: 'microsoft', name: 'Microsoft', status: 'disconnected' },
  { id: 'hubspot', name: 'HubSpot', status: 'disconnected' },
  { id: 'notion', name: 'Notion', status: 'disconnected' },
  { id: 'zapier', name: 'Zapier', status: 'disconnected' },
];

export default function ConnectorManagementHub() {
  const [connectors, setConnectors] = useState(initialConnectors);
  const [selectedConnector, setSelectedConnector] = useState<any>(null);

  const updateConnectorConfig = (connectorId: string, newConfig: any) => {
    setConnectors(connectors.map(c => c.id === connectorId ? { ...c, ...newConfig } : c));
    setSelectedConnector((prev: any) => prev ? { ...prev, ...newConfig } : prev);
  };

  const handleConnect = (connectorId: string) => {
    console.log(`Connecting ${connectorId}...`);
    setConnectors(connectors.map(c => c.id === connectorId ? { ...c, status: 'connected', account: { email: 'newly-connected@sovereign.ai', avatar: `https://i.pravatar.cc/150?u=${connectorId}` }, lastSync: new Date(), permissions: ['Default Permission'], syncFrequency: 'hourly', dataScope: ['default'], syncHistory: [], rateLimit: { used: 0, limit: 5000 } } : c));
  };

  const handleDisconnect = (connectorId: string) => {
    console.log(`Disconnecting ${connectorId}...`);
    setConnectors(connectors.map(c => c.id === connectorId ? { ...c, status: 'disconnected', account: undefined, lastSync: undefined, permissions: undefined, syncFrequency: undefined, dataScope: undefined, syncHistory: undefined, rateLimit: undefined } : c));
    if (selectedConnector && selectedConnector.id === connectorId) {
      setSelectedConnector(null);
    }
  };

  const bulkDisconnect = () => {
    setConnectors(connectors.map(c => c.status === 'connected' || c.status === 'error' ? { ...c, status: 'disconnected', account: undefined, lastSync: undefined, permissions: undefined, syncFrequency: undefined, dataScope: undefined, syncHistory: undefined, rateLimit: undefined } : c));
    setSelectedConnector(null);
  };

  const bulkReconnect = () => {
    connectors.forEach(c => {
      if (c.status === 'error') {
        console.log(`Reconnecting ${c.id}...`);
        setConnectors(prev => prev.map(pc => pc.id === c.id ? { ...pc, status: 'connected' } : pc));
      }
    });
  };

  const { connected, available } = useMemo(() => {
    const connected = connectors.filter(c => c.status === 'connected' || c.status === 'error');
    const available = connectors.filter(c => c.status === 'disconnected');
    return { connected, available };
  }, [connectors]);

  const mainContent = (
    <AnimatePresence mode="wait">
      {!selectedConnector ? (
        <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Connected Integrations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <AnimatePresence>
                {connected.map(connector => (
                  <ConnectorCard key={connector.id} connector={connector} onSelect={setSelectedConnector} />
                ))}
              </AnimatePresence>
            </div>
          </div>
          <Separator className="my-8" />
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Available Integrations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <AnimatePresence>
                {available.map(connector => (
                  <ConnectorCard key={connector.id} connector={connector} onConnect={handleConnect} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
          <ConnectorDetailView connector={selectedConnector} onDisconnect={handleDisconnect} onUpdate={updateConnectorConfig} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="bg-oklch(98.5% 0.01 240) dark:bg-oklch(15% 0.02 240) min-h-screen p-4 sm:p-6 md:p-8 font-sans">
      <div className="w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {selectedConnector ? (
            <motion.div key="header-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button variant="ghost" onClick={() => setSelectedConnector(null)} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to all connectors
              </Button>
            </motion.div>
          ) : (
            <motion.div key="header-main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Connector Hub</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your integrations with third-party services.</p>
              </div>
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button variant="outline" onClick={bulkDisconnect} disabled={!connectors.some(c => c.status === 'connected' || c.status === 'error')}><Trash2 className="w-4 h-4 mr-2" />Bulk Disconnect</Button>
                <Button onClick={bulkReconnect} disabled={!connectors.some(c => c.status === 'error')}><RefreshCw className="w-4 h-4 mr-2" />Reconnect Failed</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Card className="w-full bg-oklch(100% 0 0 / 0.6) dark:bg-oklch(20% 0.02 240 / 0.5) border-gray-200 dark:border-gray-800/50 shadow-sm" style={{ backdropFilter: 'blur(12px)' }}>
          <CardContent className="p-6">
            {mainContent}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const ConnectorCard = ({ connector, onConnect, onSelect }: { connector: any; onConnect?: (id: string) => void; onSelect?: (c: any) => void }) => {
  const Icon = connectorIcons[connector.name as keyof typeof connectorIcons];

  const getStatusIndicator = () => {
    switch (connector.status) {
      case 'connected':
        return <Tooltip><TooltipTrigger><div className="w-2.5 h-2.5 rounded-full bg-green-500" /></TooltipTrigger><TooltipContent>Connected</TooltipContent></Tooltip>;
      case 'error':
        return <Tooltip><TooltipTrigger><div className="w-2.5 h-2.5 rounded-full bg-red-500" /></TooltipTrigger><TooltipContent>Error</TooltipContent></Tooltip>;
      default:
        return <Tooltip><TooltipTrigger><div className="w-2.5 h-2.5 rounded-full bg-gray-400" /></TooltipTrigger><TooltipContent>Disconnected</TooltipContent></Tooltip>;
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="border rounded-xl p-4 flex flex-col items-center justify-between text-center bg-white/50 dark:bg-gray-950/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full"
        onClick={() => connector.status !== 'disconnected' && onSelect?.(connector)}
      >
        <div className="flex flex-col items-center w-full">
          <div className="w-full flex justify-end mb-2">
            {getStatusIndicator()}
          </div>
          <Icon className="w-12 h-12 mb-3 text-gray-800 dark:text-gray-200" />
          <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">{connector.name}</h3>
        </div>
        <div className="mt-4 w-full">
          {connector.status === 'disconnected' ? (
            <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); onConnect?.(connector.id); }}><Zap className="w-4 h-4 mr-2" />Connect</Button>
          ) : (
            <Button size="sm" variant="secondary" className="w-full" onClick={() => onSelect?.(connector)}>Manage</Button>
          )}
        </div>
      </motion.div>
    </TooltipProvider>
  );
};

const ConnectorDetailView = ({ connector, onDisconnect, onUpdate }: { connector: any; onDisconnect: (id: string) => void; onUpdate: (id: string, config: any) => void }) => {
  const Icon = connectorIcons[connector.name as keyof typeof connectorIcons];

  const handleFrequencyChange = (value: string) => {
    onUpdate(connector.id, { syncFrequency: value });
  };

  const handleDataScopeChange = (item: string, checked: boolean) => {
    const newScope = checked
      ? [...(connector.dataScope || []), item]
      : (connector.dataScope || []).filter((scopeItem: string) => scopeItem !== item);
    onUpdate(connector.id, { dataScope: newScope });
  };

  return (
    <div className="p-1">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Icon className="w-16 h-16 text-gray-800 dark:text-gray-200" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{connector.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${connector.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{connector.status}</span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDisconnect(connector.id)} className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/20">
              <Trash2 className="w-4 h-4 mr-2" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card className="bg-transparent border-none shadow-none">
            <CardContent className="p-0 grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Connected Account</h4>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={connector.account.avatar} />
                    <AvatarFallback>{connector.account.email.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{connector.account.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last sync: {new Date(connector.lastSync).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Permissions Granted</h4>
                <div className="flex flex-wrap gap-2">
                  {connector.permissions.map((p: string) => <Badge key={p} variant="secondary">{p}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="space-y-8">
            <div>
              <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Sync Frequency</h4>
              <Select value={connector.syncFrequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real-time">Real-time</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Data Scope</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { id: 'calendar', label: 'Calendar' },
                  { id: 'email', label: 'Email' },
                  { id: 'contacts', label: 'Contacts' },
                  { id: 'repos', label: 'Repositories' },
                  { id: 'issues', label: 'Issues' },
                  { id: 'channels', label: 'Channels' },
                  { id: 'default', label: 'Default' },
                ].map(item => (
                  <div key={item.id} className="flex items-center space-x-2 p-3 rounded-lg bg-gray-100/50 dark:bg-gray-900/50">
                    <Switch id={`${connector.id}-${item.id}`} checked={(connector.dataScope || []).includes(item.id)} onCheckedChange={(c) => handleDataScopeChange(item.id, c)} />
                    <label htmlFor={`${connector.id}-${item.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{item.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="health" className="mt-6">
            <div className="space-y-8">
                <div>
                    <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">API Rate Limit</h4>
                    <div className="flex items-center gap-4">
                        <div className="w-full relative">
                            <Progress value={(connector.rateLimit.used / connector.rateLimit.limit) * 100} className="h-3" />
                            <div className="absolute top-0 left-0 h-full flex items-center pl-2 text-xs font-bold text-white mix-blend-difference">
                                {((connector.rateLimit.used / connector.rateLimit.limit) * 100).toFixed(1)}%
                            </div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{connector.rateLimit.used.toLocaleString()} / {connector.rateLimit.limit.toLocaleString()}</span>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Recent Sync History</h4>
                    <ScrollArea className="h-64 border rounded-lg p-2 bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="space-y-2 p-2">
                            {connector.syncHistory.length > 0 ? connector.syncHistory.map((sync: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {sync.status === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                        <div>
                                            <p className="text-sm font-medium">{new Date(sync.time).toLocaleString()}</p>
                                            <p className={`text-xs ${sync.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{sync.status === 'success' ? 'Sync completed successfully' : 'Sync failed'}</p>
                                        </div>
                                    </div>
                                    <Badge variant={sync.status === 'success' ? 'outline' : 'destructive'} className="capitalize">{sync.status}</Badge>
                                </div>
                            )) : <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">No sync history available.</p>}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};