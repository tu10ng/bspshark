"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function TreeCard({ tree }: { tree: KnowledgeTree }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteKnowledgeTree(tree.id);
      setConfirmDelete(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Link href={`/knowledge/${tree.id}`}>
        <Card className="h-full transition-colors hover:border-foreground/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="line-clamp-2 text-base">
                {tree.name}
              </CardTitle>
              <div className="flex shrink-0 items-center gap-1">
                {tree.module && (
                  <Badge variant="secondary" className="shrink-0">
                    {tree.module}
                  </Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button size="icon-xs" variant="ghost" />}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setConfirmDelete(true);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tree.description && (
              <p className="text-muted-foreground line-clamp-3 text-sm">
                {tree.description}
              </p>
            )}
            <p className="text-muted-foreground mt-3 text-xs">
              {new Date(tree.updated_at).toLocaleDateString("zh-CN")}
            </p>
          </CardContent>
        </Card>
      </Link>

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
            确定要删除知识树「{tree.name}」吗？此操作不可撤销。
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
