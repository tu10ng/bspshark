# bspshark

## 项目概述

全栈网站：工作信息/Wiki + 多语言工具平台（Python、Java、Bash 脚本在线执行）。

## 技术栈

- **前端**: pnpm + Next.js (App Router) + shadcn/ui + TailwindCSS v4
- **后端**: Rust Actix-web 4 + SQLx + SQLite
- **Monorepo**: `frontend/` + `backend/`

## 项目结构

```
bspshark/
├── frontend/          # Next.js 前端
│   ├── src/app/       # App Router 页面
│   │   └── (app)/     # 带侧边栏的路由组 (/, /wiki, /tools)
│   ├── src/components/ # UI 组件
│   │   ├── ui/        # shadcn/ui 组件 (CLI 管理)
│   │   ├── layout/    # 布局组件 (sidebar, header, nav)
│   │   ├── dashboard/ # Dashboard 组件
│   │   ├── wiki/      # Wiki 组件
│   │   └── tools/     # Tools 组件
│   ├── src/lib/       # 工具函数 (utils, api, types)
│   └── src/hooks/     # 自定义 Hooks (use-sse, use-debounce)
├── backend/           # Rust 后端
│   ├── src/           # 源码
│   ├── tests/         # 集成测试
│   ├── migrations/    # SQL 迁移
│   └── tools/         # 工具脚本 (python/, java/, bash/)
└── Makefile           # 统一命令入口
```

## 开发命令

```bash
make dev            # 同时启动前后端
make dev-frontend   # 仅前端 (localhost:3000)
make dev-backend    # 仅后端 (localhost:8080)
make build          # 构建
make test           # 全部测试
make lint           # 代码检查
make db-migrate     # 数据库迁移
```

## 重要约定

- **cargo 命令必须加 `-j 6`** 限制并行编译任务数（如 `cargo build -j 6`、`cargo test -j 6`）

## 架构决策

- **工具执行**: 采用 SSE (Server-Sent Events) 实时流式输出
- **认证**: Admin 后台暂不做认证
- **数据库**: SQLite，轻量部署
- **API 前缀**: `/api/v1/`
- **前端代理**: Next.js rewrites 将 `/api/` 代理到后端
- **前端路由**: `(app)` 路由组包裹带侧边栏页面，不影响 URL
- **主题切换**: root layout 内联 script 读 localStorage，无额外依赖
- **URL 驱动过滤**: 搜索/筛选用 URL searchParams，支持 SSR 和可分享链接
- **shadcn/ui 风格**: `base-nova`，组件多态用 `render` prop（非 `asChild`）

## 测试策略

- **前端**: vitest + @testing-library/react，测试文件放 `src/__tests__/` 或 `*.test.tsx`
- **后端**: cargo test，单元测试在模块内 `#[cfg(test)]`，集成测试在 `tests/` 目录
