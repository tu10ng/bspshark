import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { WikiPageNested } from "@/lib/types";

interface FlatPage {
  id: string;
  title: string;
  path: string;
}

/** Depth-first flatten of the wiki tree to compute prev/next. */
function flattenTree(
  nodes: WikiPageNested[],
  parentPath: string = ""
): FlatPage[] {
  const result: FlatPage[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.slug}` : node.slug;
    result.push({ id: node.id, title: node.title, path });
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, path));
    }
  }
  return result;
}

export function WikiPrevNext({
  tree,
  currentPageId,
}: {
  tree: WikiPageNested[];
  currentPageId: string;
}) {
  const flat = flattenTree(tree);
  const currentIndex = flat.findIndex((p) => p.id === currentPageId);
  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? flat[currentIndex - 1] : null;
  const next = currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null;

  if (!prev && !next) return null;

  return (
    <nav className="mt-12 flex items-center justify-between gap-4">
      {prev ? (
        <Link
          href={`/wiki/${prev.path}`}
          className="inline-flex items-center gap-1.5 rounded-sm border border-black/10 bg-[#f3f6f6] px-3 py-1.5 text-sm text-foreground shadow-[inset_0_1px_2px_-1px_hsla(0,0%,100%,.5)] transition-colors hover:bg-[#e5ebeb] dark:border-white/10 dark:bg-[#2d2d2d] dark:hover:bg-[#3a3a3a]"
        >
          <ChevronLeftIcon className="size-3.5" />
          Previous
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/wiki/${next.path}`}
          className="inline-flex items-center gap-1.5 rounded-sm border border-black/10 bg-[#f3f6f6] px-3 py-1.5 text-sm text-foreground shadow-[inset_0_1px_2px_-1px_hsla(0,0%,100%,.5)] transition-colors hover:bg-[#e5ebeb] dark:border-white/10 dark:bg-[#2d2d2d] dark:hover:bg-[#3a3a3a]"
        >
          Next
          <ChevronRightIcon className="size-3.5" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
