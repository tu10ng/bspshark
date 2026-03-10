import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Pitfall } from "@/lib/types";
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

export function PitfallCard({ pitfall }: { pitfall: Pitfall }) {
  const tags: string[] = JSON.parse(pitfall.tags || "[]");

  return (
    <Link href={`/pitfalls/${pitfall.id}`}>
      <Card className="h-full transition-colors hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base">
              {pitfall.title}
            </CardTitle>
            <Badge className={cn("shrink-0 border-0", severityColors[pitfall.severity])}>
              {pitfall.severity}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pitfall.description && (
            <p className="text-muted-foreground line-clamp-3 text-sm">
              {pitfall.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {statusLabels[pitfall.status] ?? pitfall.status}
            </Badge>
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {new Date(pitfall.created_at).toLocaleDateString("zh-CN")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
