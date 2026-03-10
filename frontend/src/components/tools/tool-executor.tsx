"use client";

import { useState } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolOutput } from "./tool-output";
import { useSSE } from "@/hooks/use-sse";
import type { Tool, ToolParameter } from "@/lib/types";

function ParameterField({
  param,
  value,
  onChange,
}: {
  param: ToolParameter;
  value: string;
  onChange: (value: string) => void;
}) {
  if (param.type === "select" && param.options) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{param.label}</label>
        <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder={param.placeholder ?? "选择..."} />
          </SelectTrigger>
          <SelectContent>
            {param.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{param.label}</label>
      <Input
        type={param.type === "number" ? "number" : "text"}
        placeholder={param.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ToolExecutor({ tool }: { tool: Tool }) {
  const [params, setParams] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const p of tool.parameters) {
      defaults[p.name] = p.default ?? "";
    }
    return defaults;
  });

  const { output, isRunning, start, stop } = useSSE();

  const handleRun = () => {
    // In production, this would first call executeTool() to get an execution ID,
    // then connect to the SSE endpoint. For now, simulate with mock.
    start(`/api/v1/tools/${tool.id}/execute/stream?${new URLSearchParams(params)}`);
  };

  return (
    <div className="space-y-6">
      {tool.parameters.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {tool.parameters.map((param) => (
            <ParameterField
              key={param.name}
              param={param}
              value={params[param.name] ?? ""}
              onChange={(val) =>
                setParams((prev) => ({ ...prev, [param.name]: val }))
              }
            />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleRun} disabled={isRunning}>
          <Play className="size-4" />
          {isRunning ? "运行中..." : "运行"}
        </Button>
        {isRunning && (
          <Button variant="outline" onClick={stop}>
            <Square className="size-4" />
            停止
          </Button>
        )}
      </div>

      <ToolOutput output={output} isRunning={isRunning} />
    </div>
  );
}
