import type {
  WikiPageNested,
  WikiPageWithPath,
  WikiPage,
  Tool,
  ToolExecution,
  DashboardStats,
  KnowledgeTree,
  KnowledgeInstance,
  TreeNodeNested,
  Experience,
  ExperienceWithRefs,
  Task,
  TaskDetail,
  TaskArtifact,
  TreeNode,
} from "./types";

const BASE_URL =
  typeof window === "undefined"
    ? process.env.BACKEND_URL || "http://localhost:8080"
    : "";

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Dashboard
export function getStats(): Promise<DashboardStats> {
  return fetchApi("/api/v1/stats");
}

// Wiki Pages
export function getWikiTree(): Promise<WikiPageNested[]> {
  return fetchApi("/api/v1/wiki");
}

export function getWikiPageByPath(path: string): Promise<WikiPageWithPath> {
  return fetchApi(`/api/v1/wiki/page?path=${encodeURIComponent(path)}`);
}

export function getWikiPageById(id: string): Promise<WikiPageWithPath> {
  return fetchApi(`/api/v1/wiki/pages/${id}`);
}

export function createWikiPage(data: {
  parent_id?: string;
  title: string;
  slug: string;
  content?: string;
}): Promise<WikiPage> {
  return fetchApi("/api/v1/wiki/pages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateWikiPage(
  id: string,
  data: { title?: string; slug?: string; content?: string }
): Promise<WikiPage> {
  return fetchApi(`/api/v1/wiki/pages/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteWikiPage(id: string): Promise<void> {
  return fetchApi(`/api/v1/wiki/pages/${id}`, { method: "DELETE" });
}

export function reorderWikiPage(
  id: string,
  data: { parent_id?: string; sort_order: number }
): Promise<WikiPage> {
  return fetchApi(`/api/v1/wiki/pages/${id}/reorder`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Tools
export function getTools(params?: {
  language?: string;
}): Promise<Tool[]> {
  const searchParams = new URLSearchParams();
  if (params?.language) searchParams.set("language", params.language);
  const qs = searchParams.toString();
  return fetchApi(`/api/v1/tools${qs ? `?${qs}` : ""}`);
}

export function getTool(id: number): Promise<Tool> {
  return fetchApi(`/api/v1/tools/${id}`);
}

export function executeTool(
  id: number,
  parameters: Record<string, string>
): Promise<ToolExecution> {
  return fetchApi(`/api/v1/tools/${id}/execute`, {
    method: "POST",
    body: JSON.stringify({ parameters }),
  });
}

// SSE endpoint for tool execution streaming
export function getToolExecutionSSEUrl(executionId: number): string {
  return `${BASE_URL}/api/v1/executions/${executionId}/stream`;
}

// Knowledge Trees
export function getKnowledgeTrees(params?: {
  module?: string;
}): Promise<KnowledgeTree[]> {
  const searchParams = new URLSearchParams();
  if (params?.module) searchParams.set("module", params.module);
  const qs = searchParams.toString();
  return fetchApi(`/api/v1/knowledge-trees${qs ? `?${qs}` : ""}`);
}

export function getKnowledgeTree(id: string): Promise<KnowledgeTree> {
  return fetchApi(`/api/v1/knowledge-trees/${id}`);
}

export function createKnowledgeTree(data: {
  name: string;
  description?: string;
  module?: string;
}): Promise<KnowledgeTree> {
  return fetchApi("/api/v1/knowledge-trees", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateKnowledgeTree(
  id: string,
  data: { name?: string; description?: string; module?: string }
): Promise<KnowledgeTree> {
  return fetchApi(`/api/v1/knowledge-trees/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteKnowledgeTree(id: string): Promise<void> {
  return fetchApi(`/api/v1/knowledge-trees/${id}`, { method: "DELETE" });
}

export function getTreeNodes(treeId: string): Promise<TreeNodeNested[]> {
  return fetchApi(`/api/v1/knowledge-trees/${treeId}/nodes`);
}

// Tree Nodes
export function createTreeNode(data: {
  tree_id: string;
  parent_id?: string;
  title: string;
  description?: string;
}): Promise<TreeNode> {
  return fetchApi("/api/v1/tree-nodes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTreeNode(
  id: string,
  data: { title?: string; description?: string }
): Promise<TreeNode> {
  return fetchApi(`/api/v1/tree-nodes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteTreeNode(id: string): Promise<void> {
  return fetchApi(`/api/v1/tree-nodes/${id}`, { method: "DELETE" });
}

export function reorderTreeNode(
  id: string,
  data: { parent_id?: string; sort_order: number }
): Promise<TreeNode> {
  return fetchApi(`/api/v1/tree-nodes/${id}/reorder`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function linkNodeExperience(
  nodeId: string,
  experienceId: string
): Promise<void> {
  return fetchApi(`/api/v1/tree-nodes/${nodeId}/experiences`, {
    method: "POST",
    body: JSON.stringify({ experience_id: experienceId }),
  });
}

export function unlinkNodeExperience(
  nodeId: string,
  experienceId: string
): Promise<void> {
  return fetchApi(`/api/v1/tree-nodes/${nodeId}/experiences/${experienceId}`, {
    method: "DELETE",
  });
}

// Knowledge Instances
export function getInstances(
  groupNodeId: string
): Promise<KnowledgeInstance[]> {
  return fetchApi(`/api/v1/tree-nodes/${groupNodeId}/instances`);
}

export function createInstance(data: {
  group_node_id: string;
  name: string;
  description?: string;
}): Promise<KnowledgeInstance> {
  return fetchApi("/api/v1/knowledge-instances", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateInstance(
  id: string,
  data: { name?: string; description?: string }
): Promise<KnowledgeInstance> {
  return fetchApi(`/api/v1/knowledge-instances/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteInstance(id: string): Promise<void> {
  return fetchApi(`/api/v1/knowledge-instances/${id}`, { method: "DELETE" });
}

export function assignNodeInstance(
  nodeId: string,
  instanceId: string
): Promise<void> {
  return fetchApi(`/api/v1/tree-nodes/${nodeId}/instances/${instanceId}`, {
    method: "POST",
  });
}

export function unassignNodeInstance(
  nodeId: string,
  instanceId: string
): Promise<void> {
  return fetchApi(`/api/v1/tree-nodes/${nodeId}/instances/${instanceId}`, {
    method: "DELETE",
  });
}

// Experiences
export function getExperiences(params?: {
  q?: string;
  status?: string;
  severity?: string;
  tag?: string;
}): Promise<Experience[]> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", params.q);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.severity) searchParams.set("severity", params.severity);
  if (params?.tag) searchParams.set("tag", params.tag);
  const qs = searchParams.toString();
  return fetchApi(`/api/v1/experiences${qs ? `?${qs}` : ""}`);
}

export function getExperience(id: string): Promise<ExperienceWithRefs> {
  return fetchApi(`/api/v1/experiences/${id}`);
}

export function createExperience(data: {
  title: string;
  description?: string;
  severity?: string;
  tags?: string[];
}): Promise<Experience> {
  return fetchApi("/api/v1/experiences", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateExperience(
  id: string,
  data: {
    title?: string;
    description?: string;
    severity?: string;
    status?: string;
    resolution_notes?: string;
    tags?: string[];
  }
): Promise<Experience> {
  return fetchApi(`/api/v1/experiences/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteExperience(id: string): Promise<void> {
  return fetchApi(`/api/v1/experiences/${id}`, { method: "DELETE" });
}

// Tasks
export function getTasks(params?: {
  assignee?: string;
  status?: string;
  module?: string;
}): Promise<Task[]> {
  const searchParams = new URLSearchParams();
  if (params?.assignee) searchParams.set("assignee", params.assignee);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.module) searchParams.set("module", params.module);
  const qs = searchParams.toString();
  return fetchApi(`/api/v1/tasks${qs ? `?${qs}` : ""}`);
}

export function getTask(id: string): Promise<TaskDetail> {
  return fetchApi(`/api/v1/tasks/${id}`);
}

export function createTask(data: {
  title: string;
  description?: string;
  assignee?: string;
  assigned_by?: string;
  modules?: string[];
  due_date?: string;
}): Promise<{ task: Task; auto_identified_experiences: Experience[] }> {
  return fetchApi("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    assignee?: string;
    assigned_by?: string;
    status?: string;
    modules?: string[];
    discovered_experiences_notes?: string;
    due_date?: string;
  }
): Promise<Task> {
  return fetchApi(`/api/v1/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteTask(id: string): Promise<void> {
  return fetchApi(`/api/v1/tasks/${id}`, { method: "DELETE" });
}

export function linkTaskNode(
  taskId: string,
  nodeId: string
): Promise<void> {
  return fetchApi(`/api/v1/tasks/${taskId}/nodes`, {
    method: "POST",
    body: JSON.stringify({ node_id: nodeId }),
  });
}

export function unlinkTaskNode(
  taskId: string,
  nodeId: string
): Promise<void> {
  return fetchApi(`/api/v1/tasks/${taskId}/nodes/${nodeId}`, {
    method: "DELETE",
  });
}

export function createTaskArtifact(
  taskId: string,
  data: { artifact_type: string; title: string; url: string }
): Promise<TaskArtifact> {
  return fetchApi(`/api/v1/tasks/${taskId}/artifacts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteTaskArtifact(
  taskId: string,
  artifactId: string
): Promise<void> {
  return fetchApi(`/api/v1/tasks/${taskId}/artifacts/${artifactId}`, {
    method: "DELETE",
  });
}

export function getTaskExperiences(taskId: string): Promise<Experience[]> {
  return fetchApi(`/api/v1/tasks/${taskId}/experiences`);
}
