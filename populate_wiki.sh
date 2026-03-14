#!/bin/bash
# Populate wiki with sample documentation pages
# Usage: bash populate_wiki.sh
# Requires backend running on localhost:8080

BASE="http://localhost:8080/api/v1"

echo "=== Populating Wiki Pages ==="

# 1. Root: 入门
GETTING_STARTED=$(curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "入门指南",
    "slug": "getting-started",
    "content": "# 入门指南\n\n欢迎使用 bspshark 平台！本指南帮助你快速上手。\n\n## 系统要求\n\n- Node.js 20+\n- Rust 1.80+\n- SQLite 3\n- pnpm 9+\n\n## 快速开始\n\n```bash\n# 克隆仓库\ngit clone https://github.com/example/bspshark.git\ncd bspshark\n\n# 启动\nmake dev\n```\n\n前端访问 `http://localhost:3000`，后端 API 在 `http://localhost:8080`。"
  }' | jq -r '.id')
echo "Created: 入门指南 ($GETTING_STARTED)"

# 1.1 安装
curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent_id\": \"$GETTING_STARTED\",
    \"title\": \"安装与配置\",
    \"slug\": \"install\",
    \"content\": \"# 安装与配置\n\n## 依赖安装\n\n### 前端\n\n\`\`\`bash\ncd frontend\npnpm install\n\`\`\`\n\n### 后端\n\n\`\`\`bash\ncd backend\ncargo build -j 6\n\`\`\`\n\n## 环境变量\n\n在项目根目录创建 \`.env\` 文件：\n\n\`\`\`env\nDATABASE_URL=sqlite://bspshark.db\nBACKEND_PORT=8080\n\`\`\`\n\n## 数据库迁移\n\n\`\`\`bash\nmake db-migrate\n\`\`\`\"
  }" > /dev/null
echo "Created: 安装与配置"

# 2. Root: 开发
DEV=$(curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "开发指南",
    "slug": "dev",
    "content": "# 开发指南\n\n本节介绍前后端开发流程和规范。"
  }' | jq -r '.id')
echo "Created: 开发指南 ($DEV)"

# 2.1 前端开发
FRONTEND=$(curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent_id\": \"$DEV\",
    \"title\": \"前端开发\",
    \"slug\": \"frontend\",
    \"content\": \"# 前端开发\n\n## 技术栈\n\n- **Next.js 16** (App Router)\n- **shadcn/ui** (base-nova 风格)\n- **TailwindCSS v4**\n- **pnpm**\n\n## 目录结构\n\n\`\`\`\nsrc/\n├── app/          # 路由\n├── components/   # 组件\n├── lib/          # 工具\n└── hooks/        # Hooks\n\`\`\`\n\n## 开发命令\n\n\`\`\`bash\nmake dev-frontend   # 启动开发服务器\npnpm test           # 运行测试\npnpm lint           # 代码检查\n\`\`\`\n\n## 组件规范\n\n- 使用 \`render\` prop 实现组件多态，不用 \`asChild\`\n- Button + Link 必须加 \`nativeButton={false}\`\n- 使用 \`cn()\` 合并 Tailwind 类名\"
  }" | jq -r '.id')
echo "Created: 前端开发 ($FRONTEND)"

# 2.1.1 组件开发
curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent_id\": \"$FRONTEND\",
    \"title\": \"组件开发\",
    \"slug\": \"components\",
    \"content\": \"# 组件开发\n\n## shadcn/ui 组件\n\n使用 CLI 添加组件：\n\n\`\`\`bash\nnpx shadcn@latest add button\n\`\`\`\n\n## 自定义组件\n\n放在 \`src/components/\` 对应模块目录下。\n\n## render prop 用法\n\n\`\`\`tsx\n// ✅ 正确\n<Button render={<Link href=\\\"/path\\\" />}>文字</Button>\n\n// ❌ 错误\n<Button asChild><Link href=\\\"/path\\\">文字</Link></Button>\n\`\`\`\n\n## 主题切换\n\n使用 \`ThemeToggle\` 组件，基于 \`useSyncExternalStore\` 监听 DOM class 变化。\"
  }" > /dev/null
echo "Created: 组件开发"

# 2.2 后端开发
BACKEND=$(curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent_id\": \"$DEV\",
    \"title\": \"后端开发\",
    \"slug\": \"backend\",
    \"content\": \"# 后端开发\n\n## 技术栈\n\n- **Rust** (edition 2024)\n- **Actix-web 4**\n- **SQLx + SQLite**\n- **Tokio**\n\n## 重要约定\n\n- cargo 命令必须加 \`-j 6\`\n- API 前缀 \`/api/v1/\`\n- 主键用 UUID (TEXT)\n- 时间用 ISO 8601\n\n## 添加新接口流程\n\n1. 创建 migration: \`migrations/NNN_xxx.up.sql\`\n2. 添加 model: \`src/models/xxx.rs\`\n3. 添加 handler: \`src/handlers/xxx.rs\`\n4. 注册路由: \`src/lib.rs\` 的 \`configure_app\`\n5. 写集成测试: \`tests/xxx_test.rs\`\n\n## 错误处理\n\n统一使用 \`AppError\` 枚举：\n\n\`\`\`rust\nAppError::NotFound(msg)\nAppError::BadRequest(msg)\nAppError::Internal(msg)\n\`\`\`\"
  }" | jq -r '.id')
