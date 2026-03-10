export interface Article {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
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
  article_count: number;
  tool_count: number;
  execution_count: number;
  active_tools: number;
}
