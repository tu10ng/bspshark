import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WikiNav } from "@/components/wiki/wiki-nav";
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
      <div className="flex w-[250px] shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Wiki</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            render={<Link href="/wiki/new" />}
            nativeButton={false}
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          <WikiNav tree={tree} />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
