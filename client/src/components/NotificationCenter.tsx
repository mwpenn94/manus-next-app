import React, { useMemo } from 'react';
import { Bell, Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: number;
  action?: { label: string; onClick: () => void };
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  unreadCount: number;
}

const typeConfig = {
  info: {
    icon: Info,
    color: 'text-blue-500',
    borderColor: 'border-blue-500',
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-500',
    borderColor: 'border-green-500',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    borderColor: 'border-yellow-500',
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    borderColor: 'border-red-500',
  },
};

const groupNotifications = (notifications: Notification[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = {
    today: [] as Notification[],
    yesterday: [] as Notification[],
    older: [] as Notification[],
  };

  notifications.forEach(notification => {
    const notificationDate = new Date(notification.timestamp);
    if (notificationDate >= today) {
      groups.today.push(notification);
    } else if (notificationDate >= yesterday) {
      groups.yesterday.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  onMarkRead, 
  onMarkAllRead, 
  onDismiss, 
  onClearAll, 
  unreadCount 
}) => {
  const groupedNotifications = useMemo(() => groupNotifications(notifications), [notifications]);

  const renderNotificationGroup = (title: string, group: Notification[]) => {
    if (group.length === 0) return null;

    return (
      <div key={title}>
        <h3 className="text-sm font-semibold text-muted-foreground px-4 py-2">{title}</h3>
        <AnimatePresence initial={false}>
          {group.map(notification => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
              className={cn(
                'relative flex items-start gap-3 p-4 border-l-4',
                !notification.read ? 'border-accent' : 'border-transparent',
                'hover:bg-accent/50 transition-colors cursor-pointer'
              )}
              onClick={() => !notification.read && onMarkRead(notification.id)}
            >
              <div className={cn('mt-1', typeConfig[notification.type].color)}>
                {React.createElement(typeConfig[notification.type].icon, { className: 'h-5 w-5' })}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {new Date(notification.timestamp).toLocaleString()}
                </p>
                {notification.action && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto mt-2" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      notification.action?.onClick(); 
                    }}
                  >
                    {notification.action.label}
                  </Button>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs" variant="destructive">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <div className="flex items-center gap-2">
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={onMarkAllRead} disabled={unreadCount === 0}>
              Mark all read
            </Button>
            <Button variant="link" size="sm" className="p-0 h-auto text-destructive" onClick={onClearAll} disabled={notifications.length === 0}>
              Clear all
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              <Bell className="mx-auto h-12 w-12 mb-4" />
              <p>No new notifications</p>
            </div>
          ) : (
            <div>
              {renderNotificationGroup('Today', groupedNotifications.today)}
              {renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
              {renderNotificationGroup('Older', groupedNotifications.older)}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
