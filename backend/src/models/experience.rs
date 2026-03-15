use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Experience {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: String,
    pub status: String,
    pub resolution_notes: Option<String>,
    pub tags: String, // JSON array as string
    pub content: Option<String>, // Full Markdown content (description is the summary)
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateExperience {
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExperience {
    pub title: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub resolution_notes: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ExperienceQuery {
    pub q: Option<String>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub tag: Option<String>,
}

/// Experience with info about which nodes/trees reference it
#[derive(Debug, Serialize)]
pub struct ExperienceWithRefs {
    #[serde(flatten)]
    pub experience: Experience,
    pub references: Vec<ExperienceReference>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ExperienceReference {
    pub node_id: String,
    pub node_title: String,
    pub tree_id: String,
    pub tree_name: String,
}
