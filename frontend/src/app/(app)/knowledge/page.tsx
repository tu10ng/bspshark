import { TreeListPanel } from "@/components/knowledge/tree-list-panel";
import { TreeDetailHeader } from "@/components/knowledge/tree-detail-header";
import { TreeFlow } from "@/components/knowledge/tree-flow";
import { NodeForm } from "@/components/knowledge/node-form";
import {
  getKnowledgeTrees,
  getKnowledgeTree,
  getTreeNodes,
} from "@/lib/api";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; tree?: string }>;
}) {
  const params = await searchParams;
  const trees = await getKnowledgeTrees({
    module: params.module,
  });

  const modules = [
    ...new Set(trees.map((t) => t.module).filter(Boolean)),
  ] as string[];

  const selectedTreeId = params.tree;
  let selectedTree = null;
  let treeNodes = null;

  if (selectedTreeId) {
    try {
      [selectedTree, treeNodes] = await Promise.all([
        getKnowledgeTree(selectedTreeId),
        getTreeNodes(selectedTreeId),
      ]);
    } catch {
      // Tree not found or deleted — fall through to empty state
    }
  }

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] md:-m-6">
      <div className="w-72 shrink-0 border-r">
        <TreeListPanel
          trees={trees}
          modules={modules}
          selectedTreeId={selectedTreeId}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedTree && treeNodes ? (
          <>
            <div className="flex items-start justify-between border-b px-6 py-4">
              <TreeDetailHeader tree={selectedTree} treeId={selectedTreeId!} />
              <NodeForm treeId={selectedTreeId!} parentNodes={treeNodes} />
            </div>
            <div className="flex-1">
              <TreeFlow treeNodes={treeNodes} treeId={selectedTreeId!} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              {trees.length > 0
                ? "选择左侧知识树查看流程图"
                : "创建一棵知识树开始使用"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
