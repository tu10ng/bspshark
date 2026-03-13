import { notFound } from "next/navigation";
import { getExperience } from "@/lib/api";
import { ExperienceDetail } from "@/components/experiences/experience-detail";

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let experience;
  try {
    experience = await getExperience(id);
  } catch {
    notFound();
  }

  return <ExperienceDetail experience={experience} />;
}
