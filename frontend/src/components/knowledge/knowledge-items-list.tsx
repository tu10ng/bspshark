"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Search, BookOpen, FileText, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WikiMarkdown } from "@/components/wiki/wiki-markdown";
import { useDebounce } from "@/hooks/use-debounce";
import type { KnowledgeItemWithRefs } from "@/lib/types";
import Link from "next/link";

export function KnowledgeItemsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebounce(query, 300);
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const params = new URLSearchParams(searchParamsRef.current.toString());
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.push(`/knowledge-items?${params.toString()}`);
    });
  }, [debouncedQuery, router, startTransition]);

  return (
    <div className="relative">
      <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
      <Input
        placeholder="搜索知识项..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}

export function KnowledgeItemsList({
  items,
}: {
  items: KnowledgeItemWithRefs[];
}) {
  const [selectedItem, setSelectedItem] = useState<KnowledgeItemWithRefs | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">没有找到相关的知识项</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const tags: string[] = JSON.parse(item.tags || "[]");
          return (
            <Card
              key={item.id}
              className="h-full cursor-pointer transition-colors hover:border-foreground/20"
              onClick={() => setSelectedItem(item)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-base">
                    {item.title}
                  </CardTitle>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    v{item.current_version}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {item.content && (
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {item.content.slice(0, 150)}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="mr-1 size-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {item.wiki_references.length > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="size-3" />
                      {item.wiki_references.length} 个 Wiki 引用
                    </span>
                  )}
                  <span>
                    {new Date(item.updated_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BookOpen className="size-5" />
                  {selectedItem.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                {/* Tags */}
                {(() => {
                  const tags: string[] = JSON.parse(selectedItem.tags || "[]");
                  return tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          <Tag className="mr-1 size-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* Meta info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>版本 {selectedItem.current_version}</span>
                  <span>Slug: {selectedItem.slug}</span>
                </div>

                {/* Content */}
                {selectedItem.content && (
                  <div className="prose dark:prose-invert wiki-prose max-w-none">
                    <WikiMarkdown content={selectedItem.content} />
                  </div>
                )}

                {/* Wiki References */}
                {selectedItem.wiki_references.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">Wiki 引用</h3>
                    <div className="space-y-1">
                      {selectedItem.wiki_references.map((ref) => (
                        <Link
                          key={ref.wiki_page_id}
                          href={`/wiki/${ref.wiki_page_slug}`}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-blue-600 hover:bg-muted dark:text-blue-400"
                          onClick={() => setSelectedItem(null)}
                        >
                          <FileText className="size-3.5" />
                          {ref.wiki_page_title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function KnowledgeItemsListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
            <div className="bg-muted h-5 w-10 animate-pulse rounded" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="bg-muted h-4 w-full animate-pulse rounded" />
            <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
          </div>
          <div className="bg-muted mt-4 h-3 w-24 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
