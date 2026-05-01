import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  AlertCircle, CheckCircle2, Clock, MessageSquare, Activity, ShieldAlert, 
  ExternalLink, ChevronDown, ChevronUp, Search, Filter 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// --- TYPES AND MOCK DATA ---
type Severity = 'P1' | 'P2' | 'P3' | 'P4';
type Status = 'detected' | 'acknowledged' | 'investigating' | 'resolved';
type EventType = 'status_change' | 'comment' | 'system';

interface IncidentEvent {
  id: string;
  timestamp: string;
  description: string;
  author: string;
  type: EventType;
}

interface Assignee {
  id: string;
  name: string;
  avatar?: string;
}

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: Status;
  startTime: string;
  endTime?: string;
  duration: string;
  assignees: Assignee[];
  alerts: string[];
  postmortemLink?: string;
  events: IncidentEvent[];
}

const MOCK_INCIDENTS: Incident[] = [
  {
    id: "INC-1042",
    title: "Database Connection Pool Exhaustion",
    severity: "P1",
    status: "resolved",
    startTime: "2023-10-27T08:15:00Z",
    endTime: "2023-10-27T10:30:00Z",
    duration: "2h 15m",
    assignees: [
      { id: "u1", name: "Alice Chen", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d" },
      { id: "u2", name: "Bob Smith", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026025e" }
    ],
    alerts: ["High DB Latency", "Connection Refused"],
    postmortemLink: "https://wiki.example.com/postmortems/inc-1042",
    events: [
      { id: "e1", timestamp: "2023-10-27T08:15:00Z", description: "Automated alert triggered: High DB Latency", author: "System", type: "system" },
      { id: "e2", timestamp: "2023-10-27T08:20:00Z", description: "Incident acknowledged by Alice Chen", author: "Alice Chen", type: "status_change" },
      { id: "e3", timestamp: "2023-10-27T08:35:00Z", description: "Identified rogue query causing pool exhaustion. Killing query.", author: "Bob Smith", type: "comment" },
      { id: "e4", timestamp: "2023-10-27T10:30:00Z", description: "Services fully recovered. Incident resolved.", author: "Alice Chen", type: "status_change" }
    ]
  },
  {
    id: "INC-1043",
    title: "Payment Gateway Timeout",
    severity: "P2",
    status: "investigating",
    startTime: "2023-10-28T14:00:00Z",
    duration: "1h 45m",
    assignees: [
      { id: "u3", name: "Charlie Davis", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d" }
    ],
    alerts: ["Payment API 5xx Errors"],
    events: [
      { id: "e6", timestamp: "2023-10-28T14:00:00Z", description: "Multiple 504 Gateway Timeout errors detected on /api/payments", author: "System", type: "system" },
      { id: "e7", timestamp: "2023-10-28T14:05:00Z", description: "Incident acknowledged", author: "Charlie Davis", type: "status_change" },
      { id: "e8", timestamp: "2023-10-28T14:30:00Z", description: "Contacting third-party payment provider for status update.", author: "Charlie Davis", type: "comment" }
    ]
  },
  {
    id: "INC-1044",
    title: "User Avatar Upload Failing",
    severity: "P3",
    status: "acknowledged",
    startTime: "2023-10-29T09:10:00Z",
    duration: "45m",
    assignees: [
      { id: "u4", name: "Diana Prince", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026705f" }
    ],
    alerts: ["S3 Upload Errors"],
    events: [
      { id: "e9", timestamp: "2023-10-29T09:10:00Z", description: "S3 PutObject Access Denied errors spiking", author: "System", type: "system" },
      { id: "e10", timestamp: "2023-10-29T09:15:00Z", description: "Acknowledged. Checking IAM permissions for the S3 bucket.", author: "Diana Prince", type: "status_change" }
    ]
  },
  {
    id: "INC-1045",
    title: "Search Index Out of Sync",
    severity: "P4",
    status: "detected",
    startTime: "2023-10-29T11:00:00Z",
    duration: "10m",
    assignees: [],
    alerts: ["Elasticsearch Sync Lag"],
    events: [
      { id: "e11", timestamp: "2023-10-29T11:00:00Z", description: "Search index replication lag exceeded 5 minutes", author: "System", type: "system" }
    ]
  },
   {
    id: "INC-1046",
    title: "Redis Cache Eviction Spike",
    severity: "P2",
    status: "resolved",
    startTime: "2023-10-26T16:00:00Z",
    endTime: "2023-10-26T16:45:00Z",
    duration: "45m",
    assignees: [
      { id: "u2", name: "Bob Smith", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026025e" }
    ],
    alerts: ["Cache Hit Ratio Drop"],
    postmortemLink: "https://wiki.example.com/postmortems/inc-1046",
    events: [
      { id: "e12", timestamp: "2023-10-26T16:00:00Z", description: "Cache hit ratio dropped below 60%", author: "System", type: "system" },
      { id: "e13", timestamp: "2023-10-26T16:20:00Z", description: "Increased Redis maxmemory limit to 4GB", author: "Bob Smith", type: "comment" },
      { id: "e14", timestamp: "2023-10-26T16:45:00Z", description: "Hit ratio recovered to 95%. Resolved.", author: "Bob Smith", type: "status_change" }
    ]
  }
];

// --- CONFIGURATION OBJECTS ---
const severityConfig: Record<Severity, { className: string; label: string }> = {
  P1: { className: "bg-red-500/10 text-red-500 border-red-500/20", label: "P1 - Critical" },
  P2: { className: "bg-orange-500/10 text-orange-500 border-orange-500/20", label: "P2 - High" },
  P3: { className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "P3 - Medium" },
  P4: { className: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "P4 - Low" },
};

const statusConfig: Record<Status, { className: string; icon: React.ElementType; label: string }> = {
  detected: { className: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: AlertCircle, label: "Detected" },
  acknowledged: { className: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Activity, label: "Acknowledged" },
  investigating: { className: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Search, label: "Investigating" },
  resolved: { className: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2, label: "Resolved" },
};

const eventIcons: Record<EventType, React.ElementType> = {
  system: Activity,
  status_change: CheckCircle2,
  comment: MessageSquare,
};

// --- SUB-COMPONENTS ---
const IncidentCard = ({ incident, isExpanded, onToggleExpand }: { incident: Incident; isExpanded: boolean; onToggleExpand: (id: string) => void; }) => {
  const StatusIcon = statusConfig[incident.status].icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
      <Card className={cn(
        "overflow-hidden border-l-4 transition-colors hover:border-l-primary",
        incident.severity === "P1" ? "border-l-red-500" :
        incident.severity === "P2" ? "border-l-orange-500" :
        incident.severity === "P3" ? "border-l-yellow-500" : "border-l-blue-500"
      )}>
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onToggleExpand(incident.id)}>
          <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto">
            <div className="flex flex-col gap-1">
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-mono text-sm text-muted-foreground">{incident.id}</span>
                <Badge variant="outline" className={cn("font-bold", severityConfig[incident.severity].className)}>{incident.severity}</Badge>
                <Badge variant="outline" className={cn("capitalize flex items-center gap-1", statusConfig[incident.status].className)}>
                  <StatusIcon className="w-3 h-3" />
                  {incident.status}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold">{incident.title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{incident.duration}</span></div>
              {incident.assignees.length > 0 && (
                <div className="flex -space-x-2">
                  {incident.assignees.map((assignee: Assignee) => (
                    <Avatar key={assignee.id} className="w-8 h-8 border-2 border-background">
                      <AvatarImage src={assignee.avatar} alt={assignee.name} />
                      <AvatarFallback className="text-xs bg-muted">{assignee.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="shrink-0"><AnimatePresence initial={false} mode="wait"><motion.div key={isExpanded ? 'up' : 'down'} initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }} transition={{ duration: 0.2 }}>{isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</motion.div></AnimatePresence></Button>
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
              <IncidentDetails incident={incident} />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

const IncidentDetails = ({ incident }: { incident: Incident }) => (
  <div className="p-4 pt-0 border-t border-border bg-muted/20">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
      <div className="md:col-span-2 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Timeline</h4>
        <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-0 before:ml-[11px] before:w-0.5 before:bg-border/70">
          {incident.events.map((event: IncidentEvent) => {
            const EventIcon = eventIcons[event.type];
            return (
              <div key={event.id} className="relative flex items-start gap-4">
                <div className="absolute left-0 top-1 -translate-x-1/2 bg-background border-2 border-border rounded-full p-1 z-10">
                  <EventIcon className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1 bg-card/50 border border-border rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium">{event.author}</span>
                    <span className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="space-y-6">
        {incident.alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Related Alerts</h4>
            <div className="flex flex-wrap gap-2">
              {incident.alerts.map((alert: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"><AlertCircle className="w-3 h-3 mr-1" />{alert}</Badge>
              ))}
            </div>
          </div>
        )}
        {incident.postmortemLink && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Postmortem</h4>
            <Button variant="outline" className="w-full justify-start text-sm" asChild>
              <a href={incident.postmortemLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />View Report</a>
            </Button>
          </div>
        )}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Started:</span><span>{new Date(incident.startTime).toLocaleString('en-US')}</span></div>
            {incident.endTime && <div className="flex justify-between"><span className="text-muted-foreground">Ended:</span><span>{new Date(incident.endTime).toLocaleString('en-US')}</span></div>}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---
export default function IncidentTimeline() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set([MOCK_INCIDENTS[0].id]));

  const toggleExpand = (id: string) => {
    setExpandedIncidents((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredIncidents = useMemo(() => {
    return MOCK_INCIDENTS.filter((inc: Incident) => {
      const matchesSearch = inc.title.toLowerCase().includes(searchQuery.toLowerCase()) || inc.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === "all" || inc.severity === severityFilter;
      const matchesStatus = statusFilter === "all" || inc.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [searchQuery, severityFilter, statusFilter]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 bg-background text-foreground min-h-screen flex flex-col gap-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ShieldAlert className="w-8 h-8 text-red-500" />Incident Management</h1>
          <p className="text-muted-foreground mt-1">Track, investigate, and resolve system incidents.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder="Search..." className="pl-9 bg-muted/50 w-full" value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={severityFilter} onValueChange={(val: string) => setSeverityFilter(val)}>
            <SelectTrigger className="w-full sm:w-[150px] bg-muted/50"><div className="flex items-center gap-2"><Filter className="w-4 h-4" /><SelectValue placeholder="Severity" /></div></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {Object.entries(severityConfig).map(([key, {label}]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(val: string) => setStatusFilter(val)}>
            <SelectTrigger className="w-full sm:w-[160px] bg-muted/50"><div className="flex items-center gap-2"><Activity className="w-4 h-4" /><SelectValue placeholder="Status" /></div></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, {label}]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex flex-col gap-4">
        <AnimatePresence>
          {filteredIncidents.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-border border-dashed">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No incidents found</p>
              <p className="text-sm">Try adjusting your filters or search query.</p>
            </motion.div>
          ) : (
            filteredIncidents.map((incident: Incident) => (
              <IncidentCard key={incident.id} incident={incident} isExpanded={expandedIncidents.has(incident.id)} onToggleExpand={toggleExpand} />
            ))
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
