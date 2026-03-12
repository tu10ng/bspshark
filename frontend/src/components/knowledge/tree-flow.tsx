"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
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
import type {
  TreeNodeNested,
  Pitfall,
  KnowledgeInstance,
} from "@/lib/types";
import { getInstances } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Layers,
  GitBranch,
} from "lucide-react";
import { NodeDetailSheet } from "./node-detail-sheet";

// ─── Data types ────────────────────────────────────────────────────

interface FlowNodeData {
  label: string;
  nodeType: "step" | "pitfall_ref" | "exception";
  description: string | null;
  pitfalls: Pitfall[];
  /** for collapsed nodes */
  childStepCount?: number;
  childBranchCount?: number;
  /** is this node expandable (has step children) */
  expandable?: boolean;
  /** is this node currently expanded */
  expanded?: boolean;
  /** original TreeNodeNested id for toggle */
  originalId?: string;
  /** group border label */
  groupLabel?: string;
  /** lane label for swimlane view */
  laneLabel?: string;
  /** ID of the expanded parent that produced this node */
  parentGroupId?: string;
  [key: string]: unknown;
}

// ─── Layout constants ──────────────────────────────────────────────

const NODE_WIDTH = 280;
const NODE_HEIGHT = 96;
const H_GAP = 80;
const BRANCH_OFFSET_Y = 140;
const BRANCH_V_GAP = 28;
const GROUP_PADDING = 40;
const GROUP_HEADER_HEIGHT = 44;
const LANE_GAP_Y = 56;
const LANE_LABEL_WIDTH = 120;

// ─── Custom edge ───────────────────────────────────────────────────

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

// ─── Node components ───────────────────────────────────────────────

function StepNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-blue-400 bg-blue-50 px-5 py-3 dark:bg-blue-950",
        "min-w-[260px] max-w-[320px]",
        selected && "ring-2 ring-blue-500 ring-offset-2"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-400"
      />
      <div className="flex items-center gap-2.5">
        <GitBranch className="size-5 shrink-0 text-blue-500" />
        <span className="line-clamp-2 text-[15px] font-medium leading-snug">{data.label}</span>
        {data.expandable && (
          <span className="ml-auto text-blue-400">
            {data.expanded ? (
              <ChevronDown className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )}
          </span>
        )}
      </div>
      {data.pitfalls.length > 0 && (
        <div className="mt-1.5 flex gap-1">
          <Badge variant="secondary" className="text-xs">
            {data.pitfalls.length} 个坑
          </Badge>
        </div>
      )}
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!bg-blue-400"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!bg-blue-400"
      />
    </div>
  );
}

/** Collapsed knowledge node — dashed border, shows stats */
function CollapsedNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed border-slate-400 bg-slate-50 px-5 py-3 dark:bg-slate-900",
        "min-w-[260px] max-w-[320px] cursor-pointer",
        selected && "ring-2 ring-slate-500 ring-offset-2"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-slate-400"
      />
      <div className="flex items-center gap-2.5">
        <Layers className="size-5 shrink-0 text-slate-500" />
        <span className="line-clamp-2 text-[15px] font-medium leading-snug">{data.label}</span>
        <ChevronRight className="ml-auto size-5 text-slate-400" />
      </div>
      <div className="mt-1.5 flex gap-1">
        {(data.childStepCount ?? 0) > 0 && (
          <Badge variant="secondary" className="text-xs">
            {data.childStepCount} 个子知识
          </Badge>
        )}
        {(data.childBranchCount ?? 0) > 0 && (
          <Badge variant="secondary" className="text-xs">
            {data.childBranchCount} 个坑/异常
          </Badge>
        )}
      </div>
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!bg-slate-400"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!bg-slate-400"
      />
    </div>
  );
}

function ExceptionNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-orange-400 bg-orange-50 px-5 py-3 dark:bg-orange-950",
        "min-w-[260px] max-w-[320px]",
        selected && "ring-2 ring-orange-500 ring-offset-2"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-orange-400"
      />
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="size-5 shrink-0 text-orange-500" />
        <span className="line-clamp-2 text-[15px] font-medium leading-snug">{data.label}</span>
      </div>
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!bg-orange-400"
      />
    </div>
  );
}

function PitfallRefNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-red-400 bg-red-50 px-5 py-3 dark:bg-red-950",
        "min-w-[260px] max-w-[320px]",
        selected && "ring-2 ring-red-500 ring-offset-2"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-red-400" />
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="size-5 shrink-0 text-red-500" />
        <span className="line-clamp-2 text-[15px] font-medium leading-snug">{data.label}</span>
      </div>
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!bg-red-400"
      />
    </div>
  );
}

/** Background group border for expanded nodes — click header to collapse */
function GroupBorderNode({ data }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div className="h-full w-full rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20">
      <div className="flex h-10 cursor-pointer items-center gap-2.5 rounded-t-xl border-b border-dashed border-blue-200 bg-blue-50/50 px-4 hover:bg-blue-100/60 dark:border-blue-800 dark:bg-blue-950/40 dark:hover:bg-blue-900/40">
        <ChevronDown className="size-4 text-blue-400" />
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {data.groupLabel}
        </span>
        <span className="ml-auto text-xs text-blue-400">点击收起</span>
      </div>
    </div>
  );
}

/** Lane label for swimlane view */
function LaneLabelNode({ data }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-purple-200 bg-purple-50 px-2 dark:border-purple-800 dark:bg-purple-950">
      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
        {data.laneLabel}
      </span>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  step: StepNode,
  collapsed: CollapsedNode,
  exception: ExceptionNode,
  pitfall_ref: PitfallRefNode,
  group_border: GroupBorderNode,
  lane_label: LaneLabelNode,
};

// ─── Visible item model ────────────────────────────────────────────

interface VisibleItem {
  node: TreeNodeNested;
  depth: number;
  /** ID of the expanded parent that produced this item */
  parentGroupId?: string;
  isExpanded: boolean;
}

// ─── Layout algorithm: buildExpandableFlow ─────────────────────────

/**
 * Phase 1: Flatten the tree into a visible horizontal sequence.
 * Expanded step nodes are replaced by their step children.
 * Collapsed step nodes with step children appear as a single collapsed item.
 */
function flattenVisible(
  nodes: TreeNodeNested[],
  expandedNodes: Set<string>,
  depth: number = 0,
  parentGroupId?: string
): VisibleItem[] {
  const result: VisibleItem[] = [];
  // Only flatten step siblings along the horizontal axis
  const steps = nodes.filter((n) => n.node_type === "step");

  for (const node of steps) {
    const stepChildren = node.children.filter((c) => c.node_type === "step");
    const isExpanded = expandedNodes.has(node.id) && stepChildren.length > 0;

    if (isExpanded) {
      // Replace this node with its step children in the horizontal flow
      const childItems = flattenVisible(
        node.children,
        expandedNodes,
        depth + 1,
        node.id
      );
      result.push(...childItems);
    } else {
      // Render as a single item (collapsed if it has step children)
      result.push({
        node,
        depth,
        parentGroupId,
        isExpanded: false,
      });
    }
  }

  return result;
}

/**
 * Collect all branch (pitfall_ref/exception) children for a node,
 * including branches from expanded ancestors that map to this visible item.
 */
function getBranches(node: TreeNodeNested): TreeNodeNested[] {
  return node.children.filter(
    (c) => c.node_type === "pitfall_ref" || c.node_type === "exception"
  );
}

/**
 * Count the downward branch depth (how many branch nodes hang below a visible item).
 */
function branchDepth(node: TreeNodeNested): number {
  const branches = getBranches(node);
  if (branches.length === 0) return 0;
  return branches.length; // each branch occupies one vertical slot
}

/**
 * Check if a node is visible in a given instance.
 * A node is visible if: it has no instance_ids (shared) OR its instance_ids include the target instance.
 */
function isNodeVisibleInInstance(
  node: TreeNodeNested,
  instanceId: string
): boolean {
  return (
    node.instance_ids.length === 0 ||
    node.instance_ids.includes(instanceId)
  );
}

/**
 * Main layout builder. Supports swimlanes when expanded nodes have instances.
 */
