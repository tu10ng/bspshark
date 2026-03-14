"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, FileText, Folder, FileUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WikiTreeItem } from "./wiki-tree-item";
import { WikiPageForm } from "./wiki-page-form";
import { WikiDeleteDialog } from "./wiki-delete-dialog";
import { WikiImportDialog } from "./wiki-import-dialog";
import type { WikiTreeNode } from "@/lib/types";
import {
  createWikiPage,
  updateWikiPage,
  deleteWikiPage,
  reorderWikiPage,
} from "@/lib/api";

interface WikiSidebarProps {
  tree: WikiTreeNode[];
}

// Find siblings of a node
function findSiblings(
  tree: WikiTreeNode[],
  parentId: string | null
): WikiTreeNode[] {
  if (!parentId) return tree;
  function findIn(nodes: WikiTreeNode[]): WikiTreeNode[] | null {
    for (const n of nodes) {
      if (n.id === parentId) return n.children;
      const found = findIn(n.children);
      if (found) return found;
    }
    return null;
  }
  return findIn(tree) || [];
}

export function WikiSidebar({ tree }: WikiSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("page");

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<
    "create-page" | "create-folder" | "rename"
  >("create-page");
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formInitialTitle, setFormInitialTitle] = useState("");
  const [formTargetId, setFormTargetId] = useState<string | null>(null);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WikiTreeNode | null>(null);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);

  const handleSelect = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", id);
      router.push(`/wiki?${params.toString()}`);
    },
    [router, searchParams]
  );

  function openCreateForm(parentId: string | null, isFolder: boolean) {
    setFormParentId(parentId);
    setFormMode(isFolder ? "create-folder" : "create-page");
    setFormInitialTitle("");
    setFormTargetId(null);
    setFormOpen(true);
  }

  function openRenameForm(node: WikiTreeNode) {
    setFormMode("rename");
    setFormInitialTitle(node.title);
    setFormTargetId(node.id);
    setFormOpen(true);
  }

  async function handleFormSubmit(title: string) {
    if (formMode === "rename" && formTargetId) {
      await updateWikiPage(formTargetId, { title });
    } else {
      const page = await createWikiPage({
        parent_id: formParentId,
        title,
        is_folder: formMode === "create-folder",
      });
      if (!page.is_folder) {
        handleSelect(page.id);
      }
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteWikiPage(deleteTarget.id);
    if (selectedId === deleteTarget.id) {
      router.push("/wiki");
    }
    router.refresh();
  }

  async function handleMoveUp(node: WikiTreeNode) {
    const siblings = findSiblings(tree, node.parent_id);
    const idx = siblings.findIndex((s) => s.id === node.id);
    if (idx <= 0) return;
    await reorderWikiPage(node.id, {
      parent_id: node.parent_id,
      sort_order: siblings[idx - 1].sort_order,
    });
    await reorderWikiPage(siblings[idx - 1].id, {
      parent_id: siblings[idx - 1].parent_id,
      sort_order: node.sort_order,
    });
    router.refresh();
  }

  async function handleMoveDown(node: WikiTreeNode) {
    const siblings = findSiblings(tree, node.parent_id);
    const idx = siblings.findIndex((s) => s.id === node.id);
    if (idx < 0 || idx >= siblings.length - 1) return;
    await reorderWikiPage(node.id, {
      parent_id: node.parent_id,
      sort_order: siblings[idx + 1].sort_order,
    });
    await reorderWikiPage(siblings[idx + 1].id, {
      parent_id: siblings[idx + 1].parent_id,
      sort_order: node.sort_order,
    });
    router.refresh();
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="text-sm font-semibold">Wiki</h2>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" />}
            >
              <Plus className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openCreateForm(null, false)}>
                <FileText />
                New Page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreateForm(null, true)}>
                <Folder />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <FileUp />
                Import Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {tree.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                No pages yet
              </p>
            ) : (
              tree.map((node) => (
                <WikiTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  onRename={openRenameForm}
                  onCreateChild={openCreateForm}
                  onDelete={(n) => {
                    setDeleteTarget(n);
                    setDeleteOpen(true);
                  }}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <WikiPageForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialTitle={formInitialTitle}
        onSubmit={handleFormSubmit}
      />

      {deleteTarget && (
        <WikiDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={deleteTarget.title}
          isFolder={deleteTarget.is_folder}
          onConfirm={handleDelete}
        />
      )}

      <WikiImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tree={tree}
        onImported={() => router.refresh()}
      />
    </>
  );
}
