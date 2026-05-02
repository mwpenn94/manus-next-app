import React, { useState, useMemo, FC } from 'react';
import { Search, ChevronDown, ChevronRight, X, Clock, BarChart2, Code, FileText } from 'lucide-react';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

type LogEntry = {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata: Record<string, string>;
};

const logLevels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const levelColors: Record<LogLevel, string> = {
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-gray-400',
};

const generateMockLogs = (count: number): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = Date.now();
  const services = ['api-gateway', 'user-service', 'payment-processor', 'auth-service'];
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  const statusCodes = ['200', '201', '400', '404', '500'];

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - i * 1000 * Math.random() * 60);
    const level = logLevels[Math.floor(Math.random() * logLevels.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    logs.push({
      id: `${timestamp.getTime()}-${i}`,
      timestamp,
      level,
      message: `Request to ${httpMethods[Math.floor(Math.random() * httpMethods.length)]} /${service}/v1/endpoint completed.`,
      metadata: {
        service,
        traceId: `trace-${(Math.random() + 1).toString(36).substring(7)}`,
        statusCode: statusCodes[Math.floor(Math.random() * statusCodes.length)],
        userId: `user-${Math.floor(Math.random() * 100)}`,
      },
    });
  }
  return logs;
};

const allLogs = generateMockLogs(500);

const LogLevelPill: FC<{ level: LogLevel; count: number; onClick: () => void; isSelected: boolean }> = ({ level, count, onClick, isSelected }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${isSelected ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'}`}>
    <span className={`${levelColors[level]}`}>●</span>
    <span>{level}</span>
    <span className="text-white/40">{count}</span>
  </button>
);

const LogEntryRow: FC<{ log: LogEntry; isExpanded: boolean; onToggle: () => void }> = ({ log, isExpanded, onToggle }) => (
  <div className="border-b border-white/10 font-mono text-sm">
    <div onClick={onToggle} className="flex items-center p-3 cursor-pointer hover:bg-white/5">
      <div className="w-8">
        <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </div>
      <div className="w-40 text-white/60">{log.timestamp.toLocaleTimeString('en-US', { hour12: false })}</div>
      <div className={`w-20 font-bold ${levelColors[log.level]}`}>{log.level}</div>
      <div className="flex-1 truncate text-white/80">{log.message}</div>
    </div>
    {isExpanded && (
      <div className="bg-black/20 p-4 text-xs text-white/70">
        <pre className="whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
      </div>
    )}
  </div>
);

export default function LogExplorer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState(900); // in seconds, 15 mins

  const toggleLevel = (level: LogLevel) => {
    setSelectedLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  const toggleLogExpansion = (id: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    return allLogs
      .filter(log => (now - log.timestamp.getTime()) / 1000 <= timeRange)
      .filter(log => selectedLevels.size === 0 || selectedLevels.has(log.level))
      .filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(log.metadata).some(v => v.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [searchTerm, selectedLevels, timeRange]);

  const levelCounts = useMemo(() => {
    const counts: Record<LogLevel, number> = { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 };
    const now = Date.now();
    allLogs.filter(log => (now - log.timestamp.getTime()) / 1000 <= timeRange).forEach(log => {
      counts[log.level]++;
    });
    return counts;
  }, [timeRange]);

  return (
    <div className="bg-[#0a0a0a] text-white w-full h-full flex flex-col p-4 lg:p-6 font-sans overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold">Log Explorer</h1>
          <p className="text-sm text-white/60">Search and analyze structured logs in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md w-full pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-md appearance-none pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={300}>Last 5m</option>
              <option value={900}>Last 15m</option>
              <option value={3600}>Last 1h</option>
              <option value={21600}>Last 6h</option>
            </select>
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          </div>
        </div>
      </header>

      <div className="border border-white/10 rounded-lg flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {logLevels.map(level => (
              <LogLevelPill
                key={level}
                level={level}
                count={levelCounts[level]}
                onClick={() => toggleLevel(level)}
                isSelected={selectedLevels.has(level)}
              />
            ))}
          </div>
          {selectedLevels.size > 0 && (
            <button onClick={() => setSelectedLevels(new Set())} className="flex items-center gap-1 text-xs text-white/60 hover:text-white">
              <X size={14} /> Clear filters
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredLogs.length > 0 ? (
            filteredLogs.slice(0, 100).map(log => (
              <LogEntryRow
                key={log.id}
                log={log}
                isExpanded={expandedLogs.has(log.id)}
                onToggle={() => toggleLogExpansion(log.id)}
              />
            ))
          ) : (
            <div className="text-center py-16 text-white/60">
              <FileText className="mx-auto w-12 h-12 mb-2" />
              <p>No logs found for the current filters.</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-white/10 text-xs text-white/60">
          Showing {Math.min(filteredLogs.length, 100)} of {filteredLogs.length} logs. (Display limited to 100 for performance)
        </div>
      </div>
    </div>
  );
}