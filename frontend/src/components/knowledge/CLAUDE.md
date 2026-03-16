# knowledge 组件

## 职责

知识管理系统的前端可视化和交互组件。

## 关键文件

- `tree-flow.tsx` — 知识树流程图（React Flow，水平布局，展开/折叠，泳道视图）
- `tree-card.tsx` — 知识树卡片
- `tree-detail-header.tsx` — 知识树详情头部
- `tree-form.tsx` — 知识树创建/编辑表单
- `tree-list.tsx` / `tree-list-item.tsx` / `tree-list-panel.tsx` — 知识树列表
- `tree-search.tsx` — 知识树搜索
- `node-form.tsx` — 节点创建/编辑表单
- `node-detail-sheet.tsx` — 节点详情侧边栏
- `node-experience-manager.tsx` — 节点-经验关联管理
- `instance-manager.tsx` — 并行知识实例管理
- `knowledge-version-timeline.tsx` — 知识版本时间线组件
- `knowledge-items-list.tsx` — 知识项列表页组件（搜索 + 卡片列表 + 详情 Sheet）

## 数据源

- `tree-flow.tsx` 通过 `getTreeNodes(treeId)` 获取数据
- 后端自动选择数据源：如果 `knowledge_tree_roots` 有记录则用新系统（knowledge_items + knowledge_relations），否则用旧系统（tree_nodes）
- 前端无需区分数据源，API 返回格式相同（`TreeNodeNested[]`）

## 约定

- React Flow 节点类型：KnowledgeNode, CollapsedNode, GroupBorderNode, ExperienceNode, LaneLabelNode
- 水平布局，左到右展开
- 有子节点时可点击展开/折叠

## 依赖关系

- 使用 `@/lib/api` 调用后端 API
- 使用 `@xyflow/react` 进行流程图渲染
- 使用 `@/lib/types` 的 TreeNodeNested, KnowledgeInstance, Experience 类型
