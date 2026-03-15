"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { WikiPageNested } from "@/lib/types";
import {
  WikiContextMenu,
  type ContextMenuTarget,
} from "./wiki-context-menu";
import { useWikiDnd } from "./wiki-dnd-provider";

function DropSentinel({
  parentId,
  isRoot,
}: {
  parentId: string | null;
  isRoot?: boolean;
}) {
  const { activeId } = useWikiDnd();
  const sentinelId = parentId ? `sentinel:${parentId}` : "sentinel:root";
  const { setNodeRef } = useDroppable({ id: sentinelId });

  if (!activeId) return null;

  return (
    <li
      ref={setNodeRef}
      aria-hidden
      className={cn(
        "list-none",
        isRoot ? "min-h-6 flex-1" : "h-6"
      )}
    />
  );
}

function NavItem({
  node,
  parentPath,
  depth,
  forceExpandAll,
  siblings,
  onContextMenu,
}: {
  node: WikiPageNested;
  parentPath: string;
  depth: number;
  forceExpandAll?: boolean;
  siblings: { id: string; sort_order: number }[];
  onContextMenu: (
    e: React.MouseEvent,
    target: ContextMenuTarget
  ) => void;
}) {
  const pathname = usePathname();
  const path = parentPath ? `${parentPath}/${node.slug}` : node.slug;
  const href = `/wiki/${path}`;
  const hasChildren = node.children.length > 0;
  const isActive = pathname === href;
  const isParentOfActive = pathname.startsWith(href + "/");
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const expanded =
    manualExpanded ?? (isActive || isParentOfActive || !!forceExpandAll);

  const { activeId, dropIndicator } = useWikiDnd();
  const isDragging = activeId === node.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: isSortableDragging,
  } = useSortable({ id: node.id });

  // RTD-style font-size reduction for nested levels
  const fontSize = depth === 0 ? "text-sm" : "text-[13px]";

  const childSiblings = node.children.map((c) => ({
    id: c.id,
    sort_order: c.sort_order,
  }));

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, {
      pageId: node.id,
      parentId: node.parent_id,
      title: node.title,
      slug: node.slug,
      sortOrder: node.sort_order,
      path,
      siblings,
    });
  };

  const showDropBefore =
    dropIndicator?.targetId === node.id &&
    dropIndicator.position === "before";
  const showDropAfter =
    dropIndicator?.targetId === node.id &&
    dropIndicator.position === "after";
  const showDropInside =
    dropIndicator?.targetId === node.id &&
    dropIndicator.position === "inside";

  return (
    <li ref={setNodeRef} {...attributes}>
      {showDropBefore && (
        <div className="mx-2 h-0.5 rounded-full bg-wiki-sidebar-active" />
      )}
      <div
        {...listeners}
        className={cn(
          "group/navitem flex cursor-grab items-center active:cursor-grabbing",
          isDragging && "opacity-40",
          showDropInside &&
            "rounded-md bg-wiki-sidebar-active-bg/40 ring-2 ring-wiki-sidebar-active ring-offset-1"
        )}
        onContextMenu={handleContextMenu}
      >
        {hasChildren && (
          <button
            onClick={() => setManualExpanded(!expanded)}
            className="flex size-5 shrink-0 items-center justify-center hover:text-wiki-sidebar-foreground"
            aria-label={expanded ? "折叠" : "展开"}
          >
            <ChevronRightIcon
              className={cn(
                "size-3 text-wiki-sidebar-foreground/50 transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        )}
        <Link
          href={href}
          draggable={false}
          className={cn(
            "block flex-1 rounded-md px-2 py-1.5 transition-colors",
            fontSize,
            !hasChildren && "pl-1",
            isActive
              ? "border-l-2 border-wiki-sidebar-active bg-wiki-sidebar-active-bg font-medium text-wiki-sidebar-active"
              : "text-wiki-sidebar-foreground/80 hover:bg-wiki-sidebar-muted hover:text-wiki-sidebar-foreground"
          )}
        >
          {node.title}
        </Link>
      </div>
      {hasChildren && expanded && !isSortableDragging && (
        <ul className="ml-3 border-l border-wiki-sidebar-muted pl-1">
          {node.children.map((child) => (
            <NavItem
              key={child.id}
              node={child}
              parentPath={path}
              depth={depth + 1}
              forceExpandAll={forceExpandAll}
              siblings={childSiblings}
              onContextMenu={onContextMenu}
            />
          ))}
          <DropSentinel parentId={node.id} />
        </ul>
      )}
      {showDropAfter && (
        <div className="mx-2 h-0.5 rounded-full bg-wiki-sidebar-active" />
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
  const [contextMenu, setContextMenu] = useState<{
    target: ContextMenuTarget;
    position: { x: number; y: number };
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, target: ContextMenuTarget) => {
      setContextMenu({
        target,
        position: { x: e.clientX, y: e.clientY },
      });
    },
    []
  );

  const rootSiblings = tree.map((n) => ({
    id: n.id,
    sort_order: n.sort_order,
  }));

  return (
    <nav className="min-h-full flex flex-col py-2">
      <ul className="flex-1 flex flex-col">
        {tree.map((node) => (
          <NavItem
            key={node.id}
            node={node}
            parentPath=""
            depth={0}
            forceExpandAll={forceExpandAll}
            siblings={rootSiblings}
            onContextMenu={handleContextMenu}
          />
        ))}
        <DropSentinel parentId={null} isRoot />
      </ul>
      <WikiContextMenu
        target={contextMenu?.target ?? null}
        open={contextMenu !== null}
        onOpenChange={(open) => {
          if (!open) setContextMenu(null);
        }}
        position={contextMenu?.position ?? { x: 0, y: 0 }}
      />
    </nav>
  );
}
