"use client";

import { useState, useEffect } from "react";
import { HistoryIcon, FileTextIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { getKnowledgeItemVersions } from "@/lib/api";
import type { KnowledgeItemVersion } from "@/lib/types";

export function KnowledgeVersionTimeline({
  knowledgeItemId,
}: {
  knowledgeItemId: string;
}) {
  const [versions, setVersions] = useState<KnowledgeItemVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<KnowledgeItemVersion | null>(null);

  useEffect(() => {
    getKnowledgeItemVersions(knowledgeItemId)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [knowledgeItemId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载版本历史...</p>;
  }

  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无版本记录</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <HistoryIcon className="size-4" />
        版本时间线
      </h3>
      <div className="relative space-y-0">
        {/* Timeline line */}
        <div className="absolute bottom-0 left-[7px] top-0 w-px bg-border" />

        {versions.map((v, i) => (
          <div key={v.id} className="relative flex gap-3 pb-4 pl-6">
            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-1.5 size-[15px] rounded-full border-2 ${
                i === 0
                  ? "border-blue-500 bg-blue-500"
                  : "border-border bg-background"
              }`}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  版本 {v.version}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString("zh-CN")}
                </span>
              </div>

              {v.source_wiki_page_title && v.source_wiki_page_id && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <span>来自</span>
                  <Link
                    href={`/wiki/edit/${v.source_wiki_page_id}`}
                    className="inline-flex items-center gap-0.5 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {v.source_wiki_page_title}
                    <ExternalLinkIcon className="size-2.5" />
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  setSelectedVersion(
                    selectedVersion?.id === v.id ? null : v
                  )
                }
                className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                <FileTextIcon className="size-3" />
                {selectedVersion?.id === v.id ? "隐藏内容" : "查看内容"}
              </button>

              {selectedVersion?.id === v.id && (
                <div className="mt-2 rounded border bg-muted/30 p-3">
                  <div className="mb-1 text-xs font-medium">{v.title}</div>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                    {v.content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
