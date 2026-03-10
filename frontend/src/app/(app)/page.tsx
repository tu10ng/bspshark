import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentArticles } from "@/components/dashboard/recent-articles";
import { QuickTools } from "@/components/dashboard/quick-tools";
import type { DashboardStats, Article } from "@/lib/types";

// Mock data until backend APIs are ready
const mockStats: DashboardStats = {
  article_count: 12,
  tool_count: 8,
  execution_count: 156,
  active_tools: 5,
};

const mockArticles: Article[] = [
  {
    id: 1,
    title: "Python 虚拟环境最佳实践",
    summary: "介绍如何使用 venv、conda 等工具管理 Python 虚拟环境，避免依赖冲突。",
    content: "",
    category: "Python",
    tags: ["python", "venv"],
    created_at: "2026-03-08T10:00:00Z",
    updated_at: "2026-03-08T10:00:00Z",
  },
  {
    id: 2,
    title: "Bash 脚本调试技巧",
    summary: "使用 set -x、trap 等命令高效调试 Bash 脚本。",
    content: "",
    category: "Bash",
    tags: ["bash", "debug"],
    created_at: "2026-03-07T14:00:00Z",
    updated_at: "2026-03-07T14:00:00Z",
  },
  {
    id: 3,
    title: "Java Stream API 使用指南",
    summary: "全面介绍 Java Stream API 的常用操作和性能优化技巧。",
    content: "",
    category: "Java",
    tags: ["java", "stream"],
    created_at: "2026-03-06T09:00:00Z",
    updated_at: "2026-03-06T09:00:00Z",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">概览与快捷入口</p>
      </div>

      <StatsCards stats={mockStats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentArticles articles={mockArticles} />
        </div>
        <div>
          <QuickTools />
        </div>
      </div>
    </div>
  );
}
