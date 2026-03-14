"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importMarkdownFiles } from "@/lib/api";
import type { WikiTreeNode } from "@/lib/types";

interface WikiImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tree: WikiTreeNode[];
  onImported: () => void;
}

function flattenFolders(
  nodes: WikiTreeNode[],
  depth = 0
): { id: string; title: string; depth: number }[] {
  const result: { id: string; title: string; depth: number }[] = [];
  for (const node of nodes) {
    if (node.is_folder) {
      result.push({ id: node.id, title: node.title, depth });
      result.push(...flattenFolders(node.children, depth + 1));
    }
  }
  return result;
}

export function WikiImportDialog({
  open,
  onOpenChange,
  tree,
  onImported,
}: WikiImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [parentId, setParentId] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const folders = flattenFolders(tree);

  async function handleImport() {
    if (files.length === 0) return;
    setImporting(true);
    try {
      await importMarkdownFiles(files, parentId || undefined);
      onImported();
      onOpenChange(false);
      setFiles([]);
      setParentId("");
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setFiles([]);
          setParentId("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Markdown Files</DialogTitle>
          <DialogDescription>
            Select .md files to import as wiki pages.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown"
              multiple
              className="text-sm"
              onChange={(e) => {
                setFiles(Array.from(e.target.files || []));
              }}
            />
            {files.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {files.length} file(s) selected
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">
              Target Folder (optional)
            </label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">Root</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {"  ".repeat(f.depth)}
                  {f.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={files.length === 0 || importing}
          >
            {importing ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
