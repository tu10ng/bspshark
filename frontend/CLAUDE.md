# frontend

## 技术栈

- Next.js 16 (App Router) + TypeScript
- shadcn/ui 组件库（`base-nova` 风格）
- TailwindCSS v4 + `@tailwindcss/typography`
- react-markdown + remark-gfm + rehype-highlight（Wiki Markdown 渲染）
- pnpm 包管理

## 目录结构

```
src/
├── app/
│   ├── layout.tsx          # 根布局（metadata、主题脚本、TooltipProvider）
│   ├── not-found.tsx       # 404 页面
│   ├── globals.css         # TailwindCSS v4 + 主题变量
│   └── (app)/              # 带侧边栏的路由组（不影响 URL）
│       ├── layout.tsx      # SidebarProvider + Header 布局壳
│       ├── page.tsx        # Dashboard 首页 (/)
│       ├── wiki/
│       │   ├── layout.tsx           # Wiki 布局（二级侧边栏 + 内容区）
│       │   ├── [[...slug]]/page.tsx # 通配路由：/wiki（首页）和 /wiki/any/path（页面）
│       │   ├── edit/[id]/page.tsx   # 编辑页（分屏 Markdown 编辑器）
│       │   └── new/page.tsx         # 新建页（?parent=id 指定父页面）
│       └── tools/
│           ├── page.tsx    # 工具目录 (/tools)
│           └── [id]/page.tsx  # 工具执行 (/tools/[id])
├── components/
│   ├── ui/                 # shadcn/ui 组件（CLI 生成，勿手动修改）
│   ├── layout/             # 布局组件（sidebar, header, nav, theme-toggle）
│   ├── dashboard/          # Dashboard 组件（stats-cards, quick-tools）
│   ├── wiki/               # Wiki 组件（wiki-sidebar, wiki-nav, wiki-editor, wiki-markdown, wiki-heading, wiki-callout, wiki-experience-inline, wiki-breadcrumbs, wiki-prev-next, wiki-landing, wiki-page-content, wiki-version-history）
│   ├── knowledge/          # 知识组件（tree-flow, node-form, knowledge-version-timeline 等）
│   └── tools/              # Tools 组件（language-tabs, tool-card, tool-catalog, tool-executor, tool-output）
├── lib/
│   ├── utils.ts            # cn() 类名合并
│   ├── types.ts            # 共享 TypeScript 类型（WikiPage, KnowledgeItem, KnowledgeRelation, WikiPageSection, Experience, Task, version types 等）
│   └── api.ts              # API 客户端封装（server 用绝对 URL，client 用代理）
├── hooks/
│   ├── use-debounce.ts     # 搜索防抖
│   ├── use-sse.ts          # SSE 流式输出（EventSource 生命周期管理）
│   └── use-mobile.ts       # 移动端检测（shadcn sidebar 依赖）
└── __tests__/              # 测试文件
```

## 组件规范

- shadcn/ui 组件放 `components/ui/`，由 CLI 管理
- 业务组件按模块分目录放 `components/` 下
- 使用 `cn()` (from `lib/utils.ts`) 合并 Tailwind 类名
- **组件多态用 `render` prop，不用 `asChild`**（`base-nova` 风格基于 `@base-ui/react`）
  ```tsx
  // 正确：
  <Button render={<Link href="/path" />}>文字</Button>
  <SidebarMenuButton render={<Link href="/path" />}>文字</SidebarMenuButton>

  // 错误：
  <Button asChild><Link href="/path">文字</Link></Button>
  ```

## 状态管理

- 优先使用 Server Components
- 客户端状态用 `useState` / `useReducer`
- 不使用 Redux / Zustand

## 前端路由

- `(app)/` 路由组：带侧边栏布局，包含 Dashboard、Wiki、Tools
- 未来无侧边栏页面（如登录页）直接放 `app/` 下，不进 `(app)/`
- 搜索/筛选使用 URL searchParams 驱动，支持 SSR 和可分享链接

## 主题切换

- root layout 内联 `<script>` 读取 `localStorage("theme")` 设置 `.dark` class
- `ThemeToggle` 组件使用 `useSyncExternalStore` 监听 DOM class 变化
- 无需 next-themes 等额外依赖

## API 调用

- 统一封装在 `lib/api.ts`
- 前端通过 Next.js rewrites 代理 `/api/` 到后端
- Server Component 中使用绝对 URL（`http://localhost:8080`）
- Client Component 中使用相对路径（走代理）

## 样式约定

- TailwindCSS utility-first
- 使用 `cn()` 合并类名
- 避免自定义 CSS，优先用 Tailwind 工具类（例外：`globals.css` 中 `.wiki-prose` 排版覆盖用原生 CSS）
- 主题色基于 OKLch 色彩空间
- Wiki 专用 CSS 变量：`--wiki-sidebar-*`（侧边栏色系）、`--wiki-accent`（绿色强调），在 `globals.css` 的 `:root` 和 `.dark` 中定义

## 测试

- 框架: vitest + @testing-library/react + @testing-library/jest-dom
- 测试文件放 `src/__tests__/` 或与组件同目录 `*.test.tsx`
- 运行: `pnpm test`

## Wiki 系统

- Wiki 页面使用树形结构组织，slug 路径寻址（如 `/wiki/dev/frontend`）
- 布局：嵌套在 App Layout 内，RTD (Read the Docs) 风格
  - **侧边栏**（280px）：`WikiSidebar`（client component）包装标题栏 + 搜索输入框 + `WikiNav`，背景色 `bg-wiki-sidebar`
  - **搜索过滤**：递归 `filterTree` 匹配标题，搜索时 `forceExpandAll` 展开所有匹配节点
  - **导航激活态**：蓝色高亮 + `border-l-2`，使用 `--wiki-sidebar-active` 色系
  - **内容区**：`max-w-[800px]` 限宽（放在 `wiki-page-content` / `wiki-landing`，编辑器页面不限宽）
- `[[...slug]]` catch-all 路由处理首页（无 slug）和所有页面路径
- Markdown 渲染使用 `react-markdown` + `remark-gfm` + `rehype-highlight`，配合 `prose dark:prose-invert wiki-prose` 样式
  - **wiki-prose**：衬线标题（Noto Serif）、H2 底线、蓝色链接（已访问紫色）、红色内联 code、斑马纹表格
  - **WikiHeading**：h1-h6 自动生成 id 锚点 + hover `¶` 链接（支持中文 slugify）
  - **WikiCallout**：GitHub Alerts 语法（`> [!NOTE]`/`[!TIP]`/`[!WARNING]`/`[!CAUTION]`/`[!IMPORTANT]`），5 种颜色 + 图标
  - **外部链接**：`http` 开头自动 `target="_blank"` + `ExternalLinkIcon`
- **Prev/Next 导航**：绿色 `wiki-accent` 样式
- **面包屑**：`/` 分隔符
- 编辑器为分屏模式（`WikiEditor`），左侧 textarea + 右侧 `WikiMarkdown` 实时预览
- 新建页面通过 `?parent=id` query param 指定父页面

## 注意事项

- URL 驱动的搜索组件避免在 useEffect 中直接依赖 searchParams（会导致无限循环），用 useRef 存最新值
