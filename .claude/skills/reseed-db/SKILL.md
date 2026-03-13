---
name: reseed-db
description: Delete database, re-run migrations, and populate sample data
disable-model-invocation: true
argument-hint: ""
allowed-tools: Bash
---

# reseed-db: 重置数据库并填充示例数据

删除现有数据库、重新执行迁移、运行 populate_knowledge.sh 填充示例数据，最后验证数据完整性。

## 步骤 1：删除现有数据库

```bash
rm -f backend/bspshark.db
```

## 步骤 2：执行数据库迁移

```bash
cd backend && export PATH="$HOME/.cargo/bin:$PATH" && sqlx database create && sqlx migrate run
```

如果 `sqlx` 命令不存在，先安装：

```bash
cargo install sqlx-cli --no-default-features --features sqlite
```

## 步骤 3：启动后端

```bash
cd backend && export PATH="$HOME/.cargo/bin:$PATH" && cargo run -j 6 &
```

等待后端就绪（轮询 `curl -sf http://localhost:8080/api/v1/knowledge-trees`，最多 60 秒）。

## 步骤 4：运行 populate_knowledge.sh

```bash
bash populate_knowledge.sh
```

检查输出中是否有 curl 错误。如果有任何 Phase 失败，立即停止并报告错误。

## 步骤 5：验证数据完整性

运行以下验证查询并对比期望值：

```bash
API="http://localhost:8080/api/v1"
curl -s $API/knowledge-trees | jq 'length'    # 期望: 1
curl -s $API/experiences | jq 'length'        # 期望: 43
curl -s $API/tasks | jq 'length'              # 期望: 3
```

以表格形式输出验证结果（检查项 / 期望 / 实际）。

## 步骤 6：关闭后端

```bash
pkill -f "target/debug/backend"
```

## 注意事项

- 所有 cargo 命令必须加 `-j 6`
- 如果后端已经在运行（端口 8080 已占用），跳过步骤 3，直接跑 populate
- 如果 populate 之前数据库已有数据会导致重复，所以步骤 1 的删库是必要的
