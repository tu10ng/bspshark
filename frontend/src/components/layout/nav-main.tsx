"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, BookOpen, Wrench, Network, BookText, AlertTriangle, ClipboardList } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Wiki", url: "/wiki", icon: BookOpen },
  { title: "Tools", url: "/tools", icon: Wrench },
  { title: "知识树", url: "/knowledge", icon: Network },
  { title: "知识", url: "/knowledge-items", icon: BookText },
  { title: "经验", url: "/experiences", icon: AlertTriangle },
  { title: "任务", url: "/tasks", icon: ClipboardList },
];

export function NavMain() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>导航</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            item.url === "/"
              ? pathname === "/"
              : pathname.startsWith(item.url);
          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton isActive={isActive} render={<Link href={item.url} />}>
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
