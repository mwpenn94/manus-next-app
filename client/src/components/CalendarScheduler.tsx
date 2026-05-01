import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type CalendarView = 'day' | 'week' | 'month';
type EventCategory = 'work' | 'personal' | 'project' | 'meeting';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  category: EventCategory;
}

// --- MOCK DATA ---
const mockEvents: CalendarEvent[] = [
  { id: '1', title: 'Team Standup', start: new Date(new Date().setHours(9, 0, 0, 0)), end: new Date(new Date().setHours(9, 15, 0, 0)), category: 'meeting' },
  { id: '2', title: 'Design Review', start: new Date(new Date().setDate(new Date().getDate() + 1)), end: new Date(new Date().setDate(new Date().getDate() + 1)), category: 'project' },
  { id: '3', title: 'Doctor Appointment', start: new Date(new Date().setDate(new Date().getDate() - 2)), end: new Date(new Date().setDate(new Date().getDate() - 2)), category: 'personal' },
  { id: '4', title: 'Component API Design', start: new Date(new Date().setHours(11, 0, 0, 0)), end: new Date(new Date().setHours(13, 0, 0, 0)), category: 'work' },
];

const EVENT_COLORS: Record<EventCategory, string> = {
  work: 'bg-blue-500',
  personal: 'bg-green-500',
  project: 'bg-purple-500',
  meeting: 'bg-orange-500',
};

// --- HELPER FUNCTIONS ---
const getWeekDays = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => new Date(start.setDate(start.getDate() + (i > 0 ? 1 : 0))));
};

