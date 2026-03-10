import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const languageGroups = [
  {
    language: "Python",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    href: "/tools?language=python",
  },
  {
    language: "Java",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    href: "/tools?language=java",
  },
  {
    language: "Bash",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    href: "/tools?language=bash",
  },
];

export function QuickTools() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>工具快捷入口</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {languageGroups.map((group) => (
            <Button
              key={group.language}
              variant="ghost"
              className="w-full justify-start"
              nativeButton={false}
              render={<Link href={group.href} />}
            >
              <span
                className={`${group.bgColor} ${group.color} rounded px-1.5 py-0.5 font-mono text-xs font-bold`}
              >
                {group.language.slice(0, 2).toUpperCase()}
              </span>
              <span>{group.language} 工具</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
