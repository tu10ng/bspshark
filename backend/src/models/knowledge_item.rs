use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct KnowledgeItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub slug: String,
    pub tags: String, // JSON array as string
    pub current_version: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateKnowledgeItem {
    pub title: String,
    pub content: Option<String>,
    pub slug: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateKnowledgeItem {
    pub title: Option<String>,
    pub content: Option<String>,
    pub slug: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct KnowledgeItemQuery {
    pub q: Option<String>,
    pub tag: Option<String>,
}

/// Knowledge item with the wiki pages that reference it
#[derive(Debug, Serialize)]
pub struct KnowledgeItemWithRefs {
    #[serde(flatten)]
    pub item: KnowledgeItem,
    pub wiki_references: Vec<WikiReference>,
    pub experience_ids: Vec<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct WikiReference {
    pub wiki_page_id: String,
    pub wiki_page_title: String,
    pub wiki_page_slug: String,
}

// Version types

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct KnowledgeItemVersion {
    pub id: String,
    pub knowledge_item_id: String,
    pub version: i64,
    pub title: String,
    pub content: String,
    pub source_wiki_page_id: Option<String>,
    pub created_at: String,
}

/// Extended version with source wiki page title (from JOIN)
#[derive(Debug, Serialize, FromRow)]
pub struct KnowledgeItemVersionWithSource {
    pub id: String,
    pub knowledge_item_id: String,
    pub version: i64,
    pub title: String,
    pub content: String,
    pub source_wiki_page_id: Option<String>,
    pub source_wiki_page_title: Option<String>,
    pub created_at: String,
}
