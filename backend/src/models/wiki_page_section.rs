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

/// Flattened row from JOIN query (sections + knowledge_items + experiences)
#[derive(Debug, Clone, FromRow)]
pub struct WikiPageSectionJoinRow {
    // wiki_page_sections fields
    pub id: String,
    pub section_type: String,
    pub knowledge_item_id: Option<String>,
    pub experience_id: Option<String>,
    pub freeform_content: Option<String>,
    pub sort_order: i64,
    // knowledge_items fields (prefixed with ki_)
    pub ki_id: Option<String>,
    pub ki_title: Option<String>,
    pub ki_content: Option<String>,
    pub ki_slug: Option<String>,
    pub ki_tags: Option<String>,
    pub ki_current_version: Option<i64>,
    pub ki_created_at: Option<String>,
    pub ki_updated_at: Option<String>,
    // experiences fields (prefixed with exp_)
    pub exp_id: Option<String>,
    pub exp_title: Option<String>,
    pub exp_description: Option<String>,
    pub exp_severity: Option<String>,
    pub exp_status: Option<String>,
    pub exp_resolution_notes: Option<String>,
    pub exp_tags: Option<String>,
    pub exp_content: Option<String>,
    pub exp_created_at: Option<String>,
    pub exp_updated_at: Option<String>,
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
