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

interface TreeSearchProps {
  modules: string[];
}

export function TreeSearch({ modules }: TreeSearchProps) {
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
      // Clear tree selection when changing filters
      params.delete("tree");
      startTransition(() => {
        router.push(`/knowledge?${params.toString()}`);
      });
    },
    [router, startTransition]
  );

  if (modules.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Select
        value={searchParams.get("module") ?? "全部"}
        onValueChange={(value) => pushParams({ module: value })}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="业务模块" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="全部">全部模块</SelectItem>
          {modules.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
