import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Search, FileDown } from 'lucide-react';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  stackTrace?: string;
}

const generateMockLogs = (count: number): LogEntry[] => {
  const logs: LogEntry[] = [];
  const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const sources = ['api-gateway', 'user-service', 'payment-processor', 'frontend-app', 'database-connector'];
  const messages = [
    'User logged in successfully',
    'Failed to process payment: card declined',
    'Database connection established',
    'API request timed out',
    'Missing required field: username',
    'New user registered',
    'Cache cleared for user profile',
    'Unhandled exception caught',
    'Debugging user session for user_id: 12345',
    'Configuration loaded from environment variables'
  ];

  for (let i = 0; i < count; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    logs.push({
      id: i,
      timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24),
      level,
      source: sources[Math.floor(Math.random() * sources.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      stackTrace: level === 'ERROR' ? `Error: ${messages[Math.floor(Math.random() * messages.length)]}\n    at /app/services/payment.js:123:45\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)` : undefined,
    });
  }
  return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

const levelColors: Record<LogLevel, string> = {
  INFO: 'bg-blue-500 hover:bg-blue-600',
  WARN: 'bg-yellow-500 hover:bg-yellow-600',
  ERROR: 'bg-red-500 hover:bg-red-600',
  DEBUG: 'bg-gray-500 hover:bg-gray-600',
};

export default function LogViewer() {
  const [logs] = useState<LogEntry[]>(() => generateMockLogs(200));
  const [levelFilters, setLevelFilters] = useState<Record<LogLevel, boolean>>({ INFO: true, WARN: true, ERROR: true, DEBUG: true });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (!levelFilters[log.level]) return false;
      if (searchTerm) {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return (
          log.message.toLowerCase().includes(lowerCaseSearch) ||
          log.source.toLowerCase().includes(lowerCaseSearch) ||
          log.timestamp.toISOString().toLowerCase().includes(lowerCaseSearch)
        );
      }
      return true;
    });
  }, [logs, levelFilters, searchTerm]);

  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleLevelFilterChange = (level: LogLevel, checked: boolean) => {
    setLevelFilters(prev => ({ ...prev, [level]: checked }));
  };

  const handleToggleExpand = (id: number) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'filtered_logs.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const highlightMatch = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <Card className="w-full h-[90vh] flex flex-col bg-background text-foreground">
      <CardHeader className="border-b border-border p-4">
        <div className="flex justify-between items-center">
          <CardTitle>Structured Log Viewer</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
              <Label htmlFor="auto-scroll">Auto-Scroll</Label>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileDown className="h-4 w-4 mr-2" />
              Export ({filteredLogs.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow flex flex-col overflow-hidden">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-10 bg-muted"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-4">
            {(Object.keys(levelFilters) as LogLevel[]).map(level => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox
                  id={level}
                  checked={levelFilters[level]}
                  onCheckedChange={(checked: boolean) => handleLevelFilterChange(level, checked)}
                />
                <Label htmlFor={level} className="capitalize">{level.toLowerCase()}</Label>
              </div>
            ))}
          </div>
          <Badge variant="secondary">{filteredLogs.length} / {logs.length} entries</Badge>
        </div>
        <div ref={scrollAreaRef} className="flex-grow overflow-auto rounded-md border border-border font-mono text-sm">
          {filteredLogs.map(log => (
            <React.Fragment key={log.id}>
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-start p-2 border-b border-border/50 hover:bg-muted/50 cursor-pointer"
                onClick={() => log.stackTrace && handleToggleExpand(log.id)}
              >
                <div className="w-40 text-muted-foreground pr-4 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</div>
                <div className="w-24 flex-shrink-0">
                  <Badge className={cn('text-white', levelColors[log.level])}>{log.level}</Badge>
                </div>
                <div className="w-40 text-muted-foreground pr-4 flex-shrink-0">{log.source}</div>
                <div className="flex-grow break-words whitespace-pre-wrap">{highlightMatch(log.message)}</div>
                {log.stackTrace && (
                  <div className="pl-4">
                    {expandedEntries.has(log.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                )}
              </motion.div>
              <AnimatePresence>
                {expandedEntries.has(log.id) && log.stackTrace && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-muted/30 p-4 border-b border-border/50 text-red-400 whitespace-pre-wrap"
                  >
                    {log.stackTrace}
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
