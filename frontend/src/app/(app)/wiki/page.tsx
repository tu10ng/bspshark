import { WikiSidebar } from "@/components/wiki/wiki-sidebar";
import { WikiContent } from "@/components/wiki/wiki-content";
import { WikiEmpty } from "@/components/wiki/wiki-empty";
import { getWikiTree, getWikiPage } from "@/lib/api";

export default async function WikiPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const tree = await getWikiTree();
  const page = params.page ? await getWikiPage(params.page).catch(() => null) : null;

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] md:-m-6">
      <div className="w-64 shrink-0 border-r">
        <WikiSidebar tree={tree} />
      </div>
      <div className="flex-1 overflow-hidden">
        {page ? <WikiContent key={page.id} page={page} /> : <WikiEmpty />}
      </div>
    </div>
  );
}
