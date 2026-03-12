"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getInstances,
  createInstance,
  updateInstance,
  deleteInstance,
} from "@/lib/api";
import type { KnowledgeInstance } from "@/lib/types";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";

interface InstanceManagerProps {
  groupNodeId: string;
  groupNodeTitle: string;
  onMutate: () => void;
}

export function InstanceManager({
  groupNodeId,
  groupNodeTitle,
  onMutate,
}: InstanceManagerProps) {
  const [instances, setInstances] = useState<KnowledgeInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstance, setEditingInstance] =
    useState<KnowledgeInstance | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInstances(groupNodeId);
      setInstances(data);
    } finally {
      setLoading(false);
    }
  }, [groupNodeId]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const handleCreate = () => {
    setEditingInstance(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const handleEdit = (instance: KnowledgeInstance) => {
    setEditingInstance(instance);
    setName(instance.name);
    setDescription(instance.description ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingInstance) {
        await updateInstance(editingInstance.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
      } else {
        await createInstance({
          group_node_id: groupNodeId,
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }
      setDialogOpen(false);
      fetchInstances();
      onMutate();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteInstance(id);
      fetchInstances();
      onMutate();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-blue-500" />
          <span className="text-sm font-medium">
            实例（{groupNodeTitle}）
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={handleCreate}>
          <Plus className="mr-1 size-3.5" />
          添加实例
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">加载中...</p>
      ) : instances.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          暂无实例，所有子知识共享同一流程
        </p>
      ) : (
        <div className="space-y-2">
          {instances.map((inst) => (
            <div
              key={inst.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium">{inst.name}</span>
                {inst.description && (
                  <p className="text-muted-foreground text-xs">
                    {inst.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleEdit(inst)}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleDelete(inst.id)}
                  disabled={deletingId === inst.id}
                >
                  <Trash2 className="size-3 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstance ? "编辑实例" : "创建实例"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">名称</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：Ubuntu、Arch"
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述（可选）</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="实例描述"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
