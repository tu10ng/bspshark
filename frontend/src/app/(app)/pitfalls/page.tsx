import { Suspense } from "react";
import { PitfallSearch } from "@/components/pitfalls/pitfall-search";
import { PitfallList, PitfallListSkeleton } from "@/components/pitfalls/pitfall-list";
import { getPitfalls } from "@/lib/api";

export default async function PitfallsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; severity?: string }>;
}) {
  const params = await searchParams;
  const pitfalls = await getPitfalls({
    q: params.q,
    status: params.status,
    severity: params.severity,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">坑</h1>
        <p className="text-muted-foreground">团队踩过的坑和已知问题</p>
      </div>

      <Suspense>
        <PitfallSearch />
      </Suspense>

      <Suspense fallback={<PitfallListSkeleton />}>
        <PitfallList pitfalls={pitfalls} />
      </Suspense>
    </div>
  );
}
