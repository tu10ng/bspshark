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
├── .env               # 环境变量（DATABASE_URL, BACKEND_PORT 等）
├── frontend/          # Next.js 前端
│   ├── src/app/       # App Router 页面
│   │   └── (app)/     # 带侧边栏的路由组 (/, /wiki, /tools, /knowledge, /pitfalls, /tasks)
│   ├── src/components/ # UI 组件
│   │   ├── ui/        # shadcn/ui 组件 (CLI 管理)
│   │   ├── layout/    # 布局组件 (sidebar, header, nav)
│   │   ├── dashboard/ # Dashboard 组件
│   │   ├── wiki/      # Wiki 组件
│   │   ├── tools/     # Tools 组件
│   │   ├── knowledge/ # 知识树组件 (tree-flow, node-form 等)
│   │   ├── pitfalls/  # 坑组件
│   │   └── tasks/     # 任务组件
│   ├── src/lib/       # 工具函数 (utils, api, types)
│   └── src/hooks/     # 自定义 Hooks (use-sse, use-debounce)
├── backend/           # Rust 后端
│   ├── src/
│   │   ├── main.rs    # 入口 + 服务器配置
│   │   ├── lib.rs     # 路由注册
│   │   ├── db.rs      # SqlitePool 初始化 + 迁移
│   │   ├── error.rs   # AppError 枚举
│   │   ├── models/    # 数据模型 (knowledge_tree, pitfall, task)
│   │   └── handlers/  # HTTP 处理器 (knowledge_tree, tree_node, pitfall, task)
│   ├── tests/         # 集成测试
│   ├── migrations/    # SQL 迁移 (001_initial_schema, 002_knowledge_system)
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
- **`.env` 在项目根目录**，后端 `main.rs` 会先找 `backend/.env`，再找 `../.env`（项目根）。`DATABASE_URL` 路径相对于 `backend/` 目录（因为 `cargo run` 在该目录执行），例如 `sqlite://bspshark.db` 对应 `backend/bspshark.db`
- **Button + Link 必须加 `nativeButton={false}`**：base-ui 的 Button 默认 `nativeButton=true`，当用 `render={<Link>}` 渲染为 `<a>` 标签时必须设置 `nativeButton={false}`，否则会报 console error
- **`render` prop 类型是 `ReactElement`**：base-ui 的 `DialogTrigger`、`SheetTrigger`、`DropdownMenuTrigger` 等的 `render` prop 要求 `React.ReactElement`（不是 `ReactNode`）。封装组件接受外部 trigger 时类型应定义为 `React.ReactElement`
- **Dialog 表单多入口触发需 controlled mode**：当同一个 Dialog 表单既有自带触发按钮（uncontrolled），又需要被外部 DropdownMenu 等命令式打开（controlled）时，用 union type 区分两种 props（`trigger` vs `open`/`onOpenChange`），避免组件内部 state 与外部冲突

## 架构决策

- **工具执行**: 采用 SSE (Server-Sent Events) 实时流式输出
- **认证**: Admin 后台暂不做认证
- **数据库**: SQLite，轻量部署
- **API 前缀**: `/api/v1/`
- **前端代理**: Next.js rewrites 将 `/api/` 代理到后端
- **前端路由**: `(app)` 路由组包裹带侧边栏页面，不影响 URL
- **主题切换**: root layout 内联 script 读 localStorage，无额外依赖
- **URL 驱动过滤**: 搜索/筛选用 URL searchParams，支持 SSR 和可分享链接
- **shadcn/ui 风格**: `base-nova`，组件多态用 `render` prop（非 `asChild`）；Button 渲染非 `<button>` 元素时需加 `nativeButton={false}`

## 知识管理系统

### 核心设计思想

- **全局知识树**: 以树形结构表示业务流程，主干是正常时序流程，分支是坑（错误）和异常场景
- **坑是独立实体**: 坑独立存储，被多棵树的节点引用（多对多）。修改坑时所有引用处自动同步
- **坑的生命周期**: `active` → `resolved`（已修复）/ `transformed`（变成了另一个坑），变更时附带说明
- **自由嵌套**: 树节点不限层级，任何节点可以有子节点
- **任务引用知识树**: 组长派任务时引用知识树节点，系统根据模块自动识别相关的坑
- **归档材料**: 任务可附加设计文档、串讲视频等链接（只存 URL，不做文件上传）

### 关键约束

- **树节点排序**: `sort_order` 整数字段控制兄弟节点顺序
- **坑的搜索**: 使用 LIKE 模糊搜索（title/description/tags），FTS5 虚拟表保留用于未来优化
- **流程图可视化**: 使用 React Flow (`@xyflow/react`) + dagre 自动布局，只读展示 + 点击查看详情，编辑通过表单完成
- **时序连线**: 同层级相邻 `step` 节点自动生成时序边（蓝色实线，高 weight），主干纵向流动；`pitfall_ref`/`exception` 从侧面（Left Handle）分支出去（虚线），dagre 通过 edge weight 优先对齐主干链
- **三种节点类型**: `step`（流程步骤，蓝色，Top/Bottom Handle）、`pitfall_ref`（坑引用，红色虚线边，Left Handle）、`exception`（异常场景，橙色虚线动画边，Left Handle），各有不同视觉样式
- **自动识别坑**: 创建任务时根据 modules 字段匹配 knowledge_trees → tree_nodes → pitfalls
- **级联删除**: 所有关联表 ON DELETE CASCADE

## 示例数据

`populate_knowledge.sh` 脚本通过 curl 调用后端 API 批量填充 Linux 内核知识示例数据：

- **25 个坑**: 覆盖 Linux 启动、SATA、存储、内核恢复四大主题
- **1 棵统一知识树**: "Linux系统全栈知识树"(`linux-system`)，根级主干按时序串联四大模块：启动流程 → SATA驱动 → 磁盘挂载 → 内核恢复
- **~64 个树节点**: 4 个根级模块节点 + 每个模块下含主干步骤 + 异常/坑引用子节点
- **24 条坑-节点关联**: 含跨模块引用（P6 fstab 同时被模块一和模块三引用）
- **3 个任务 + 5 个工件**: 含跨模块任务（Task3 跨 storage + kernel-recovery）

```bash
# 填充数据（需后端运行在 localhost:8080）
bash populate_knowledge.sh
```

**注意**:
- `task_artifacts.artifact_type` 有 CHECK 约束，仅允许 `design_doc`、`arch_review_video`、`test_review_video`、`other`
- 填充前需清空旧数据（删除 `backend/bspshark.db` 并重新 `make db-migrate`），否则会出现重复数据

## 测试策略

- **前端**: vitest + @testing-library/react，测试文件放 `src/__tests__/` 或 `*.test.tsx`
- **后端**: cargo test，单元测试在模块内 `#[cfg(test)]`，集成测试在 `tests/` 目录
