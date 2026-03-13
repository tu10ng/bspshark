"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

const statuses = ["全部", "active", "resolved", "transformed"];
const severities = ["全部", "low", "medium", "high", "critical"];

export function ExperienceSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebounce(query, 300);
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
        router.push(`/experiences?${params.toString()}`);
      });
    },
    [router, startTransition]
  );

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    pushParams({ q: debouncedQuery || null });
  }, [debouncedQuery, pushParams]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="搜索经验..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
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
              {s === "全部" ? "全部状态" : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("severity") ?? "全部"}
        onValueChange={(value) => pushParams({ severity: value })}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="严重度" />
        </SelectTrigger>
        <SelectContent>
          {severities.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "全部" ? "全部严重度" : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
