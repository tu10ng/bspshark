"use client";

import { BugIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Experience } from "@/lib/types";
import { WikiMarkdown } from "./wiki-markdown";

const severityColors = {
  low: "border-green-400 bg-green-50 dark:bg-green-950/20",
  medium: "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20",
  high: "border-orange-400 bg-orange-50 dark:bg-orange-950/20",
  critical: "border-red-400 bg-red-50 dark:bg-red-950/20",
};

const severityBadge = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusBadge = {
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  resolved: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  transformed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function WikiExperienceInline({ experience }: { experience: Experience }) {
  const content = experience.content || experience.description || "";

  return (
    <div
      className={cn(
        "my-6 rounded-lg border-l-4 p-4",
        severityColors[experience.severity]
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <BugIcon className="size-4 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold">{experience.title}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            severityBadge[experience.severity]
          )}
        >
          {experience.severity}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            statusBadge[experience.status]
          )}
        >
          {experience.status}
        </span>
      </div>
      {content && (
        <div className="text-sm">
          <WikiMarkdown content={content} />
        </div>
      )}
    </div>
  );
}
