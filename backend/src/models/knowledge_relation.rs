use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct KnowledgeRelation {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub relation_type: String,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateKnowledgeRelation {
    pub source_id: String,
    pub target_id: String,
    pub relation_type: String,
    pub sort_order: Option<i64>,
}

/// Knowledge tree root entry
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct KnowledgeTreeRoot {
    pub tree_id: String,
    pub knowledge_item_id: String,
    pub sort_order: i64,
}
