"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateWikiPage } from "@/lib/api";

interface WikiRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
  currentTitle: string;
  currentSlug: string;
}

export function WikiRenameDialog({
  open,
  onOpenChange,
  pageId,
  currentTitle,
  currentSlug,
}: WikiRenameDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState(currentTitle);
  const [slug, setSlug] = useState(currentSlug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setSlug(currentSlug);
      setError(null);
    }
  }, [open, currentTitle, currentSlug]);

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      setError("标题和 Slug 不能为空");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWikiPage(pageId, {
        title: title.trim(),
        slug: slug.trim(),
      });
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名页面</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="rename-title"
              className="mb-1 block text-sm font-medium"
            >
              标题
            </label>
            <Input
              id="rename-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="rename-slug"
              className="mb-1 block text-sm font-medium"
            >
              Slug
            </label>
            <Input
              id="rename-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
