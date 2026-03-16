import { Suspense } from "react";
import {
  KnowledgeItemsSearch,
  KnowledgeItemsList,
  KnowledgeItemsListSkeleton,
} from "@/components/knowledge/knowledge-items-list";
import { getKnowledgeItems } from "@/lib/api";

export default async function KnowledgeItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const items = await getKnowledgeItems({
    q: params.q,
    tag: params.tag,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">知识</h1>
        <p className="text-muted-foreground">
          通过 Wiki 自动识别的原子知识单元
        </p>
      </div>

      <Suspense>
        <KnowledgeItemsSearch />
      </Suspense>

      <Suspense fallback={<KnowledgeItemsListSkeleton />}>
        <KnowledgeItemsList items={items} />
      </Suspense>
    </div>
  );
}
