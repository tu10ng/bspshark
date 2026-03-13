"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExperienceWithRefs } from "@/lib/types";
import { cn } from "@/lib/utils";

const severityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusLabels: Record<string, string> = {
  active: "活跃",
  resolved: "已解决",
  transformed: "已转化",
};

export function ExperienceDetail({ experience }: { experience: ExperienceWithRefs }) {
  const tags: string[] = JSON.parse(experience.tags || "[]");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{experience.title}</h1>
          <Badge className={cn("border-0", severityColors[experience.severity])}>
            {experience.severity}
          </Badge>
          <Badge variant="outline">
            {statusLabels[experience.status] ?? experience.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          创建于 {new Date(experience.created_at).toLocaleDateString("zh-CN")}
        </p>
      </div>

      {experience.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">描述</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{experience.description}</p>
          </CardContent>
        </Card>
      )}

      {experience.resolution_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">解决说明</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{experience.resolution_notes}</p>
          </CardContent>
        </Card>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {experience.references.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">引用此经验的节点</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {experience.references.map((ref) => (
                <li key={ref.node_id} className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/knowledge/${ref.tree_id}`}
                    className="text-primary hover:underline"
                  >
                    {ref.tree_name}
                  </Link>
                  <span className="text-muted-foreground">/</span>
                  <span>{ref.node_title}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
