import { createWikiPage } from "@/lib/api";
import { WikiEditor } from "@/components/wiki/wiki-editor";

export default async function WikiNewPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>;
}) {
  const { parent } = await searchParams;

  async function handleSave(data: {
    title: string;
    slug: string;
    content: string;
    parent_id?: string;
  }) {
    "use server";
    await createWikiPage({
      title: data.title,
      slug: data.slug,
      content: data.content,
      parent_id: data.parent_id,
    });
  }

  return <WikiEditor mode="create" parentId={parent} onSave={handleSave} />;
}
