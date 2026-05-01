import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Search, Folder } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center text-center p-8 space-y-4 bg-background", className)}>
    <div className="text-muted-foreground mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
    <p className="text-muted-foreground max-w-xs">
      {description}
    </p>
    {action && <div className="pt-4">{action}</div>}
  </div>
);

interface IllustrationProps {
    action?: React.ReactNode;
    className?: string;
}

export const NoTasksIllustration: React.FC<IllustrationProps> = ({ action, className }) => (
    <EmptyState
        icon={<Sparkles className="h-16 w-16" strokeWidth={1.5} />}
        title="Start your first task"
        description="Your task list is empty. Click the button below to begin."
        action={action}
        className={className}
    />
);

export const NoResultsIllustration: React.FC<IllustrationProps> = ({ action, className }) => (
    <EmptyState
        icon={<Search className="h-16 w-16" strokeWidth={1.5} />}
        title="No results found"
        description="Your search did not return any results. Try a different query."
        action={action}
        className={className}
    />
);

export const NoArtifactsIllustration: React.FC<IllustrationProps> = ({ action, className }) => (
    <EmptyState
        icon={<Folder className="h-16 w-16" strokeWidth={1.5} />}
        title="No artifacts yet"
        description="Artifacts generated from your tasks will appear here."
        action={action}
        className={className}
    />
);
