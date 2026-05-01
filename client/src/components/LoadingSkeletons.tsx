import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const pulseAnimation = {
  scale: [1, 1.02, 1],
  opacity: [0.07, 0.15, 0.07],
};

const transition = (delay: number) => ({
  duration: 1.5,
  ease: "easeInOut" as const,
  repeat: Infinity,
  delay,
});

const SkeletonElement = ({ className, delay = 0, style }: { className?: string; delay?: number; style?: React.CSSProperties }) => (
  <motion.div
    className={cn('bg-card rounded-md', className)}
    animate={pulseAnimation}
    transition={transition(delay)}
    style={style}
  />
);

export const MessageListSkeleton = () => {
  return (
    <div className="w-full p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={cn('flex items-start gap-2.5', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
          {i % 2 === 0 && <SkeletonElement className="w-8 h-8 rounded-full" delay={i * 0.1} />}
          <div className={cn('flex flex-col gap-1', i % 2 === 0 ? 'items-start' : 'items-end')}>
            <SkeletonElement className="w-32 h-4" delay={i * 0.1 + 0.1} />
            <SkeletonElement className="w-48 h-10" delay={i * 0.1 + 0.2} />
          </div>
          {i % 2 !== 0 && <SkeletonElement className="w-8 h-8 rounded-full" delay={i * 0.1} />}
        </div>
      ))}
    </div>
  );
};

export const SidebarTasksSkeleton = () => {
  return (
    <div className="p-2 space-y-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center p-2 rounded-md gap-3">
          <SkeletonElement className="w-5 h-5" delay={i * 0.05} />
          <SkeletonElement className="flex-grow h-4" delay={i * 0.05 + 0.1} />
          <SkeletonElement className="w-12 h-3" delay={i * 0.05 + 0.2} />
        </div>
      ))}
    </div>
  );
};

export const WorkspaceSkeleton = () => {
  const widths = [90, 75, 60, 85, 50, 70, 95, 55, 80, 65, 72, 88];
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-card">
        <SkeletonElement className="h-6 w-48" delay={0} />
        <div className="flex items-center gap-2">
          <SkeletonElement className="h-8 w-20" delay={0.1} />
          <SkeletonElement className="h-8 w-8" delay={0.2} />
        </div>
      </div>
      <div className="flex-grow p-4 space-y-2">
        {widths.map((w, i) => (
          <SkeletonElement
            key={i}
            className="h-4"
            style={{ width: `${w}%` }}
            delay={i * 0.05}
          />
        ))}
      </div>
    </div>
  );
};
