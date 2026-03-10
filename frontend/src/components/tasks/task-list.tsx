import { TaskCard } from "./task-card";
import type { Task } from "@/lib/types";

export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">暂无任务</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
            <div className="bg-muted h-5 w-12 animate-pulse rounded" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="bg-muted h-4 w-full animate-pulse rounded" />
            <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
          </div>
          <div className="bg-muted mt-4 h-3 w-20 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
