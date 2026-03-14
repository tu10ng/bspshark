import {
  InfoIcon,
  LightbulbIcon,
  AlertTriangleIcon,
  AlertOctagonIcon,
  StarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const calloutConfig = {
  NOTE: {
    icon: InfoIcon,
    label: "Note",
    border: "border-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-500",
  },
  TIP: {
    icon: LightbulbIcon,
    label: "Tip",
    border: "border-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
    iconColor: "text-green-500",
  },
  WARNING: {
    icon: AlertTriangleIcon,
    label: "Warning",
    border: "border-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    iconColor: "text-yellow-600 dark:text-yellow-500",
  },
  CAUTION: {
    icon: AlertOctagonIcon,
    label: "Caution",
    border: "border-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",
    iconColor: "text-red-500",
  },
  IMPORTANT: {
    icon: StarIcon,
    label: "Important",
    border: "border-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-500",
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
    <div
      className={cn(
        "not-prose my-4 rounded-md border-l-4 p-4",
        config.border,
        config.bg
      )}
    >
      <div className={cn("mb-2 flex items-center gap-2 font-semibold", config.iconColor)}>
        <Icon className="size-4" />
        {config.label}
      </div>
      <div className="text-sm [&>p]:m-0">{children}</div>
    </div>
  );
}
