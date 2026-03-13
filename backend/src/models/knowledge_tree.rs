use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct KnowledgeTree {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub module: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateKnowledgeTree {
    pub name: String,
    pub description: Option<String>,
    pub module: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateKnowledgeTree {
    pub name: Option<String>,
    pub description: Option<String>,
    pub module: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TreeNode {
    pub id: String,
    pub tree_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTreeNode {
    pub tree_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTreeNode {
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderNode {
    pub parent_id: Option<String>,
    pub sort_order: i32,
    /// Optional: move node (and all descendants) to a different tree
    pub tree_id: Option<String>,
}

/// Nested tree node with children and associated experiences, used for API responses
#[derive(Debug, Serialize)]
pub struct TreeNodeNested {
    #[serde(flatten)]
    pub node: TreeNode,
    pub experiences: Vec<super::experience::Experience>,
    pub children: Vec<TreeNodeNested>,
    pub instance_ids: Vec<String>,
}
