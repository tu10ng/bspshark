import { Suspense } from "react";
import { ExperienceSearch } from "@/components/experiences/experience-search";
import { ExperienceList, ExperienceListSkeleton } from "@/components/experiences/experience-list";
import { getExperiences } from "@/lib/api";

export default async function ExperiencesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; severity?: string }>;
}) {
  const params = await searchParams;
  const experiences = await getExperiences({
    q: params.q,
    status: params.status,
    severity: params.severity,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">经验</h1>
        <p className="text-muted-foreground">团队积累的经验和已知问题</p>
      </div>

      <Suspense>
        <ExperienceSearch />
      </Suspense>

      <Suspense fallback={<ExperienceListSkeleton />}>
        <ExperienceList experiences={experiences} />
      </Suspense>
    </div>
  );
}
