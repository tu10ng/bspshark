use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct WikiPage {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub content: String,
    pub is_folder: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct WikiPageSummary {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub is_folder: bool,
    pub sort_order: i32,
}

#[derive(Debug, Serialize)]
pub struct WikiTreeNode {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub is_folder: bool,
    pub sort_order: i32,
    pub children: Vec<WikiTreeNode>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct WikiAttachment {
    pub id: String,
    pub page_id: Option<String>,
    pub filename: String,
    pub original_name: String,
    pub mime_type: String,
    pub size: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateWikiPage {
    pub parent_id: Option<String>,
    pub title: String,
    pub content: Option<String>,
    pub is_folder: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWikiPage {
    pub title: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderWikiPage {
    pub parent_id: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Deserialize)]
pub struct RecentQuery {
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct RecentWikiPage {
    pub id: String,
    pub title: String,
    pub updated_at: String,
}
