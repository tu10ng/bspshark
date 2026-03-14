import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WikiBreadcrumbs } from "./wiki-breadcrumbs";
import { WikiMarkdown } from "./wiki-markdown";
import { WikiPrevNext } from "./wiki-prev-next";
import type { WikiPageWithPath, WikiPageNested } from "@/lib/types";

export function WikiPageContent({
  page,
  tree,
}: {
  page: WikiPageWithPath;
  tree: WikiPageNested[];
}) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <WikiBreadcrumbs breadcrumbs={page.breadcrumbs} />
          <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/wiki/edit/${page.id}`} />}
          nativeButton={false}
        >
          <PencilIcon className="mr-1.5 size-3.5" />
          编辑
        </Button>
      </div>
      <WikiMarkdown content={page.content} />
      <WikiPrevNext tree={tree} currentPageId={page.id} />
    </div>
  );
}
