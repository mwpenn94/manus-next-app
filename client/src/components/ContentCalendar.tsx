import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, GripVertical } from 'lucide-react';

// MOCK-START
// In a real app, you would import these from your UI library
const Button = ({ className, variant: _v, size: _s, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
  <button className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`} {...props} />
);

const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props} />
);

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);

const cn = (...inputs: any[]) => {
  // A simple version of clsx/tailwind-merge
  return inputs.filter(Boolean).join(' ');
};
// MOCK-END

type ContentCategory = 'Article' | 'Video' | 'Social' | 'Podcast';

type ContentItem = {
  id: string;
  date: Date;
  title: string;
  category: ContentCategory;
};

const CATEGORY_COLORS: Record<ContentCategory, string> = {
  Article: 'bg-blue-500 text-blue-50',
  Video: 'bg-red-500 text-red-50',
  Social: 'bg-yellow-500 text-yellow-50',
  Podcast: 'bg-green-500 text-green-50',
};

const initialContent: ContentItem[] = [
  { id: '1', date: new Date(new Date().setDate(2)), title: 'New Blog Post', category: 'Article' },
  { id: '2', date: new Date(new Date().setDate(5)), title: 'Product Hunt Launch', category: 'Social' },
  { id: '3', date: new Date(new Date().setDate(5)), title: 'Weekly Dev Vlog', category: 'Video' },
  { id: '4', date: new Date(new Date().setDate(10)), title: 'Guest on Tech Talks', category: 'Podcast' },
  { id: '5', date: new Date(new Date().setDate(15)), title: 'React 19 Deep Dive', category: 'Article' },
  { id: '6', date: new Date(new Date().setDate(22)), title: 'Behind the Scenes', category: 'Video' },
  { id: '7', date: new Date(new Date().setDate(28)), title: 'Twitter Spaces AMA', category: 'Social' },
];

export default function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [contentItems, setContentItems] = useState<ContentItem[]>(initialContent);
  const [reschedulingItem, setReschedulingItem] = useState<ContentItem | null>(null);

  const { monthDays, monthStart } = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const days = [];
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      days.push(new Date(day));
    }
    return { monthDays: days, monthStart: start };
  }, [currentDate]);

  const startingDayIndex = monthStart.getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: Date) => {
    if (reschedulingItem) {
      setContentItems(items =>
        items.map(item =>
          item.id === reschedulingItem.id ? { ...item, date: day } : item
        )
      );
      setReschedulingItem(null);
    }
  };

  const handleItemClick = (e: React.MouseEvent, item: ContentItem) => {
    e.stopPropagation();
    setReschedulingItem(item);
  };

  const upcomingItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return contentItems
      .filter(item => item.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [contentItems]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 gap-4 font-sans">
      <div className="flex-grow bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <header className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-7 text-center font-semibold text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 h-[calc(100%-120px)]">
          {Array.from({ length: startingDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="border-r border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"></div>
          ))}
          {monthDays.map(day => {
            const itemsOnDay = contentItems.filter(item => item.date.toDateString() === day.toDateString());
            const isToday = day.toDateString() === new Date().toDateString();
            const isReschedulingTarget = reschedulingItem && day.toDateString() === reschedulingItem.date.toDateString();

            return (
              <div
                key={day.toString()}
                className={cn(
                  'border-r border-b dark:border-gray-700 p-1.5 flex flex-col gap-1 overflow-y-auto relative',
                  reschedulingItem ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : '',
                  isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                )}
                onClick={() => handleDateClick(day)}
              >
                <span className={cn('font-medium text-sm', isToday ? 'text-blue-600 dark:text-blue-300 font-bold' : 'text-gray-600 dark:text-gray-300')}>
                  {day.getDate()}
                </span>
                <div className="flex flex-col gap-1">
                  {itemsOnDay.map(item => (
                    <div
                      key={item.id}
                      onClick={(e) => handleItemClick(e, item)}
                      className={cn(
                        'text-xs rounded-md px-2 py-1 w-full truncate cursor-grab',
                        CATEGORY_COLORS[item.category],
                        isReschedulingTarget && item.id === reschedulingItem?.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                      )}
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="w-72 flex-shrink-0 flex flex-col gap-4">
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Upcoming Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {upcomingItems.map(item => (
                <li key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span className={cn('ml-auto text-xs rounded-full px-2 py-0.5', CATEGORY_COLORS[item.category])}>
                    {item.category}
                  </span>
                </li>
              ))}
              {upcomingItems.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming content.</p>}
            </ul>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Object.entries(CATEGORY_COLORS).map(([category, className]) => (
                <li key={category} className="flex items-center gap-2 text-sm">
                  <span className={cn('h-4 w-4 rounded-full', className)}></span>
                  <span>{category}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        {reschedulingItem && (
          <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-sm rounded-lg p-3 text-center">
            Select a new date for "<span className="font-semibold">{reschedulingItem.title}</span>".
          </div>
        )}
      </aside>
    </div>
  );
}
