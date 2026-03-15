use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::experience::Experience;
use super::knowledge_item::KnowledgeItem;

/// Raw section row from DB
#[derive(Debug, Clone, FromRow)]
pub struct WikiPageSectionRow {
    pub id: String,
    pub wiki_page_id: String,
    pub section_type: String,
    pub knowledge_item_id: Option<String>,
    pub experience_id: Option<String>,
    pub freeform_content: Option<String>,
    pub sort_order: i64,
}

/// Section with resolved entities for API responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WikiPageSection {
    pub id: String,
    pub section_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub knowledge_item: Option<KnowledgeItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub experience: Option<Experience>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub freeform_content: Option<String>,
    pub sort_order: i64,
}

/// Wiki page version history
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WikiPageVersion {
    pub id: String,
    pub wiki_page_id: String,
    pub version: i64,
    pub title: String,
    pub content: String,
    pub sections_snapshot: Option<String>,
    pub created_at: String,
}

/// Experience version history
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ExperienceVersion {
    pub id: String,
    pub experience_id: String,
    pub version: i64,
    pub title: String,
    pub description: Option<String>,
    pub content: Option<String>,
    pub severity: String,
    pub status: String,
    pub resolution_notes: Option<String>,
    pub source_wiki_page_id: Option<String>,
    pub created_at: String,
}
