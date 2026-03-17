import type { WikiPageNested } from "@/lib/types";

/**
 * Deep-clone a tree node (shallow clone each level's array + spread node).
 * Only clones along the path that changes — other branches keep references.
 */
function cloneTree(tree: WikiPageNested[]): WikiPageNested[] {
  return tree.map((n) => ({ ...n, children: cloneTree(n.children) }));
}

/** Remove a node by id from the tree, returning the removed node (or undefined). */
function removeNode(
  tree: WikiPageNested[],
  id: string
): { tree: WikiPageNested[]; removed: WikiPageNested | undefined } {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      const removed = tree[i];
      tree.splice(i, 1);
      return { tree, removed };
    }
    const result = removeNode(tree[i].children, id);
    if (result.removed) return { tree, removed: result.removed };
  }
  return { tree, removed: undefined };
}

/** Find the children array of a parent (null = root). */
function findChildren(
  tree: WikiPageNested[],
  parentId: string | null
): WikiPageNested[] | undefined {
  if (parentId === null) return tree;
  for (const node of tree) {
    if (node.id === parentId) return node.children;
    const found = findChildren(node.children, parentId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Apply a drag-and-drop reorder to the tree.
 * `items` is the array of { id, parent_id, sort_order } that was sent to the API.
 * `draggedId` is the node being moved. `newParentId` is its destination parent.
 */
export function applyReorderToTree(
  tree: WikiPageNested[],
  items: { id: string; parent_id: string | null; sort_order: number }[],
  draggedId: string,
  newParentId: string | null
): WikiPageNested[] {
  const cloned = cloneTree(tree);

  // 1. Remove the dragged node from its old location
  const { removed } = removeNode(cloned, draggedId);
  if (!removed) return cloned;

  // Update parent_id on the removed node
  removed.parent_id = newParentId;

  // 2. Find the target children array
  const targetChildren = findChildren(cloned, newParentId);
  if (!targetChildren) return cloned;

  // 3. Insert the node and sort by the items order
  targetChildren.push(removed);

  // Build a sort_order map from items
  const orderMap = new Map<string, number>();
  for (const item of items) {
    orderMap.set(item.id, item.sort_order);
  }

  // Sort target children by the new order
  targetChildren.sort((a, b) => {
    const oa = orderMap.get(a.id) ?? a.sort_order;
    const ob = orderMap.get(b.id) ?? b.sort_order;
    return oa - ob;
  });

  // Update sort_order values on the nodes
  for (let i = 0; i < targetChildren.length; i++) {
    targetChildren[i].sort_order = orderMap.get(targetChildren[i].id) ?? i;
  }

  return cloned;
}

/**
 * Apply a swap (move up/down) in the tree.
 * Swaps the sort_order of two sibling nodes under the same parent.
 */
export function applySwapInTree(
  tree: WikiPageNested[],
  parentId: string | null,
  idA: string,
  sortOrderA: number,
  idB: string,
  sortOrderB: number
): WikiPageNested[] {
  const cloned = cloneTree(tree);

  const siblings = findChildren(cloned, parentId);
  if (!siblings) return cloned;

  for (const node of siblings) {
    if (node.id === idA) node.sort_order = sortOrderB;
    else if (node.id === idB) node.sort_order = sortOrderA;
  }

  siblings.sort((a, b) => a.sort_order - b.sort_order);

  return cloned;
}
