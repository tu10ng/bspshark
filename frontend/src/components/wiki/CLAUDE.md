# wiki 组件

## 职责

Wiki 文档系统的前端渲染和编辑组件。

## 关键文件

- `wiki-sidebar.tsx` — RTD 风格侧边栏（搜索 + 导航树）
- `wiki-nav.tsx` — 递归导航组件（拖拽排序 + 上下文菜单）
- `wiki-page-content.tsx` — 页面内容渲染（支持 sections 模式和纯 Markdown 模式）
- `wiki-markdown.tsx` — Markdown 渲染（react-markdown + remark-gfm + rehype-highlight + callouts）
- `wiki-editor.tsx` — 分屏编辑器（Markdown textarea + 实时预览）
- `wiki-callout.tsx` — GitHub Alerts + EXPERIENCE callout 渲染
- `wiki-experience-inline.tsx` — 经验内联渲染（severity 颜色 + status 徽章）
- `wiki-version-history.tsx` — Wiki 修订历史面板
- `wiki-heading.tsx` — 标题锚点 + ¶ 链接
- `wiki-breadcrumbs.tsx` — 面包屑导航
- `wiki-prev-next.tsx` — 上一页/下一页导航
- `wiki-landing.tsx` — Wiki 首页
- `wiki-dnd-provider.tsx` — 拖拽排序 Provider
- `wiki-context-menu.tsx` — 右键上下文菜单
- `wiki-rename-dialog.tsx` — 重命名对话框
- `wiki-delete-dialog.tsx` — 删除确认对话框
- `code-block/` — 代码块渲染（语法高亮 + 行号 + 复制）

## 约定

- Callout 类型：NOTE, TIP, WARNING, CAUTION, IMPORTANT, EXPERIENCE
- 知识识别默认对所有 Wiki 页面生效，按 section 逐个渲染（知识带蓝色左边框，经验带 severity 颜色边框）

## 依赖关系

- 使用 `@/lib/api` 调用后端 API
- 使用 `@/lib/types` 的 WikiPage*, KnowledgeItem, Experience 类型
