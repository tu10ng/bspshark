"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WikiEditor } from "./wiki-editor";
import { updateWikiPage } from "@/lib/api";
import type { WikiPage } from "@/lib/types";

interface WikiContentProps {
  page: WikiPage;
}

export function WikiContent({ page }: WikiContentProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const contentRef = useRef(page.content);

  const handleChange = useCallback((markdown: string) => {
    contentRef.current = markdown;
  }, []);

  async function handleSave() {
    await updateWikiPage(page.id, { content: contentRef.current });
    setEditing(false);
    router.refresh();
  }

  const updatedDate = new Date(page.updated_at).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{page.title}</h1>
          <p className="text-xs text-muted-foreground">
            Updated {updatedDate}
          </p>
        </div>
        {editing ? (
          <Button size="sm" onClick={handleSave}>
            <Check className="size-3.5" data-icon="inline-start" />
            Done
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" data-icon="inline-start" />
            Edit
          </Button>
        )}
      </div>
      <WikiEditor
        content={page.content}
        editable={editing}
        onChange={handleChange}
      />
    </div>
  );
}
