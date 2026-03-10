# frontend

## 技术栈

- Next.js 16 (App Router) + TypeScript
- shadcn/ui 组件库（`base-nova` 风格）
- TailwindCSS v4
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
│       │   ├── page.tsx    # 文章列表 (/wiki)
│       │   └── [id]/page.tsx  # 文章详情 (/wiki/[id])
│       └── tools/
│           ├── page.tsx    # 工具目录 (/tools)
│           └── [id]/page.tsx  # 工具执行 (/tools/[id])
├── components/
│   ├── ui/                 # shadcn/ui 组件（CLI 生成，勿手动修改）
│   ├── layout/             # 布局组件（sidebar, header, nav, theme-toggle）
│   ├── dashboard/          # Dashboard 组件（stats-cards, recent-articles, quick-tools）
│   ├── wiki/               # Wiki 组件（article-search, article-card, article-list, article-content）
│   └── tools/              # Tools 组件（language-tabs, tool-card, tool-catalog, tool-executor, tool-output）
├── lib/
│   ├── utils.ts            # cn() 类名合并
│   ├── types.ts            # 共享 TypeScript 类型（Article, Tool, ToolExecution, DashboardStats）
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
- 避免自定义 CSS，优先用 Tailwind 工具类
- 主题色基于 OKLch 色彩空间

## 测试

- 框架: vitest + @testing-library/react + @testing-library/jest-dom
- 测试文件放 `src/__tests__/` 或与组件同目录 `*.test.tsx`
- 运行: `pnpm test`

## 注意事项

- 当前页面数据为 mock 数据，待后端 API 实现后替换为真实调用
- URL 驱动的搜索组件避免在 useEffect 中直接依赖 searchParams（会导致无限循环），用 useRef 存最新值
