import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Article } from "@/lib/types";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/wiki/${article.id}`}>
      <Card className="h-full transition-colors hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base">
              {article.title}
            </CardTitle>
            <Badge variant="secondary" className="shrink-0">
              {article.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {article.summary}
          </p>
          <p className="text-muted-foreground mt-3 text-xs">
            {new Date(article.created_at).toLocaleDateString("zh-CN")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
