import { ToolCard } from "./tool-card";
import type { Tool } from "@/lib/types";

export function ToolCatalog({ tools }: { tools: Tool[] }) {
  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">没有找到相关工具</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  );
}

export function ToolCatalogSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="bg-muted h-5 w-1/2 animate-pulse rounded" />
            <div className="bg-muted h-5 w-14 animate-pulse rounded" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="bg-muted h-4 w-full animate-pulse rounded" />
            <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
          </div>
          <div className="bg-muted mt-4 h-8 w-16 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
