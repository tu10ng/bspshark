# backend

## 技术栈

- Rust (edition 2024)
- Actix-web 4 (HTTP 框架)
- SQLx + SQLite (数据库)
- Tokio (异步运行时)

## 目录结构

```
src/
├── main.rs          # 入口 + 服务器配置 + health 端点
├── lib.rs           # 路由注册
├── db.rs            # SqlitePool 初始化 + 迁移
├── error.rs         # AppError 枚举
├── models/          # 数据模型 (SQLx FromRow)
│   ├── knowledge_tree.rs      # KnowledgeTree, TreeNode, TreeNodeNested
│   ├── knowledge_item.rs      # KnowledgeItem, versions, wiki refs
│   ├── knowledge_relation.rs  # KnowledgeRelation, tree roots
│   ├── experience.rs          # Experience (含 content 字段), refs
│   ├── knowledge_instance.rs  # KnowledgeInstance
│   ├── task.rs                # Task, TaskArtifact, TaskDetail
│   ├── wiki_page.rs           # WikiPage (含 sections_enabled), sections
│   └── wiki_page_section.rs   # WikiPageSection, versions
├── services/        # ★ 业务逻辑层
│   ├── knowledge.rs         # 知识 CRUD + 去重 + 关系 + 经验链接
│   ├── versioning.rs        # 版本管理（知识/经验/Wiki 版本创建和查询）
│   ├── auto_identify.rs     # Markdown 解析 + 实体匹配/创建
│   └── wiki_compose.rs      # Wiki sections 组装 + Markdown 重建
├── handlers/        # HTTP 请求处理（薄层，调用 services）
│   ├── knowledge_tree.rs    # 知识树 CRUD + 双数据源节点查询
│   ├── knowledge_item.rs    # 知识项 CRUD + 关系 + 版本历史
│   ├── tree_node.rs         # 旧系统节点 CRUD（保留兼容）
│   ├── experience.rs        # 经验 CRUD + 版本历史
│   ├── task.rs              # 任务 CRUD + 工件
│   ├── wiki_page.rs         # Wiki CRUD（含自动识别 + 版本化）
│   └── upload.rs            # 文件上传
├── executor/        # 工具执行引擎
└── middleware/      # 中间件

tests/
├── common/mod.rs              # 测试工具函数
├── knowledge_item_test.rs     # 知识项 + 关系 + 自动识别集成测试
├── wiki_test.rs               # Wiki CRUD + 排序 + slug 集成测试
├── experience_test.rs         # 经验 CRUD + FTS 搜索
├── knowledge_test.rs          # 知识树 CRUD + 嵌套节点
├── task_test.rs               # 任务 CRUD + 经验自动识别
└── health_test.rs             # 健康检查

migrations/          # SQL 迁移脚本 (001-007)
tools/               # 工具脚本
├── python/
├── java/
└── bash/
```

## 分层架构

- **Handler**：接收 HTTP 请求 → 参数校验 → 调用 service → 返回响应。不包含业务逻辑。
- **Service**：业务逻辑核心。接收 `&SqlitePool` 和类型化参数，返回 `Result<T, AppError>`。
- **Model**：纯数据结构 + 序列化/反序列化。不包含逻辑。

## API 设计

- 前缀: `/api/v1/`
- RESTful 风格
- 响应格式: JSON

## 数据库约定

- 主键: UUID (TEXT 类型)
- JSON 字段: 存为 TEXT
- 时间: ISO 8601 格式 (`YYYY-MM-DDTHH:MM:SSZ`)

## 知识管理系统

### 新系统（knowledge_items）

- `knowledge_items`：原子知识单元，全局唯一 slug，完整 Markdown 内容
- `knowledge_relations`：知识间关系（parent_child / precedes / related_to）
- `knowledge_experience_refs`：知识-经验多对多
- `knowledge_tree_roots`：知识树入口点
- `wiki_page_sections`：Wiki 页面的有序 sections 组合
- 版本表：`knowledge_item_versions`、`experience_versions`、`wiki_page_versions`

### 双数据源兼容

`get_tree_nodes` 自动检测：如果 `knowledge_tree_roots` 有记录则用新系统，否则用旧系统（tree_nodes）。前端 API 返回格式不变。

### 自动识别流程

Wiki 保存时自动执行（所有页面默认启用）：
1. 解析 Markdown → `ParsedSection[]`
2. 匹配/创建 knowledge_items（标题精确匹配）
3. 匹配/创建 experiences（`[!EXPERIENCE]` callout）
4. 替换 `wiki_page_sections`
5. 创建版本快照

## 错误处理

- 定义 `AppError` enum 实现 `actix_web::ResponseError`
- 统一错误响应格式: `{ "error": "message" }`

## 工具执行架构

- `ToolExecutor` trait 定义执行接口
- 每种语言实现各自的 executor
- SSE 流式输出执行结果
- Sandbox 安全措施 (超时、资源限制)

## Wiki 系统

- `wiki_pages` 表：自引用树结构，`parent_id` FK ON DELETE CASCADE
- `sections_enabled` 列保留（默认值 1），知识识别对所有页面默认生效
- slug 路径寻址：`resolve_path()` 沿 parent_id 向上构建完整路径和面包屑
- 同级 slug 唯一性：`UNIQUE(COALESCE(parent_id, ''), slug)`
- 保留 slug：`edit`、`new` 不可用（与前端路由冲突）
- GET 端点始终返回 `sections[]`，含解析后的知识/经验实体

## 测试

- **单元测试**: 模块内 `#[cfg(test)] mod tests` 块（auto_identify 解析器 10 个测试、slug 生成 2 个测试）
- **集成测试**: `tests/` 目录，使用 `actix_web::test` 工具
- **运行**: `cargo test -j 6`
