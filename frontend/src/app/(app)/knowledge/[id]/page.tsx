import { redirect } from "next/navigation";

export default async function KnowledgeTreeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/knowledge?tree=${id}`);
}
