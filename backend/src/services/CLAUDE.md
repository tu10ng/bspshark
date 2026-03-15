# services

## 职责

业务逻辑层。接收 `&SqlitePool` 和类型化参数，返回 `Result<T, AppError>`。不处理 HTTP 请求/响应。

## 关键文件

- `knowledge.rs` — 知识项 CRUD + 去重匹配 + 关系管理 + 经验链接/取消链接
- `versioning.rs` — 通用版本化（知识版本、经验版本、Wiki 页面版本的创建和查询）
- `auto_identify.rs` — Markdown 解析引擎：将原始 Markdown 拆分为 ParsedSection（知识/经验/自由文本），匹配已有实体或创建新实体
- `wiki_compose.rs` — Wiki sections 组装：从 DB 加载解析后的 sections、重建 Markdown（round-trip）、保存 sections、创建 sections 快照

## 约定

- **分层原则**：Handler（薄层）→ Service（业务核心）→ Model（纯数据）
- Service 函数接收 `&SqlitePool`，不依赖 `actix_web`
- 版本号从 1 开始递增，content 变化时才创建新版本
- 标题匹配使用大小写不敏感精确匹配（`LOWER(title) = LOWER(?)`）

## 依赖关系

- 被 `handlers/` 调用
- 依赖 `models/` 的数据结构
- 依赖 `error::AppError`
