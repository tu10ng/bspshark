"use client";

import { FileText } from "lucide-react";

export function WikiEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <FileText className="size-12" />
      <div className="text-center">
        <p className="text-lg font-medium">Select or create a page</p>
        <p className="text-sm">
          Choose a page from the sidebar or create a new one to get started.
        </p>
      </div>
    </div>
  );
}
