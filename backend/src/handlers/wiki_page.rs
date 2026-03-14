use actix_web::{delete, get, post, put, web, HttpResponse};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::wiki_page::*;

const RESERVED_SLUGS: &[&str] = &["edit", "new"];

fn validate_slug(slug: &str) -> Result<(), AppError> {
    if RESERVED_SLUGS.contains(&slug) {
        return Err(AppError::BadRequest(format!(
            "Slug '{}' is reserved",
            slug
        )));
    }
    if slug.is_empty() {
        return Err(AppError::BadRequest("Slug cannot be empty".to_string()));
    }
    Ok(())
}

/// Build the full path and breadcrumbs for a page by walking up parent_id.
async fn resolve_path(
    pool: &SqlitePool,
    page_id: &str,
) -> Result<(String, Vec<WikiPageBreadcrumb>), AppError> {
    let mut breadcrumbs = Vec::new();
    let mut current_id = page_id.to_string();

    loop {
        let page = sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
            .bind(&current_id)
            .fetch_one(pool)
            .await
            .map_err(|_| AppError::NotFound("Page not found".to_string()))?;

        breadcrumbs.push(WikiPageBreadcrumb {
            id: page.id.clone(),
            title: page.title.clone(),
            slug: page.slug.clone(),
        });

        match page.parent_id {
            Some(pid) => current_id = pid,
            None => break,
        }
    }

    breadcrumbs.reverse();
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

    Ok(HttpResponse::Ok().json(WikiPageWithPath {
        page,
        path,
        breadcrumbs,
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

    Ok(HttpResponse::Ok().json(WikiPageWithPath {
        page,
        path: url_path,
        breadcrumbs,
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

    // Auto sort_order = max + 1
    let max_sort: Option<i32> = sqlx::query_scalar(
        "SELECT MAX(sort_order) FROM wiki_pages WHERE parent_id IS ?1",
    )
    .bind(&body.parent_id)
    .fetch_one(pool.get_ref())
    .await?;

    let sort_order = max_sort.unwrap_or(-1) + 1;

    sqlx::query(
        "INSERT INTO wiki_pages (id, parent_id, title, slug, content, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(&id)
    .bind(&body.parent_id)
    .bind(&body.title)
    .bind(&body.slug)
    .bind(body.content.as_deref().unwrap_or(""))
    .bind(sort_order)
    .execute(pool.get_ref())
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

    sqlx::query(
        "UPDATE wiki_pages SET title = ?1, slug = ?2, content = ?3,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?4",
    )
    .bind(title)
    .bind(slug)
    .bind(content)
    .bind(&id)
    .execute(pool.get_ref())
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

    // Verify new parent exists if specified
    if let Some(parent_id) = &body.parent_id {
        sqlx::query("SELECT id FROM wiki_pages WHERE id = ?1")
            .bind(parent_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|_| AppError::NotFound("Parent page not found".to_string()))?;
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
