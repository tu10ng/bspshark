"use client";

import { useState, useEffect } from "react";
import { HistoryIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWikiPageVersions } from "@/lib/api";
import type { WikiPageVersion } from "@/lib/types";

export function WikiVersionHistory({ pageId }: { pageId: string }) {
  const [versions, setVersions] = useState<WikiPageVersion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<WikiPageVersion | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getWikiPageVersions(pageId)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [pageId, open]);

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <HistoryIcon className="mr-1.5 size-3.5" />
        修订历史
      </Button>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <HistoryIcon className="size-4" />
          修订历史
        </h3>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setSelectedVersion(null); }}>
          关闭
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无修订记录</p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedVersion(v)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                selectedVersion?.id === v.id ? "bg-muted" : ""
              }`}
            >
              <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">版本 {v.version}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString("zh-CN")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedVersion && (
        <div className="mt-4 rounded border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            版本 {selectedVersion.version} 内容
          </div>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs">
            {selectedVersion.content}
          </pre>
        </div>
      )}
    </div>
  );
}
