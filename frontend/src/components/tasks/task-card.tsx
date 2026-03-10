import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "待处理",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

export function TaskCard({ task }: { task: Task }) {
  const modules: string[] = JSON.parse(task.modules || "[]");

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className="h-full transition-colors hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base">
              {task.title}
            </CardTitle>
            <Badge className={cn("shrink-0 border-0", statusColors[task.status])}>
              {statusLabels[task.status] ?? task.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {task.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {task.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {task.assignee && (
              <span className="text-muted-foreground text-xs">
                {task.assignee}
              </span>
            )}
            {modules.map((m) => (
              <Badge key={m} variant="secondary" className="text-xs">
                {m}
              </Badge>
            ))}
          </div>
          {task.due_date && (
            <p className="text-muted-foreground mt-2 text-xs">
              截止: {new Date(task.due_date).toLocaleDateString("zh-CN")}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
