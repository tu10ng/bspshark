import { notFound } from "next/navigation";
import { getPitfall } from "@/lib/api";
import { PitfallDetail } from "@/components/pitfalls/pitfall-detail";

export default async function PitfallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let pitfall;
  try {
    pitfall = await getPitfall(id);
  } catch {
    notFound();
  }

  return <PitfallDetail pitfall={pitfall} />;
}
