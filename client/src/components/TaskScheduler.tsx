
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import cronstrue from 'cronstrue';
import cronParser from 'cron-parser';
import { Calendar as CalendarIcon, Play, Pause, Trash2, Clock, Repeat, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- TYPES ---
type ScheduleConfig = {
  prompt: string;
  cronExpression?: string;
  runAt?: number;
  repeat: boolean;
  timezone: string;
};

type ExistingSchedule = {
  id: string;
  prompt: string;
  schedule: string;
  nextRun: number;
  lastRun?: number;
  status: 'active' | 'paused' | 'completed';
};

interface TaskSchedulerProps {
  onSchedule: (schedule: ScheduleConfig) => void;
  existingSchedules?: ExistingSchedule[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

// --- CONSTANTS & HELPERS ---
const timezones = Intl.supportedValuesOf('timeZone');

const cronOptions = {
  minute: ['0', '15', '30', '45'],
  hour: Array.from({ length: 24 }, (_, i) => i.toString()),
  dayOfMonth: ['*', ...Array.from({ length: 31 }, (_, i) => (i + 1).toString())],
  dayOfWeek: ['*', '0', '1', '2', '3', '4', '5', '6'], // 0 = Sunday
};

const dayOfWeekMap: { [key: string]: string } = {
    '*': 'Any Day',
    '0': 'Sunday',
    '1': 'Monday',
    '2': 'Tuesday',
    '3': 'Wednesday',
    '4': 'Thursday',
    '5': 'Friday',
    '6': 'Saturday',
}

// --- COMPONENT ---
export const TaskScheduler: React.FC<TaskSchedulerProps> = ({ onSchedule, existingSchedules = [], onPause, onResume, onDelete }) => {
  const [mode, setMode] = useState<'One-time' | 'Recurring'>('One-time');
  const [prompt, setPrompt] = useState('');
  const [runAtDate, setRunAtDate] = useState<Date | undefined>(new Date());
  const [runAtTime, setRunAtTime] = useState('09:00');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [cronMinute, setCronMinute] = useState('0');
  const [cronHour, setCronHour] = useState('9');
  const [cronDayOfMonth, setCronDayOfMonth] = useState('*');
  const [cronDayOfWeek, setCronDayOfWeek] = useState('*');

  const cronExpression = useMemo(() => {
    return `${cronMinute} ${cronHour} ${cronDayOfMonth} * ${cronDayOfWeek}`;
  }, [cronMinute, cronHour, cronDayOfMonth, cronDayOfWeek]);

  const humanReadableCron = useMemo(() => {
    try {
      return cronstrue.toString(cronExpression);
    } catch (e) {
      return 'Invalid cron expression';
    }
  }, [cronExpression]);

  const scheduledDates = useMemo(() => {
      return existingSchedules.map(s => new Date(s.nextRun));
  }, [existingSchedules]);

  const handleSchedule = useCallback(() => {
    if (!prompt) return;

    if (mode === 'One-time') {
      if (!runAtDate || !runAtTime) return;
      const [hours, minutes] = runAtTime.split(':').map(Number);
      const combinedDate = new Date(runAtDate.getFullYear(), runAtDate.getMonth(), runAtDate.getDate(), hours, minutes);
      onSchedule({
        prompt,
        runAt: combinedDate.getTime(),
        repeat: false,
        timezone,
      });
    } else {
      onSchedule({
        prompt,
        cronExpression,
        repeat: true,
        timezone,
      });
    }
    setPrompt('');
  }, [prompt, mode, runAtDate, runAtTime, cronExpression, timezone, onSchedule]);

  const getStatusIcon = (status: ExistingSchedule['status']) => {
      switch(status) {
          case 'active': return <ShieldCheck className="h-4 w-4 text-green-500" />;
          case 'paused': return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
          case 'completed': return <Shield className="h-4 w-4 text-muted-foreground" />;
      }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Create a New Scheduled Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Enter task prompt (e.g., 'Summarize weekly sales report')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Tabs defaultValue="One-time" onValueChange={(value) => setMode(value as 'One-time' | 'Recurring')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="One-time"><Clock className="mr-2 h-4 w-4" />One-time</TabsTrigger>
                <TabsTrigger value="Recurring"><Repeat className="mr-2 h-4 w-4" />Recurring</TabsTrigger>
              </TabsList>
              <TabsContent value="One-time" className="pt-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <Calendar
                        mode="single"
                        selected={runAtDate}
                        onSelect={setRunAtDate}
                        className="rounded-md border"
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                    />
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Time</label>
                        <Input type="time" value={runAtTime} onChange={e => setRunAtTime(e.target.value)} />
                    </div>
                </div>
              </TabsContent>
              <TabsContent value="Recurring" className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Select value={cronMinute} onValueChange={setCronMinute}>
                    <SelectTrigger><SelectValue placeholder="Minute" /></SelectTrigger>
                    <SelectContent>{cronOptions.minute.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={cronHour} onValueChange={setCronHour}>
                    <SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger>
                    <SelectContent>{cronOptions.hour.map(h => <SelectItem key={h} value={h}>{h.padStart(2, '0')}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={cronDayOfWeek} onValueChange={setCronDayOfWeek}>
                    <SelectTrigger><SelectValue placeholder="Day of Week" /></SelectTrigger>
                    <SelectContent>{cronOptions.dayOfWeek.map(d => <SelectItem key={d} value={d}>{dayOfWeekMap[d]}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={cronDayOfMonth} onValueChange={setCronDayOfMonth}>
                    <SelectTrigger><SelectValue placeholder="Day of Month" /></SelectTrigger>
                    <SelectContent>{cronOptions.dayOfMonth.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <p className="text-muted-foreground text-sm mt-2">{humanReadableCron}</p>
              </TabsContent>
            </Tabs>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {timezones.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSchedule} disabled={!prompt}>Schedule Task</Button>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <Card>
            <CardHeader><CardTitle>Scheduled Days</CardTitle></CardHeader>
            <CardContent>
                <Calendar
                    mode="multiple"
                    selected={scheduledDates}
                    className="rounded-md border p-0"
                />
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence>
              <ul className="space-y-4">
                {existingSchedules.length === 0 && <p className="text-muted-foreground text-center">No tasks scheduled.</p>}
                {existingSchedules.map((schedule) => (
                  <motion.li
                    key={schedule.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="p-4 border rounded-lg bg-card/50"
                  >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold">{schedule.prompt}</p>
                            <p className="text-sm text-muted-foreground">{schedule.schedule}</p>
                        </div>
                        <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'} className="capitalize flex items-center gap-1">
                            {getStatusIcon(schedule.status)}
                            {schedule.status}
                        </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      Next run: {formatDistanceToNow(new Date(schedule.nextRun), { addSuffix: true })}
                    </div>
                    <div className="flex items-center justify-end space-x-2 mt-4">
                      {schedule.status === 'active' ? (
                        <Button variant="ghost" size="icon" onClick={() => onPause(schedule.id)}><Pause className="h-4 w-4" /></Button>
                      ) : schedule.status === 'paused' ? (
                        <Button variant="ghost" size="icon" onClick={() => onResume(schedule.id)}><Play className="h-4 w-4" /></Button>
                      ) : null}
                      <Button variant="ghost" size="icon" onClick={() => onDelete(schedule.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
