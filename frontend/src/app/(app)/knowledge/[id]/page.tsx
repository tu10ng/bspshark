import { notFound } from "next/navigation";
import { getKnowledgeTree, getTreeNodes } from "@/lib/api";
import { TreeFlow } from "@/components/knowledge/tree-flow";
import { NodeForm } from "@/components/knowledge/node-form";
import { TreeDetailHeader } from "@/components/knowledge/tree-detail-header";

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
        <TreeDetailHeader tree={tree} treeId={id} />
        <NodeForm treeId={id} parentNodes={treeNodes} />
      </div>

      <TreeFlow treeNodes={treeNodes} treeId={id} />
    </div>
  );
}
