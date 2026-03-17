use sqlx::{SqliteConnection, SqlitePool};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::knowledge_item::{
    KnowledgeItem, KnowledgeItemWithRefs, WikiReference,
};
use crate::models::knowledge_relation::KnowledgeRelation;
use crate::services::versioning;

/// Generate a URL-safe slug from a title.
/// Converts to lowercase, replaces non-alphanumeric (except CJK) with hyphens,
/// collapses multiple hyphens, and trims leading/trailing hyphens.
pub fn generate_slug(title: &str) -> String {
    let slug: String = title
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || is_cjk(c) {
                c.to_lowercase().next().unwrap_or(c)
            } else {
                '-'
            }
        })
        .collect();

    // Collapse multiple hyphens and trim
    let mut result = String::new();
    let mut prev_hyphen = true; // start as true to trim leading
    for ch in slug.chars() {
        if ch == '-' {
            if !prev_hyphen {
                result.push('-');
            }
            prev_hyphen = true;
        } else {
            result.push(ch);
            prev_hyphen = false;
        }
    }
    // Trim trailing hyphen
    if result.ends_with('-') {
        result.pop();
    }
    if result.is_empty() {
        // Fallback: use a UUID fragment
        format!("item-{}", &Uuid::new_v4().to_string()[..8])
    } else {
        result
    }
}

fn is_cjk(c: char) -> bool {
    matches!(c,
        '\u{4E00}'..='\u{9FFF}' |
        '\u{3400}'..='\u{4DBF}' |
        '\u{F900}'..='\u{FAFF}' |
        '\u{2E80}'..='\u{2EFF}' |
        '\u{3000}'..='\u{303F}' |
        '\u{31F0}'..='\u{31FF}' |
        '\u{3200}'..='\u{32FF}' |
        '\u{FE30}'..='\u{FE4F}' |
        '\u{AC00}'..='\u{D7AF}' |  // Korean
        '\u{3040}'..='\u{309F}' |  // Hiragana
        '\u{30A0}'..='\u{30FF}'    // Katakana
    )
}

/// Ensure slug uniqueness by appending a suffix if needed.
async fn ensure_unique_slug(
    conn: &mut SqliteConnection,
    base_slug: &str,
    exclude_id: Option<&str>,
) -> Result<String, AppError> {
    let mut slug = base_slug.to_string();
    let mut suffix = 1;

    loop {
        let exists = if let Some(eid) = exclude_id {
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM knowledge_items WHERE slug = ? AND id != ?",
            )
            .bind(&slug)
            .bind(eid)
            .fetch_one(&mut *conn)
            .await
            .map_err(AppError::from)?
        } else {
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM knowledge_items WHERE slug = ?",
            )
            .bind(&slug)
            .fetch_one(&mut *conn)
            .await
            .map_err(AppError::from)?
        };

        if exists == 0 {
            return Ok(slug);
        }

        slug = format!("{}-{}", base_slug, suffix);
        suffix += 1;

        if suffix > 100 {
            return Err(AppError::Internal(
                "Could not generate unique slug".to_string(),
            ));
        }
    }
}

/// Create a new knowledge item.
pub async fn create_knowledge_item(
    conn: &mut SqliteConnection,
    title: &str,
    content: &str,
    slug: Option<&str>,
    tags: &[String],
    source_wiki_page_id: Option<&str>,
) -> Result<KnowledgeItem, AppError> {
    let id = Uuid::new_v4().to_string();

    let base_slug = match slug {
        Some(s) if !s.is_empty() => s.to_string(),
        _ => generate_slug(title),
    };
    let final_slug = ensure_unique_slug(&mut *conn, &base_slug, None).await?;

    let tags_json = serde_json::to_string(&tags)
        .unwrap_or_else(|_| "[]".to_string());

    sqlx::query(
        "INSERT INTO knowledge_items (id, title, content, slug, tags, current_version)
         VALUES (?, ?, ?, ?, ?, 1)",
    )
    .bind(&id)
    .bind(title)
    .bind(content)
    .bind(&final_slug)
    .bind(&tags_json)
    .execute(&mut *conn)
    .await
    .map_err(AppError::from)?;

    // Create initial version
    versioning::create_knowledge_version(&mut *conn, &id, 1, title, content, source_wiki_page_id)
        .await?;

    get_knowledge_item(&mut *conn, &id).await
}

/// Get a knowledge item by ID.
pub async fn get_knowledge_item(
    conn: &mut SqliteConnection,
    id: &str,
) -> Result<KnowledgeItem, AppError> {
    sqlx::query_as::<_, KnowledgeItem>("SELECT * FROM knowledge_items WHERE id = ?")
        .bind(id)
        .fetch_optional(&mut *conn)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError::NotFound(format!("Knowledge item {} not found", id)))
}

