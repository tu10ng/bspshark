# frontend

## 技术栈

- Next.js 16 (App Router) + TypeScript
- shadcn/ui 组件库
- TailwindCSS v4
- pnpm 包管理

## 目录结构

```
src/
├── app/            # App Router 页面和布局
├── components/
│   └── ui/         # shadcn/ui 组件 (由 CLI 生成，勿手动修改)
├── lib/            # 工具函数 (utils.ts, api.ts)
├── hooks/          # 自定义 React Hooks
└── __tests__/      # 测试文件
```

## 组件规范

- shadcn/ui 组件放 `components/ui/`，由 CLI 管理
- 业务组件按模块分目录放 `components/` 下
- 使用 `cn()` (from `lib/utils.ts`) 合并 Tailwind 类名

## 状态管理

- 优先使用 Server Components
- 客户端状态用 `useState` / `useReducer`
- 不使用 Redux / Zustand

## API 调用

- 统一封装在 `lib/api.ts`
- 前端通过 Next.js rewrites 代理 `/api/` 到后端

## 样式约定

- TailwindCSS utility-first
- 使用 `cn()` 合并类名
- 避免自定义 CSS，优先用 Tailwind 工具类

## 测试

- 框架: vitest + @testing-library/react + @testing-library/jest-dom
- 测试文件放 `src/__tests__/` 或与组件同目录 `*.test.tsx`
- 运行: `pnpm test`
