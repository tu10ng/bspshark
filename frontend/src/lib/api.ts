import type { Article, Tool, ToolExecution, DashboardStats } from "./types";

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

// Articles
export function getArticles(params?: {
  q?: string;
  category?: string;
}): Promise<Article[]> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", params.q);
  if (params?.category) searchParams.set("category", params.category);
  const qs = searchParams.toString();
  return fetchApi(`/api/v1/articles${qs ? `?${qs}` : ""}`);
}

export function getArticle(id: number): Promise<Article> {
  return fetchApi(`/api/v1/articles/${id}`);
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
