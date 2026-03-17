"use client";

import { useState, useCallback, useMemo, useRef, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { batchReorderWikiPages } from "@/lib/api";
import { useWikiTree } from "./wiki-tree-context";
import { applyReorderToTree } from "./wiki-tree-helpers";
import type { WikiPageNested } from "@/lib/types";

/** Flatten a wiki tree for quick ID lookup */
function buildLookup(
  nodes: WikiPageNested[],
  parentId: string | null = null
): Map<string, { node: WikiPageNested; parentId: string | null }> {
  const map = new Map<
    string,
    { node: WikiPageNested; parentId: string | null }
  >();
  for (const node of nodes) {
    map.set(node.id, { node, parentId });
    for (const [k, v] of buildLookup(node.children, node.id)) {
      map.set(k, v);
    }
  }
  return map;
}

/** Check if `candidateId` is an ancestor of `nodeId` */
function isAncestor(
  nodeId: string,
  candidateId: string,
  lookup: Map<string, { node: WikiPageNested; parentId: string | null }>
): boolean {
  let current = lookup.get(nodeId);
  while (current?.parentId) {
    if (current.parentId === candidateId) return true;
    current = lookup.get(current.parentId);
  }
  return false;
}

/** Build the full slug path for a node by walking up the parent chain */
function getNodePath(
  nodeId: string,
  lookup: Map<string, { node: WikiPageNested; parentId: string | null }>
): string {
  const parts: string[] = [];
  let current = lookup.get(nodeId);
  while (current) {
    parts.unshift(current.node.slug);
    current = current.parentId ? lookup.get(current.parentId) : undefined;
  }
  return parts.join("/");
}

/** Parse a sentinel droppable id like "sentinel:root" or "sentinel:{parentId}" */
function parseSentinelId(
  id: string
): { parentId: string | null } | null {
  if (!id.startsWith("sentinel:")) return null;
  const rest = id.slice("sentinel:".length);
  return { parentId: rest === "root" ? null : rest };
}

/** Get the last child node of a given parent */
function getLastSibling(
  parentId: string | null,
  tree: WikiPageNested[],
  lookup: Map<string, { node: WikiPageNested; parentId: string | null }>
): WikiPageNested | undefined {
  const siblings =
    parentId === null
      ? tree
      : lookup.get(parentId)?.node.children ?? [];
  return siblings.length > 0 ? siblings[siblings.length - 1] : undefined;
}

export interface DropIndicator {
  /** Target node id */
  targetId: string;
  /** "before" | "after" = sibling reorder, "inside" = make child */
  position: "before" | "after" | "inside";
}

interface WikiDndProviderProps {
  children: React.ReactNode;
}

export function WikiDndProvider({ children }: WikiDndProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { tree, applyReorder } = useWikiTree();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(
    null
  );
  const dropIndicatorRef = useRef<DropIndicator | null>(null);

  const lookup = useMemo(() => buildLookup(tree), [tree]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const activeNode = activeId ? lookup.get(activeId)?.node : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        if (dropIndicatorRef.current !== null) {
          dropIndicatorRef.current = null;
          setDropIndicator(null);
        }
        return;
      }

      const overId = over.id as string;
      const activeIdStr = active.id as string;

      // Handle sentinel droppable (end-of-list zone)
      const sentinel = parseSentinelId(overId);
      if (sentinel) {
        const lastSibling = getLastSibling(sentinel.parentId, tree, lookup);
        if (!lastSibling || lastSibling.id === activeIdStr) {
          if (dropIndicatorRef.current !== null) {
            dropIndicatorRef.current = null;
            setDropIndicator(null);
          }
          return;
        }
        const indicator: DropIndicator = {
          targetId: lastSibling.id,
          position: "after",
        };
        const prev = dropIndicatorRef.current;
        if (prev?.targetId === indicator.targetId && prev?.position === indicator.position) {
          return;
        }
        dropIndicatorRef.current = indicator;
        setDropIndicator(indicator);
        return;
      }

      // Prevent dropping a node into its own descendant
      if (isAncestor(overId, activeIdStr, lookup)) {
        if (dropIndicatorRef.current !== null) {
          dropIndicatorRef.current = null;
          setDropIndicator(null);
        }
        return;
      }

      // Determine position using dual-axis + direction-aware detection
      const overRect = over.rect;
      const pointerY =
        (event.activatorEvent as MouseEvent).clientY + (event.delta?.y ?? 0);
      const pointerX =
        (event.activatorEvent as MouseEvent).clientX + (event.delta?.x ?? 0);
      const ratioY = (pointerY - overRect.top) / overRect.height;
      const offsetX = pointerX - overRect.left;
      const deltaY = event.delta?.y ?? 0;

      let position: DropIndicator["position"];
      if (ratioY >= 0.35 && ratioY <= 0.65 && offsetX >= 24) {
        position = "inside";
      } else {
        const splitY = deltaY > 0 ? 0.3 : deltaY < 0 ? 0.7 : 0.5;
        position = ratioY < splitY ? "before" : "after";
      }

      // Only update state when targetId or position actually changed
      const prev = dropIndicatorRef.current;
      if (prev?.targetId === overId && prev?.position === position) {
        return;
      }

      const indicator = { targetId: overId, position };
      dropIndicatorRef.current = indicator;
      setDropIndicator(indicator);
    },
    [lookup, tree]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const indicator = dropIndicatorRef.current;
      dropIndicatorRef.current = null;
      setActiveId(null);
      setDropIndicator(null);

      if (!over || active.id === over.id) return;
      if (!indicator) return;

      const draggedId = active.id as string;
      let overId = over.id as string;

      // Resolve sentinel to the last sibling
      const sentinel = parseSentinelId(overId);
      if (sentinel) {
        const lastSibling = getLastSibling(sentinel.parentId, tree, lookup);
        if (!lastSibling || lastSibling.id === draggedId) return;
        overId = lastSibling.id;
      }
      const draggedEntry = lookup.get(draggedId);
      const overEntry = lookup.get(overId);
      if (!draggedEntry || !overEntry) return;

      // Prevent dropping into own descendant
      if (isAncestor(overId, draggedId, lookup)) return;
      let newParentId: string | null;
      let insertBeforeId: string | null = null;

      if (indicator.position === "inside") {
        // Make child of target
        newParentId = overId;
      } else {
        // Same parent as target
        newParentId = overEntry.parentId;
        if (indicator.position === "before") {
          insertBeforeId = overId;
        }
      }

      // Get siblings of the new parent
      const getSiblings = (parentId: string | null): WikiPageNested[] => {
        if (!parentId) return tree;
        const parent = lookup.get(parentId);
        return parent?.node.children ?? [];
      };

      const siblings = getSiblings(newParentId).filter(
        (s) => s.id !== draggedId
      );

      // Calculate new sort orders
      const items: { id: string; parent_id: string | null; sort_order: number }[] =
        [];

      if (indicator.position === "inside") {
        // Append at end of target's children
        const existingChildren = overEntry.node.children.filter(
          (c) => c.id !== draggedId
        );
        existingChildren.forEach((c, i) => {
          items.push({ id: c.id, parent_id: newParentId, sort_order: i });
        });
        items.push({
          id: draggedId,
          parent_id: newParentId,
          sort_order: existingChildren.length,
        });
      } else {
        // Insert before or after target in siblings
        let idx = 0;
        for (const sibling of siblings) {
          if (insertBeforeId && sibling.id === insertBeforeId) {
            items.push({
              id: draggedId,
              parent_id: newParentId,
              sort_order: idx,
            });
            idx++;
          }
          items.push({
            id: sibling.id,
            parent_id: newParentId,
            sort_order: idx,
          });
          idx++;
          if (
            !insertBeforeId &&
            indicator.position === "after" &&
            sibling.id === overId
          ) {
            items.push({
              id: draggedId,
              parent_id: newParentId,
              sort_order: idx,
            });
            idx++;
          }
        }
        // If inserting before and target wasn't found yet (shouldn't happen)
        if (!items.find((i) => i.id === draggedId)) {
          items.push({
            id: draggedId,
            parent_id: newParentId,
            sort_order: idx,
          });
        }
      }

      // Optimistic update — apply immediately to the tree
      const rollback = applyReorder((prev) =>
        applyReorderToTree(prev, items, draggedId, newParentId)
      );

      // If the parent changed, update the URL for the dragged page
      if (newParentId !== draggedEntry.parentId) {
        const oldPath = "/wiki/" + getNodePath(draggedId, lookup);
        if (pathname.startsWith(oldPath)) {
          const newParentPath = newParentId
            ? getNodePath(newParentId, lookup)
            : "";
          const newSlug = draggedEntry.node.slug;
          const newPagePath = newParentPath
            ? `${newParentPath}/${newSlug}`
            : newSlug;
          const suffix = pathname.slice(oldPath.length);
          router.replace("/wiki/" + newPagePath + suffix);
        }
      }

      try {
        await batchReorderWikiPages(items);
      } catch (err) {
        console.error("Failed to reorder wiki pages:", err);
        rollback();
      }
    },
    [lookup, tree, router, pathname, applyReorder]
  );

  const handleDragCancel = useCallback(() => {
    dropIndicatorRef.current = null;
    setActiveId(null);
    setDropIndicator(null);
  }, []);

  return (
    <DndContext
      id="wiki-dnd"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <WikiDndContext.Provider value={{ activeId, dropIndicator }}>
        {children}
      </WikiDndContext.Provider>
      <DragOverlay dropAnimation={null}>
        {activeNode ? (
          <div className="rounded-md bg-wiki-sidebar-active-bg px-3 py-1.5 text-sm font-medium text-wiki-sidebar-active shadow-md opacity-60">
            {activeNode.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface WikiDndContextValue {
  activeId: string | null;
  dropIndicator: DropIndicator | null;
}

const WikiDndContext = createContext<WikiDndContextValue>({
  activeId: null,
  dropIndicator: null,
});

export function useWikiDnd() {
  return useContext(WikiDndContext);
}