/// Get a knowledge item with its wiki references.
pub async fn get_knowledge_item_with_refs(
    conn: &mut SqliteConnection,
    id: &str,
) -> Result<KnowledgeItemWithRefs, AppError> {
    let item = get_knowledge_item(&mut *conn, id).await?;

    let wiki_refs = sqlx::query_as::<_, WikiReference>(
        "SELECT wp.id AS wiki_page_id, wp.title AS wiki_page_title, wp.slug AS wiki_page_slug
         FROM wiki_page_sections wps
         JOIN wiki_pages wp ON wp.id = wps.wiki_page_id
         WHERE wps.knowledge_item_id = ?
         GROUP BY wp.id",
    )
    .bind(id)
    .fetch_all(&mut *conn)
    .await
    .map_err(AppError::from)?;

    let experience_ids: Vec<String> = sqlx::query_scalar(
        "SELECT experience_id FROM knowledge_experience_refs WHERE knowledge_item_id = ?",
    )
    .bind(id)
    .fetch_all(&mut *conn)
    .await
    .map_err(AppError::from)?;

    Ok(KnowledgeItemWithRefs {
        item,
        wiki_references: wiki_refs,
        experience_ids,
    })
}

/// List knowledge items with optional search, including wiki references.
pub async fn list_knowledge_items(
    pool: &SqlitePool,
    q: Option<&str>,
    tag: Option<&str>,
) -> Result<Vec<KnowledgeItemWithRefs>, AppError> {
    let mut query = String::from("SELECT * FROM knowledge_items WHERE 1=1");
    let mut bindings: Vec<String> = Vec::new();

    if let Some(search) = q {
        if !search.is_empty() {
            query.push_str(" AND (title LIKE ? OR content LIKE ? OR slug LIKE ?)");
            let pattern = format!("%{}%", search);
            bindings.push(pattern.clone());
            bindings.push(pattern.clone());
            bindings.push(pattern);
        }
    }

    if let Some(tag_val) = tag {
        if !tag_val.is_empty() {
            query.push_str(" AND tags LIKE ?");
            bindings.push(format!("%\"{}\"%" , tag_val));
        }
    }

    query.push_str(" ORDER BY updated_at DESC");

    let mut q = sqlx::query_as::<_, KnowledgeItem>(&query);
    for b in &bindings {
        q = q.bind(b);
    }

    let items: Vec<KnowledgeItem> = q.fetch_all(pool).await.map_err(AppError::from)?;

    let mut results = Vec::with_capacity(items.len());
    for item in items {
        let wiki_refs = sqlx::query_as::<_, WikiReference>(
            "SELECT wp.id AS wiki_page_id, wp.title AS wiki_page_title, wp.slug AS wiki_page_slug
             FROM wiki_page_sections wps
             JOIN wiki_pages wp ON wp.id = wps.wiki_page_id
             WHERE wps.knowledge_item_id = ?
             GROUP BY wp.id",
        )
        .bind(&item.id)
        .fetch_all(pool)
        .await
        .map_err(AppError::from)?;

        let experience_ids: Vec<String> = sqlx::query_scalar(
            "SELECT experience_id FROM knowledge_experience_refs WHERE knowledge_item_id = ?",
        )
        .bind(&item.id)
        .fetch_all(pool)
        .await
        .map_err(AppError::from)?;

        results.push(KnowledgeItemWithRefs {
            item,
            wiki_references: wiki_refs,
            experience_ids,
        });
    }

    Ok(results)
}

/// Update a knowledge item. Returns the updated item.
pub async fn update_knowledge_item(
    conn: &mut SqliteConnection,
    id: &str,
    title: Option<&str>,
    content: Option<&str>,
    slug: Option<&str>,
    tags: Option<&[String]>,
    source_wiki_page_id: Option<&str>,
) -> Result<KnowledgeItem, AppError> {
    let existing = get_knowledge_item(&mut *conn, id).await?;

    let new_title = title.unwrap_or(&existing.title);
    let new_content = content.unwrap_or(&existing.content);

    let new_slug = if let Some(s) = slug {
        ensure_unique_slug(&mut *conn, s, Some(id)).await?
    } else {
        existing.slug.clone()
    };

    let new_tags = if let Some(t) = tags {
        serde_json::to_string(t).unwrap_or_else(|_| "[]".to_string())
    } else {
        existing.tags.clone()
    };

    // Check if content actually changed (for versioning)
    let content_changed = new_title != existing.title || new_content != existing.content;
    let new_version = if content_changed {
        existing.current_version + 1
    } else {
        existing.current_version
    };

    sqlx::query(
        "UPDATE knowledge_items
         SET title = ?, content = ?, slug = ?, tags = ?, current_version = ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?",
    )
    .bind(new_title)
    .bind(new_content)
    .bind(&new_slug)
    .bind(&new_tags)
    .bind(new_version)
    .bind(id)
    .execute(&mut *conn)
    .await
    .map_err(AppError::from)?;

    if content_changed {
        versioning::create_knowledge_version(
            &mut *conn,
            id,
            new_version,
            new_title,
            new_content,
            source_wiki_page_id,
        )
        .await?;
    }

    get_knowledge_item(&mut *conn, id).await
}

