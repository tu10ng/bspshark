import { StatsCards } from "@/components/dashboard/stats-cards";
import { QuickTools } from "@/components/dashboard/quick-tools";
import type { DashboardStats } from "@/lib/types";

// Mock data until backend APIs are ready
const mockStats: DashboardStats = {
  wiki_count: 12,
  tool_count: 8,
  execution_count: 156,
  active_tools: 5,
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">概览与快捷入口</p>
      </div>

      <StatsCards stats={mockStats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <QuickTools />
        </div>
      </div>
    </div>
  );
}
