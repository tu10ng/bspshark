import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Article } from "@/lib/types";

export function RecentArticles({ articles }: { articles: Article[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近文章</CardTitle>
      </CardHeader>
      <CardContent>
        {articles.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无文章</p>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/wiki/${article.id}`}
                className="hover:bg-muted -mx-2 block rounded-lg p-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {article.title}
                    </p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {article.summary}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {article.category}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentArticlesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近文章</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
              <div className="bg-muted h-3 w-full animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
