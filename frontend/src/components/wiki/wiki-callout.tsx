import {
  InfoIcon,
  LightbulbIcon,
  AlertTriangleIcon,
  AlertOctagonIcon,
  StarIcon,
  BugIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const calloutConfig = {
  NOTE: {
    icon: InfoIcon,
    label: "Note",
    titleBg: "bg-[#6ab0de]",
    bodyBg: "bg-[#e7f2fa] dark:bg-blue-950/30",
    titleText: "text-white",
  },
  TIP: {
    icon: LightbulbIcon,
    label: "Tip",
    titleBg: "bg-[#1abc9c]",
    bodyBg: "bg-[#dbfaf4] dark:bg-emerald-950/30",
    titleText: "text-white",
  },
  WARNING: {
    icon: AlertTriangleIcon,
    label: "Warning",
    titleBg: "bg-[#f0b37e]",
    bodyBg: "bg-[#ffedcc] dark:bg-amber-950/30",
    titleText: "text-white",
  },
  CAUTION: {
    icon: AlertOctagonIcon,
    label: "Caution",
    titleBg: "bg-[#f29f97]",
    bodyBg: "bg-[#fdf3f2] dark:bg-red-950/30",
    titleText: "text-white",
  },
  IMPORTANT: {
    icon: StarIcon,
    label: "Important",
    titleBg: "bg-[#1abc9c]",
    bodyBg: "bg-[#dbfaf4] dark:bg-emerald-950/30",
    titleText: "text-white",
  },
  EXPERIENCE: {
    icon: BugIcon,
    label: "Experience",
    titleBg: "bg-amber-500",
    bodyBg: "bg-amber-50 dark:bg-amber-950/30",
    titleText: "text-white",
  },
} as const;

export type CalloutType = keyof typeof calloutConfig;

export function WikiCallout({
  type,
  children,
}: {
  type: CalloutType;
  children: React.ReactNode;
}) {
  const config = calloutConfig[type];
  const Icon = config.icon;

  return (
    <div className="not-prose my-6">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm font-bold",
          config.titleBg,
          config.titleText
        )}
      >
        <Icon className="size-4" />
        {config.label}
      </div>
      <div className={cn("p-3 text-sm", config.bodyBg)}>
        <div className="[&>p]:m-0">{children}</div>
      </div>
    </div>
  );
}
