
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, GitCompareArrows, History, ChevronsUpDown, Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ArtifactVersion {
  id: string;
  version: number;
  filename: string;
  content: string;
  timestamp: number;
  changeDescription?: string;
  linesAdded: number;
  linesRemoved: number;
}

interface ArtifactVersionHistoryProps {
  versions: ArtifactVersion[];
  currentVersion: number;
  onSelectVersion: (version: number) => void;
  onCompareVersions: (v1: number, v2: number) => void;
  onRestoreVersion: (version: number) => void;
}

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 100 },
  },
};

export const ArtifactVersionHistory = ({
  versions,
  currentVersion,
  onSelectVersion,
  onCompareVersions,
  onRestoreVersion,
}: ArtifactVersionHistoryProps) => {
  const [isCompact, setIsCompact] = useState(false);

  const sortedVersions = useMemo(() => 
    [...versions].sort((a, b) => b.version - a.version), 
    [versions]
  );

  if (!sortedVersions.length) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <History className="mx-auto h-12 w-12" />
            <p className="mt-4">No version history available.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderFullView = () => (
    <ScrollArea className="h-full">
      <motion.div
        className="p-4 space-y-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {sortedVersions.map((version, index) => {
          const isCurrent = version.version === currentVersion;
          const previousVersion = sortedVersions[index + 1];

          return (
            <motion.div key={version.id} variants={itemVariants}>
              {previousVersion && (
                <div className="flex justify-center my-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => onCompareVersions(version.version, previousVersion.version)}
                  >
                    <GitCompareArrows className="h-4 w-4" />
                    Compare with v{previousVersion.version}
                  </Button>
                </div>
              )}
              <Card
                className={cn(
                  'cursor-pointer transition-all',
                  isCurrent
                    ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'hover:border-muted-foreground/50'
                )}
                onClick={() => onSelectVersion(version.version)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant={isCurrent ? 'default' : 'secondary'}>v{version.version}</Badge>
                      <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeTime(version.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-green-500">+{version.linesAdded}</span>
                        <span className="text-sm font-mono text-red-500">-{version.linesRemoved}</span>
                    </div>
                  </div>
                  {version.changeDescription && (
                    <p className="text-sm mt-3">{version.changeDescription}</p>
                  )}
                  {!isCurrent && (
                     <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRestoreVersion(version.version);
                        }}
                    >
                        <History className="h-4 w-4 mr-2" />
                        Restore this version
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </ScrollArea>
  );

  const renderCompactView = () => {
    const selectedVersion = versions.find(v => v.version === currentVersion);
    return (
        <div className="p-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                        <span>{selectedVersion ? `v${selectedVersion.version} - ${formatRelativeTime(selectedVersion.timestamp)}` : 'Select a version'}</span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                    <ScrollArea className="h-[300px]">
                    {sortedVersions.map(version => (
                        <DropdownMenuItem key={version.id} onSelect={() => onSelectVersion(version.version)}>
                            <div className="flex items-center justify-between w-full">
                                <span>v{version.version} <span className="text-xs text-muted-foreground">{formatRelativeTime(version.timestamp)}</span></span>
                                {version.version === currentVersion && <Check className="h-4 w-4" />}
                            </div>
                        </DropdownMenuItem>
                    ))}
                    </ScrollArea>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
        <div className="flex items-center justify-between p-2 border-b">
            <h3 className="font-semibold text-md ml-2">Version History</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsCompact(!isCompact)}>
                {isCompact ? 'Expand' : 'Compact'}
            </Button>
        </div>
        {isCompact ? renderCompactView() : renderFullView()}
    </Card>
  );
};