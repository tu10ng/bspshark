use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::knowledge_item::{KnowledgeItemVersion, KnowledgeItemVersionWithSource};
use crate::models::wiki_page_section::{ExperienceVersion, WikiPageVersion};

// ---- Knowledge Item Versions ----

/// Create a version snapshot for a knowledge item.
pub async fn create_knowledge_version(
    pool: &SqlitePool,
    knowledge_item_id: &str,
    version: i64,
    title: &str,
    content: &str,
    source_wiki_page_id: Option<&str>,
) -> Result<KnowledgeItemVersion, AppError> {
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO knowledge_item_versions (id, knowledge_item_id, version, title, content, source_wiki_page_id)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(knowledge_item_id)
    .bind(version)
    .bind(title)
    .bind(content)
    .bind(source_wiki_page_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    sqlx::query_as::<_, KnowledgeItemVersion>(
        "SELECT * FROM knowledge_item_versions WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)
}

/// Get all versions of a knowledge item (with source wiki page titles).
pub async fn get_knowledge_versions(
    pool: &SqlitePool,
    knowledge_item_id: &str,
) -> Result<Vec<KnowledgeItemVersionWithSource>, AppError> {
    sqlx::query_as::<_, KnowledgeItemVersionWithSource>(
        "SELECT kiv.*, wp.title AS source_wiki_page_title
         FROM knowledge_item_versions kiv
         LEFT JOIN wiki_pages wp ON wp.id = kiv.source_wiki_page_id
         WHERE kiv.knowledge_item_id = ?
         ORDER BY kiv.version DESC",
    )
    .bind(knowledge_item_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Get a specific version of a knowledge item.
pub async fn get_knowledge_version(
    pool: &SqlitePool,
    knowledge_item_id: &str,
    version: i64,
) -> Result<KnowledgeItemVersionWithSource, AppError> {
    sqlx::query_as::<_, KnowledgeItemVersionWithSource>(
        "SELECT kiv.*, wp.title AS source_wiki_page_title
         FROM knowledge_item_versions kiv
         LEFT JOIN wiki_pages wp ON wp.id = kiv.source_wiki_page_id
         WHERE kiv.knowledge_item_id = ? AND kiv.version = ?",
    )
    .bind(knowledge_item_id)
    .bind(version)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)?
    .ok_or_else(|| {
        AppError::NotFound(format!(
            "Version {} of knowledge item {} not found",
            version, knowledge_item_id
        ))
    })
}

/// Get the knowledge item content at a specific point in time.
/// Returns the latest version created before or at `as_of`.
pub async fn get_knowledge_at(
    pool: &SqlitePool,
    knowledge_item_id: &str,
    as_of: &str,
) -> Result<Option<KnowledgeItemVersion>, AppError> {
    sqlx::query_as::<_, KnowledgeItemVersion>(
        "SELECT * FROM knowledge_item_versions
         WHERE knowledge_item_id = ? AND created_at <= ?
         ORDER BY version DESC
         LIMIT 1",
    )
    .bind(knowledge_item_id)
    .bind(as_of)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

// ---- Experience Versions ----

/// Create a version snapshot for an experience.
pub async fn create_experience_version(
    pool: &SqlitePool,
    experience_id: &str,
    version: i64,
    title: &str,
    description: Option<&str>,
    content: Option<&str>,
    severity: &str,
    status: &str,
    resolution_notes: Option<&str>,
    source_wiki_page_id: Option<&str>,
) -> Result<ExperienceVersion, AppError> {
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO experience_versions
         (id, experience_id, version, title, description, content, severity, status, resolution_notes, source_wiki_page_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(experience_id)
    .bind(version)
    .bind(title)
    .bind(description)
    .bind(content)
    .bind(severity)
    .bind(status)
    .bind(resolution_notes)
    .bind(source_wiki_page_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    sqlx::query_as::<_, ExperienceVersion>(
        "SELECT * FROM experience_versions WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)
}

/// Get all versions of an experience.
pub async fn get_experience_versions(
    pool: &SqlitePool,
    experience_id: &str,
) -> Result<Vec<ExperienceVersion>, AppError> {
    sqlx::query_as::<_, ExperienceVersion>(
        "SELECT * FROM experience_versions
         WHERE experience_id = ?
         ORDER BY version DESC",
    )
    .bind(experience_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

// ---- Wiki Page Versions ----

/// Create a version snapshot for a wiki page.
pub async fn create_wiki_page_version(
    pool: &SqlitePool,
    wiki_page_id: &str,
    version: i64,
    title: &str,
    content: &str,
    sections_snapshot: Option<&str>,
) -> Result<WikiPageVersion, AppError> {
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO wiki_page_versions (id, wiki_page_id, version, title, content, sections_snapshot)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(wiki_page_id)
    .bind(version)
    .bind(title)
    .bind(content)
    .bind(sections_snapshot)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    sqlx::query_as::<_, WikiPageVersion>(
        "SELECT * FROM wiki_page_versions WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)
}

/// Get all versions of a wiki page.
pub async fn get_wiki_page_versions(
    pool: &SqlitePool,
    wiki_page_id: &str,
) -> Result<Vec<WikiPageVersion>, AppError> {
    sqlx::query_as::<_, WikiPageVersion>(
        "SELECT * FROM wiki_page_versions
         WHERE wiki_page_id = ?
         ORDER BY version DESC",
    )
    .bind(wiki_page_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Get a specific version of a wiki page.
pub async fn get_wiki_page_version(
    pool: &SqlitePool,
    wiki_page_id: &str,
    version: i64,
) -> Result<WikiPageVersion, AppError> {
    sqlx::query_as::<_, WikiPageVersion>(
        "SELECT * FROM wiki_page_versions
         WHERE wiki_page_id = ? AND version = ?",
    )
    .bind(wiki_page_id)
    .bind(version)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)?
    .ok_or_else(|| {
        AppError::NotFound(format!(
            "Version {} of wiki page {} not found",
            version, wiki_page_id
        ))
    })
}
