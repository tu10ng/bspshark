# bspshark

## 项目概述

全栈网站：工作信息/Wiki + 多语言工具平台（Python、Java、Bash 脚本在线执行）。

## 术语表

- **知识项（knowledge item）**：原子知识单元，拥有完整 Markdown 内容和全局唯一 slug，可跨 Wiki 共享引用
- **经验（experience）**：独立实体（原称"坑"），通过多对多关联到知识项
- **并行知识（knowledge instance）**：同一知识的不同变体（如 Ubuntu vs Arch）
- **知识树（knowledge tree）**：知识关系的可视化视图，通过 `knowledge_tree_roots` 指定入口节点
- **知识关系（knowledge relation）**：知识项之间的关系（parent_child / precedes / related_to）
- **Wiki 页面 section**：Wiki 页面的组成单元（知识引用 / 经验引用 / 自由文本）
- **自动识别**：保存 Wiki 时后端自动解析 Markdown，创建/更新知识项和经验
- **版本化**：知识、经验、Wiki 每次内容变更都保留版本快照

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
│   │   └── (app)/     # 带侧边栏的路由组 (/, /wiki, /tools, /knowledge, /experiences, /tasks)
│   │       └── wiki/  # Wiki 文档系统（RTD 风格）
│   │           ├── layout.tsx           # 二级侧边栏布局
│   │           ├── [[...slug]]/page.tsx # 通配路由（首页 + 页面渲染）
│   │           ├── edit/[id]/page.tsx   # 编辑页
│   │           └── new/page.tsx         # 新建页
│   ├── src/components/ # UI 组件
│   │   ├── ui/        # shadcn/ui 组件 (CLI 管理)
│   │   ├── layout/    # 布局组件 (sidebar, header, nav)
│   │   ├── dashboard/ # Dashboard 组件
│   │   ├── wiki/      # Wiki 组件 (wiki-sidebar, wiki-nav, wiki-editor, wiki-markdown, wiki-heading, wiki-callout, wiki-breadcrumbs, wiki-prev-next, wiki-landing, wiki-page-content)
│   │   ├── tools/     # Tools 组件
│   │   ├── knowledge/ # 知识树组件 (tree-flow, node-form 等)
│   │   ├── experiences/ # 经验组件
│   │   └── tasks/     # 任务组件
│   ├── src/lib/       # 工具函数 (utils, api, types)
│   └── src/hooks/     # 自定义 Hooks (use-sse, use-debounce)
├── backend/           # Rust 后端
│   ├── src/
│   │   ├── main.rs    # 入口 + 服务器配置
│   │   ├── lib.rs     # 路由注册
│   │   ├── db.rs      # SqlitePool 初始化 + 迁移
│   │   ├── error.rs   # AppError 枚举
│   │   ├── models/    # 数据模型 (knowledge_tree, knowledge_item, knowledge_relation, experience, task, wiki_page, wiki_page_section)
│   │   ├── services/  # 业务逻辑层 (knowledge, versioning, auto_identify, wiki_compose)
│   │   └── handlers/  # HTTP 处理器 (knowledge_tree, knowledge_item, tree_node, experience, task, wiki_page)
│   ├── tests/         # 集成测试
│   ├── migrations/    # SQL 迁移 (001-007)
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

### 核心架构（Wiki 作为知识创建入口）

- **Wiki 是创建入口**：用户正常写 Markdown，保存时后端自动识别知识和经验
- **知识项是原子单位**：`knowledge_items` 拥有独立 Markdown 内容和全局唯一 slug
- **经验是独立实体**：经验独立存储，被知识项引用（`knowledge_experience_refs`），修改时所有引用处同步
- **Wiki 页面 = sections 的有序组合**：`wiki_page_sections` 表存储知识引用 + 经验引用 + 自由文本
- **知识树 = 关系视图**：`knowledge_tree_roots` 指定入口，`knowledge_relations` 定义知识间关系
- **全面版本化**：`knowledge_item_versions` + `experience_versions` + `wiki_page_versions`

### 自动识别规则

| Markdown 结构 | 识别为 | 说明 |
|---------------|--------|------|
| `## 标题` + 下方内容 | **知识** | H2 → 知识标题，content → 知识内容 |
| `> [!EXPERIENCE] 标题` | **经验** | 从知识 section 中提取 |
| H2 之前的内容 | **自由文本** | 原样保存 |

### 去重逻辑

- 标题精确匹配（大小写不敏感）→ 关联已有知识/经验
- 未找到 → 创建新知识项/经验
- 内容变化时自动创建新版本

### 关键约束

- **slug 全局唯一**：用于 URL 和去重
- **版本号递增**：content 变化时 `current_version` +1
- **sections_enabled 标志**：Wiki 页面可选择是否启用自动识别
- **级联删除**：所有关联表 ON DELETE CASCADE（`knowledge_experience_refs` 和 `wiki_page_sections` 中引用用 ON DELETE SET NULL）

## Wiki 文档系统

### 架构

