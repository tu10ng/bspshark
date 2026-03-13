"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateTreeNode, deleteTreeNode } from "@/lib/api";
import { NodeExperienceManager } from "./node-experience-manager";
import { InstanceManager } from "./instance-manager";
import type { Experience } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";

interface FlowNodeData {
  label: string;
  description: string | null;
  experiences: Experience[];
  [key: string]: unknown;
}

interface NodeDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  nodeData: FlowNodeData;
  treeId: string;
  onMutate: () => void;
}

export function NodeDetailSheet({
  open,
  onOpenChange,
  nodeId,
  nodeData,
  treeId,
  onMutate,
}: NodeDetailSheetProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(nodeData.label);
  const [description, setDescription] = useState(nodeData.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleStartEdit = () => {
    setTitle(nodeData.label);
    setDescription(nodeData.description ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await updateTreeNode(nodeId, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setEditing(false);
      onMutate();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTreeNode(nodeId);
      setConfirmDelete(false);
      onOpenChange(false);
      onMutate();
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setEditing(false);
    }
    onOpenChange(value);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between pr-8">
              <SheetTitle>
                {editing ? "编辑节点" : nodeData.label}
              </SheetTitle>
              {!editing && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={handleStartEdit}
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}
            </div>
            {!editing && (
              <SheetDescription>知识节点</SheetDescription>
            )}
          </SheetHeader>

          <div className="flex-1 space-y-4 px-4">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">标题</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="节点标题"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">描述</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="详细描述（可选）"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving ? "保存中..." : "保存"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditing(false)}
                    size="sm"
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {nodeData.description && (
                  <div>
                    <p className="mb-1 text-sm font-medium">描述</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {nodeData.description}
                    </p>
                  </div>
                )}
              </>
            )}

            <NodeExperienceManager
              nodeId={nodeId}
              experiences={nodeData.experiences}
              onMutate={onMutate}
            />

            <InstanceManager
              groupNodeId={nodeId}
              groupNodeTitle={nodeData.label}
              onMutate={onMutate}
            />
          </div>

          <SheetFooter>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1 size-3.5" />
              删除节点
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除节点「{nodeData.label}」吗？其子节点也会被一并删除，此操作不可撤销。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