function buildExpandableFlow(
  treeNodes: TreeNodeNested[],
  expandedNodes: Set<string>,
  instancesMap: Map<string, KnowledgeInstance[]>
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const visibleItems = flattenVisible(treeNodes, expandedNodes);

  if (visibleItems.length === 0) {
    return { nodes: [], edges: [] };
  }

  const flowNodes: Node<FlowNodeData>[] = [];
  const flowEdges: Edge[] = [];
  const trunkY = 200;

  // ── Segment the visible items into "chunks" ──
  // A chunk is either a single non-swimlane item, or a swimlane group
  // (all items from the same expanded parent that has instances).
  interface Chunk {
    type: "single" | "swimlane";
    items: VisibleItem[];
    parentGroupId?: string;
    instances?: KnowledgeInstance[];
    // node from which this swimlane was expanded
    parentNode?: TreeNodeNested;
  }

  const chunks: Chunk[] = [];
  let i = 0;
  while (i < visibleItems.length) {
    const item = visibleItems[i];
    const parentId = item.parentGroupId;

    // Check if this is part of a swimlane group
    if (parentId && instancesMap.has(parentId)) {
      const instances = instancesMap.get(parentId)!;
      if (instances.length > 0) {
        // Collect all items from the same parent group
        const groupItems: VisibleItem[] = [];
        while (
          i < visibleItems.length &&
          visibleItems[i].parentGroupId === parentId
        ) {
          groupItems.push(visibleItems[i]);
          i++;
        }
        const parentNode = findNodeById(treeNodes, parentId);
        chunks.push({
          type: "swimlane",
          items: groupItems,
          parentGroupId: parentId,
          instances,
          parentNode: parentNode ?? undefined,
        });
        continue;
      }
    }

    chunks.push({ type: "single", items: [item] });
    i++;
  }

  // ── Layout chunks left to right ──
  let curX = 0;
  // Track the last node IDs on the right edge of each chunk for connecting to the next chunk
  let prevRightNodeIds: string[] = [];
  // Track max lane height offset for y-positioning of branches
  let maxLaneOffset = 0;

  for (const chunk of chunks) {
    if (chunk.type === "single") {
      const item = chunk.items[0];
      const pos = { x: curX, y: trunkY };

      const stepChildren = item.node.children.filter(
        (c) => c.node_type === "step"
      );
      const hasStepKids = stepChildren.length > 0;
      const branchChildren = getBranches(item.node);
      const isCollapsed = hasStepKids && !expandedNodes.has(item.node.id);

      flowNodes.push({
        id: item.node.id,
        type: isCollapsed ? "collapsed" : item.node.node_type,
        position: pos,
        data: {
          label: item.node.title,
          nodeType: item.node.node_type,
          description: item.node.description,
          pitfalls: item.node.pitfalls,
          expandable: hasStepKids,
          expanded: expandedNodes.has(item.node.id) && hasStepKids,
          originalId: item.node.id,
          childStepCount: stepChildren.length,
          childBranchCount: branchChildren.length,
          parentGroupId: item.parentGroupId,
        },
      });

      // Branch nodes below
      let branchY = pos.y + BRANCH_OFFSET_Y;
      for (const branch of branchChildren) {
        flowNodes.push({
          id: branch.id,
          type: branch.node_type,
          position: { x: pos.x, y: branchY },
          data: {
            label: branch.title,
            nodeType: branch.node_type,
            description: branch.description,
            pitfalls: branch.pitfalls,
            parentGroupId: item.parentGroupId,
          },
        });
        flowEdges.push({
          id: `branch-${item.node.id}-${branch.id}`,
          source: item.node.id,
          target: branch.id,
          sourceHandle: "bottom",
          type: "branch-edge",
          animated: branch.node_type === "exception",
          style: {
            stroke: branch.node_type === "exception" ? "#f97316" : "#ef4444",
            strokeWidth: 2,
            strokeDasharray: "6 3",
          },
        });
        branchY += NODE_HEIGHT + BRANCH_V_GAP;
      }

      // Connect from previous chunk
      for (const prevId of prevRightNodeIds) {
        flowEdges.push({
          id: `seq-${prevId}-${item.node.id}`,
          source: prevId,
          target: item.node.id,
          sourceHandle: "right",
          type: "smoothstep",
          style: { stroke: "#3b82f6", strokeWidth: 2.5 },
        });
      }

      // Group border if this item belongs to an expanded parent (non-swimlane)
      if (item.parentGroupId && !instancesMap.has(item.parentGroupId)) {
        // Will be handled in the group border phase below
      }

      prevRightNodeIds = [item.node.id];
      curX += NODE_WIDTH + H_GAP;
    } else {
      // ── Swimlane chunk ──
      const { instances, items, parentGroupId, parentNode } = chunk;
      if (!instances || !parentGroupId) continue;

      const laneStartX = curX + LANE_LABEL_WIDTH + H_GAP;
      let maxLaneWidth = 0;
      const laneFirstNodeIds: string[] = [];
      const laneLastNodeIds: string[] = [];

      for (let laneIdx = 0; laneIdx < instances.length; laneIdx++) {
        const instance = instances[laneIdx];
        const laneY = trunkY + laneIdx * (NODE_HEIGHT + LANE_GAP_Y);

        // Filter step children visible in this instance
        const laneNodes = items
          .map((item) => item.node)
          .filter((node) => isNodeVisibleInInstance(node, instance.id));

        // Lane label
        flowNodes.push({
          id: `lane-label-${parentGroupId}-${instance.id}`,
          type: "lane_label",
          position: { x: curX, y: laneY },
          data: {
            label: instance.name,
            nodeType: "step",
            description: null,
            pitfalls: [],
            laneLabel: instance.name,
            parentGroupId,
          },
          style: { width: LANE_LABEL_WIDTH, height: NODE_HEIGHT },
          selectable: false,
          draggable: false,
        });

        // Place lane nodes horizontally
        let laneX = laneStartX;
        let prevLaneNodeId: string | null = null;

        for (const laneNode of laneNodes) {
          const stepChildren = laneNode.children.filter(
            (c) => c.node_type === "step"
          );
          const hasStepKids = stepChildren.length > 0;
          const branchChildren = getBranches(laneNode);
          const isCollapsed =
            hasStepKids && !expandedNodes.has(laneNode.id);

          // Use a lane-specific ID to avoid conflicts if same node appears in multiple lanes
          const laneNodeId = `${laneNode.id}__lane-${instance.id}`;

          flowNodes.push({
            id: laneNodeId,
            type: isCollapsed ? "collapsed" : laneNode.node_type,
            position: { x: laneX, y: laneY },
            data: {
              label: laneNode.title,
              nodeType: laneNode.node_type,
              description: laneNode.description,
              pitfalls: laneNode.pitfalls,
              expandable: hasStepKids,
              expanded: expandedNodes.has(laneNode.id) && hasStepKids,
              originalId: laneNode.id,
              childStepCount: stepChildren.length,
              childBranchCount: branchChildren.length,
              parentGroupId,
            },
          });

          // Branch nodes below lane node
          let branchY = laneY + BRANCH_OFFSET_Y;
          for (const branch of branchChildren) {
            const laneBranchId = `${branch.id}__lane-${instance.id}`;
            flowNodes.push({
              id: laneBranchId,
              type: branch.node_type,
              position: { x: laneX, y: branchY },
              data: {
                label: branch.title,
                nodeType: branch.node_type,
                description: branch.description,
                pitfalls: branch.pitfalls,
                parentGroupId,
              },
            });
            flowEdges.push({
              id: `branch-${laneNodeId}-${laneBranchId}`,
              source: laneNodeId,
              target: laneBranchId,
              sourceHandle: "bottom",
              type: "branch-edge",
              animated: branch.node_type === "exception",
              style: {
                stroke:
                  branch.node_type === "exception" ? "#f97316" : "#ef4444",
                strokeWidth: 2,
                strokeDasharray: "6 3",
              },
            });
            branchY += NODE_HEIGHT + BRANCH_V_GAP;
          }

          // Horizontal edge within lane
          if (prevLaneNodeId) {
            flowEdges.push({
              id: `seq-${prevLaneNodeId}-${laneNodeId}`,
              source: prevLaneNodeId,
              target: laneNodeId,
              sourceHandle: "right",
              type: "smoothstep",
              style: { stroke: "#3b82f6", strokeWidth: 2.5 },
            });
          }

          if (!prevLaneNodeId) {
            laneFirstNodeIds.push(laneNodeId);
          }
          prevLaneNodeId = laneNodeId;

          laneX += NODE_WIDTH + H_GAP;
        }

        if (prevLaneNodeId) {
          laneLastNodeIds.push(prevLaneNodeId);
        }

        maxLaneWidth = Math.max(maxLaneWidth, laneX - laneStartX);
      }

      // Connect from previous chunk to all lane first nodes
      for (const prevId of prevRightNodeIds) {
        for (const firstId of laneFirstNodeIds) {
          flowEdges.push({
            id: `seq-${prevId}-${firstId}`,
            source: prevId,
            target: firstId,
            sourceHandle: "right",
            type: "smoothstep",
            style: { stroke: "#3b82f6", strokeWidth: 2.5 },
          });
        }
      }

      // Group border for swimlane
      const totalLaneHeight =
        instances.length * (NODE_HEIGHT + LANE_GAP_Y) - LANE_GAP_Y;
      const groupX = curX - GROUP_PADDING;
      const groupY = trunkY - GROUP_HEADER_HEIGHT - GROUP_PADDING;
      const groupWidth =
        LANE_LABEL_WIDTH + H_GAP + maxLaneWidth + GROUP_PADDING * 2;
      const groupHeight =
        totalLaneHeight + GROUP_HEADER_HEIGHT + GROUP_PADDING * 2;
      const groupLabel = parentNode?.title ?? "泳道区域";

      flowNodes.push({
        id: `group-${parentGroupId}`,
        type: "group_border",
        position: { x: groupX, y: groupY },
        data: {
          label: groupLabel,
          nodeType: "step",
          description: null,
          pitfalls: [],
          groupLabel,
          originalId: parentGroupId,
          parentGroupId,
        },
        style: {
          width: groupWidth,
          height: groupHeight,
          zIndex: -1,
        },
        draggable: false,
      });

      prevRightNodeIds = laneLastNodeIds;
      curX += LANE_LABEL_WIDTH + H_GAP + maxLaneWidth + H_GAP;
      maxLaneOffset = Math.max(
        maxLaneOffset,
        (instances.length - 1) * (NODE_HEIGHT + LANE_GAP_Y)
      );
    }
  }

  // ── Group borders for non-swimlane expanded nodes ──
  const expandedParentIds = new Set<string>();
  for (const item of visibleItems) {
    if (item.parentGroupId && !instancesMap.has(item.parentGroupId)) {
      expandedParentIds.add(item.parentGroupId);
    }
  }

  for (const groupId of expandedParentIds) {
    const groupItems = visibleItems.filter(
      (item) => item.parentGroupId === groupId
    );
    if (groupItems.length === 0) continue;

    // Find positions of first and last items in this group
    // We need to find them in the flow nodes
    const firstNode = flowNodes.find((n) => n.id === groupItems[0].node.id);
    const lastNode = flowNodes.find(
      (n) => n.id === groupItems[groupItems.length - 1].node.id
    );
    if (!firstNode || !lastNode) continue;

    let maxBranchCount = 0;
    for (const item of groupItems) {
      maxBranchCount = Math.max(maxBranchCount, branchDepth(item.node));
    }

    const groupX = firstNode.position.x - GROUP_PADDING;
    const groupY =
      firstNode.position.y - GROUP_HEADER_HEIGHT - GROUP_PADDING;
    const groupWidth =
      lastNode.position.x +
      NODE_WIDTH -
      firstNode.position.x +
      GROUP_PADDING * 2;
    const groupHeight =
      NODE_HEIGHT +
      GROUP_HEADER_HEIGHT +
      GROUP_PADDING * 2 +
      (maxBranchCount > 0
        ? BRANCH_OFFSET_Y -
          NODE_HEIGHT +
          maxBranchCount * (NODE_HEIGHT + BRANCH_V_GAP)
        : 0);

    const groupNode = findNodeById(treeNodes, groupId);
    const groupLabel = groupNode?.title ?? "展开区域";

    flowNodes.push({
      id: `group-${groupId}`,
      type: "group_border",
      position: { x: groupX, y: groupY },
      data: {
        label: groupLabel,
        nodeType: "step",
        description: null,
        pitfalls: [],
        groupLabel,
        originalId: groupId,
        parentGroupId: groupId,
      },
      style: {
        width: groupWidth,
        height: groupHeight,
        zIndex: -1,
      },
      draggable: false,
    });
  }

  return { nodes: flowNodes, edges: flowEdges };
}

