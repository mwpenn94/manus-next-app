import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, CircleX, User, FileText, Download, Calendar } from 'lucide-react';

// Type definitions
type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT';

interface AuditEvent {
  id: string;
  actor: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  action: ActionType;
  resource: {
    type: string;
    id: string;
  };
  timestamp: string;
  ipAddress: string;
  location: string;
  diff?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
}

// Mock Data
const mockAuditEvents: AuditEvent[] = Array.from({ length: 25 }, (_, i) => {
    const actions: ActionType[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'];
    const resources = ['User', 'Document', 'Setting', 'Invoice'];
    const action = actions[i % actions.length];
    const actorName = ['Alice', 'Bob', 'Charlie', 'Diana'][i % 4];
    
    let diff = undefined;
    if (action === 'UPDATE') {
        diff = {
            before: { status: 'pending', assignedTo: 'Alice' },
            after: { status: 'completed', assignedTo: 'Bob' }
        }
    }
    if (action === 'CREATE') {
        diff = {
            before: {},
            after: { title: `New Document ${i}`, content: 'Lorem ipsum...' }
        }
    }

    return {
        id: `evt_${i + 1}`,
        actor: {
            id: `user_${i % 4 + 1}`,
            name: actorName,
            avatarUrl: `https://i.pravatar.cc/40?u=${actorName}`,
        },
        action: action,
        resource: {
            type: resources[i % resources.length],
            id: `res_${i + 101}`,
        },
        timestamp: new Date(Date.now() - i * 1000 * 60 * 60 * 3).toISOString(),
        ipAddress: `192.168.1.${100 + i}`,
        location: 'New York, USA',
        diff: diff
    };
});

const DiffView = ({ before, after }: { before: Record<string, any>, after: Record<string, any> }) => {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-2 ml-4 border-l-2 border-border pl-4 overflow-hidden"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs">
                <div>
                    <h4 className="font-semibold mb-1 text-red-400">Before</h4>
                    <pre className="bg-muted/50 p-2 rounded text-muted-foreground whitespace-pre-wrap font-mono text-xs">{JSON.stringify(before, null, 2)}</pre>
                </div>
                <div>
                    <h4 className="font-semibold mb-1 text-green-400">After</h4>
                    <pre className="bg-muted/50 p-2 rounded text-foreground whitespace-pre-wrap font-mono text-xs">{JSON.stringify(after, null, 2)}</pre>
                </div>
            </div>
        </motion.div>
    );
};

export default function AuditLogExplorer() {
    const [filters, setFilters] = useState({ actor: '', action: 'ALL', resource: '', startDate: '', endDate: '' });
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const actionConfig: Record<ActionType, { color: string; icon: React.ElementType }> = {
        CREATE: { color: 'bg-green-500/20 text-green-400', icon: Wrench },
        UPDATE: { color: 'bg-blue-500/20 text-blue-400', icon: Wrench },
        DELETE: { color: 'bg-red-500/20 text-red-400', icon: CircleX },
        LOGIN: { color: 'bg-yellow-500/20 text-yellow-400', icon: User },
        EXPORT: { color: 'bg-purple-500/20 text-purple-400', icon: FileText },
    };

    const filteredEvents = useMemo(() => {
        return mockAuditEvents.filter(event => {
            const eventDate = new Date(event.timestamp);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;

            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            if (filters.actor && !event.actor.name.toLowerCase().includes(filters.actor.toLowerCase())) return false;
            if (filters.action !== 'ALL' && event.action !== filters.action) return false;
            if (filters.resource && !(event.resource.type.toLowerCase().includes(filters.resource.toLowerCase()) || event.resource.id.toLowerCase().includes(filters.resource.toLowerCase()))) return false;

            return true;
        });
    }, [filters]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ actor: '', action: 'ALL', resource: '', startDate: '', endDate: '' });
    };

    const exportToCsv = () => {
        const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Location'];
        const csvRows = [
            headers.join(','),
            ...filteredEvents.map(event => [
                `"${event.id}"`,
                `"${event.timestamp}"`,
                `"${event.actor.name}"`,
                `"${event.action}"`,
                `"${event.resource.type}"`,
                `"${event.resource.id}"`,
                `"${event.ipAddress}"`,
                `"${event.location}"`
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'audit_log.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    return (
        <Card className="w-full max-w-6xl mx-auto bg-background text-foreground border-border">
            <CardHeader>
                <CardTitle>Audit Log Explorer</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                        <Input placeholder="Filter by actor..." value={filters.actor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('actor', e.target.value)} className="bg-background" />
                        <Select value={filters.action} onValueChange={(value: string) => handleFilterChange('action', value)}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Filter by action..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Actions</SelectItem>
                                {Object.keys(actionConfig).map(action => <SelectItem key={action} value={action}>{action}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input placeholder="Filter by resource..." value={filters.resource} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('resource', e.target.value)} className="bg-background" />
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" placeholder="Start date" value={filters.startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('startDate', e.target.value)} className="bg-background pl-10" />
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" placeholder="End date" value={filters.endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('endDate', e.target.value)} className="bg-background pl-10" />
                        </div>
                        <div className="md:col-span-3 lg:col-span-5 flex justify-end gap-2">
                            <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
                            <Button onClick={exportToCsv}><Download className="mr-2 h-4 w-4" /> Export Results</Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="overflow-auto h-[600px] pr-4">
                        <div className="relative space-y-6">
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border"></div>
                            <AnimatePresence>
                                {filteredEvents.map(event => (
                                    <motion.div key={event.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="pl-12 relative">
                                        <div className="absolute left-0 top-0">
                                            <Avatar className="h-10 w-10 border-2 border-background">
                                                <AvatarImage src={event.actor.avatarUrl} alt={event.actor.name} />
                                                <AvatarFallback>{event.actor.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="ml-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold">{event.actor.name}</span>
                                                <Badge className={cn('font-mono text-xs', actionConfig[event.action].color)}>
                                                    {React.createElement(actionConfig[event.action].icon, { className: 'h-3 w-3 mr-1' })}
                                                    {event.action}
                                                </Badge>
                                                <span className="text-muted-foreground">{event.resource.type}: {event.resource.id}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                <span title={new Date(event.timestamp).toLocaleString()}>{formatRelativeTime(event.timestamp)}</span>
                                                <span>&bull;</span>
                                                <span>{event.ipAddress} ({event.location})</span>
                                            </div>
                                            {event.diff && (
                                                <Button variant="link" className="p-0 h-auto text-xs mt-1" onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}>
                                                    {expandedId === event.id ? 'Hide' : 'Show'} Changes
                                                </Button>
                                            )}
                                            <AnimatePresence>
                                                {expandedId === event.id && event.diff && <DiffView before={event.diff.before} after={event.diff.after} />}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
