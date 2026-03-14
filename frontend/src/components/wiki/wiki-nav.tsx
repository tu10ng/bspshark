"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WikiPageNested } from "@/lib/types";

function NavItem({
  node,
  parentPath,
  depth,
  forceExpandAll,
}: {
  node: WikiPageNested;
  parentPath: string;
  depth: number;
  forceExpandAll?: boolean;
}) {
  const pathname = usePathname();
  const path = parentPath ? `${parentPath}/${node.slug}` : node.slug;
  const href = `/wiki/${path}`;
  const hasChildren = node.children.length > 0;
  const isActive = pathname === href;
  const isParentOfActive = pathname.startsWith(href + "/");
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const expanded = manualExpanded ?? (isActive || isParentOfActive || !!forceExpandAll);

  return (
    <li>
      <div className="flex items-center">
        {hasChildren && (
          <button
            onClick={() => setManualExpanded(!expanded)}
            className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-wiki-sidebar-muted"
            aria-label={expanded ? "折叠" : "展开"}
          >
            <ChevronRightIcon
              className={cn(
                "size-3.5 text-wiki-sidebar-foreground/50 transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        )}
        <Link
          href={href}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-sm transition-colors",
            !hasChildren && "ml-6",
            isActive
              ? "border-l-2 border-wiki-sidebar-active bg-wiki-sidebar-active-bg font-medium text-wiki-sidebar-active"
              : "text-wiki-sidebar-foreground/80 hover:bg-wiki-sidebar-muted hover:text-wiki-sidebar-foreground"
          )}
        >
          {node.title}
        </Link>
      </div>
      {hasChildren && expanded && (
        <ul className="ml-3 border-l border-wiki-sidebar-muted pl-1">
          {node.children.map((child) => (
            <NavItem
              key={child.id}
              node={child}
              parentPath={path}
              depth={depth + 1}
              forceExpandAll={forceExpandAll}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function WikiNav({
  tree,
  forceExpandAll,
}: {
  tree: WikiPageNested[];
  forceExpandAll?: boolean;
}) {
  return (
    <nav className="py-2">
      <ul className="space-y-0.5">
        {tree.map((node) => (
          <NavItem
            key={node.id}
            node={node}
            parentPath=""
            depth={0}
            forceExpandAll={forceExpandAll}
          />
        ))}
      </ul>
    </nav>
  );
}
