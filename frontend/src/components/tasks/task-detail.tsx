"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskDetail as TaskDetailType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

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

const artifactTypeLabels: Record<string, string> = {
  design_doc: "设计文档",
  arch_review_video: "架构评审视频",
  test_review_video: "测试评审视频",
  other: "其他",
};

export function TaskDetailView({ task }: { task: TaskDetailType }) {
  const modules: string[] = JSON.parse(task.modules || "[]");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          <Badge className={cn("border-0", statusColors[task.status])}>
            {statusLabels[task.status] ?? task.status}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-4 text-sm">
          {task.assignee && <span>执行人: {task.assignee}</span>}
          {task.assigned_by && <span>派发人: {task.assigned_by}</span>}
          {task.due_date && (
            <span>截止: {new Date(task.due_date).toLocaleDateString("zh-CN")}</span>
          )}
          <span>创建于 {new Date(task.created_at).toLocaleDateString("zh-CN")}</span>
        </div>
        {modules.length > 0 && (
          <div className="mt-2 flex gap-2">
            {modules.map((m) => (
              <Badge key={m} variant="secondary">
                {m}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {task.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">描述</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{task.description}</p>
          </CardContent>
        </Card>
      )}

      {task.nodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">关联节点</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {task.nodes.map((node) => (
                <li key={node.id} className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/knowledge/${node.tree_id}`}
                    className="text-primary hover:underline"
                  >
                    {node.title}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {node.node_type}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {task.artifacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">归档材料</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {task.artifacts.map((artifact) => (
                <li key={artifact.id} className="flex items-center gap-2 text-sm">
                  <a
                    href={artifact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1 hover:underline"
                  >
                    {artifact.title}
                    <ExternalLink className="size-3" />
                  </a>
                  <Badge variant="outline" className="text-xs">
                    {artifactTypeLabels[artifact.artifact_type] ?? artifact.artifact_type}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {task.discovered_pitfalls_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">发现的新坑</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{task.discovered_pitfalls_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
