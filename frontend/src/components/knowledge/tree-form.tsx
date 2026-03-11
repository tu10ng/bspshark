"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createKnowledgeTree, updateKnowledgeTree } from "@/lib/api";
import { Plus } from "lucide-react";
import type { KnowledgeTree } from "@/lib/types";

interface TreeFormBaseProps {
  mode: "create" | "edit";
  initialData?: KnowledgeTree;
  onSuccess?: () => void;
}

interface TreeFormUncontrolledProps extends TreeFormBaseProps {
  trigger?: React.ReactElement;
  open?: never;
  onOpenChange?: never;
}

interface TreeFormControlledProps extends TreeFormBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: never;
}

type TreeFormProps = TreeFormUncontrolledProps | TreeFormControlledProps;

export function TreeForm({
  mode,
  initialData,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: TreeFormProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [module, setModule] = useState(initialData?.module ?? "");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const handleOpen = (value: boolean) => {
    if (value && initialData) {
      setName(initialData.name);
      setDescription(initialData.description ?? "");
      setModule(initialData.module ?? "");
    }
    setOpen(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (mode === "create") {
        await createKnowledgeTree({
          name: name.trim(),
          description: description.trim() || undefined,
          module: module.trim() || undefined,
        });
      } else if (initialData) {
        await updateKnowledgeTree(initialData.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          module: module.trim() || undefined,
        });
      }
      setOpen(false);
      if (mode === "create") {
        setName("");
        setDescription("");
        setModule("");
      }
      onSuccess?.();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button size="sm">
      <Plus className="mr-1 size-4" />
      新建知识树
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      {!isControlled && (
        <DialogTrigger render={trigger ?? defaultTrigger} />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "新建知识树" : "编辑知识树"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="知识树名称"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">描述</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="知识树描述（可选）"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">模块</label>
            <Input
              value={module}
              onChange={(e) => setModule(e.target.value)}
              placeholder="业务模块标识（可选）"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? mode === "create"
                ? "创建中..."
                : "保存中..."
              : mode === "create"
                ? "创建"
                : "保存"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
