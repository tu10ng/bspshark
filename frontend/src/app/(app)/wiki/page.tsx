import { Suspense } from "react";
import { ArticleSearch } from "@/components/wiki/article-search";
import { ArticleList, ArticleListSkeleton } from "@/components/wiki/article-list";
import type { Article } from "@/lib/types";

// Mock data until backend APIs are ready
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
  {
    id: 4,
    title: "Docker 多阶段构建优化",
    summary: "使用多阶段构建减小镜像体积，提升 CI/CD 效率。",
    content: "",
    category: "DevOps",
    tags: ["docker", "ci"],
    created_at: "2026-03-05T11:00:00Z",
    updated_at: "2026-03-05T11:00:00Z",
  },
  {
    id: 5,
    title: "Python 类型提示完全指南",
    summary: "从基础到高级，掌握 Python typing 模块的使用方法。",
    content: "",
    category: "Python",
    tags: ["python", "typing"],
    created_at: "2026-03-04T08:00:00Z",
    updated_at: "2026-03-04T08:00:00Z",
  },
  {
    id: 6,
    title: "Shell 脚本编写规范",
    summary: "编写安全、可维护的 Shell 脚本的最佳实践和常见陷阱。",
    content: "",
    category: "Bash",
    tags: ["bash", "best-practices"],
    created_at: "2026-03-03T16:00:00Z",
    updated_at: "2026-03-03T16:00:00Z",
  },
];

function filterArticles(
  articles: Article[],
  q?: string,
  category?: string
): Article[] {
  return articles.filter((a) => {
    if (category && category !== "全部" && a.category !== category) return false;
    if (q && !a.title.includes(q) && !a.summary.includes(q)) return false;
    return true;
  });
}

export default async function WikiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const articles = filterArticles(mockArticles, params.q, params.category);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wiki</h1>
        <p className="text-muted-foreground">知识库文章</p>
      </div>

      <Suspense>
        <ArticleSearch />
      </Suspense>

      <Suspense fallback={<ArticleListSkeleton />}>
        <ArticleList articles={articles} />
      </Suspense>
    </div>
  );
}
