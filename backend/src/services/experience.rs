use sqlx::SqliteConnection;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::experience::Experience;
use crate::services::versioning;

/// Find an experience by title (case-insensitive exact match).
pub async fn find_by_title(
    conn: &mut SqliteConnection,
    title: &str,
) -> Result<Option<Experience>, AppError> {
    sqlx::query_as::<_, Experience>(
        "SELECT * FROM experiences WHERE LOWER(title) = LOWER(?)",
    )
    .bind(title)
    .fetch_optional(&mut *conn)
    .await
    .map_err(AppError::from)
}

/// Create a new experience with initial version.
pub async fn create_experience(
    conn: &mut SqliteConnection,
    title: &str,
    content: &str,
    source_wiki_page_id: Option<&str>,
) -> Result<String, AppError> {
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO experiences (id, title, description, content)
         VALUES (?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(title)
    .bind(content)
    .bind(content)
    .execute(&mut *conn)
    .await
    .map_err(AppError::from)?;

    versioning::create_experience_version(
        &mut *conn,
        &id,
        1,
        title,
        Some(content),
        Some(content),
        "medium",
        "active",
        None,
        source_wiki_page_id,
    )
    .await?;

    Ok(id)
}

/// Update an experience's content if it changed. Creates a new version on change.
/// Returns true if content was actually updated.
pub async fn update_experience_content(
    conn: &mut SqliteConnection,
    exp: &Experience,
    content: &str,
    source_wiki_page_id: Option<&str>,
) -> Result<bool, AppError> {
    let current_content = exp.content.as_deref().unwrap_or("");
    if current_content == content {
        return Ok(false);
    }

    let current_version: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version), 0) FROM experience_versions WHERE experience_id = ?",
    )
    .bind(&exp.id)
    .fetch_one(&mut *conn)
    .await
    .map_err(AppError::from)?;

    let new_version = current_version + 1;

    sqlx::query(
        "UPDATE experiences SET description = ?, content = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    )
    .bind(content)
    .bind(content)
    .bind(&exp.id)
    .execute(&mut *conn)
    .await
    .map_err(AppError::from)?;

    versioning::create_experience_version(
        &mut *conn,
        &exp.id,
        new_version,
        &exp.title,
        Some(content),
        Some(content),
        &exp.severity,
        &exp.status,
        exp.resolution_notes.as_deref(),
        source_wiki_page_id,
    )
    .await?;

    Ok(true)
}
