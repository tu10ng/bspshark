import { WikiSidebar } from "@/components/wiki/wiki-sidebar";
import { getWikiTree } from "@/lib/api";
import type { WikiPageNested } from "@/lib/types";

export default async function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let tree: WikiPageNested[];
  try {
    tree = await getWikiTree();
  } catch {
    tree = [];
  }

  return (
    <div className="-m-4 flex h-[calc(100vh-var(--header-height,56px))] md:-m-6">
      {/* Secondary sidebar */}
      <div className="flex w-[280px] shrink-0 flex-col border-r bg-wiki-sidebar text-wiki-sidebar-foreground">
        <WikiSidebar tree={tree} />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">{children}</div>
    </div>
  );
}
