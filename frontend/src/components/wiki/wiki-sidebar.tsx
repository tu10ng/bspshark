"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WikiNav } from "./wiki-nav";
import { WikiDndProvider } from "./wiki-dnd-provider";
import type { WikiPageNested } from "@/lib/types";

function filterTree(
  nodes: WikiPageNested[],
  query: string
): WikiPageNested[] {
  if (!query) return nodes;
  const lower = query.toLowerCase();
  const result: WikiPageNested[] = [];
  for (const node of nodes) {
    const childMatches = filterTree(node.children, query);
    if (
      node.title.toLowerCase().includes(lower) ||
      childMatches.length > 0
    ) {
      result.push({ ...node, children: childMatches });
    }
  }
  return result;
}

export function WikiSidebar({ tree }: { tree: WikiPageNested[] }) {
  const [query, setQuery] = useState("");

  const filteredTree = useMemo(() => filterTree(tree, query), [tree, query]);
  const isSearching = query.length > 0;

  return (
    <>
      <div className="flex items-center justify-between border-b border-wiki-sidebar-muted px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-wiki-sidebar-foreground/80">
          Wiki
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-wiki-sidebar-foreground/60 hover:bg-wiki-sidebar-muted hover:text-wiki-sidebar-foreground"
          render={<Link href="/wiki/new" />}
          nativeButton={false}
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
      <div className="px-3 py-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-wiki-sidebar-foreground/40" />
          <input
            type="text"
            placeholder="搜索文档..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full rounded-md bg-wiki-sidebar-muted/50 pl-8 pr-3 text-sm text-wiki-sidebar-foreground placeholder:text-wiki-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-wiki-sidebar-active"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {filteredTree.length > 0 ? (
          <WikiDndProvider tree={tree}>
            <WikiNav tree={filteredTree} forceExpandAll={isSearching} />
          </WikiDndProvider>
        ) : (
          <p className="px-3 py-4 text-center text-xs text-wiki-sidebar-foreground/40">
            未找到匹配文档
          </p>
        )}
      </div>
    </>
  );
}
