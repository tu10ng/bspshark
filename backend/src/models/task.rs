use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub assignee: Option<String>,
    pub assigned_by: Option<String>,
    pub status: String,
    pub modules: String, // JSON array as string
    pub discovered_pitfalls_notes: Option<String>,
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTask {
    pub title: String,
    pub description: Option<String>,
    pub assignee: Option<String>,
    pub assigned_by: Option<String>,
    pub modules: Option<Vec<String>>,
    pub due_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTask {
    pub title: Option<String>,
    pub description: Option<String>,
    pub assignee: Option<String>,
    pub assigned_by: Option<String>,
    pub status: Option<String>,
    pub modules: Option<Vec<String>>,
    pub discovered_pitfalls_notes: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TaskQuery {
    pub assignee: Option<String>,
    pub status: Option<String>,
    pub module: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TaskArtifact {
    pub id: String,
    pub task_id: String,
    pub artifact_type: String,
    pub title: String,
    pub url: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateArtifact {
    pub artifact_type: String,
    pub title: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct NodeRef {
    pub node_id: String,
}

#[derive(Debug, Deserialize)]
pub struct PitfallRef {
    pub pitfall_id: String,
}

/// Task detail with related nodes, pitfalls, and artifacts
#[derive(Debug, Serialize)]
pub struct TaskDetail {
    #[serde(flatten)]
    pub task: Task,
    pub nodes: Vec<super::knowledge_tree::TreeNode>,
    pub artifacts: Vec<TaskArtifact>,
}
