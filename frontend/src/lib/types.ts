// Wiki System

export interface WikiPage {
  id: string;
  parent_id: string | null;
  title: string;
  content: string;
  is_folder: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WikiTreeNode {
  id: string;
  parent_id: string | null;
  title: string;
  is_folder: boolean;
  sort_order: number;
  children: WikiTreeNode[];
}

export interface RecentWikiPage {
  id: string;
  title: string;
  updated_at: string;
}

export interface WikiAttachment {
  id: string;
  url: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  language: "python" | "java" | "bash";
  script_path: string;
  parameters: ToolParameter[];
  created_at: string;
  updated_at: string;
}

export interface ToolParameter {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "select";
  required: boolean;
  default?: string;
  options?: string[];
  placeholder?: string;
}

export interface ToolExecution {
  id: number;
  tool_id: number;
  parameters: Record<string, string>;
  status: "running" | "completed" | "failed";
  output: string;
  started_at: string;
  finished_at?: string;
}

export interface DashboardStats {
  wiki_page_count: number;
  tool_count: number;
  execution_count: number;
  active_tools: number;
}

// Knowledge Management System

export interface KnowledgeTree {
  id: string;
  name: string;
  description: string | null;
  module: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreeNode {
  id: string;
  tree_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TreeNodeNested extends TreeNode {
  experiences: Experience[];
  children: TreeNodeNested[];
  instance_ids: string[];
}

export interface KnowledgeInstance {
  id: string;
  group_node_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Experience {
  id: string;
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "resolved" | "transformed";
  resolution_notes: string | null;
  tags: string; // JSON array as string
  created_at: string;
  updated_at: string;
}

export interface ExperienceReference {
  node_id: string;
  node_title: string;
  tree_id: string;
  tree_name: string;
}

export interface ExperienceWithRefs extends Experience {
  references: ExperienceReference[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  assigned_by: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  modules: string; // JSON array as string
  discovered_experiences_notes: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskArtifact {
  id: string;
  task_id: string;
  artifact_type: "design_doc" | "arch_review_video" | "test_review_video" | "other";
  title: string;
  url: string;
  created_at: string;
}

export interface TaskDetail extends Task {
  nodes: TreeNode[];
  artifacts: TaskArtifact[];
}
