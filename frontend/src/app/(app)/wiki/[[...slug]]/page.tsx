import { notFound } from "next/navigation";
import { getWikiTree, getWikiPageByPath } from "@/lib/api";
import { WikiLanding } from "@/components/wiki/wiki-landing";
import { WikiPageContent } from "@/components/wiki/wiki-page-content";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const tree = await getWikiTree();

  // No slug → landing page
  if (!slug || slug.length === 0) {
    return <WikiLanding tree={tree} />;
  }

  // Resolve path
  const path = slug.join("/");
  try {
    const page = await getWikiPageByPath(path);
    return <WikiPageContent page={page} tree={tree} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.toLowerCase().includes("not found")) {
      notFound();
    }
    throw e;
  }
}
