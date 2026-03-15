use actix_web::{delete, get, post, put, web, HttpResponse};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::wiki_page::*;
use crate::services::{auto_identify, versioning, wiki_compose};

use serde::Serialize;

const RESERVED_SLUGS: &[&str] = &["edit", "new"];

fn validate_slug(slug: &str) -> Result<(), AppError> {
    if slug.is_empty() {
        return Err(AppError::BadRequest("Slug cannot be empty".to_string()));
    }
    if RESERVED_SLUGS.contains(&slug) {
        return Err(AppError::BadRequest(format!(
            "Slug '{}' is reserved",
            slug
        )));
    }
    // Only allow lowercase ASCII alphanumerics, hyphens, and CJK characters
    let valid = slug.chars().all(|c| {
        c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || ('\u{4e00}'..='\u{9fa5}').contains(&c)
    });
    if !valid {
        return Err(AppError::BadRequest(
            "Slug may only contain lowercase letters, digits, hyphens, and Chinese characters"
                .to_string(),
        ));
    }
    if slug.starts_with('-') || slug.ends_with('-') {
        return Err(AppError::BadRequest(
            "Slug cannot start or end with a hyphen".to_string(),
        ));
    }
    Ok(())
}

/// Build the full path and breadcrumbs for a page using a single recursive CTE.
async fn resolve_path(
    pool: &SqlitePool,
    page_id: &str,
) -> Result<(String, Vec<WikiPageBreadcrumb>), AppError> {
    let rows = sqlx::query_as::<_, (String, String, String, i32)>(
        "WITH RECURSIVE ancestors(id, title, slug, depth) AS (
            SELECT id, title, slug, 0 FROM wiki_pages WHERE id = ?1
            UNION ALL
            SELECT wp.id, wp.title, wp.slug, a.depth + 1
            FROM wiki_pages wp
            JOIN ancestors a ON wp.id = (SELECT parent_id FROM wiki_pages WHERE id = a.id)
            WHERE (SELECT parent_id FROM wiki_pages WHERE id = a.id) IS NOT NULL
        ) SELECT id, title, slug, depth FROM ancestors ORDER BY depth DESC",
    )
    .bind(page_id)
    .fetch_all(pool)
    .await?;

    if rows.is_empty() {
        return Err(AppError::NotFound("Page not found".to_string()));
    }

    let breadcrumbs: Vec<WikiPageBreadcrumb> = rows
        .into_iter()
        .map(|(id, title, slug, _)| WikiPageBreadcrumb { id, title, slug })
        .collect();

    let path = breadcrumbs
        .iter()
        .map(|b| b.slug.as_str())
        .collect::<Vec<_>>()
        .join("/");

    Ok((path, breadcrumbs))
}

/// GET /api/v1/wiki — full tree
#[get("/api/v1/wiki")]
async fn get_wiki_tree(pool: web::Data<SqlitePool>) -> Result<HttpResponse, AppError> {
    let pages = sqlx::query_as::<_, WikiPage>(
        "SELECT * FROM wiki_pages ORDER BY sort_order",
    )
    .fetch_all(pool.get_ref())
    .await?;

    let tree = build_nested_tree(&pages, None);
    Ok(HttpResponse::Ok().json(tree))
}

fn build_nested_tree(all_pages: &[WikiPage], parent_id: Option<&str>) -> Vec<WikiPageNested> {
    let mut result: Vec<WikiPageNested> = all_pages
        .iter()
        .filter(|p| p.parent_id.as_deref() == parent_id)
        .map(|page| {
            let children = build_nested_tree(all_pages, Some(&page.id));
            WikiPageNested {
                page: page.clone(),
                children,
            }
        })
        .collect();

    result.sort_by_key(|n| n.page.sort_order);
    result
}

#[derive(serde::Deserialize)]
pub struct PathQuery {
    pub path: String,
}

/// GET /api/v1/wiki/page?path=dev/frontend/setup — find by slug path
#[get("/api/v1/wiki/page")]
async fn get_wiki_page_by_path(
    pool: web::Data<SqlitePool>,
    query: web::Query<PathQuery>,
) -> Result<HttpResponse, AppError> {
    let slugs: Vec<&str> = query.path.split('/').filter(|s| !s.is_empty()).collect();

    if slugs.is_empty() {
        return Err(AppError::BadRequest("Path cannot be empty".to_string()));
    }

    // Walk down from root
    let mut current_parent_id: Option<String> = None;
    let mut current_page: Option<WikiPage> = None;

    for slug in &slugs {
        let page = match &current_parent_id {
            None => {
                sqlx::query_as::<_, WikiPage>(
                    "SELECT * FROM wiki_pages WHERE slug = ?1 AND parent_id IS NULL",
                )
                .bind(slug)
                .fetch_optional(pool.get_ref())
                .await?
            }
            Some(pid) => {
                sqlx::query_as::<_, WikiPage>(
                    "SELECT * FROM wiki_pages WHERE slug = ?1 AND parent_id = ?2",
                )
                .bind(slug)
                .bind(pid)
                .fetch_optional(pool.get_ref())
                .await?
            }
        };

        match page {
            Some(p) => {
                current_parent_id = Some(p.id.clone());
                current_page = Some(p);
            }
            None => {
                return Err(AppError::NotFound(format!(
                    "Page not found at path: {}",
                    query.path
                )));
            }
        }
    }

    let page = current_page.unwrap();
    let (path, breadcrumbs) = resolve_path(pool.get_ref(), &page.id).await?;

    let sections = if page.sections_enabled != 0 {
        Some(wiki_compose::load_sections(pool.get_ref(), &page.id).await?)
    } else {
        None
    };

    Ok(HttpResponse::Ok().json(WikiPageWithPath {
        page,
        path,
        breadcrumbs,
        sections,
    }))
}

