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
  type NodeProps,
  BaseEdge,
  Handle,
  Position,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type EdgeProps,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  TreeNodeNested,
  Experience,
  KnowledgeInstance,
} from "@/lib/types";
import { getInstances } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  Layers,
  GitBranch,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { NodeDetailSheet } from "./node-detail-sheet";

// ─── Data types ────────────────────────────────────────────────────

interface FlowNodeData {
  label: string;
  description: string | null;
  experiences: Experience[];
  /** for collapsed nodes */
  childCount?: number;
  /** is this node expandable (has children) */
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
  /** depth level for visual distinction */
  depth?: number;
  /** experience data for experience nodes */
  experience?: Experience;
  /** parent knowledge node ID for experience nodes */
  parentKnowledgeNodeId?: string;
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

const EXP_NODE_WIDTH = 240;
const EXP_NODE_HEIGHT = 44;
const EXP_V_GAP = 20;
const EXP_TOP_GAP = 32;

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

/** Unified knowledge node — all nodes are "knowledge" */
function KnowledgeNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const depth = (data.depth ?? 0);
  // Deeper nodes use lighter shades
  const isChild = depth > 0;

  return (
    <div
      className={cn(
        "rounded-xl border-2 px-5 py-3",
        "min-w-[260px] max-w-[320px]",
        isChild
          ? "border-blue-300 bg-blue-50/70 dark:border-blue-700 dark:bg-blue-950/50"
          : "border-blue-400 bg-blue-50 dark:bg-blue-950",
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
        {(data.childCount ?? 0) > 0 && (
          <Badge variant="secondary" className="text-xs">
            {data.childCount} 个子节点
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
      <Handle type="source" id="bottom" position={Position.Bottom} className="!bg-amber-400" />
    </div>
  );
}

/** Severity left-border colors */
const severityBorderColors: Record<string, string> = {
  low: "border-l-green-500",
  medium: "border-l-yellow-500",
  high: "border-l-orange-500",
  critical: "border-l-red-500",
};

/** Status background colors */
const statusBgColors: Record<string, string> = {
  active: "bg-amber-50 dark:bg-amber-950/40",
  resolved: "bg-green-50 dark:bg-green-950/40",
  transformed: "bg-slate-50 dark:bg-slate-900/60",
};

/** Severity badge colors */
const severityBadgeColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

/** Compact experience (坑) node */
function ExperienceNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const exp = data.experience;
  if (!exp) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-l-4 px-3 py-2",
        "cursor-pointer shadow-sm transition-shadow hover:shadow-md",
        "min-w-[220px] max-w-[260px]",
        severityBorderColors[exp.severity] ?? "border-l-slate-400",
        statusBgColors[exp.status] ?? "bg-slate-50 dark:bg-slate-900",
      )}
      style={{ width: EXP_NODE_WIDTH, height: EXP_NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-400" />
      {exp.status === "resolved" ? (
        <CheckCircle className="size-3.5 shrink-0 text-green-500" />
      ) : (
        <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
      )}
      <span className="line-clamp-1 flex-1 text-xs font-medium leading-tight">
        {exp.title}
      </span>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
          severityBadgeColors[exp.severity] ?? "bg-slate-100 text-slate-700",
        )}
      >
        {exp.severity}
      </span>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400" />
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
  knowledge: KnowledgeNode,
  collapsed: CollapsedNode,
  group_border: GroupBorderNode,
  lane_label: LaneLabelNode,
  experience: ExperienceNode,
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
 * Top-level siblings form the main trunk (by sort_order).
 * Expanded nodes are replaced by their children.
 */
function flattenVisible(
  nodes: TreeNodeNested[],
  expandedNodes: Set<string>,
  depth: number = 0,
  parentGroupId?: string
): VisibleItem[] {
  const result: VisibleItem[] = [];

  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id) && hasChildren;

    if (isExpanded) {
      // Replace this node with its children in the horizontal flow
      const childItems = flattenVisible(
        node.children,
        expandedNodes,
        depth + 1,
        node.id
      );
      result.push(...childItems);
    } else {
      // Render as a single item (collapsed if it has children)
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
 * Check if a node is visible in a given instance.
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
 * Append experience (坑) nodes vertically below a parent knowledge node.
 * Returns the total height of the experience chain (0 if no experiences).
 */
function appendExperienceNodes(
  parentFlowNodeId: string,
  parentX: number,
  parentY: number,
  experiences: Experience[],
  flowNodes: Node<FlowNodeData>[],
  flowEdges: Edge[],
): number {
  if (experiences.length === 0) return 0;

  const expX = parentX + (NODE_WIDTH - EXP_NODE_WIDTH) / 2;
  let prevId = parentFlowNodeId;
  let prevSourceHandle: string | undefined = "bottom";

  for (let i = 0; i < experiences.length; i++) {
    const exp = experiences[i];
    const expY =
      parentY +
      NODE_HEIGHT +
      EXP_TOP_GAP +
      i * (EXP_NODE_HEIGHT + EXP_V_GAP);
    const expNodeId = `exp-${parentFlowNodeId}-${exp.id}`;

    flowNodes.push({
      id: expNodeId,
      type: "experience",
      position: { x: expX, y: expY },
      data: {
        label: exp.title,
        description: exp.description,
        experiences: [],
        experience: exp,
        parentKnowledgeNodeId: parentFlowNodeId,
      },
      style: { width: EXP_NODE_WIDTH, height: EXP_NODE_HEIGHT },
      draggable: false,
    });

    flowEdges.push({
      id: `exp-edge-${prevId}-${expNodeId}`,
      source: prevId,
      sourceHandle: prevSourceHandle,
      target: expNodeId,
      type: "smoothstep",
      style: {
        stroke: "#f59e0b",
        strokeDasharray: "4 3",
        strokeWidth: 1.5,
      },
    });

    prevId = expNodeId;
    prevSourceHandle = undefined; // subsequent edges use default source handle
  }

  return (
    EXP_TOP_GAP +
    experiences.length * EXP_NODE_HEIGHT +
    (experiences.length - 1) * EXP_V_GAP
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
  interface Chunk {
    type: "single" | "swimlane";
    items: VisibleItem[];
    parentGroupId?: string;
    instances?: KnowledgeInstance[];
    parentNode?: TreeNodeNested;
  }

  const chunks: Chunk[] = [];
  let i = 0;
  while (i < visibleItems.length) {
    const item = visibleItems[i];
    const parentId = item.parentGroupId;

    if (parentId && instancesMap.has(parentId)) {
      const instances = instancesMap.get(parentId)!;
      if (instances.length > 0) {
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
  let prevRightNodeIds: string[] = [];
  // Track max experience chain height per single-chunk group for group border sizing
  const singleNodeExpHeights = new Map<string, number>();

  for (const chunk of chunks) {
    if (chunk.type === "single") {
      const item = chunk.items[0];
      const pos = { x: curX, y: trunkY };

      const hasChildren = item.node.children.length > 0;
      const isCollapsed = hasChildren && !expandedNodes.has(item.node.id);

      flowNodes.push({
        id: item.node.id,
        type: isCollapsed ? "collapsed" : "knowledge",
        position: pos,
        data: {
          label: item.node.title,
          description: item.node.description,
          experiences: item.node.experiences,
          expandable: hasChildren,
          expanded: expandedNodes.has(item.node.id) && hasChildren,
          originalId: item.node.id,
          childCount: item.node.children.length,
          parentGroupId: item.parentGroupId,
          depth: item.depth,
        },
      });

      // Append experience nodes below this knowledge node
      const expHeight = appendExperienceNodes(
        item.node.id,
        curX,
        trunkY,
        item.node.experiences,
        flowNodes,
        flowEdges,
      );
      if (expHeight > 0 && item.parentGroupId) {
        const prev = singleNodeExpHeights.get(item.parentGroupId) ?? 0;
        singleNodeExpHeights.set(item.parentGroupId, Math.max(prev, expHeight));
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
      // Progressive Y: track each lane's height (node + experience chain)
      const laneHeights: number[] = [];
      let cumulativeLaneY = trunkY;

      for (let laneIdx = 0; laneIdx < instances.length; laneIdx++) {
        const instance = instances[laneIdx];
        const laneY = cumulativeLaneY;

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
            description: null,
            experiences: [],
            laneLabel: instance.name,
            parentGroupId,
          },
          style: { width: LANE_LABEL_WIDTH, height: NODE_HEIGHT },
          selectable: false,
          draggable: false,
        });

        let laneX = laneStartX;
        let prevLaneNodeId: string | null = null;
        let maxExpHeightInLane = 0;

        for (const laneNode of laneNodes) {
          const hasChildren = laneNode.children.length > 0;
          const isCollapsed =
            hasChildren && !expandedNodes.has(laneNode.id);

          const laneNodeId = `${laneNode.id}__lane-${instance.id}`;

          flowNodes.push({
            id: laneNodeId,
            type: isCollapsed ? "collapsed" : "knowledge",
            position: { x: laneX, y: laneY },
            data: {
              label: laneNode.title,
              description: laneNode.description,
              experiences: laneNode.experiences,
              expandable: hasChildren,
              expanded: expandedNodes.has(laneNode.id) && hasChildren,
              originalId: laneNode.id,
              childCount: laneNode.children.length,
              parentGroupId,
              depth: 1,
            },
          });

          // Append experience nodes below this lane node
          const expHeight = appendExperienceNodes(
            laneNodeId,
            laneX,
            laneY,
            laneNode.experiences,
            flowNodes,
            flowEdges,
          );
          maxExpHeightInLane = Math.max(maxExpHeightInLane, expHeight);

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

        const laneHeight = NODE_HEIGHT + maxExpHeightInLane;
        laneHeights.push(laneHeight);
        cumulativeLaneY += laneHeight + LANE_GAP_Y;

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

      // Group border for swimlane (use cumulative lane heights)
      const totalLaneHeight = cumulativeLaneY - trunkY - LANE_GAP_Y;
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
          description: null,
          experiences: [],
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

      // Append parent node's experiences below the swimlane group border
      if (parentNode && parentNode.experiences.length > 0) {
        const expParentX = groupX + (groupWidth - NODE_WIDTH) / 2;
        const expParentY = groupY + groupHeight - NODE_HEIGHT;
        appendExperienceNodes(
          `group-${parentGroupId}`,
          expParentX,
          expParentY,
          parentNode.experiences,
          flowNodes,
          flowEdges,
        );
      }

      prevRightNodeIds = laneLastNodeIds;
      curX += LANE_LABEL_WIDTH + H_GAP + maxLaneWidth + H_GAP;
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

    const firstNode = flowNodes.find((n) => n.id === groupItems[0].node.id);
    const lastNode = flowNodes.find(
      (n) => n.id === groupItems[groupItems.length - 1].node.id
    );
    if (!firstNode || !lastNode) continue;

    const groupX = firstNode.position.x - GROUP_PADDING;
    const groupY =
      firstNode.position.y - GROUP_HEADER_HEIGHT - GROUP_PADDING;
    const groupWidth =
      lastNode.position.x +
      NODE_WIDTH -
      firstNode.position.x +
      GROUP_PADDING * 2;
    const maxExpHeight = singleNodeExpHeights.get(groupId) ?? 0;
    const groupHeight =
      NODE_HEIGHT +
      maxExpHeight +
      GROUP_HEADER_HEIGHT +
      GROUP_PADDING * 2;

    const groupNode = findNodeById(treeNodes, groupId);
    const groupLabel = groupNode?.title ?? "展开区域";

    flowNodes.push({
      id: `group-${groupId}`,
      type: "group_border",
      position: { x: groupX, y: groupY },
      data: {
        label: groupLabel,
        description: null,
        experiences: [],
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

    // Append parent node's experiences below the group border
    if (groupNode && groupNode.experiences.length > 0) {
      const expParentX = groupX + (groupWidth - NODE_WIDTH) / 2;
      const expParentY = groupY + groupHeight - NODE_HEIGHT;
      appendExperienceNodes(
        `group-${groupId}`,
        expParentX,
        expParentY,
        groupNode.experiences,
        flowNodes,
        flowEdges,
      );
    }
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

/** Check if a node has children (is expandable) */
function hasChildren(
  treeNodes: TreeNodeNested[],
  nodeId: string
): boolean {
  const node = findNodeById(treeNodes, nodeId);
  if (!node) return false;
  return node.children.length > 0;
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

      // Experience nodes → navigate to experience detail
      if (node.type === "experience") {
        const exp = node.data.experience as Experience | undefined;
        if (exp) router.push(`/experiences/${exp.id}`);
        return;
      }

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
      const expandable = hasChildren(treeNodes, originalId);

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
          暂无节点，请添加知识节点
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
    if (expandedSet.has(child.id)) {
      collapseDescendants(treeNodes, child.id, expandedSet);
      expandedSet.delete(child.id);
    }
  }
}
