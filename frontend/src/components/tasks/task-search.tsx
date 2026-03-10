"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statuses = ["全部", "pending", "in_progress", "completed", "cancelled"];

const statusLabels: Record<string, string> = {
  "全部": "全部状态",
  pending: "待处理",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

export function TaskSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "全部") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      startTransition(() => {
        router.push(`/tasks?${params.toString()}`);
      });
    },
    [router, startTransition]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Select
        value={searchParams.get("status") ?? "全部"}
        onValueChange={(value) => pushParams({ status: value })}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="状态" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {statusLabels[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
