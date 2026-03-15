import { notFound } from "next/navigation";
import { getWikiPageById, updateWikiPage } from "@/lib/api";
import { WikiEditor } from "@/components/wiki/wiki-editor";

export default async function WikiEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let page;
  try {
    page = await getWikiPageById(id);
  } catch {
    notFound();
  }

  async function handleSave(data: {
    title: string;
    slug: string;
    content: string;
    sections_enabled?: boolean;
  }) {
    "use server";
    await updateWikiPage(id, data);
  }

  return (
    <WikiEditor
      mode="edit"
      initialData={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        sections_enabled: page.sections_enabled,
      }}
      parentId={page.parent_id ?? undefined}
      onSave={handleSave}
    />
  );
}
