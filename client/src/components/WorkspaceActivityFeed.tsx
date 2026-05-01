import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Bot, CheckCircle, FileText, Settings, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

type ActivityType = 'task_created' | 'task_completed' | 'file_changed' | 'agent_action' | 'user_action' | 'system';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: number;
  actor: string;
  metadata?: Record<string, string>;
}

interface WorkspaceActivityFeedProps {
  activities: Activity[];
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  filter?: string;
  onFilterChange: (filter: string) => void;
}

const formatRelativeTime = (timestamp: number): string => {
  const now = new Date().getTime();
  const seconds = Math.floor((now - timestamp) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "just now";
};

const activityIcons: Record<ActivityType, React.ElementType> = {
  task_created: CheckCircle,
  task_completed: CheckCircle,
  file_changed: FileText,
  agent_action: Bot,
  user_action: User,
  system: Settings,
};

const ActivityCard: React.FC<{ activity: Activity; isCompact: boolean }> = ({ activity, isCompact }) => {
  const Icon = activityIcons[activity.type] || Settings;
  const avatarFallback = activity.actor.substring(0, 2).toUpperCase();

  return (
    <div className="flex items-start space-x-4 relative pl-8">
      <div className="absolute left-0 top-1.5 flex h-full w-8 justify-center">
        <div className="h-full w-px bg-border"></div>
      </div>
      <div className="absolute left-[-1px] top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
      </div>
      <div className="flex-1 pt-1 pb-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{activity.title}</p>
          <time className="text-xs text-muted-foreground">{formatRelativeTime(activity.timestamp)}</time>
        </div>
        {!isCompact && activity.description && (
          <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
        )}
        <div className="mt-2 flex items-center space-x-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={activity.metadata?.avatarUrl} alt={activity.actor} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-muted-foreground">{activity.actor}</span>
        </div>
      </div>
    </div>
  );
};

const ActivitySkeleton: React.FC = () => (
  <div className="flex items-start space-x-4 pl-8 py-4">
    <Skeleton className="absolute left-[-1px] top-5 h-8 w-8 rounded-full" />
    <div className="flex-1 space-y-2 pt-1">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-1/5" />
      </div>
      <Skeleton className="h-4 w-4/5" />
      <div className="flex items-center space-x-2 pt-1">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  </div>
);

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
} as const satisfies Variants;

export const WorkspaceActivityFeed: React.FC<WorkspaceActivityFeedProps> = ({
  activities,
  onLoadMore,
  hasMore,
  isLoading,
  filter = 'all',
  onFilterChange,
}) => {
  const [isCompact, setIsCompact] = useState(false);

  const handleFilterChange = useCallback((value: string) => {
    onFilterChange(value);
  }, [onFilterChange]);

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    if (filter === 'tasks') return activities.filter(a => a.type.startsWith('task_'));
    if (filter === 'files') return activities.filter(a => a.type === 'file_changed');
    if (filter === 'agent') return activities.filter(a => a.type === 'agent_action');
    if (filter === 'system') return activities.filter(a => a.type === 'system');
    return activities;
  }, [activities, filter]);

  const renderContent = () => {
    if (isLoading && filteredActivities.length === 0) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <ActivitySkeleton key={i} />)}
        </div>
      );
    }

    if (filteredActivities.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">No Activities Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">Workspace events will appear here as they happen.</p>
        </div>
      );
    }

    return (
      <div className="relative">
        <AnimatePresence initial={false}>
          {filteredActivities.map((activity) => (
            <motion.div
              key={activity.id}
              layout
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={cardVariants}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            >
              <ActivityCard activity={activity} isCompact={isCompact} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Card className="h-full w-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-4 py-3">
        <CardTitle className="text-lg">Activity Feed</CardTitle>
        <div className="flex items-center space-x-2">
          <Switch id="compact-mode" checked={isCompact} onCheckedChange={setIsCompact} />
          <Label htmlFor="compact-mode" className="text-sm font-normal">Compact</Label>
        </div>
      </CardHeader>
      <div className="p-4 border-b border-border">
        <Tabs value={filter} onValueChange={handleFilterChange as (value: string) => void}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="agent">Agent</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <CardContent className="flex-1 overflow-y-auto p-4">
        {renderContent()}
        {hasMore && (
          <div className="mt-6 flex justify-center">
            <Button onClick={onLoadMore} disabled={isLoading} variant="outline">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
