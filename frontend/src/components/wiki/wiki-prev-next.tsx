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
    <nav className="mt-12 flex items-stretch gap-4 border-t pt-6">
      {prev ? (
        <Link
          href={`/wiki/${prev.path}`}
          className="group flex flex-1 items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <ChevronLeftIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">上一页</div>
            <div className="truncate text-sm font-medium">{prev.title}</div>
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          href={`/wiki/${next.path}`}
          className="group flex flex-1 items-center justify-end gap-2 rounded-lg border p-4 text-right transition-colors hover:bg-muted"
        >
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">下一页</div>
            <div className="truncate text-sm font-medium">{next.title}</div>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}
