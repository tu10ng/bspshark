"use client";

import { Suspense } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeForm } from "./tree-form";
import { TreeSearch } from "./tree-search";
import { TreeListItem } from "./tree-list-item";
import type { KnowledgeTree } from "@/lib/types";

interface TreeListPanelProps {
  trees: KnowledgeTree[];
  modules: string[];
  selectedTreeId?: string;
}

export function TreeListPanel({
  trees,
  modules,
  selectedTreeId,
}: TreeListPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">知识树</h2>
        <TreeForm mode="create" />
      </div>

      <div className="px-4 py-2">
        <Suspense>
          <TreeSearch modules={modules} />
        </Suspense>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-2 pb-4">
          {trees.length === 0 ? (
            <p className="text-muted-foreground px-2 py-8 text-center text-sm">
              暂无知识树
            </p>
          ) : (
            trees.map((tree) => (
              <TreeListItem
                key={tree.id}
                tree={tree}
                selected={tree.id === selectedTreeId}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
