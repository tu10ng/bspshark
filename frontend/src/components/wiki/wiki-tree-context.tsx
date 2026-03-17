"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { WikiPageNested } from "@/lib/types";

type TreeUpdater = (tree: WikiPageNested[]) => WikiPageNested[];

interface WikiTreeContextValue {
  tree: WikiPageNested[];
  /** Apply an optimistic update and return a rollback function */
  applyReorder: (updater: TreeUpdater) => () => void;
}

const WikiTreeContext = createContext<WikiTreeContextValue | null>(null);

export function WikiTreeProvider({
  serverTree,
  children,
}: {
  serverTree: WikiPageNested[];
  children: React.ReactNode;
}) {
  const [tree, setTree] = useState(serverTree);
  const treeRef = useRef(tree);
  treeRef.current = tree;

  // Sync when server prop changes (e.g. after rename/delete triggers router.refresh())
  useEffect(() => {
    setTree(serverTree);
  }, [serverTree]);

  const applyReorder = useCallback((updater: TreeUpdater) => {
    const snapshot = treeRef.current;
    setTree((prev) => updater(prev));
    // Return rollback function
    return () => setTree(snapshot);
  }, []);

  return (
    <WikiTreeContext.Provider value={{ tree, applyReorder }}>
      {children}
    </WikiTreeContext.Provider>
  );
}

export function useWikiTree() {
  const ctx = useContext(WikiTreeContext);
  if (!ctx) {
    throw new Error("useWikiTree must be used within a WikiTreeProvider");
  }
  return ctx;
}
