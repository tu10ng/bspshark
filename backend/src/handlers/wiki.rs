use actix_multipart::Multipart;
use actix_web::{delete, get, post, put, web, HttpResponse};
use futures_util::StreamExt;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::wiki::*;

fn build_wiki_tree(all: &[WikiPageSummary], parent_id: Option<&str>) -> Vec<WikiTreeNode> {
    let mut result: Vec<WikiTreeNode> = all
        .iter()
        .filter(|p| p.parent_id.as_deref() == parent_id)
        .map(|p| WikiTreeNode {
            id: p.id.clone(),
            parent_id: p.parent_id.clone(),
            title: p.title.clone(),
            is_folder: p.is_folder,
            sort_order: p.sort_order,
            children: build_wiki_tree(all, Some(&p.id)),
        })
        .collect();
    result.sort_by_key(|n| n.sort_order);
    result
}

#[get("/api/v1/wiki/tree")]
async fn get_wiki_tree(pool: web::Data<SqlitePool>) -> Result<HttpResponse, AppError> {
    let pages = sqlx::query_as::<_, WikiPageSummary>(
        "SELECT id, parent_id, title, is_folder, sort_order FROM wiki_pages ORDER BY sort_order",
    )
    .fetch_all(pool.get_ref())
    .await?;

    let tree = build_wiki_tree(&pages, None);
    Ok(HttpResponse::Ok().json(tree))
}

#[get("/api/v1/wiki/pages/recent")]
async fn get_recent_wiki_pages(
    pool: web::Data<SqlitePool>,
    query: web::Query<RecentQuery>,
) -> Result<HttpResponse, AppError> {
    let limit = query.limit.unwrap_or(10);
    let pages = sqlx::query_as::<_, RecentWikiPage>(
        "SELECT id, title, updated_at FROM wiki_pages WHERE is_folder = 0 ORDER BY updated_at DESC LIMIT ?1",
    )
    .bind(limit)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(pages))
}

#[post("/api/v1/wiki/pages")]
async fn create_wiki_page(
    pool: web::Data<SqlitePool>,
    body: web::Json<CreateWikiPage>,
) -> Result<HttpResponse, AppError> {
    let id = Uuid::new_v4().to_string();
    let is_folder = body.is_folder.unwrap_or(false);
    let content = body.content.as_deref().unwrap_or("");

    // Auto sort_order: max + 1 among siblings
    let max_sort: Option<(i32,)> = if let Some(ref pid) = body.parent_id {
        sqlx::query_as("SELECT COALESCE(MAX(sort_order), -1) FROM wiki_pages WHERE parent_id = ?1")
            .bind(pid)
            .fetch_optional(pool.get_ref())
            .await?
    } else {
        sqlx::query_as(
            "SELECT COALESCE(MAX(sort_order), -1) FROM wiki_pages WHERE parent_id IS NULL",
        )
        .fetch_optional(pool.get_ref())
        .await?
    };
    let sort_order = max_sort.map(|r| r.0 + 1).unwrap_or(0);

    sqlx::query(
        "INSERT INTO wiki_pages (id, parent_id, title, content, is_folder, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(&id)
    .bind(&body.parent_id)
    .bind(&body.title)
    .bind(content)
    .bind(is_folder)
    .bind(sort_order)
    .execute(pool.get_ref())
    .await?;

    let page =
        sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await?;

    Ok(HttpResponse::Created().json(page))
}

#[get("/api/v1/wiki/pages/{id}")]
async fn get_wiki_page(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let page =
        sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|_| AppError::NotFound("Wiki page not found".to_string()))?;

    Ok(HttpResponse::Ok().json(page))
}

#[put("/api/v1/wiki/pages/{id}")]
async fn update_wiki_page(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateWikiPage>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let existing =
        sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|_| AppError::NotFound("Wiki page not found".to_string()))?;

    let title = body.title.as_deref().unwrap_or(&existing.title);
    let content = body.content.as_deref().unwrap_or(&existing.content);

    sqlx::query(
        "UPDATE wiki_pages SET title = ?1, content = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?3",
    )
    .bind(title)
    .bind(content)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    let page =
        sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await?;

    Ok(HttpResponse::Ok().json(page))
}

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

