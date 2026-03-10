import { notFound } from "next/navigation";
import { ArticleContent } from "@/components/wiki/article-content";
import type { Article } from "@/lib/types";

// Mock data until backend APIs are ready
const mockArticles: Record<number, Article> = {
  1: {
    id: 1,
    title: "Python 虚拟环境最佳实践",
    summary: "介绍如何使用 venv、conda 等工具管理 Python 虚拟环境，避免依赖冲突。",
    content: `Python 虚拟环境是隔离项目依赖的重要工具。本文介绍几种常用方案：

1. venv（内置模块）
创建虚拟环境：python -m venv .venv
激活：source .venv/bin/activate

2. conda
创建环境：conda create -n myenv python=3.11
激活：conda activate myenv

3. 最佳实践
- 每个项目使用独立虚拟环境
- 使用 requirements.txt 或 pyproject.toml 锁定依赖版本
- 在 CI/CD 中自动创建虚拟环境`,
    category: "Python",
    tags: ["python", "venv", "best-practices"],
    created_at: "2026-03-08T10:00:00Z",
    updated_at: "2026-03-08T10:00:00Z",
  },
  2: {
    id: 2,
    title: "Bash 脚本调试技巧",
    summary: "使用 set -x、trap 等命令高效调试 Bash 脚本。",
    content: `调试 Bash 脚本的几种常用方法：

1. set -x：打印每条命令及其参数
2. set -e：遇到错误立即退出
3. set -u：使用未定义变量时报错
4. trap：捕获信号和错误

推荐在脚本开头加上：
set -euo pipefail

这样可以捕获大部分常见错误。`,
    category: "Bash",
    tags: ["bash", "debug"],
    created_at: "2026-03-07T14:00:00Z",
    updated_at: "2026-03-07T14:00:00Z",
  },
  3: {
    id: 3,
    title: "Java Stream API 使用指南",
    summary: "全面介绍 Java Stream API 的常用操作和性能优化技巧。",
    content: `Java Stream API 是 Java 8 引入的函数式编程工具。

常用操作：
- filter：过滤元素
- map：转换元素
- reduce：聚合操作
- collect：收集结果

性能提示：
- 避免在 Stream 中执行副作用操作
- 大数据量时考虑使用 parallelStream
- 注意短路操作（findFirst, anyMatch）的优势`,
    category: "Java",
    tags: ["java", "stream", "functional"],
    created_at: "2026-03-06T09:00:00Z",
    updated_at: "2026-03-06T09:00:00Z",
  },
};

export default async function WikiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = mockArticles[Number(id)];

  if (!article) {
    notFound();
  }

  return <ArticleContent article={article} />;
}