echo "Created: 后端开发 ($BACKEND)"

# 2.2.1 数据库
curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent_id\": \"$BACKEND\",
    \"title\": \"数据库设计\",
    \"slug\": \"database\",
    \"content\": \"# 数据库设计\n\n## SQLite\n\n使用 SQLite 数据库，轻量部署。数据库文件位于 \`backend/bspshark.db\`。\n\n## 迁移\n\n迁移脚本在 \`backend/migrations/\` 目录，使用 SQLx 的迁移系统。\n\n\`\`\`bash\nmake db-migrate\n\`\`\`\n\n## 表结构\n\n| 表 | 说明 |\n|---|---|\n| wiki_pages | Wiki 文档页面 |\n| knowledge_trees | 知识树 |\n| tree_nodes | 树节点 |\n| experiences | 经验 |\n| tasks | 任务 |\n| tools | 工具注册 |\n\n## 级联删除\n\n所有关联表使用 \`ON DELETE CASCADE\`，删除父记录自动清理子记录。\"
  }" > /dev/null
echo "Created: 数据库设计"

# 3. Root: API 参考
API=$(curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API 参考",
    "slug": "api",
    "content": "# API 参考\n\n所有 API 使用 `/api/v1/` 前缀，返回 JSON 格式。\n\n## 错误响应\n\n```json\n{\n  \"error\": \"错误信息\"\n}\n```\n\n## 状态码\n\n| 状态码 | 说明 |\n|--------|------|\n| 200 | 成功 |\n| 201 | 创建成功 |\n| 204 | 删除成功 |\n| 400 | 请求参数错误 |\n| 404 | 资源不存在 |\n| 500 | 服务器内部错误 |"
  }' | jq -r '.id')
echo "Created: API 参考 ($API)"

# 3.1 Wiki API
curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent_id\": \"$API\",
    \"title\": \"Wiki API\",
    \"slug\": \"wiki\",
    \"content\": \"# Wiki API\n\n## 获取文档树\n\n\`\`\`\nGET /api/v1/wiki\n\`\`\`\n\n返回完整的嵌套文档树。\n\n## 按路径查找页面\n\n\`\`\`\nGET /api/v1/wiki/page?path=dev/frontend\n\`\`\`\n\n## 按 ID 查找页面\n\n\`\`\`\nGET /api/v1/wiki/pages/{id}\n\`\`\`\n\n## 创建页面\n\n\`\`\`\nPOST /api/v1/wiki/pages\n\`\`\`\n\n\`\`\`json\n{\n  \\\"title\\\": \\\"页面标题\\\",\n  \\\"slug\\\": \\\"url-slug\\\",\n  \\\"parent_id\\\": \\\"可选父页面ID\\\",\n  \\\"content\\\": \\\"Markdown 内容\\\"\n}\n\`\`\`\n\n## 更新页面\n\n\`\`\`\nPUT /api/v1/wiki/pages/{id}\n\`\`\`\n\n## 删除页面\n\n\`\`\`\nDELETE /api/v1/wiki/pages/{id}\n\`\`\`\n\n级联删除所有子页面。\"
  }" > /dev/null
echo "Created: Wiki API"

# 3.2 Knowledge API
curl -s -X POST "$BASE/wiki/pages" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent_id\": \"$API\",
    \"title\": \"知识树 API\",
    \"slug\": \"knowledge\",
    \"content\": \"# 知识树 API\n\n## 知识树 CRUD\n\n\`\`\`\nGET    /api/v1/knowledge-trees\nPOST   /api/v1/knowledge-trees\nGET    /api/v1/knowledge-trees/{id}\nPUT    /api/v1/knowledge-trees/{id}\nDELETE /api/v1/knowledge-trees/{id}\n\`\`\`\n\n## 获取树节点\n\n\`\`\`\nGET /api/v1/knowledge-trees/{id}/nodes\n\`\`\`\n\n返回嵌套的树节点结构，包含关联的经验和实例。\n\n## 树节点 CRUD\n\n\`\`\`\nPOST   /api/v1/tree-nodes\nPUT    /api/v1/tree-nodes/{id}\nDELETE /api/v1/tree-nodes/{id}\nPOST   /api/v1/tree-nodes/{id}/reorder\n\`\`\`\"
  }" > /dev/null
echo "Created: 知识树 API"

echo ""
echo "=== Done! ==="
echo "Visit http://localhost:3000/wiki to see the wiki."
