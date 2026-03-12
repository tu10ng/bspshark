---
name: update-doc
description: Update memory documentation and reflect on problems discovered during task execution
disable-model-invocation: true
argument-hint: "[optional: specific topic to document]"
---

# update-doc: 更新记忆文档 + 执行反思

当用户说 "update doc" 时执行以下流程。

## 步骤 1：回顾本次会话的工作内容

回顾当前会话中完成的所有任务，识别：

- 做了哪些改动（代码、数据、配置）
- 遇到了哪些问题（bug、遗漏、返工）
- 有没有用户指出的错误或遗漏（这是最重要的反思来源）

## 步骤 2：读取现有记忆文件

读取 memory 目录下的所有文件，了解已有内容，避免重复：

- `MEMORY.md` — 索引文件
- 各主题文件（如 `planning-lessons.md`, `component-patterns.md`, `tree-flow-layout.md` 等）

## 步骤 3：更新技术文档

如果本次会话涉及架构变更、新增组件模式、布局算法改动等，更新对应的主题文件：

- 已有主题文件 → Edit 更新相关 section
- 全新主题 → 创建新文件并在 MEMORY.md 中添加索引条目

**原则**：记录当前实现状态和关键决策，不记录临时调试过程。

## 步骤 4：反思问题与遗漏（关键步骤）

对本次会话中出现的每个问题/遗漏，进行结构化分析并写入 `planning-lessons.md`：

### 分析框架

对每个问题回答：

1. **现象**：发生了什么？用户指出了什么？
2. **根因分析**：为什么会发生？是 plan 的问题还是执行的问题？常见根因类型：
   - 认知惯性（按经验假设，没查验实际情况）
   - Plan 结构缺陷（关键步骤藏在描述性文字中，没有独立成 action item）
   - 完成标准不一致（代码完成 ≠ 用户可感知的结果完成）
   - 非代码步骤遗漏（数据迁移、配置变更、环境设置等）
   - 组件通信模式未设计（多入口触发、controlled vs uncontrolled）
   - API/类型签名未查验（依赖经验假设而非实际接口）
3. **Plan 应该怎么做**：如果重来，plan 阶段应该如何避免这个问题？

### 写入格式

追加到 `planning-lessons.md`，按日期分 section，每个问题一个 subsection。如果发现新的盲区类型，追加到"总结"section 的编号列表中。

## 步骤 5：如果没有问题

如果本次会话一切顺利没有遗漏，也要记录：

- 在对应日期 section 写一行"本次实现顺利，无需反思"
- 简要说明为什么顺利（比如 plan 粒度足够细、数据操作有独立 checklist 等），作为正向 pattern 积累

## 注意事项

- 不要重复已有内容，先读再写
- MEMORY.md 保持简洁（< 200 行），详细内容放主题文件
- 反思部分要诚实，不要回避自身执行中的失误
- 如果用户传了 $ARGUMENTS，优先围绕该主题更新
