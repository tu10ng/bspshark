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
}: {
  node: WikiPageNested;
  parentPath: string;
  depth: number;
}) {
  const pathname = usePathname();
  const path = parentPath ? `${parentPath}/${node.slug}` : node.slug;
  const href = `/wiki/${path}`;
  const hasChildren = node.children.length > 0;
  const isActive = pathname === href;
  const isParentOfActive = pathname.startsWith(href + "/");
  const [expanded, setExpanded] = useState(isActive || isParentOfActive);

  return (
    <li>
      <div className="flex items-center">
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-muted"
            aria-label={expanded ? "折叠" : "展开"}
          >
            <ChevronRightIcon
              className={cn(
                "size-3.5 text-muted-foreground transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        )}
        <Link
          href={href}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
            !hasChildren && "ml-6",
            isActive
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {node.title}
        </Link>
      </div>
      {hasChildren && expanded && (
        <ul className="ml-3 border-l pl-1">
          {node.children.map((child) => (
            <NavItem
              key={child.id}
              node={child}
              parentPath={path}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function WikiNav({ tree }: { tree: WikiPageNested[] }) {
  return (
    <nav className="py-2">
      <ul className="space-y-0.5">
        {tree.map((node) => (
          <NavItem key={node.id} node={node} parentPath="" depth={0} />
        ))}
      </ul>
    </nav>
  );
}
