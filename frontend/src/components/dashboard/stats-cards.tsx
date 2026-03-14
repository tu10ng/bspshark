import { BookOpen, Wrench, Play, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

const statConfig = [
  { key: "wiki_count" as const, label: "Wiki 页面", icon: BookOpen },
  { key: "tool_count" as const, label: "工具数", icon: Wrench },
  { key: "execution_count" as const, label: "执行次数", icon: Play },
  { key: "active_tools" as const, label: "活跃工具", icon: Activity },
];

export function StatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statConfig.map(({ key, label, icon: Icon }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Icon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[key]}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="bg-muted h-4 w-16 animate-pulse rounded" />
            <div className="bg-muted size-4 animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="bg-muted h-8 w-20 animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
