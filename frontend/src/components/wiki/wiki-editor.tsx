"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WikiMarkdown } from "./wiki-markdown";
import { uploadFile } from "@/lib/api";

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

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function WikiEditor({
  mode,
  initialData,
  parentId,
  onSave,
}: WikiEditorProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);

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

  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        setContent((prev) => prev + text);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        content.substring(0, start) + text + content.substring(end);
      setContent(newContent);
      // Restore cursor position after the inserted text
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      });
    },
    [content]
  );

  const replaceText = useCallback(
    (oldText: string, newText: string) => {
      setContent((prev) => prev.replace(oldText, newText));
    },
    []
  );

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setUploading((prev) => prev + files.length);

      for (const file of files) {
        const placeholder = `![Uploading ${file.name}...]()`;
        insertAtCursor(placeholder + "\n");

        try {
          const result = await uploadFile(file);
          const markdown = isImageFile(file)
            ? `![${result.filename}](${result.url})`
            : `[${result.filename}](${result.url})`;
          replaceText(placeholder, markdown);
        } catch {
          replaceText(placeholder, `<!-- Upload failed: ${file.name} -->`);
        } finally {
          setUploading((prev) => prev - 1);
        }
      }
    },
    [insertAtCursor, replaceText]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleUploadFiles(files);
      }
    },
    [handleUploadFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleUploadFiles(files);
      }
    },
    [handleUploadFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        handleUploadFiles(files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleUploadFiles]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium">
            {mode === "create" ? "新建页面" : "编辑页面"}
          </h1>
          {uploading > 0 && (
            <span className="text-sm text-muted-foreground">
              上传中 ({uploading})...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-destructive">{error}</span>}
          <Button variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading > 0}>
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
        <div
          className="flex flex-1 flex-col border-r"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            Markdown
          </div>
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              className="size-full resize-none bg-transparent p-4 font-mono text-sm outline-none"
              placeholder="输入 Markdown 内容..."
            />
            {dragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-wiki-sidebar-active-bg/50 border-2 border-dashed border-wiki-sidebar-active">
                <span className="rounded-md bg-background px-4 py-2 text-sm font-medium shadow-sm">
                  松开以上传文件
                </span>
              </div>
            )}
          </div>
          {/* Upload bar */}
          <div className="border-t px-4 py-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground/70"
            >
              <UploadIcon className="size-3.5" />
              通过拖拽、选择或粘贴来附加文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
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
