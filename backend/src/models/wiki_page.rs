use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct WikiPage {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct WikiPageNested {
    #[serde(flatten)]
    pub page: WikiPage,
    pub children: Vec<WikiPageNested>,
}

#[derive(Debug, Serialize)]
pub struct WikiPageBreadcrumb {
    pub id: String,
    pub title: String,
    pub slug: String,
}

#[derive(Debug, Serialize)]
pub struct WikiPageWithPath {
    #[serde(flatten)]
    pub page: WikiPage,
    pub path: String,
    pub breadcrumbs: Vec<WikiPageBreadcrumb>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWikiPage {
    pub parent_id: Option<String>,
    pub title: String,
    pub slug: String,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWikiPage {
    pub title: Option<String>,
    pub slug: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderWikiPage {
    pub parent_id: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Deserialize)]
pub struct BatchReorderItem {
    pub id: String,
    pub parent_id: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Deserialize)]
pub struct BatchReorderWikiPages {
    pub items: Vec<BatchReorderItem>,
}
