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
  getExperiences,
  linkNodeExperience,
  unlinkNodeExperience,
} from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import type { Experience } from "@/lib/types";
import { X, Plus, AlertTriangle, CheckCircle, Search } from "lucide-react";

interface NodeExperienceManagerProps {
  nodeId: string;
  experiences: Experience[];
  onMutate: () => void;
}

export function NodeExperienceManager({
  nodeId,
  experiences,
  onMutate,
}: NodeExperienceManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Experience[]>([]);
  const [searching, setSearching] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!dialogOpen) return;

    async function fetchExperiences() {
      setSearching(true);
      try {
        const data = await getExperiences(
          debouncedSearch ? { q: debouncedSearch } : undefined
        );
        // Filter out already linked experiences
        const linkedIds = new Set(experiences.map((e) => e.id));
        setResults(data.filter((e) => !linkedIds.has(e.id)));
      } finally {
        setSearching(false);
      }
    }
    fetchExperiences();
  }, [debouncedSearch, dialogOpen, experiences]);

  const handleUnlink = async (experienceId: string) => {
    setUnlinking(experienceId);
    try {
      await unlinkNodeExperience(nodeId, experienceId);
      onMutate();
    } finally {
      setUnlinking(null);
    }
  };

  const handleLink = async (experienceId: string) => {
    setLinking(experienceId);
    try {
      await linkNodeExperience(nodeId, experienceId);
      onMutate();
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">关联的经验</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="xs" variant="outline" />}>
            <Plus className="mr-1 size-3" />
            关联经验
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>关联经验</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索经验..."
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
                    无可关联的经验
                  </p>
                ) : (
                  results.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {e.title}
                        </p>
                        <div className="flex gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {e.severity}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {e.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="xs"
                        onClick={() => handleLink(e.id)}
                        disabled={linking === e.id}
                      >
                        {linking === e.id ? "..." : "关联"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {experiences.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无关联的经验</p>
      ) : (
        <ul className="space-y-1.5">
          {experiences.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              {e.status === "resolved" ? (
                <CheckCircle className="size-3.5 shrink-0 text-green-500" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0 text-red-500" />
              )}
              <span className="min-w-0 flex-1 truncate">{e.title}</span>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {e.severity}
              </Badge>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => handleUnlink(e.id)}
                disabled={unlinking === e.id}
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
