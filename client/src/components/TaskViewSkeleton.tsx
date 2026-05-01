/**
 * TaskViewSkeleton — Page-level loading skeleton for TaskView
 * Shows a realistic chat layout skeleton with staggered progressive reveal animation.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function StaggeredItem({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("animate-[fadeSlideIn_0.4s_ease-out_forwards] opacity-0", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function TaskViewSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="flex h-full">
        {/* Sidebar skeleton */}
        <div className="hidden md:flex w-[280px] border-r border-border flex-col p-3 space-y-2 shrink-0">
          <StaggeredItem delay={0}>
            <Skeleton className="h-9 w-full rounded-lg" />
          </StaggeredItem>
          {[1, 2, 3, 4, 5].map((i) => (
            <StaggeredItem key={i} delay={i * 80}>
              <div className="flex items-center gap-2 p-2">
                <Skeleton className="w-5 h-5 rounded shrink-0" />
                <Skeleton className="h-4 rounded" style={{ width: `${55 + (i * 7) % 30}%` }} />
              </div>
            </StaggeredItem>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header skeleton */}
          <StaggeredItem delay={100}>
            <div className="border-b border-border px-4 py-2.5 flex items-center gap-3">
              <Skeleton className="h-5 w-32 rounded" />
              <div className="flex-1" />
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </StaggeredItem>

          {/* Chat area skeleton */}
          <div className="flex-1 overflow-hidden px-4 py-6 space-y-6 max-w-3xl mx-auto w-full">
            <StaggeredItem delay={200}>
              <div className="flex justify-end">
                <Skeleton className="h-12 w-[60%] rounded-2xl" />
              </div>
            </StaggeredItem>
            <StaggeredItem delay={350}>
              <div className="flex justify-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1 max-w-[80%]">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[85%]" />
                  <Skeleton className="h-4 w-[70%]" />
                </div>
              </div>
            </StaggeredItem>
            <StaggeredItem delay={500}>
              <div className="flex justify-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1 max-w-[80%]">
                  <Skeleton className="h-10 w-[50%] rounded-lg" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                </div>
              </div>
            </StaggeredItem>
            <StaggeredItem delay={650}>
              <div className="flex justify-end">
                <Skeleton className="h-10 w-[45%] rounded-2xl" />
              </div>
            </StaggeredItem>
            <StaggeredItem delay={800}>
              <div className="flex justify-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1 max-w-[80%]">
                  <Skeleton className="h-4 w-[75%]" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[60%]" />
                </div>
              </div>
            </StaggeredItem>
          </div>

          {/* Input area skeleton */}
          <StaggeredItem delay={900}>
            <div className="border-t border-border px-4 py-3 shrink-0">
              <div className="max-w-3xl mx-auto">
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </StaggeredItem>
        </div>
      </div>
    </div>
  );
}
