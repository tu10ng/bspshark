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
├── models/          # 数据模型 (SQLx FromRow)
├── handlers/        # HTTP 请求处理
├── executor/        # 工具执行引擎
└── middleware/      # 中间件

tests/
├── common/mod.rs    # 测试工具函数
└── *_test.rs        # 集成测试

migrations/          # SQL 迁移脚本
tools/               # 工具脚本
├── python/
├── java/
└── bash/
```

## API 设计

- 前缀: `/api/v1/`
- RESTful 风格
- 响应格式: JSON

## 数据库约定

- 主键: UUID (TEXT 类型)
- JSON 字段: 存为 TEXT
- 时间: ISO 8601 格式 (`YYYY-MM-DDTHH:MM:SSZ`)

## 错误处理

- 定义 `AppError` enum 实现 `actix_web::ResponseError`
- 统一错误响应格式: `{ "error": "message" }`

## 工具执行架构

- `ToolExecutor` trait 定义执行接口
- 每种语言实现各自的 executor
- SSE 流式输出执行结果
- Sandbox 安全措施 (超时、资源限制)

## 测试

- **单元测试**: 模块内 `#[cfg(test)] mod tests` 块
- **集成测试**: `tests/` 目录，使用 `actix_web::test` 工具
- **运行**: `cargo test`
