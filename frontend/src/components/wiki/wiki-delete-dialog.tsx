"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteWikiPage } from "@/lib/api";

interface WikiDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
  pageTitle: string;
  pagePath: string;
}

export function WikiDeleteDialog({
  open,
  onOpenChange,
  pageId,
  pageTitle,
  pagePath,
}: WikiDeleteDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteWikiPage(pageId);
      onOpenChange(false);
      // If we deleted the current page, go to wiki root
      if (pathname === `/wiki/${pagePath}`) {
        router.push("/wiki");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除页面</DialogTitle>
          <DialogDescription>
            确定要删除 &ldquo;{pageTitle}&rdquo; 吗？此操作将同时删除所有子页面，且不可撤销。
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "删除中..." : "删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
