"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  Handle,
  Position,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import type { TreeNodeNested, Pitfall } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, GitBranch } from "lucide-react";
import { NodeDetailSheet } from "./node-detail-sheet";

// Custom node data type
interface FlowNodeData {
  label: string;
  nodeType: "step" | "pitfall_ref" | "exception";
  description: string | null;
  pitfalls: Pitfall[];
  [key: string]: unknown;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 60;

function StepNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-blue-400 bg-blue-50 px-4 py-2 dark:bg-blue-950",
        "min-w-[200px] max-w-[260px]",
        selected && "ring-2 ring-blue-500 ring-offset-2"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />
      <div className="flex items-center gap-2">
        <GitBranch className="size-4 shrink-0 text-blue-500" />
        <span className="line-clamp-2 text-sm font-medium">{data.label}</span>
      </div>
      {data.pitfalls.length > 0 && (
        <div className="mt-1 flex gap-1">
          <Badge variant="secondary" className="text-[10px]">
            {data.pitfalls.length} 个坑
          </Badge>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
    </div>
  );
}

function ExceptionNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-orange-400 bg-orange-50 px-4 py-2 dark:bg-orange-950",
        "min-w-[200px] max-w-[260px]",
        selected && "ring-2 ring-orange-500 ring-offset-2"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-orange-400" />
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0 text-orange-500" />
        <span className="line-clamp-2 text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-400" />
    </div>
  );
}

function PitfallRefNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-red-400 bg-red-50 px-4 py-2 dark:bg-red-950",
        "min-w-[200px] max-w-[260px]",
        selected && "ring-2 ring-red-500 ring-offset-2"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-red-400" />
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0 text-red-500" />
        <span className="line-clamp-2 text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-red-400" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  step: StepNode,
  exception: ExceptionNode,
  pitfall_ref: PitfallRefNode,
};

function flattenToNodesAndEdges(
  nestedNodes: TreeNodeNested[],
  parentId?: string
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const nodes: Node<FlowNodeData>[] = [];
  const edges: Edge[] = [];

  for (const nested of nestedNodes) {
    nodes.push({
      id: nested.id,
      type: nested.node_type,
      position: { x: 0, y: 0 }, // dagre will set this
      data: {
        label: nested.title,
        nodeType: nested.node_type,
        description: nested.description,
        pitfalls: nested.pitfalls,
      },
    });

    if (parentId) {
      const isBranch = nested.node_type === "pitfall_ref" || nested.node_type === "exception";
      edges.push({
        id: `${parentId}-${nested.id}`,
        source: parentId,
        target: nested.id,
        animated: nested.node_type === "exception",
        style: isBranch
          ? {
              stroke: nested.node_type === "exception" ? "#f97316" : "#ef4444",
              strokeWidth: 1.5,
              strokeDasharray: "6 3",
            }
          : { stroke: "#94a3b8", strokeWidth: 1 },
        data: { weight: isBranch ? 1 : 5 },
      });
    }

    const children = flattenToNodesAndEdges(nested.children, nested.id);
    nodes.push(...children.nodes);
    edges.push(...children.edges);
  }

  // Add temporal edges between adjacent step siblings
  const stepNodes = nestedNodes.filter((n) => n.node_type === "step");
  for (let i = 0; i < stepNodes.length - 1; i++) {
    edges.push({
      id: `seq-${stepNodes[i].id}-${stepNodes[i + 1].id}`,
      source: stepNodes[i].id,
      target: stepNodes[i + 1].id,
      style: { stroke: "#3b82f6", strokeWidth: 2 },
      data: { weight: 10 },
    });
  }

  return { nodes, edges };
}

function applyDagreLayout(
  nodes: Node<FlowNodeData>[],
  edges: Edge[]
): Node<FlowNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    const weight = (edge.data as { weight?: number } | undefined)?.weight ?? 1;
    g.setEdge(edge.source, edge.target, { weight });
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export function TreeFlow({
  treeNodes,
  treeId,
}: {
  treeNodes: TreeNodeNested[];
  treeId: string;
}) {
  const router = useRouter();
  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => flattenToNodesAndEdges(treeNodes),
    [treeNodes]
  );

  const layoutedNodes = useMemo(
    () => applyDagreLayout(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  const [nodes] = useNodesState(layoutedNodes);
  const [edges] = useEdgesState(rawEdges);
  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(null);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<FlowNodeData>) => {
      setSelectedNode(node);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleMutate = useCallback(() => {
    router.refresh();
  }, [router]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border">
        <p className="text-muted-foreground text-sm">暂无节点，请添加流程步骤</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative h-[calc(100vh-12rem)] min-h-[500px] rounded-lg border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodesDraggable={false}
          nodesConnectable={false}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {selectedNode && (
        <NodeDetailSheet
          open={!!selectedNode}
          onOpenChange={(open) => {
            if (!open) setSelectedNode(null);
          }}
          nodeId={selectedNode.id}
          nodeData={selectedNode.data}
          treeId={treeId}
          onMutate={handleMutate}
        />
      )}
    </>
  );
}
