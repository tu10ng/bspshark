# bspshark

全栈网站：工作信息/Wiki + 多语言工具平台。

## 技术栈

- **前端**: Next.js + shadcn/ui + TailwindCSS (pnpm)
- **后端**: Rust Actix-web + SQLite (SQLx)

## 快速开始

```bash
cp .env.example .env

# 启动后端
make dev-backend

# 启动前端（另一个终端）
make dev-frontend

# 或同时启动
make dev
```

## 常用命令

```bash
make build       # 构建前后端
make test        # 运行所有测试
make lint        # 代码检查
make db-migrate  # 执行数据库迁移
```

## 项目结构

```
bspshark/
├── frontend/    # Next.js 前端
├── backend/     # Rust Actix-web 后端
└── Makefile     # 统一开发命令
```
