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
│   ├── src/components/ # UI 组件
│   └── src/lib/       # 工具函数
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

## 架构决策

- **工具执行**: 采用 SSE (Server-Sent Events) 实时流式输出
- **认证**: Admin 后台暂不做认证
- **数据库**: SQLite，轻量部署
- **API 前缀**: `/api/v1/`
- **前端代理**: Next.js rewrites 将 `/api/` 代理到后端

## 测试策略

- **前端**: vitest + @testing-library/react，测试文件放 `src/__tests__/` 或 `*.test.tsx`
- **后端**: cargo test，单元测试在模块内 `#[cfg(test)]`，集成测试在 `tests/` 目录
