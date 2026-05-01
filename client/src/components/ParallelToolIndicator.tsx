/**
 * A React component that shows an indicator when multiple tools are running in parallel.
 * It displays a compact badge and expands on hover to show a list of active tools with their elapsed time.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ActiveTool {
  id: string;
  name: string;
  startedAt: number; // Unix timestamp (milliseconds)
}

interface ParallelToolIndicatorProps {
  activeTools: ActiveTool[];
  className?: string;
}

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const ElapsedTime: React.FC<{ startTime: number }> = ({ startTime }) => {
  const [elapsed, setElapsed] = React.useState(Date.now() - startTime);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return <span>{formatDuration(elapsed)}</span>;
};

const ParallelToolIndicator: React.FC<ParallelToolIndicatorProps> = ({ activeTools, className }) => {
  if (activeTools.length < 2) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div
          className={cn(
            "relative flex cursor-pointer items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted",
            className
          )}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 rounded-full border border-yellow-400"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <Zap className="relative h-4 w-4 text-yellow-400" />
          <span className="relative">{activeTools.length} tools running in parallel</span>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-1">
          <p className="px-2 text-sm font-semibold">Active Tools</p>
          <ul className="space-y-1">
            {activeTools.map(tool => (
              <li key={tool.id} className="flex items-center justify-between rounded-md px-2 py-1 text-sm text-muted-foreground">
                <span className="truncate pr-2">{tool.name}</span>
                <ElapsedTime startTime={tool.startedAt} />
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ParallelToolIndicator;
