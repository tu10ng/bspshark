import Link from "next/link";
import { FileTextIcon } from "lucide-react";
import type { WikiPageNested } from "@/lib/types";

export function WikiLanding({ tree }: { tree: WikiPageNested[] }) {
  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileTextIcon className="mb-4 size-12 text-muted-foreground" />
        <h2 className="text-lg font-medium">Wiki 暂无内容</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          点击右上角新建按钮创建第一个页面
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px]">
      <h1 className="text-2xl font-bold tracking-tight">Wiki</h1>
      <p className="mt-1 text-muted-foreground">文档与知识库</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {tree.map((page) => (
          <Link
            key={page.id}
            href={`/wiki/${page.slug}`}
            className="group rounded-lg border p-4 transition-colors hover:bg-muted"
          >
            <h3 className="font-medium group-hover:text-primary">
              {page.title}
            </h3>
            {page.children.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {page.children.length} 个子页面
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
