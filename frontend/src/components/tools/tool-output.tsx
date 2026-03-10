"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ToolOutput({
  output,
  isRunning,
}: {
  output: string;
  isRunning: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  if (!output && !isRunning) {
    return (
      <div className="bg-muted/50 flex h-48 items-center justify-center rounded-lg border">
        <p className="text-muted-foreground text-sm">点击「运行」查看输出</p>
      </div>
    );
  }

  return (
    <ScrollArea className="bg-muted/50 h-80 rounded-lg border">
      <pre className="p-4 font-mono text-sm">
        {output}
        {isRunning && (
          <span className="text-muted-foreground animate-pulse">_</span>
        )}
        <div ref={bottomRef} />
      </pre>
    </ScrollArea>
  );
}
