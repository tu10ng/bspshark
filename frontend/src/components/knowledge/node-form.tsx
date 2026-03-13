"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTreeNode } from "@/lib/api";
import { Plus } from "lucide-react";
import type { TreeNodeNested } from "@/lib/types";

interface NodeFormProps {
  treeId: string;
  parentNodes: TreeNodeNested[];
}

function flattenNodes(nodes: TreeNodeNested[], depth = 0): { id: string; title: string; depth: number }[] {
  const result: { id: string; title: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, title: node.title, depth });
    result.push(...flattenNodes(node.children, depth + 1));
  }
  return result;
}

export function NodeForm({ treeId, parentNodes }: NodeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const flatNodes = flattenNodes(parentNodes);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await createTreeNode({
        tree_id: treeId,
        parent_id: parentId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      setParentId("");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1 size-4" />
        添加节点
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加节点</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="节点标题"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">描述</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="详细描述（可选）"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">父节点</label>
            <Select value={parentId} onValueChange={(v) => setParentId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="根节点（无父节点）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">根节点</SelectItem>
                {flatNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {"  ".repeat(node.depth)}{node.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "创建中..." : "创建"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