/// Delete a knowledge item.
pub async fn delete_knowledge_item(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM knowledge_items WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(AppError::from)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!(
            "Knowledge item {} not found",
            id
        )));
    }

    Ok(())
}

/// Find a knowledge item by title (case-insensitive exact match).
pub async fn find_by_title(
    conn: &mut SqliteConnection,
    title: &str,
) -> Result<Option<KnowledgeItem>, AppError> {
    sqlx::query_as::<_, KnowledgeItem>(
        "SELECT * FROM knowledge_items WHERE LOWER(title) = LOWER(?)",
    )
    .bind(title)
    .fetch_optional(&mut *conn)
    .await
    .map_err(AppError::from)
}

/// Find a knowledge item by title, preferring items already referenced by the given wiki page.
/// First checks knowledge items linked to the page via wiki_page_sections, then falls back
/// to global title match. This prevents cross-page accidental merges for common titles.
pub async fn find_by_title_scoped(
    conn: &mut SqliteConnection,
    title: &str,
    wiki_page_id: &str,
) -> Result<Option<KnowledgeItem>, AppError> {
    // First: try to find among knowledge items already on this wiki page
    let scoped = sqlx::query_as::<_, KnowledgeItem>(
        "SELECT ki.* FROM knowledge_items ki
         JOIN wiki_page_sections wps ON wps.knowledge_item_id = ki.id
         WHERE wps.wiki_page_id = ? AND LOWER(ki.title) = LOWER(?)",
    )
    .bind(wiki_page_id)
    .bind(title)
    .fetch_optional(&mut *conn)
    .await
    .map_err(AppError::from)?;

    if scoped.is_some() {
        return Ok(scoped);
    }

    // Fallback: global title match
    find_by_title(&mut *conn, title).await
}

// ---- Knowledge Relations ----

/// Create a relation between two knowledge items.
pub async fn create_relation(
    conn: &mut SqliteConnection,
    source_id: &str,
    target_id: &str,
    relation_type: &str,
    sort_order: i64,
) -> Result<KnowledgeRelation, AppError> {
    // Validate relation_type
    if !["parent_child", "precedes", "related_to"].contains(&relation_type) {
        return Err(AppError::BadRequest(format!(
            "Invalid relation_type: {}. Must be one of: parent_child, precedes, related_to",
            relation_type
        )));
    }

    // Validate both items exist
    get_knowledge_item(&mut *conn, source_id).await?;
    get_knowledge_item(&mut *conn, target_id).await?;

    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO knowledge_relations (id, source_id, target_id, relation_type, sort_order)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(source_id)
    .bind(target_id)
    .bind(relation_type)
    .bind(sort_order)
    .execute(&mut *conn)
    .await
    .map_err(AppError::from)?;

    sqlx::query_as::<_, KnowledgeRelation>(
        "SELECT * FROM knowledge_relations WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&mut *conn)
    .await
    .map_err(AppError::from)
}

/// Get all relations for a knowledge item (both as source and target).
pub async fn get_relations(
    pool: &SqlitePool,
    item_id: &str,
) -> Result<Vec<KnowledgeRelation>, AppError> {
    sqlx::query_as::<_, KnowledgeRelation>(
        "SELECT * FROM knowledge_relations
         WHERE source_id = ? OR target_id = ?
         ORDER BY relation_type, sort_order",
    )
    .bind(item_id)
    .bind(item_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Delete a relation by ID.
pub async fn delete_relation(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM knowledge_relations WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(AppError::from)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!(
            "Knowledge relation {} not found",
            id
        )));
    }

    Ok(())
}

// ---- Knowledge-Experience References ----

/// Link a knowledge item to an experience.
pub async fn link_experience(
    conn: &mut SqliteConnection,
    knowledge_item_id: &str,
    experience_id: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT OR IGNORE INTO knowledge_experience_refs (knowledge_item_id, experience_id)
         VALUES (?, ?)",
    )
    .bind(knowledge_item_id)
    .bind(experience_id)
    .execute(&mut *conn)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Unlink a knowledge item from an experience.
pub async fn unlink_experience(
    pool: &SqlitePool,
    knowledge_item_id: &str,
    experience_id: &str,
) -> Result<(), AppError> {
    let result = sqlx::query(
        "DELETE FROM knowledge_experience_refs
         WHERE knowledge_item_id = ? AND experience_id = ?",
    )
    .bind(knowledge_item_id)
    .bind(experience_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(
            "Knowledge-experience link not found".to_string(),
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_slug() {
        assert_eq!(generate_slug("Hello World"), "hello-world");
        assert_eq!(generate_slug("Linux存储I/O全链路"), "linux存储i-o全链路");
        assert_eq!(generate_slug("  multiple   spaces  "), "multiple-spaces");
        assert_eq!(generate_slug("UPPER-CASE"), "upper-case");
        assert_eq!(generate_slug("already-slug"), "already-slug");
    }

    #[test]
    fn test_generate_slug_empty() {
        let slug = generate_slug("");
        assert!(slug.starts_with("item-"));
    }
}