/** Find a node by ID in a nested tree */
function findNodeById(
  nodes: TreeNodeNested[],
  id: string
): TreeNodeNested | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return undefined;
}

/** Check if a node has step children (is expandable) */
function hasStepChildren(
  treeNodes: TreeNodeNested[],
  nodeId: string
): boolean {
  const node = findNodeById(treeNodes, nodeId);
  if (!node) return false;
  return node.children.some((c) => c.node_type === "step");
}

// ─── Main component (Provider wrapper) ──────────────────────────────

export function TreeFlow({
  treeNodes,
  treeId,
}: {
  treeNodes: TreeNodeNested[];
  treeId: string;
}) {
  return (
    <ReactFlowProvider>
      <TreeFlowInner treeNodes={treeNodes} treeId={treeId} />
    </ReactFlowProvider>
  );
}

// ─── Inner component (uses useReactFlow) ────────────────────────────

function TreeFlowInner({
  treeNodes,
  treeId,
}: {
  treeNodes: TreeNodeNested[];
  treeId: string;
}) {
  const router = useRouter();
  const { fitView, setNodes, setEdges } = useReactFlow();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set()
  );
  const [instancesMap, setInstancesMap] = useState<
    Map<string, KnowledgeInstance[]>
  >(() => new Map());

  // Track the last expanded/collapsed action for targeted fitView
  const lastExpandedRef = useRef<string | null>(null);
  const lastCollapsedRef = useRef<string | null>(null);

  // Fetch instances for expanded nodes that have them
  useEffect(() => {
    const fetchInstancesForExpanded = async () => {
      const newMap = new Map(instancesMap);
      let changed = false;

      for (const nodeId of expandedNodes) {
        if (!newMap.has(nodeId)) {
          try {
            const instances = await getInstances(nodeId);
            if (instances.length > 0) {
              newMap.set(nodeId, instances);
              changed = true;
            }
          } catch {
            // Node might not have instances, ignore
          }
        }
      }

      if (changed) {
        setInstancesMap(newMap);
      }
    };

    fetchInstancesForExpanded();
  }, [expandedNodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => buildExpandableFlow(treeNodes, expandedNodes, instancesMap),
    [treeNodes, expandedNodes, instancesMap]
  );

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);
  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(
    null
  );

  // Sync layout when expandedNodes or treeNodes change
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // After nodes update, perform targeted fitView
  useEffect(() => {
    if (nodes.length === 0) return;

    // Small delay to let React Flow measure the new nodes
    const timer = setTimeout(() => {
      const expandedId = lastExpandedRef.current;
      const collapsedId = lastCollapsedRef.current;

      if (expandedId) {
        lastExpandedRef.current = null;
      } else if (collapsedId) {
        lastCollapsedRef.current = null;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [nodes, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<FlowNodeData>) => {
      // Lane labels are not clickable
      if (node.type === "lane_label") return;

      // Click group border → collapse the expanded node
      if (node.type === "group_border") {
        const groupNodeId = node.data.originalId as string;
        if (groupNodeId) {
          lastCollapsedRef.current = groupNodeId;
          setExpandedNodes((prev) => {
            const next = new Set(prev);
            collapseDescendants(treeNodes, groupNodeId, next);
            next.delete(groupNodeId);
            return next;
          });
        }
        return;
      }

      // Extract original node ID (strip lane suffix if present)
      const originalId = (node.data.originalId as string) ?? node.id;
      const expandable = hasStepChildren(treeNodes, originalId);

      if (expandable) {
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          if (next.has(originalId)) {
            lastCollapsedRef.current = originalId;
            collapseDescendants(treeNodes, originalId, next);
            next.delete(originalId);
          } else {
            lastExpandedRef.current = originalId;
            next.add(originalId);
          }
          return next;
        });
      } else {
        // For swimlane nodes, create a virtual node with the original ID for the detail sheet
        const detailNode =
          node.id !== originalId
            ? { ...node, id: originalId }
            : node;
        setSelectedNode(detailNode);
      }
    },
    [treeNodes]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleMutate = useCallback(() => {
    router.refresh();
  }, [router]);

  if (layoutedNodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground text-sm">
          暂无节点，请添加流程步骤
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="relative h-full min-h-[500px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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

/** When collapsing a node, also collapse all its expanded descendants */
function collapseDescendants(
  treeNodes: TreeNodeNested[],
  nodeId: string,
  expandedSet: Set<string>
) {
  const node = findNodeById(treeNodes, nodeId);
  if (!node) return;

  for (const child of node.children) {
    if (child.node_type === "step" && expandedSet.has(child.id)) {
      collapseDescendants(treeNodes, child.id, expandedSet);
      expandedSet.delete(child.id);
    }
  }
}