const CalendarScheduler: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [popover, setPopover] = useState<{ x: number, y: number, event: Partial<CalendarEvent> } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeToPosition = (time: Date) => (time.getHours() * 60 + time.getMinutes()) / (24 * 60) * 100;

  const handlePrev = () => {
    if (view === 'day') setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)));
    else if (view === 'week') setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)));
    else setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  };

  const handleNext = () => {
    if (view === 'day') setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)));
    else if (view === 'week') setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)));
    else setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor((y / rect.height) * 24);
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, 0, 0, 0);

    setNewEvent({ start, end, category: 'work' });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newY = moveEvent.clientY - rect.top;
      const newHour = Math.ceil((newY / rect.height) * 24);
      const newEnd = new Date(start);
      newEnd.setHours(Math.max(hour + 1, newHour), 0, 0, 0);
      setNewEvent(prev => prev ? { ...prev, end: newEnd } : null);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Small delay to prevent popover from appearing when clicking to change view
      setTimeout(() => {
        if (newEvent) {
            setPopover({ x: upEvent.clientX, y: upEvent.clientY, event: newEvent });
        }
        setNewEvent(null);
      }, 50);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const Header = () => (
    <div className="flex items-center justify-between p-4 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} aria-label="Previous period"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
          <Button variant="outline" size="sm" onClick={handleNext} aria-label="Next period"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <h2 className="text-lg font-medium text-muted-foreground">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
      </div>
      <Tabs value={view} onValueChange={(value) => setView(value as CalendarView)} className="w-auto">
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );

  const renderMonthView = () => {
    const monthDays = useMemo(() => {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startDate = new Date(startOfMonth);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      const endDate = new Date(endOfMonth);
      if (endDate.getDay() !== 6) endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
      const days = [];
      let day = new Date(startDate);
      while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
      }
      return days;
    }, [currentDate]);

    return (
      <div className="grid grid-cols-7 h-full">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center font-medium text-muted-foreground p-2 border-b border-r border-border">{day}</div>
        ))}
        {monthDays.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={index} className={cn("border-b border-r border-border p-2 h-40 flex flex-col", isCurrentMonth ? "bg-card" : "bg-background text-muted-foreground/50", isToday && "bg-blue-500/10 relative")}>
              {isToday && <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>}
              <span className={cn("font-medium", isToday && "text-blue-600")}>{day.getDate()}</span>
              <div className="flex-grow overflow-y-auto mt-1 space-y-1"><AnimatePresence>
                {events.filter(e => e.start.toDateString() === day.toDateString()).map(e => (
                  <motion.div key={e.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("text-xs p-1 rounded truncate text-white", EVENT_COLORS[e.category])}>{e.title}</motion.div>
                ))}
              </AnimatePresence></div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimeGridView = (days: Date[]) => {
    const timeSlots = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const gridColsClass = `grid-cols-${days.length}`;

    return (
      <div className="grid grid-cols-[auto_1fr] h-full">
        <div className="border-r border-border w-20 text-right">
          <div className="h-16 border-b border-border"></div>
          {timeSlots.map(time => (
            <div key={time} className="h-16 text-xs text-muted-foreground pt-1 pr-2 border-b border-border">{time}</div>
          ))}
        </div>
        <div className={cn("grid relative", gridColsClass)}>
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className={cn("border-r border-border relative", dayIndex === days.length - 1 && "border-r-0")} onMouseDown={(e) => handleDragStart(e, day)}>
              {view === 'week' && (
                <div className="h-16 text-center p-2 border-b border-border">
                  <div className={cn("text-sm text-muted-foreground", day.toDateString() === new Date().toDateString() && "text-blue-600")}>{day.toLocaleDateString('default', { weekday: 'short' })}</div>
                  <div className={cn("text-2xl font-bold", day.toDateString() === new Date().toDateString() && "text-blue-600")}>{day.getDate()}</div>
                </div>
              )}
              <div className="h-full relative">
                {timeSlots.slice(1).map(time => <div key={time} className="h-16 border-b border-border/50"></div>)}
              </div>
            </div>
          ))}
          <div className="absolute left-0 right-0 h-px bg-red-500 z-10" style={{ top: `${timeToPosition(currentTime)}%` }}>
            <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
          <AnimatePresence>
            {events.filter(e => days.some(d => d.toDateString() === e.start.toDateString())).map(event => {
              const dayIndex = days.findIndex(d => d.toDateString() === event.start.toDateString());
              if (dayIndex === -1) return null;
              const top = timeToPosition(event.start);
              const height = Math.max(0.5, timeToPosition(event.end) - top);
              return (
                <motion.div key={event.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("absolute p-2 rounded-lg text-white flex flex-col overflow-hidden", EVENT_COLORS[event.category])} style={{ top: `${top}%`, height: `${height}%`, left: `calc(${(dayIndex / days.length) * 100}% + 4px)`, width: `calc(${(1 / days.length) * 100}% - 8px)` }}>
                  <p className="font-bold text-sm truncate">{event.title}</p>
                  <p className="text-xs opacity-80">{event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  return (
    <Card className="w-full h-[90vh] flex flex-col bg-background text-foreground shadow-2xl rounded-lg overflow-hidden">
      <Header />
      <div className="flex-grow overflow-auto relative">
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="h-full">
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderTimeGridView(weekDays)}
            {view === 'day' && renderTimeGridView([currentDate])}
          </motion.div>
        </AnimatePresence>
        {newEvent && newEvent.start && newEvent.end && (
          <div className={cn("absolute p-2 rounded-lg text-white flex flex-col overflow-hidden z-10 pointer-events-none", EVENT_COLORS[newEvent.category || 'work'])} style={{ top: `${timeToPosition(newEvent.start)}%`, height: `${timeToPosition(newEvent.end) - timeToPosition(newEvent.start)}%`, left: view === 'week' ? `calc(5rem + ${(weekDays.findIndex(d => d.toDateString() === newEvent.start!.toDateString()) / 7) * (100 - (5/16*100))}%)` : '5rem', right: view === 'week' ? `calc(100% - 5rem - ${((weekDays.findIndex(d => d.toDateString() === newEvent.start!.toDateString()) + 1) / 7) * (100 - (5/16*100))}%)` : '0' }} />
        )}
        {popover && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute z-20 p-4 bg-card border border-border rounded-lg shadow-xl" style={{ left: popover.x, top: popover.y }}>
            <h3 className="font-bold mb-2">Create Event</h3>
            <input type="text" placeholder="Event Title" className="w-full p-2 rounded bg-background border border-border mb-2" onChange={(e) => setPopover(p => p ? { ...p, event: { ...p.event, title: e.target.value } } : null)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPopover(null)}>Cancel</Button>
              <Button size="sm" onClick={() => { if (popover.event.title && popover.event.start && popover.event.end) { setEvents([...events, { ...popover.event, id: String(Date.now()) } as CalendarEvent]); } setPopover(null); }}>Save</Button>
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
};

export default CalendarScheduler;
