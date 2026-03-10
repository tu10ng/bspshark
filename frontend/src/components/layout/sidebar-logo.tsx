import Link from "next/link";
import { Zap } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function SidebarLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" render={<Link href="/" />}>
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Zap className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">BSPShark</span>
              <span className="text-muted-foreground truncate text-xs">
                工具平台
              </span>
            </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
