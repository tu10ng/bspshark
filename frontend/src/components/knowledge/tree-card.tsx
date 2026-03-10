import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KnowledgeTree } from "@/lib/types";

export function TreeCard({ tree }: { tree: KnowledgeTree }) {
  return (
    <Link href={`/knowledge/${tree.id}`}>
      <Card className="h-full transition-colors hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base">
              {tree.name}
            </CardTitle>
            {tree.module && (
              <Badge variant="secondary" className="shrink-0">
                {tree.module}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tree.description && (
            <p className="text-muted-foreground line-clamp-3 text-sm">
              {tree.description}
            </p>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            {new Date(tree.updated_at).toLocaleDateString("zh-CN")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
