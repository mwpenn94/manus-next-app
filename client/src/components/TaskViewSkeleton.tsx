/**
 * TaskViewSkeleton — Page-level loading skeleton for TaskView
 * Shows a realistic chat layout skeleton while task data loads.
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function TaskViewSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat area skeleton */}
      <div className="flex-1 overflow-hidden px-4 py-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* User message skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-[60%] rounded-2xl" />
        </div>
        {/* Assistant message skeleton */}
        <div className="flex justify-start gap-3">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 max-w-[80%]">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-[70%]" />
          </div>
        </div>
        {/* Tool action skeleton */}
        <div className="flex justify-start gap-3">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 max-w-[80%]">
            <Skeleton className="h-10 w-[50%] rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
          </div>
        </div>
        {/* Another user message */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-[45%] rounded-2xl" />
        </div>
        {/* Another assistant response */}
        <div className="flex justify-start gap-3">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 max-w-[80%]">
            <Skeleton className="h-4 w-[75%]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>
      </div>
      {/* Input area skeleton */}
      <div className="border-t border-border px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
