use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Pitfall {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: String,
    pub status: String,
    pub resolution_notes: Option<String>,
    pub tags: String, // JSON array as string
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatePitfall {
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePitfall {
    pub title: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub resolution_notes: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct PitfallQuery {
    pub q: Option<String>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub tag: Option<String>,
}

/// Pitfall with info about which nodes/trees reference it
#[derive(Debug, Serialize)]
pub struct PitfallWithRefs {
    #[serde(flatten)]
    pub pitfall: Pitfall,
    pub references: Vec<PitfallReference>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct PitfallReference {
    pub node_id: String,
    pub node_title: String,
    pub tree_id: String,
    pub tree_name: String,
}
