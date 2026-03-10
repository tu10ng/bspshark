"use client";

import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const tools = [
  { title: "Python", url: "/tools?language=python", color: "text-yellow-500" },
  { title: "Java", url: "/tools?language=java", color: "text-orange-500" },
  { title: "Bash", url: "/tools?language=bash", color: "text-green-500" },
];

export function NavTools() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>快捷工具</SidebarGroupLabel>
      <SidebarMenu>
        {tools.map((tool) => (
          <SidebarMenuItem key={tool.title}>
            <SidebarMenuButton render={<Link href={tool.url} />}>
              <span className={`font-mono text-xs font-bold ${tool.color}`}>
                {tool.title.slice(0, 2).toUpperCase()}
              </span>
              <span>{tool.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
