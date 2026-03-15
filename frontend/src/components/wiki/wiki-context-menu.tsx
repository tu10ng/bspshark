"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import {
  PlusIcon,
  PencilIcon,
  TypeIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reorderWikiPage } from "@/lib/api";
import { WikiRenameDialog } from "./wiki-rename-dialog";
import { WikiDeleteDialog } from "./wiki-delete-dialog";

export interface ContextMenuTarget {
  pageId: string;
  parentId: string | null;
  title: string;
  slug: string;
  sortOrder: number;
  path: string;
  /** siblings in same parent, sorted by sort_order */
  siblings: { id: string; sort_order: number }[];
}

interface WikiContextMenuProps {
  target: ContextMenuTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { x: number; y: number };
}

function MenuItem({
  className,
  ...props
}: ContextMenuPrimitive.Item.Props & { className?: string }) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function MenuSeparator() {
  return <ContextMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />;
}

export function WikiContextMenu({
  target,
  open,
  onOpenChange,
  position,
}: WikiContextMenuProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSwap = useCallback(
    async (direction: "up" | "down") => {
      if (!target) return;
      const idx = target.siblings.findIndex((s) => s.id === target.pageId);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= target.siblings.length) return;

      const current = target.siblings[idx];
      const swap = target.siblings[swapIdx];

      try {
        await Promise.all([
          reorderWikiPage(current.id, {
            parent_id: target.parentId ?? undefined,
            sort_order: swap.sort_order,
          }),
          reorderWikiPage(swap.id, {
            parent_id: target.parentId ?? undefined,
            sort_order: current.sort_order,
          }),
        ]);
      } catch {
        // Reorder failed — refresh to restore server state
      }
      onOpenChange(false);
      router.refresh();
    },
    [target, onOpenChange, router]
  );

  const handleCopyLink = useCallback(async () => {
    if (!target) return;
    const url = `${window.location.origin}/wiki/${target.path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API may not be available in insecure contexts
    }
    onOpenChange(false);
  }, [target, onOpenChange]);

  if (!target) return null;

  const siblingIdx = target.siblings.findIndex((s) => s.id === target.pageId);
  const canMoveUp = siblingIdx > 0;
  const canMoveDown = siblingIdx < target.siblings.length - 1;

  const anchor: ContextMenuPrimitive.Positioner.Props["anchor"] = {
    getBoundingClientRect: () => ({
      x: position.x,
      y: position.y,
      width: 0,
      height: 0,
      top: position.y,
      right: position.x,
      bottom: position.y,
      left: position.x,
      toJSON: () => {},
    }),
  };

  return (
    <>
      <ContextMenuPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <ContextMenuPrimitive.Portal>
          <ContextMenuPrimitive.Positioner
            className="isolate z-50 outline-none"
            anchor={anchor}
            side="bottom"
            align="start"
            sideOffset={0}
          >
            <ContextMenuPrimitive.Popup className="min-w-[160px] rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
              <MenuItem
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/wiki/new?parent=${target.pageId}`);
                }}
              >
                <PlusIcon />
                新建子页面
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/wiki/edit/${target.pageId}`);
                }}
              >
                <PencilIcon />
                编辑
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onOpenChange(false);
                  setRenameOpen(true);
                }}
              >
                <TypeIcon />
                重命名
              </MenuItem>
              <MenuSeparator />
              {canMoveUp && (
                <MenuItem onClick={() => handleSwap("up")}>
                  <ArrowUpIcon />
                  上移
                </MenuItem>
              )}
              {canMoveDown && (
                <MenuItem onClick={() => handleSwap("down")}>
                  <ArrowDownIcon />
                  下移
                </MenuItem>
              )}
              {(canMoveUp || canMoveDown) && <MenuSeparator />}
              <MenuItem onClick={handleCopyLink}>
                <LinkIcon />
                复制链接
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  setDeleteOpen(true);
                }}
              >
                <Trash2Icon className="!text-destructive" />
                删除
              </MenuItem>
            </ContextMenuPrimitive.Popup>
          </ContextMenuPrimitive.Positioner>
        </ContextMenuPrimitive.Portal>
      </ContextMenuPrimitive.Root>

      <WikiRenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        pageId={target.pageId}
        currentTitle={target.title}
        currentSlug={target.slug}
      />

      <WikiDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        pageId={target.pageId}
        pageTitle={target.title}
        pagePath={target.path}
      />
    </>
  );
}