#[post("/api/v1/wiki/pages/{id}/reorder")]
async fn reorder_wiki_page(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<ReorderWikiPage>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    // Verify page exists
    sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Wiki page not found".to_string()))?;

    sqlx::query(
        "UPDATE wiki_pages SET parent_id = ?1, sort_order = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?3",
    )
    .bind(&body.parent_id)
    .bind(body.sort_order)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    let page =
        sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await?;

    Ok(HttpResponse::Ok().json(page))
}

#[post("/api/v1/wiki/upload")]
async fn upload_wiki_file(
    pool: web::Data<SqlitePool>,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    let upload_dir = "wiki-uploads";
    tokio::fs::create_dir_all(upload_dir)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to create upload dir: {}", e)))?;

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| AppError::BadRequest(format!("Multipart error: {}", e)))?;

        let original_name = field
            .content_disposition()
            .and_then(|cd| cd.get_filename().map(|s| s.to_string()))
            .unwrap_or_else(|| "unknown".to_string());

        let mime_type = field.content_type().map(|m| m.to_string()).unwrap_or_else(|| "application/octet-stream".to_string());

        let ext = original_name
            .rsplit('.')
            .next()
            .unwrap_or("bin");
        let file_id = Uuid::new_v4().to_string();
        let filename = format!("{}.{}", file_id, ext);
        let filepath = format!("{}/{}", upload_dir, filename);

        let mut bytes = Vec::new();
        while let Some(chunk) = field.next().await {
            let data =
                chunk.map_err(|e| AppError::Internal(format!("Read chunk error: {}", e)))?;
            bytes.extend_from_slice(&data);
        }

        let size = bytes.len() as i64;
        tokio::fs::write(&filepath, &bytes)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to write file: {}", e)))?;

        // Save to DB (page_id = NULL for standalone uploads)
        sqlx::query(
            "INSERT INTO wiki_attachments (id, page_id, filename, original_name, mime_type, size) VALUES (?1, NULL, ?2, ?3, ?4, ?5)",
        )
        .bind(&file_id)
        .bind(&filename)
        .bind(&original_name)
        .bind(&mime_type)
        .bind(size)
        .execute(pool.get_ref())
        .await?;

        let url = format!("/api/v1/wiki/attachments/{}/{}", file_id, filename);

        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "id": file_id,
            "url": url,
            "filename": filename,
            "original_name": original_name,
            "mime_type": mime_type,
            "size": size,
        })));
    }

    Err(AppError::BadRequest("No file provided".to_string()))
}

#[post("/api/v1/wiki/upload-with-page")]
async fn upload_wiki_file_with_page(
    pool: web::Data<SqlitePool>,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    let upload_dir = "wiki-uploads";
    tokio::fs::create_dir_all(upload_dir)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to create upload dir: {}", e)))?;

    let mut page_id: Option<String> = None;

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| AppError::BadRequest(format!("Multipart error: {}", e)))?;

        let field_name = field.name().map(|s| s.to_string()).unwrap_or_default();

        if field_name == "page_id" {
            let mut data = Vec::new();
            while let Some(chunk) = field.next().await {
                let bytes = chunk.map_err(|e| AppError::Internal(e.to_string()))?;
                data.extend_from_slice(&bytes);
            }
            page_id = Some(String::from_utf8_lossy(&data).to_string());
            continue;
        }

        let original_name = field
            .content_disposition()
            .and_then(|cd| cd.get_filename().map(|s| s.to_string()))
            .unwrap_or_else(|| "unknown".to_string());

        let mime_type = field.content_type().map(|m| m.to_string()).unwrap_or_else(|| "application/octet-stream".to_string());

        let ext = original_name.rsplit('.').next().unwrap_or("bin");
        let file_id = Uuid::new_v4().to_string();
        let filename = format!("{}.{}", file_id, ext);
        let filepath = format!("{}/{}", upload_dir, filename);

        let mut bytes = Vec::new();
        while let Some(chunk) = field.next().await {
            let data = chunk.map_err(|e| AppError::Internal(format!("Read chunk error: {}", e)))?;
            bytes.extend_from_slice(&data);
        }

        let size = bytes.len() as i64;
        tokio::fs::write(&filepath, &bytes)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to write file: {}", e)))?;

        // Save to DB
        sqlx::query(
            "INSERT INTO wiki_attachments (id, page_id, filename, original_name, mime_type, size) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )
        .bind(&file_id)
        .bind(&page_id)
        .bind(&filename)
        .bind(&original_name)
        .bind(&mime_type)
        .bind(size)
        .execute(pool.get_ref())
        .await?;

        let url = format!("/api/v1/wiki/attachments/{}/{}", file_id, filename);

        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "id": file_id,
            "url": url,
            "filename": filename,
            "original_name": original_name,
            "mime_type": mime_type,
            "size": size,
        })));
    }

    Err(AppError::BadRequest("No file provided".to_string()))
}

