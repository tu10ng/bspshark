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

const categories = ["全部", "Python", "Java", "Bash", "DevOps", "其他"];

export function ArticleSearch() {
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
        router.push(`/wiki?${params.toString()}`);
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
          placeholder="搜索文章..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={searchParams.get("category") ?? "全部"}
        onValueChange={(value) => pushParams({ category: value })}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="分类" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
