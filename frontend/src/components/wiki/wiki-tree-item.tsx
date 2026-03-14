"use client";

import { useState } from "react";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WikiTreeNode } from "@/lib/types";

interface WikiTreeItemProps {
  node: WikiTreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (node: WikiTreeNode) => void;
  onCreateChild: (parentId: string, isFolder: boolean) => void;
  onDelete: (node: WikiTreeNode) => void;
  onMoveUp: (node: WikiTreeNode) => void;
  onMoveDown: (node: WikiTreeNode) => void;
}

export function WikiTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
  onRename,
  onCreateChild,
  onDelete,
  onMoveUp,
  onMoveDown,
}: WikiTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-sm hover:bg-muted",
          isSelected && "bg-muted font-medium"
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={() => {
          if (node.is_folder) {
            setExpanded(!expanded);
          }
          onSelect(node.id);
        }}
      >
        {node.is_folder ? (
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              expanded && "rotate-90"
            )}
          />
        ) : (
          <span className="w-3.5" />
        )}
        {node.is_folder ? (
          expanded ? (
            <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="size-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.title}</span>
        {node.is_folder && hasChildren && !expanded && (
          <span className="ml-auto text-xs text-muted-foreground">
            {node.children.length}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="ml-auto shrink-0 opacity-0 group-hover:opacity-100"
                              />
            }
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" sideOffset={4}>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(node); }}>
              <Pencil />
              Rename
            </DropdownMenuItem>
            {node.is_folder && (
              <>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateChild(node.id, false); }}>
                  <Plus />
                  New Page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateChild(node.id, true); }}>
                  <Plus />
                  New Folder
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveUp(node); }}>
              <ArrowUp />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveDown(node); }}>
              <ArrowDown />
              Move Down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {node.is_folder && expanded && (
        <div>
          {node.children.map((child) => (
            <WikiTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onRename={onRename}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      )}
    </div>
  );
}