#[get("/api/v1/wiki/attachments/{id}/{filename}")]
async fn get_wiki_attachment(
    path: web::Path<(String, String)>,
) -> Result<actix_files::NamedFile, AppError> {
    let (id, _filename) = path.into_inner();

    // Find the file in wiki-uploads directory by id prefix
    let upload_dir = "wiki-uploads";
    let mut entries = tokio::fs::read_dir(upload_dir)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to read upload dir: {}", e)))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
    {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&id) {
            let file = actix_files::NamedFile::open(entry.path())
                .map_err(|e| AppError::Internal(format!("Failed to open file: {}", e)))?;
            return Ok(file);
        }
    }

    Err(AppError::NotFound("Attachment not found".to_string()))
}

#[delete("/api/v1/wiki/attachments/{id}")]
async fn delete_wiki_attachment(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let attachment = sqlx::query_as::<_, WikiAttachment>(
        "SELECT * FROM wiki_attachments WHERE id = ?1",
    )
    .bind(&id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| AppError::NotFound("Attachment not found".to_string()))?;

    // Delete file from disk
    let filepath = format!("wiki-uploads/{}", attachment.filename);
    let _ = tokio::fs::remove_file(&filepath).await;

    // Delete DB record
    sqlx::query("DELETE FROM wiki_attachments WHERE id = ?1")
        .bind(&id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::NoContent().finish())
}

#[post("/api/v1/wiki/import")]
async fn import_wiki_pages(
    pool: web::Data<SqlitePool>,
    mut payload: Multipart,
) -> Result<HttpResponse, AppError> {
    let mut parent_id: Option<String> = None;
    let mut created_pages: Vec<WikiPage> = Vec::new();

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| AppError::BadRequest(format!("Multipart error: {}", e)))?;

        let field_name = field.name().map(|s| s.to_string()).unwrap_or_default();

        if field_name == "parent_id" {
            let mut data = Vec::new();
            while let Some(chunk) = field.next().await {
                let bytes =
                    chunk.map_err(|e| AppError::Internal(e.to_string()))?;
                data.extend_from_slice(&bytes);
            }
            let val = String::from_utf8_lossy(&data).to_string();
            if !val.is_empty() {
                parent_id = Some(val);
            }
            continue;
        }

        // File field
        let original_name = field
            .content_disposition()
            .and_then(|cd| cd.get_filename().map(|s| s.to_string()))
            .unwrap_or_else(|| "untitled.md".to_string());

        let mut content_bytes = Vec::new();
        while let Some(chunk) = field.next().await {
            let data =
                chunk.map_err(|e| AppError::Internal(format!("Read chunk error: {}", e)))?;
            content_bytes.extend_from_slice(&data);
        }
        let content = String::from_utf8_lossy(&content_bytes).to_string();

        // Title = filename without .md extension
        let title = original_name
            .strip_suffix(".md")
            .or_else(|| original_name.strip_suffix(".markdown"))
            .unwrap_or(&original_name)
            .to_string();

        let id = Uuid::new_v4().to_string();

        // Auto sort_order
        let max_sort: Option<(i32,)> = if let Some(ref pid) = parent_id {
            sqlx::query_as(
                "SELECT COALESCE(MAX(sort_order), -1) FROM wiki_pages WHERE parent_id = ?1",
            )
            .bind(pid)
            .fetch_optional(pool.get_ref())
            .await?
        } else {
            sqlx::query_as(
                "SELECT COALESCE(MAX(sort_order), -1) FROM wiki_pages WHERE parent_id IS NULL",
            )
            .fetch_optional(pool.get_ref())
            .await?
        };
        let sort_order = max_sort.map(|r| r.0 + 1).unwrap_or(0);

        sqlx::query(
            "INSERT INTO wiki_pages (id, parent_id, title, content, is_folder, sort_order) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
        )
        .bind(&id)
        .bind(&parent_id)
        .bind(&title)
        .bind(&content)
        .bind(sort_order)
        .execute(pool.get_ref())
        .await?;

        let page = sqlx::query_as::<_, WikiPage>("SELECT * FROM wiki_pages WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await?;

        created_pages.push(page);
    }

    Ok(HttpResponse::Created().json(created_pages))
}
