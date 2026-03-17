// Wiki Pages

export interface WikiPage {
  id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  content: string;
  sort_order: number;
  sections_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface WikiPageNested extends WikiPage {
  children: WikiPageNested[];
}

export interface WikiPageBreadcrumb {
  id: string;
  title: string;
  slug: string;
}

export interface WikiPageWithPath extends WikiPage {
  path: string;
  breadcrumbs: WikiPageBreadcrumb[];
  sections?: WikiPageSection[];
  /** Markdown rebuilt from current sections/knowledge items. Use for editing. */
  rebuilt_content?: string;
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
  wiki_count: number;
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
  content: string | null;
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

// Knowledge Items (new knowledge management system)

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  slug: string;
  tags: string; // JSON array as string
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeItemWithRefs extends KnowledgeItem {
  wiki_references: WikiReference[];
  experience_ids: string[];
}

export interface WikiReference {
  wiki_page_id: string;
  wiki_page_title: string;
  wiki_page_slug: string;
}

export interface KnowledgeItemVersion {
  id: string;
  knowledge_item_id: string;
  version: number;
  title: string;
  content: string;
  source_wiki_page_id: string | null;
  source_wiki_page_title?: string;
  created_at: string;
}

export interface WikiPageSection {
  id: string;
  section_type: "knowledge" | "experience" | "freeform";
  knowledge_item?: KnowledgeItem;
  experience?: Experience;
  freeform_content?: string;
  sort_order: number;
}

export interface WikiPageVersion {
  id: string;
  wiki_page_id: string;
  version: number;
  title: string;
  content: string;
  sections_snapshot?: string;
  created_at: string;
}

export interface IdentifySummary {
  knowledge_created: number;
  knowledge_updated: number;
  experience_created: number;
  experience_updated: number;
  warnings: string[];
}

export interface WikiPageMutationResponse extends WikiPageWithPath {
  identify_summary?: IdentifySummary;
}

export interface ExperienceVersion {
  id: string;
  experience_id: string;
  version: number;
  title: string;
  description: string | null;
  content: string | null;
  severity: string;
  status: string;
  resolution_notes: string | null;
  source_wiki_page_id: string | null;
  created_at: string;
}

export interface KnowledgeRelation {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: "parent_child" | "precedes" | "related_to";
  sort_order: number;
  created_at: string;
}
