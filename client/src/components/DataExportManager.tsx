import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, X, Calendar as CalendarIcon, Settings, Clock } from 'lucide-react';

type ExportFormat = 'CSV' | 'JSON' | 'Excel' | 'PDF';
type ExportStatus = 'Completed' | 'In Progress' | 'Failed' | 'Cancelled';

interface ExportHistoryItem {
  id: string;
  fileName: string;
  format: ExportFormat;
  date: string;
  status: ExportStatus;
  size: string;
  downloadUrl: string;
}

const mockFields = ['User ID', 'Name', 'Email', 'Signup Date', 'Last Login', 'Subscription Plan', 'Revenue'];

const mockHistory: ExportHistoryItem[] = [
  { id: 'exp-001', fileName: 'users_20230428.csv', format: 'CSV', date: '2023-04-28 14:30', status: 'Completed', size: '2.5 MB', downloadUrl: '#' },
  { id: 'exp-002', fileName: 'analytics_20230427.json', format: 'JSON', date: '2023-04-27 10:15', status: 'Completed', size: '5.1 MB', downloadUrl: '#' },
  { id: 'exp-003', fileName: 'report_q1_2023.xlsx', format: 'Excel', date: '2023-04-26 18:00', status: 'Failed', size: 'N/A', downloadUrl: '#' },
  { id: 'exp-004', fileName: 'invoices_20230425.pdf', format: 'PDF', date: '2023-04-25 09:05', status: 'Completed', size: '10.2 MB', downloadUrl: '#' },
  { id: 'exp-005', fileName: 'customers_20230424.csv', format: 'CSV', date: '2023-04-24 12:45', status: 'Cancelled', size: '1.8 MB', downloadUrl: '#' },
];

export default function DataExportManager() {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('CSV');
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());
  const [selectedFields, setSelectedFields] = useState<string[]>(mockFields);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [estimatedSize, setEstimatedSize] = useState<string>('~5.8 MB');
  const [enableSchedule, setEnableSchedule] = useState<boolean>(false);

  const handleFieldSelection = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const handleExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleCancelExport = () => {
    setIsExporting(false);
    setExportProgress(0);
  };

  const allFieldsSelected = useMemo(() => selectedFields.length === mockFields.length, [selectedFields]);
  const someFieldsSelected = useMemo(() => selectedFields.length > 0 && !allFieldsSelected, [selectedFields, allFieldsSelected]);

  const handleSelectAllFields = (checked: boolean) => {
    setSelectedFields(checked ? mockFields : []);
  }

  return (
    <div className="bg-background text-foreground p-6 max-w-4xl mx-auto font-sans">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Data Export Manager
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              Export Data
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configuration Section */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CSV">CSV</SelectItem>
                    <SelectItem value="JSON">JSON</SelectItem>
                    <SelectItem value="Excel">Excel</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange ? new Intl.DateTimeFormat().format(dateRange) : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateRange} onSelect={setDateRange} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fields to Export</Label>
                <div className="border border-border rounded-md p-4 h-48 overflow-y-auto">
                  <div className="flex items-center pb-2 border-b border-border mb-2">
                    <Checkbox 
                      id="select-all-fields"
                      checked={allFieldsSelected}
                      onCheckedChange={handleSelectAllFields}
                    />
                    <Label htmlFor="select-all-fields" className="ml-2 font-medium">Select All</Label>
                  </div>
                  {mockFields.map(field => (
                    <div key={field} className="flex items-center space-x-2 py-1">
                      <Checkbox 
                        id={field}
                        checked={selectedFields.includes(field)}
                        onCheckedChange={() => handleFieldSelection(field)}
                      />
                      <Label htmlFor={field} className="font-normal">{field}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Estimated file size: <span className="font-medium text-foreground">{estimatedSize}</span>
              </div>
            </div>

            {/* Export Status & Schedule */}
            <div className="space-y-6">
              <AnimatePresence>
                {isExporting && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-2 p-4 bg-muted rounded-lg"
                  >
                    <Label>Exporting...</Label>
                    <div className="flex items-center gap-2">
                      <Progress value={exportProgress} className="w-full" />
                      <span className="text-sm font-mono">{exportProgress}%</span>
                      <Button variant="ghost" size="icon" onClick={handleCancelExport}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Card className="bg-muted/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Scheduled Export
                    </div>
                    <Switch checked={enableSchedule} onCheckedChange={setEnableSchedule} />
                  </CardTitle>
                </CardHeader>
                <AnimatePresence>
                  {enableSchedule && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <Select>
                            <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground">Next export will run automatically.</p>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </div>
          </div>

          {/* Export History */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Export History</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.fileName}</TableCell>
                      <TableCell>{item.format}</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.status === 'Completed' && "bg-green-500/20 text-green-400",
                          item.status === 'In Progress' && "bg-blue-500/20 text-blue-400",
                          item.status === 'Failed' && "bg-red-500/20 text-red-400",
                          item.status === 'Cancelled' && "bg-yellow-500/20 text-yellow-400",
                        )}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" disabled={item.status !== 'Completed'}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
