import { Suspense } from "react";
import { TreeSearch } from "@/components/knowledge/tree-search";
import { TreeList, TreeListSkeleton } from "@/components/knowledge/tree-list";
import { TreeForm } from "@/components/knowledge/tree-form";
import { getKnowledgeTrees } from "@/lib/api";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const params = await searchParams;
  const trees = await getKnowledgeTrees({
    module: params.module,
  });

  const modules = [
    ...new Set(trees.map((t) => t.module).filter(Boolean)),
  ] as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">知识树</h1>
          <p className="text-muted-foreground">业务流程知识库</p>
        </div>
        <TreeForm mode="create" />
      </div>

      <Suspense>
        <TreeSearch modules={modules} />
      </Suspense>

      <Suspense fallback={<TreeListSkeleton />}>
        <TreeList trees={trees} />
      </Suspense>
    </div>
  );
}