- **数据模型**: `wiki_pages` 表，自引用树结构（`parent_id` FK），slug 路径寻址
- **前端布局**: 嵌套在 App Layout 内，RTD (Read the Docs) 风格：280px 二级侧边栏（独立背景色 + 搜索框 + 导航树）+ 800px 限宽内容区
- **Markdown 渲染**: react-markdown + remark-gfm + rehype-highlight，`prose dark:prose-invert wiki-prose` 样式（衬线标题、蓝色链接、红色内联代码、斑马纹表格、heading 锚点 `¶`）
- **告示框**: 支持 GitHub Alerts 语法（`> [!NOTE]`/`[!TIP]`/`[!WARNING]`/`[!CAUTION]`/`[!IMPORTANT]`/`[!EXPERIENCE]`），由 `WikiCallout` 组件渲染
- **编辑器**: 分屏模式，左侧 Markdown 源码，右侧实时预览

### Wiki 前端样式

- **CSS 变量**: `--wiki-sidebar-*`（侧边栏色系）和 `--wiki-accent`（绿色强调），light/dark 各一套
- **衬线字体**: Noto Serif（`--font-serif`），仅用于 `.wiki-prose` 标题
- **侧边栏**: `WikiSidebar` 包装搜索输入 + `WikiNav`，搜索递归过滤树并 `forceExpandAll`
- **导航激活态**: 蓝色高亮 + `border-l-2`，使用 `wiki-sidebar-active` 色系
- **Prev/Next**: 绿色 `wiki-accent` 边框和文字
- **面包屑**: `/` 分隔符

### Wiki API

| 端点 | 说明 |
|------|------|
| `GET /api/v1/wiki` | 完整嵌套树 |
| `GET /api/v1/wiki/page?path=dev/frontend` | 按 slug 路径查找（含 sections） |
| `GET /api/v1/wiki/pages/{id}` | 按 ID 查找（含 path + breadcrumbs + sections） |
| `POST /api/v1/wiki/pages` | 创建页面（支持 sections_enabled） |
| `PUT /api/v1/wiki/pages/{id}` | 更新页面（sections_enabled 时自动识别知识/经验） |
| `DELETE /api/v1/wiki/pages/{id}` | 删除页面（级联） |
| `PUT /api/v1/wiki/pages/{id}/reorder` | 移动/排序 |
| `GET /api/v1/wiki/pages/{id}/versions` | Wiki 版本历史 |
| `GET /api/v1/wiki/pages/{id}/versions/{v}` | Wiki 特定版本快照 |

### Knowledge Items API

| 端点 | 说明 |
|------|------|
| `GET /api/v1/knowledge-items` | 列表/搜索（?q=, ?tag=） |
| `POST /api/v1/knowledge-items` | 创建知识项 |
| `GET /api/v1/knowledge-items/{id}` | 详情（含 wiki_references, experience_ids） |
| `PUT /api/v1/knowledge-items/{id}` | 更新（内容变化时自动版本化） |
| `DELETE /api/v1/knowledge-items/{id}` | 删除 |
| `POST /api/v1/knowledge-relations` | 创建知识关系 |
| `DELETE /api/v1/knowledge-relations/{id}` | 删除知识关系 |
| `GET /api/v1/knowledge-items/{id}/relations` | 获取某知识的所有关系 |
| `GET /api/v1/knowledge-items/{id}/versions` | 知识版本历史 |
| `GET /api/v1/knowledge-items/{id}/versions/{v}` | 特定版本内容 |
| `GET /api/v1/experiences/{id}/versions` | 经验版本历史 |

### 关键约束

- **slug 唯一性**: 同级（相同 parent_id）slug 不可重复，不同级可以
- **保留 slug**: `edit`、`new` 不可用作 slug（与前端路由冲突）
- **级联删除**: 删除父页面自动删除所有子页面
- **排序**: `sort_order` 控制同级页面顺序，创建时自动递增

## 示例数据

`populate_knowledge.sh` 脚本通过 curl 调用后端 API 批量填充 Linux 存储 I/O 全链路知识示例数据：

- **经验**: 覆盖 Linux 启动、SATA、存储、运行时保障四大主题
- **1 棵知识树**: "Linux存储I/O全链路知识树"(`linux-storage-io`)，12 个顶层节点按时序排列
- **~70 个树节点**: 12 个顶层节点 + 子节点（含多层嵌套）
- **经验-节点关联**: 含跨节点引用（如 fstab 经验同时被 systemd 和文件系统挂载引用）
- **3 个任务 + 5 个工件**: 任务 modules 统一为 `linux-storage-io`

```bash
# 填充数据（需后端运行在 localhost:8080）
bash populate_knowledge.sh
```

**注意**:
- `task_artifacts.artifact_type` 有 CHECK 约束，仅允许 `design_doc`、`arch_review_video`、`test_review_video`、`other`
- 填充前需清空旧数据（删除 `backend/bspshark.db` 并重新 `make db-migrate`），否则会出现重复数据

`populate_wiki.sh` 脚本填充 Wiki 示例文档：

- **3 个顶层页面**: 入门指南、开发指南、API 参考
- **6 个子页面**: 安装与配置、前端开发、组件开发、后端开发、数据库设计、Wiki API、知识树 API

```bash
# 填充 Wiki（需后端运行在 localhost:8080）
bash populate_wiki.sh
```

## 测试策略

- **前端**: vitest + @testing-library/react，测试文件放 `src/__tests__/` 或 `*.test.tsx`
- **后端**: cargo test，单元测试在模块内 `#[cfg(test)]`，集成测试在 `tests/` 目录
