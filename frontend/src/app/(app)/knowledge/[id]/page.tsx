import { notFound } from "next/navigation";
import Link from "next/link";
import { getKnowledgeTree, getTreeNodes } from "@/lib/api";
import { TreeFlow } from "@/components/knowledge/tree-flow";
import { NodeForm } from "@/components/knowledge/node-form";
import { Badge } from "@/components/ui/badge";

export default async function KnowledgeTreeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let tree;
  let treeNodes;
  try {
    [tree, treeNodes] = await Promise.all([
      getKnowledgeTree(id),
      getTreeNodes(id),
    ]);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/knowledge"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              知识树
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-2xl font-bold tracking-tight">{tree.name}</h1>
          </div>
          {tree.description && (
            <p className="text-muted-foreground mt-1">{tree.description}</p>
          )}
          {tree.module && (
            <Badge variant="secondary" className="mt-2">
              {tree.module}
            </Badge>
          )}
        </div>
        <NodeForm treeId={id} parentNodes={treeNodes} />
      </div>

      <TreeFlow treeNodes={treeNodes} />
    </div>
  );
}
