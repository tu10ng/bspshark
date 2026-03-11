"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeProps,
  type EdgeProps,
  BaseEdge,
  Handle,
  Position,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
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

// Layout constants — git-branch style
const STEP_H_GAP = 80;
const BRANCH_X_OFFSET = 100;
const BRANCH_OFFSET_Y = 100;
const BRANCH_V_GAP = 20;

// --- Custom branch edge (git-style bezier curve) ---

function BranchEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}: EdgeProps) {
  const path = `M ${sourceX},${sourceY} C ${sourceX},${sourceY + (targetY - sourceY) * 0.4} ${targetX - (targetX - sourceX) * 0.3},${targetY} ${targetX},${targetY}`;
  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
}

const edgeTypes: EdgeTypes = {
  "branch-edge": BranchEdge,
};

// --- Node components ---

function StepNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-blue-400 bg-blue-50 px-4 py-2 dark:bg-blue-950",
        "min-w-[200px] max-w-[260px]",
        selected && "ring-2 ring-blue-500 ring-offset-2"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-blue-400" />
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
      <Handle type="source" id="right" position={Position.Right} className="!bg-blue-400" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!bg-blue-400" />
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

// --- Git-branch style layout algorithm ---

/** Bottom-up: measure the horizontal width a subtree of step nodes needs */
function measureSubtree(
  node: TreeNodeNested,
  memo: Map<string, number>
): number {
  if (memo.has(node.id)) return memo.get(node.id)!;

  const stepChildren = node.children.filter((c) => c.node_type === "step");
  if (stepChildren.length === 0) {
    memo.set(node.id, NODE_WIDTH);
    return NODE_WIDTH;
  }

  let total = 0;
  for (const child of stepChildren) {
    total += measureSubtree(child, memo) + STEP_H_GAP;
  }
  // Remove trailing gap, add own width
  const width = NODE_WIDTH + total;
  memo.set(node.id, width);
  return width;
}

/** Top-down: assign positions to all nodes */
function buildPositions(
  siblings: TreeNodeNested[],
  memo: Map<string, number>,
  startX: number,
  trunkY: number,
  positions: Map<string, { x: number; y: number }>,
  parentPos?: { x: number; y: number }
) {
  // Separate step vs branch nodes at this level
  const steps = siblings.filter((n) => n.node_type === "step");
  const branches = siblings.filter((n) => n.node_type !== "step");

  // Place step nodes along the trunk
  let curX = startX;
  for (const step of steps) {
    positions.set(step.id, { x: curX, y: trunkY });

    // Recurse into step's children
    const childSteps = step.children.filter((c) => c.node_type === "step");
    const childBranches = step.children.filter((c) => c.node_type !== "step");

    // Place branch children below this step
    const stepPos = { x: curX, y: trunkY };
    for (let i = 0; i < childBranches.length; i++) {
      const bx = stepPos.x + BRANCH_X_OFFSET;
      const by = stepPos.y + BRANCH_OFFSET_Y + i * (NODE_HEIGHT + BRANCH_V_GAP);
      positions.set(childBranches[i].id, { x: bx, y: by });

      // If branches have their own children, recurse
      if (childBranches[i].children.length > 0) {
        buildPositions(
          childBranches[i].children,
          memo,
          bx + NODE_WIDTH + STEP_H_GAP,
          by,
          positions,
          { x: bx, y: by }
        );
      }
    }

    // Move cursor past this step's subtree width
    curX += measureSubtree(step, memo) - NODE_WIDTH + NODE_WIDTH + STEP_H_GAP;

    // Recurse into child steps
    if (childSteps.length > 0) {
      buildPositions(
        childSteps,
        memo,
        curX,
        trunkY,
        positions,
        stepPos
      );
      // Advance cursor past child steps' width
      let childWidth = 0;
      for (const cs of childSteps) {
        childWidth += measureSubtree(cs, memo) + STEP_H_GAP;
      }
      curX += childWidth;
    }
  }

  // Place branch siblings (from parent)
  if (parentPos) {
    for (let i = 0; i < branches.length; i++) {
      const bx = parentPos.x + BRANCH_X_OFFSET;
      const by = parentPos.y + BRANCH_OFFSET_Y + i * (NODE_HEIGHT + BRANCH_V_GAP);
      positions.set(branches[i].id, { x: bx, y: by });

      if (branches[i].children.length > 0) {
        buildPositions(
          branches[i].children,
          memo,
          bx + NODE_WIDTH + STEP_H_GAP,
          by,
          positions,
          { x: bx, y: by }
        );
      }
    }
  }
}

