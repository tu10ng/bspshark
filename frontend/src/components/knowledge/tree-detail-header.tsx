"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteKnowledgeTree } from "@/lib/api";
import { TreeForm } from "./tree-form";
import type { KnowledgeTree } from "@/lib/types";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface TreeDetailHeaderProps {
  tree: KnowledgeTree;
  treeId: string;
}

export function TreeDetailHeader({ tree, treeId }: TreeDetailHeaderProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteKnowledgeTree(treeId);
      router.push("/knowledge");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center gap-3">
          <Link
            href="/knowledge"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            知识树
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold tracking-tight">{tree.name}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button size="icon-xs" variant="ghost" />}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {tree.description && (
          <p className="text-muted-foreground mt-1">{tree.description}</p>
        )}
        {tree.module && (
          <Badge variant="secondary" className="mt-2">
            {tree.module}
          </Badge>
        )}
      </div>

      <TreeForm
        mode="edit"
        initialData={tree}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除知识树「{tree.name}」吗？所有节点和关联数据都会被一并删除，此操作不可撤销。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
