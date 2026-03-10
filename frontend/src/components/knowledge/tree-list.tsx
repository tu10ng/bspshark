import { TreeCard } from "./tree-card";
import type { KnowledgeTree } from "@/lib/types";

export function TreeList({ trees }: { trees: KnowledgeTree[] }) {
  if (trees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">暂无知识树</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trees.map((tree) => (
        <TreeCard key={tree.id} tree={tree} />
      ))}
    </div>
  );
}

export function TreeListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
            <div className="bg-muted h-5 w-12 animate-pulse rounded" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="bg-muted h-4 w-full animate-pulse rounded" />
            <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