/** Recursively flatten nested nodes into React Flow nodes */
function flattenNodes(
  nestedNodes: TreeNodeNested[],
  positions: Map<string, { x: number; y: number }>
): Node<FlowNodeData>[] {
  const result: Node<FlowNodeData>[] = [];

  for (const nested of nestedNodes) {
    const pos = positions.get(nested.id) ?? { x: 0, y: 0 };
    result.push({
      id: nested.id,
      type: nested.node_type,
      position: { x: pos.x, y: pos.y },
      data: {
        label: nested.title,
        nodeType: nested.node_type,
        description: nested.description,
        pitfalls: nested.pitfalls,
      },
    });
    result.push(...flattenNodes(nested.children, positions));
  }

  return result;
}

/** Recursively build edges */
function buildEdges(
  nestedNodes: TreeNodeNested[],
  parentId?: string
): Edge[] {
  const edges: Edge[] = [];

  for (const nested of nestedNodes) {
    if (parentId) {
      const isBranch =
        nested.node_type === "pitfall_ref" || nested.node_type === "exception";

      if (isBranch) {
        edges.push({
          id: `${parentId}-${nested.id}`,
          source: parentId,
          target: nested.id,
          sourceHandle: "bottom",
          type: "branch-edge",
          animated: nested.node_type === "exception",
          style: {
            stroke: nested.node_type === "exception" ? "#f97316" : "#ef4444",
            strokeWidth: 1.5,
            strokeDasharray: "6 3",
          },
        });
      } else {
        // parent step → child step
        edges.push({
          id: `${parentId}-${nested.id}`,
          source: parentId,
          target: nested.id,
          sourceHandle: "right",
          type: "smoothstep",
          style: { stroke: "#94a3b8", strokeWidth: 1 },
        });
      }
    }

    edges.push(...buildEdges(nested.children, nested.id));
  }

  // Temporal edges between adjacent step siblings
  const stepNodes = nestedNodes.filter((n) => n.node_type === "step");
  for (let i = 0; i < stepNodes.length - 1; i++) {
    edges.push({
      id: `seq-${stepNodes[i].id}-${stepNodes[i + 1].id}`,
      source: stepNodes[i].id,
      target: stepNodes[i + 1].id,
      sourceHandle: "right",
      type: "smoothstep",
      style: { stroke: "#3b82f6", strokeWidth: 2 },
    });
  }

  return edges;
}

/** Main entry: build positioned nodes + edges from nested tree data */
function buildFlowGraph(treeNodes: TreeNodeNested[]): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const memo = new Map<string, number>();

  // Pre-measure all subtrees
  for (const root of treeNodes) {
    measureSubtree(root, memo);
  }

  const positions = new Map<string, { x: number; y: number }>();
  buildPositions(treeNodes, memo, 0, 0, positions);

  const nodes = flattenNodes(treeNodes, positions);
  const edges = buildEdges(treeNodes);

  return { nodes, edges };
}

// --- Main component ---

export function TreeFlow({
  treeNodes,
  treeId,
}: {
  treeNodes: TreeNodeNested[];
  treeId: string;
}) {
  const router = useRouter();
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => buildFlowGraph(treeNodes),
    [treeNodes]
  );

  const [nodes] = useNodesState(layoutedNodes);
  const [edges] = useEdgesState(layoutedEdges);
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
      <div className="flex h-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground text-sm">暂无节点，请添加流程步骤</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative h-full min-h-[500px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
