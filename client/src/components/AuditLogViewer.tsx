
import React, { useState, useMemo } from 'react';
import { Search, User, Shield, Clock, ChevronDown, ChevronsRight, Server, FileText } from 'lucide-react';

// --- TYPES ---
type AuditAction = 'login' | 'logout' | 'create' | 'read' | 'update' | 'delete';
type ResourceType = 'user' | 'document' | 'system';
type Severity = 'low' | 'medium' | 'high' | 'critical';

type AuditLog = {
  id: string;
  timestamp: Date;
  actor: { id: string; name: string; };
  action: AuditAction;
  resource: { type: ResourceType; id: string; };
  severity: Severity;
  ipAddress: string;
};

// --- MOCK DATA GENERATION ---
const generateMockData = (count: number): AuditLog[] => {
  const users = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
  const actions: AuditAction[] = ['login', 'logout', 'create', 'read', 'update', 'delete'];
  const resourceTypes: ResourceType[] = ['user', 'document', 'system'];
  const severities: Severity[] = ['low', 'medium', 'high', 'critical'];

  return Array.from({ length: count }, (_, i) => {
    const actorName = users[i % users.length];
    const action = actions[i % actions.length];
    const resourceType = resourceTypes[i % resourceTypes.length];
    const severity = severities[i % severities.length];
    const timestamp = new Date(Date.now() - i * 1000 * 60 * (Math.random() * 60 + 1));

    return {
      id: `log-${i}`,
      timestamp,
      actor: { id: `user-${i % users.length}`, name: actorName },
      action,
      resource: { type: resourceType, id: `${resourceType}-${i}` },
      severity,
      ipAddress: `192.168.1.${i % 255}`,
    };
  });
};

// --- HELPER COMPONENTS ---
const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => {
  const colors = {
    low: 'bg-blue-900/50 text-blue-300 border-blue-500/30',
    medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-500/30',
    high: 'bg-orange-900/50 text-orange-300 border-orange-500/30',
    critical: 'bg-red-900/50 text-red-300 border-red-500/30',
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[severity]}`}>{severity}</span>;
};

const ResourceIcon: React.FC<{ type: ResourceType }> = ({ type }) => {
  const icons = {
    user: <User className="w-4 h-4" />,
    document: <FileText className="w-4 h-4" />,
    system: <Server className="w-4 h-4" />,
  };
  return icons[type];
};

// --- MAIN COMPONENT ---
export default function AuditLogViewer() {
  const [logs] = useState<AuditLog[]>(() => generateMockData(100));
  const [filter, setFilter] = useState('');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const searchLower = filter.toLowerCase();
      const matchesSearch = 
        log.actor.name.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.resource.id.toLowerCase().includes(searchLower) ||
        log.ipAddress.includes(searchLower);

      const matchesActor = actorFilter ? log.actor.name === actorFilter : true;
      const matchesAction = actionFilter ? log.action === actionFilter : true;
      const matchesSeverity = severityFilter ? log.severity === severityFilter : true;

      return matchesSearch && matchesActor && matchesAction && matchesSeverity;
    });
  }, [logs, filter, actorFilter, actionFilter, severityFilter]);

  const actors = useMemo(() => Array.from(new Set(logs.map(l => l.actor.name))), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map(l => l.action))), [logs]);
  const severities = useMemo(() => Array.from(new Set(logs.map(l => l.severity))), [logs]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };

  const DropdownFilter: React.FC<{ label: string; options: string[]; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; }> = ({ label, options, value, onChange }) => (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="bg-[#0a0a0a] border border-white/10 rounded-md pl-3 pr-8 py-2 text-sm text-white/60 appearance-none focus:outline-none focus:ring-1 focus:ring-white/20"
      >
        <option value="">{label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Audit Log</h1>
          <p className="text-sm text-white/60 mt-1">Comprehensive audit trail for all platform activities.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 border border-white/10 rounded-lg bg-[#111]">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Search logs (actor, action, resource ID, IP)..."
              value={filter}
              onChange={handleFilterChange}
              className="w-full bg-transparent border border-white/10 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownFilter label="All Actors" options={actors} value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} />
            <DropdownFilter label="All Actions" options={actions} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
            <DropdownFilter label="All Severities" options={severities} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} />
          </div>
        </div>

        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="whitespace-nowrap">
                  <th className="px-4 py-3 font-semibold text-left text-white/80">Actor</th>
                  <th className="px-4 py-3 font-semibold text-left text-white/80">Action</th>
                  <th className="px-4 py-3 font-semibold text-left text-white/80">Resource</th>
                  <th className="px-4 py-3 font-semibold text-left text-white/80">Severity</th>
                  <th className="px-4 py-3 font-semibold text-left text-white/80">Timestamp</th>
                  <th className="px-4 py-3 font-semibold text-left text-white/80">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-white/40" />
                        <span className="font-medium text-white/90">{log.actor.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChevronsRight className="w-4 h-4 text-white/40" />
                        <span className="text-white/80">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                        <ResourceIcon type={log.resource.type} />
                        <span>{log.resource.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={log.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-white/60">
                        <Clock className="w-4 h-4" />
                        <span>{log.timestamp.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/60">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-white/60">
                <p>No logs found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
