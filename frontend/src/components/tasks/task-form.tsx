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
import { createTask } from "@/lib/api";
import { Plus } from "lucide-react";

export function TaskForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [assignedBy, setAssignedBy] = useState("");
  const [modules, setModules] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [experienceMsg, setExperienceMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const modulesArr = modules
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      const result = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        assignee: assignee.trim() || undefined,
        assigned_by: assignedBy.trim() || undefined,
        modules: modulesArr.length > 0 ? modulesArr : undefined,
        due_date: dueDate || undefined,
      });

      setTitle("");
      setDescription("");
      setAssignee("");
      setAssignedBy("");
      setModules("");
      setDueDate("");
      setOpen(false);
      router.refresh();

      if (result.auto_identified_experiences?.length > 0) {
        setExperienceMsg(
          `已自动识别 ${result.auto_identified_experiences.length} 个相关的经验`
        );
        setTimeout(() => setExperienceMsg(""), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button size="sm" />}>
          <Plus className="mr-1 size-4" />
          新建任务
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建任务</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="任务标题"
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
              <label className="text-sm font-medium">执行人</label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="执行人（可选）"
              />
            </div>
            <div>
              <label className="text-sm font-medium">指派人</label>
              <Input
                value={assignedBy}
                onChange={(e) => setAssignedBy(e.target.value)}
                placeholder="指派人（可选）"
              />
            </div>
            <div>
              <label className="text-sm font-medium">模块</label>
              <Input
                value={modules}
                onChange={(e) => setModules(e.target.value)}
                placeholder="逗号分隔，如：登录,支付,订单"
              />
            </div>
            <div>
              <label className="text-sm font-medium">截止日期</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "创建中..." : "创建"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {experienceMsg && (
        <span className="text-sm text-amber-600 dark:text-amber-400">
          {experienceMsg}
        </span>
      )}
    </>
  );
}
