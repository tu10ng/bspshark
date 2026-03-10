import { Suspense } from "react";
import { TaskSearch } from "@/components/tasks/task-search";
import { TaskList, TaskListSkeleton } from "@/components/tasks/task-list";
import { TaskForm } from "@/components/tasks/task-form";
import { getTasks } from "@/lib/api";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; assignee?: string; module?: string }>;
}) {
  const params = await searchParams;
  const tasks = await getTasks({
    status: params.status,
    assignee: params.assignee,
    module: params.module,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">任务</h1>
          <p className="text-muted-foreground">任务管理与跟踪</p>
        </div>
        <TaskForm />
      </div>

      <Suspense>
        <TaskSearch />
      </Suspense>

      <Suspense fallback={<TaskListSkeleton />}>
        <TaskList tasks={tasks} />
      </Suspense>
    </div>
  );
}
