"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getPitfalls,
  linkNodePitfall,
  unlinkNodePitfall,
} from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import type { Pitfall } from "@/lib/types";
import { X, Plus, AlertTriangle, CheckCircle, Search } from "lucide-react";

interface NodePitfallManagerProps {
  nodeId: string;
  pitfalls: Pitfall[];
  onMutate: () => void;
}

export function NodePitfallManager({
  nodeId,
  pitfalls,
  onMutate,
}: NodePitfallManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Pitfall[]>([]);
  const [searching, setSearching] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!dialogOpen) return;

    async function fetchPitfalls() {
      setSearching(true);
      try {
        const data = await getPitfalls(
          debouncedSearch ? { q: debouncedSearch } : undefined
        );
        // Filter out already linked pitfalls
        const linkedIds = new Set(pitfalls.map((p) => p.id));
        setResults(data.filter((p) => !linkedIds.has(p.id)));
      } finally {
        setSearching(false);
      }
    }
    fetchPitfalls();
  }, [debouncedSearch, dialogOpen, pitfalls]);

  const handleUnlink = async (pitfallId: string) => {
    setUnlinking(pitfallId);
    try {
      await unlinkNodePitfall(nodeId, pitfallId);
      onMutate();
    } finally {
      setUnlinking(null);
    }
  };

  const handleLink = async (pitfallId: string) => {
    setLinking(pitfallId);
    try {
      await linkNodePitfall(nodeId, pitfallId);
      onMutate();
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">关联的坑</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="xs" variant="outline" />}>
            <Plus className="mr-1 size-3" />
            关联坑
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>关联坑</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索坑..."
                  className="pl-8"
                />
              </div>
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {searching ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    搜索中...
                  </p>
                ) : results.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    无可关联的坑
                  </p>
                ) : (
                  results.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {p.title}
                        </p>
                        <div className="flex gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {p.severity}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="xs"
                        onClick={() => handleLink(p.id)}
                        disabled={linking === p.id}
                      >
                        {linking === p.id ? "..." : "关联"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pitfalls.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无关联的坑</p>
      ) : (
        <ul className="space-y-1.5">
          {pitfalls.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              {p.status === "resolved" ? (
                <CheckCircle className="size-3.5 shrink-0 text-green-500" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0 text-red-500" />
              )}
              <span className="min-w-0 flex-1 truncate">{p.title}</span>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {p.severity}
              </Badge>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => handleUnlink(p.id)}
                disabled={unlinking === p.id}
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
