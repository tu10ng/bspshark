import Link from "next/link";
import { PencilIcon, BookOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WikiBreadcrumbs } from "./wiki-breadcrumbs";
import { WikiMarkdown } from "./wiki-markdown";
import { WikiPrevNext } from "./wiki-prev-next";
import { WikiExperienceInline } from "./wiki-experience-inline";
import { WikiVersionHistory } from "./wiki-version-history";
import type { WikiPageWithPath, WikiPageNested } from "@/lib/types";

function SectionsRenderer({ page }: { page: WikiPageWithPath }) {
  if (!page.sections || page.sections.length === 0) {
    return <WikiMarkdown content={page.content} />;
  }

  return (
    <div className="space-y-0">
      {page.sections.map((section) => {
        switch (section.section_type) {
          case "knowledge":
            if (!section.knowledge_item) return null;
            return (
              <div key={section.id} className="border-l-2 border-blue-200 pl-4 dark:border-blue-800">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookOpenIcon className="size-3" />
                  <span>知识</span>
                </div>
                <WikiMarkdown
                  content={`## ${section.knowledge_item.title}\n\n${section.knowledge_item.content}`}
                />
              </div>
            );
          case "experience":
            if (!section.experience) return null;
            return (
              <WikiExperienceInline
                key={section.id}
                experience={section.experience}
              />
            );
          case "freeform":
            if (!section.freeform_content) return null;
            return (
              <WikiMarkdown
                key={section.id}
                content={section.freeform_content}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export function WikiPageContent({
  page,
  tree,
}: {
  page: WikiPageWithPath;
  tree: WikiPageNested[];
}) {
  const hasSections = page.sections && page.sections.length > 0;

  return (
    <div className="mx-auto max-w-[800px]">
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
      {hasSections ? (
        <SectionsRenderer page={page} />
      ) : (
        <WikiMarkdown content={page.content} />
      )}
      <div className="mt-8">
        <WikiVersionHistory pageId={page.id} />
      </div>
      <WikiPrevNext tree={tree} currentPageId={page.id} />
    </div>
  );
}
