import Link from "next/link";
import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tool } from "@/lib/types";

const languageConfig = {
  python: { label: "Python", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  java: { label: "Java", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  bash: { label: "Bash", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
} as const;

export function ToolCard({ tool }: { tool: Tool }) {
  const config = languageConfig[tool.language];

  return (
    <Card className="flex h-full flex-col transition-colors hover:border-foreground/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{tool.name}</CardTitle>
          <Badge variant="secondary" className={config.color}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {tool.description}
        </p>
        <Button size="sm" nativeButton={false} render={<Link href={`/tools/${tool.id}`} />}>
          <Play className="size-3" />
          运行
        </Button>
      </CardContent>
    </Card>
  );
}
