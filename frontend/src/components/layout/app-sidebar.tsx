"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SidebarLogo } from "./sidebar-logo";
import { NavMain } from "./nav-main";
import { NavTools } from "./nav-tools";
import { ThemeToggle } from "./theme-toggle";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <NavTools />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-muted-foreground text-xs">BSPShark v0.1</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
