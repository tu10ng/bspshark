import { Badge } from "@/components/ui/badge";
import type { Article } from "@/lib/types";

export function ArticleContent({ article }: { article: Article }) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge>{article.category}</Badge>
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          <span className="text-muted-foreground text-sm">
            {new Date(article.created_at).toLocaleDateString("zh-CN")}
          </span>
        </div>
        {article.summary && (
          <p className="text-muted-foreground mt-4 text-lg">
            {article.summary}
          </p>
        )}
      </header>
      <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
        {article.content}
      </div>
    </article>
  );
}