/// GET /api/v1/wiki/pages/{id} — find by ID
#[get("/api/v1/wiki/pages/{id}")]
async fn get_wiki_page_by_id(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let page = sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Wiki page not found".to_string()))?;

    let (url_path, breadcrumbs) = resolve_path(pool.get_ref(), &page.id).await?;

    let sections = if page.sections_enabled != 0 {
        Some(wiki_compose::load_sections(pool.get_ref(), &page.id).await?)
    } else {
        None
    };

    Ok(HttpResponse::Ok().json(WikiPageWithPath {
        page,
        path: url_path,
        breadcrumbs,
        sections,
    }))
}

/// POST /api/v1/wiki/pages — create page
#[post("/api/v1/wiki/pages")]
async fn create_wiki_page(
    pool: web::Data<SqlitePool>,
    body: web::Json<CreateWikiPage>,
) -> Result<HttpResponse, AppError> {
    validate_slug(&body.slug)?;

    // Verify parent exists if specified
    if let Some(parent_id) = &body.parent_id {
        sqlx::query("SELECT id FROM wiki_pages WHERE id = ?1")
            .bind(parent_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|_| AppError::NotFound("Parent page not found".to_string()))?;
    }

    // Check slug uniqueness among siblings
    let existing = sqlx::query_scalar::<_, i32>(
        "SELECT COUNT(*) FROM wiki_pages WHERE COALESCE(parent_id, '') = ?1 AND slug = ?2",
    )
    .bind(
        body.parent_id
            .as_deref()
            .unwrap_or(""),
    )
    .bind(&body.slug)
    .fetch_one(pool.get_ref())
    .await?;

    if existing > 0 {
        return Err(AppError::BadRequest(format!(
            "Slug '{}' already exists at this level",
            body.slug
        )));
    }

    let id = Uuid::new_v4().to_string();
    let sections_enabled = if body.sections_enabled.unwrap_or(false) { 1 } else { 0 };
    let content = body.content.as_deref().unwrap_or("");

    // Auto sort_order = max + 1
    let max_sort: Option<i32> = sqlx::query_scalar(
        "SELECT MAX(sort_order) FROM wiki_pages WHERE parent_id IS ?1",
    )
    .bind(&body.parent_id)
    .fetch_one(pool.get_ref())
    .await?;

    let sort_order = max_sort.unwrap_or(-1) + 1;

    sqlx::query(
        "INSERT INTO wiki_pages (id, parent_id, title, slug, content, sort_order, sections_enabled)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(&id)
    .bind(&body.parent_id)
    .bind(&body.title)
    .bind(&body.slug)
    .bind(content)
    .bind(sort_order)
    .bind(sections_enabled)
    .execute(pool.get_ref())
    .await?;

    // If sections enabled and content is not empty, run auto-identify
    if sections_enabled != 0 && !content.is_empty() {
        let result = auto_identify::identify_and_create(pool.get_ref(), &id, content).await?;
        wiki_compose::save_sections(pool.get_ref(), &id, &result.sections).await?;
    }

    // Create initial wiki page version
    let sections_snapshot = if sections_enabled != 0 {
        Some(wiki_compose::create_sections_snapshot(pool.get_ref(), &id).await?)
    } else {
        None
    };
    versioning::create_wiki_page_version(
        pool.get_ref(),
        &id,
        1,
        &body.title,
        content,
        sections_snapshot.as_deref(),
    )
    .await?;

    let page = sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Created().json(page))
}

