import React, { useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronRight, FileDown, SlidersHorizontal, Info, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Assuming a DateRangePicker component exists. For now, a placeholder.
// import { DateRangePicker } from '@/components/ui/daterangepicker';

type LogSeverity = 'info' | 'warning' | 'critical';

interface Log {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: number;
  details?: string;
  severity: LogSeverity;
  ip?: string;
}

interface AuditLogViewerProps {
  logs: Log[];
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  filters: { severity?: string; actor?: string; dateRange?: [number, number] };
  onFilterChange: (filters: Record<string, unknown>) => void;
}

const severityConfig: Record<LogSeverity, { icon: ReactNode; color: string; iconColor: string }> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    color: 'border-transparent bg-blue-900/50 text-blue-300',
    iconColor: 'text-blue-400',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'border-transparent bg-yellow-900/50 text-yellow-300',
    iconColor: 'text-yellow-400',
  },
  critical: {
    icon: <ShieldAlert className="h-4 w-4" />,
    color: 'border-transparent bg-red-900/50 text-red-300',
    iconColor: 'text-red-400',
  },
};

const rowVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.3, ease: 'easeInOut' as const },
  },
} as const satisfies Variants;

const LogRow: React.FC<{ log: Log; isExpanded: boolean; onToggle: () => void; isDetailedView: boolean }> = ({ log, isExpanded, onToggle, isDetailedView }) => {
  const config = severityConfig[log.severity];

  return (
    <>
      <TableRow onClick={onToggle} className="cursor-pointer hover:bg-accent/50">
        <TableCell className="w-12">
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </TableCell>
        <TableCell>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-muted-foreground">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{format(new Date(log.timestamp), 'PPPpp')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
        <TableCell>{log.actor}</TableCell>
        <TableCell>{log.action}</TableCell>
        <TableCell>{log.target}</TableCell>
        <TableCell>
          <Badge variant="outline" className={cn('gap-x-1.5', config.color)}>
            <span className={cn(config.iconColor)}>{config.icon}</span>
            {log.severity}
          </Badge>
        </TableCell>
      </TableRow>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <TableRow className="bg-black/20 hover:bg-black/20">
            <TableCell colSpan={6} className="p-0">
              <motion.div variants={rowVariants} initial="hidden" animate="visible" exit="hidden">
                <div className="p-4 text-sm text-muted-foreground">
                  <p><strong>Details:</strong> {log.details || 'No additional details.'}</p>
                  {isDetailedView && <p><strong>IP Address:</strong> {log.ip || 'N/A'}</p>}
                  {isDetailedView && <p><strong>Log ID:</strong> {log.id}</p>}
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
};

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  logs,
  onLoadMore,
  hasMore,
  isLoading,
  filters,
  onFilterChange,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isDetailedView, setIsDetailedView] = useState(true);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleFilterChange = (key: string, value: unknown) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const memoizedLogs = useMemo(() => logs, [logs]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Audit Log</CardTitle>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-x-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Filters</h4>
                  <p className="text-sm text-muted-foreground">Adjust the filters to refine the logs.</p>
                </div>
                <div className="grid gap-2">
                  <Input
                    placeholder="Filter by actor..."
                    value={filters.actor || ''}
                    onChange={(e) => handleFilterChange('actor', e.target.value)}
                  />
                  <Select onValueChange={(value) => handleFilterChange('severity', value)} value={filters.severity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by severity..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Placeholder for DateRangePicker */}
                  <Button variant="outline" disabled>Select Date Range</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => setIsDetailedView(v => !v)}>
            {isDetailedView ? 'Compact View' : 'Detailed View'}
          </Button>
          <Button variant="outline" size="sm" className="gap-x-2" disabled>
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memoizedLogs.map(log => (
                <LogRow
                  key={log.id}
                  log={log}
                  isExpanded={expandedRows.has(log.id)}
                  onToggle={() => toggleRow(log.id)}
                  isDetailedView={isDetailedView}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button onClick={onLoadMore} disabled={isLoading} variant="secondary">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
