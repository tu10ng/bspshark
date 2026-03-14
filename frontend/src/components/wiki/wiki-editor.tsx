"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WikiMarkdown } from "./wiki-markdown";

interface WikiEditorProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    slug: string;
    content: string;
  };
  parentId?: string;
  onSave: (data: {
    title: string;
    slug: string;
    content: string;
    parent_id?: string;
  }) => Promise<void>;
}

export function WikiEditor({
  mode,
  initialData,
  parentId,
  onSave,
}: WikiEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      setError("标题和 Slug 不能为空");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        slug: slug.trim(),
        content,
        parent_id: parentId,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const autoSlug = (value: string) => {
    setTitle(value);
    if (mode === "create" && !initialData) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-medium">
          {mode === "create" ? "新建页面" : "编辑页面"}
        </h1>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-destructive">{error}</span>}
          <Button variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* Meta fields */}
      <div className="flex items-end gap-4 border-b px-4 py-3">
        <div className="flex-1">
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            标题
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => autoSlug(e.target.value)}
            placeholder="页面标题"
          />
        </div>
        <div className="w-48">
          <label htmlFor="slug" className="mb-1 block text-sm font-medium">
            Slug
          </label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-slug"
          />
        </div>
      </div>

      {/* Split editor */}
      <div className="flex min-h-0 flex-1">
        <div className="flex flex-1 flex-col border-r">
          <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            Markdown
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 resize-none bg-transparent p-4 font-mono text-sm outline-none"
            placeholder="输入 Markdown 内容..."
          />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            预览
          </div>
          <div className="flex-1 overflow-auto p-4">
            <WikiMarkdown content={content} />
          </div>
        </div>
      </div>
    </div>
  );
}