/// PUT /api/v1/wiki/pages/{id} — update page
#[put("/api/v1/wiki/pages/{id}")]
async fn update_wiki_page(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateWikiPage>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let existing = sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Wiki page not found".to_string()))?;

    let title = body.title.as_deref().unwrap_or(&existing.title);
    let content = body.content.as_deref().unwrap_or(&existing.content);

    // If slug is changing, validate and check uniqueness
    let slug = body.slug.as_deref().unwrap_or(&existing.slug);
    if slug != existing.slug {
        validate_slug(slug)?;

        let count = sqlx::query_scalar::<_, i32>(
            "SELECT COUNT(*) FROM wiki_pages WHERE COALESCE(parent_id, '') = ?1 AND slug = ?2 AND id != ?3",
        )
        .bind(existing.parent_id.as_deref().unwrap_or(""))
        .bind(slug)
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

        if count > 0 {
            return Err(AppError::BadRequest(format!(
                "Slug '{}' already exists at this level",
                slug
            )));
        }
    }

    // Handle sections_enabled toggle
    let sections_enabled = match body.sections_enabled {
        Some(true) => 1,
        Some(false) => 0,
        None => existing.sections_enabled,
    };

    sqlx::query(
        "UPDATE wiki_pages SET title = ?1, slug = ?2, content = ?3, sections_enabled = ?4,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?5",
    )
    .bind(title)
    .bind(slug)
    .bind(content)
    .bind(sections_enabled)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    // If sections enabled, run auto-identify
    if sections_enabled != 0 {
        let result =
            auto_identify::identify_and_create(pool.get_ref(), &id, content).await?;
        wiki_compose::save_sections(pool.get_ref(), &id, &result.sections).await?;
    }

    // Create new wiki page version
    let current_version: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version), 0) FROM wiki_page_versions WHERE wiki_page_id = ?",
    )
    .bind(&id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(AppError::from)?;

    let sections_snapshot = if sections_enabled != 0 {
        Some(wiki_compose::create_sections_snapshot(pool.get_ref(), &id).await?)
    } else {
        None
    };

    versioning::create_wiki_page_version(
        pool.get_ref(),
        &id,
        current_version + 1,
        title,
        content,
        sections_snapshot.as_deref(),
    )
    .await?;

    let page = sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(page))
}

/// DELETE /api/v1/wiki/pages/{id} — delete page (cascade)
#[delete("/api/v1/wiki/pages/{id}")]
async fn delete_wiki_page(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let result = sqlx::query("DELETE FROM wiki_pages WHERE id = ?1")
        .bind(&id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Wiki page not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}

/// PUT /api/v1/wiki/pages/{id}/reorder — move/reorder page
#[put("/api/v1/wiki/pages/{id}/reorder")]
async fn reorder_wiki_page(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<ReorderWikiPage>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    // Verify page exists
    sqlx::query("SELECT id FROM wiki_pages WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Wiki page not found".to_string()))?;

    // Verify new parent exists if specified + cycle detection
    if let Some(parent_id) = &body.parent_id {
        // Self-reference check
        if *parent_id == id {
            return Err(AppError::BadRequest(
                "A page cannot be its own parent".to_string(),
            ));
        }

        sqlx::query("SELECT id FROM wiki_pages WHERE id = ?1")
            .bind(parent_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|_| AppError::NotFound("Parent page not found".to_string()))?;

        // Check if parent_id is a descendant of id (would create a cycle)
        let is_descendant: i32 = sqlx::query_scalar(
            "WITH RECURSIVE descendants(id) AS (
                SELECT ?1
                UNION ALL
                SELECT wp.id FROM wiki_pages wp JOIN descendants d ON wp.parent_id = d.id
            ) SELECT COUNT(*) FROM descendants WHERE id = ?2",
        )
        .bind(&id)
        .bind(parent_id)
        .fetch_one(pool.get_ref())
        .await?;

        if is_descendant > 0 {
            return Err(AppError::BadRequest(
                "Cannot move a page under its own descendant".to_string(),
            ));
        }
    }

    sqlx::query(
        "UPDATE wiki_pages SET parent_id = ?1, sort_order = ?2,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?3",
    )
    .bind(&body.parent_id)
    .bind(body.sort_order)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    let page = sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(page))
}

#[derive(Serialize)]
struct BatchReorderResponse {
    updated: usize,
}

/// PUT /api/v1/wiki/pages/reorder-batch — batch reorder/move pages
#[put("/api/v1/wiki/pages/reorder-batch")]
pub async fn batch_reorder_wiki_pages(
    pool: web::Data<SqlitePool>,
    body: web::Json<BatchReorderWikiPages>,
) -> Result<HttpResponse, AppError> {
    if body.items.is_empty() {
        return Err(AppError::BadRequest("Items cannot be empty".to_string()));
    }

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    for item in &body.items {
        // Cycle detection for each item
        if let Some(parent_id) = &item.parent_id {
            if *parent_id == item.id {
                return Err(AppError::BadRequest(
                    "A page cannot be its own parent".to_string(),
                ));
            }

            // Check against in-transaction state (intermediate moves already applied)
            let is_descendant: i32 = sqlx::query_scalar(
                "WITH RECURSIVE descendants(id) AS (
                    SELECT ?1
                    UNION ALL
                    SELECT wp.id FROM wiki_pages wp JOIN descendants d ON wp.parent_id = d.id
                ) SELECT COUNT(*) FROM descendants WHERE id = ?2",
            )
            .bind(&item.id)
            .bind(parent_id)
            .fetch_one(&mut *tx)
            .await?;

            if is_descendant > 0 {
                return Err(AppError::BadRequest(
                    "Cannot move a page under its own descendant".to_string(),
                ));
            }
        }

        sqlx::query(
            "UPDATE wiki_pages SET parent_id = ?1, sort_order = ?2,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?3",
        )
        .bind(&item.parent_id)
        .bind(item.sort_order)
        .bind(&item.id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(HttpResponse::Ok().json(BatchReorderResponse {
        updated: body.items.len(),
    }))
}
