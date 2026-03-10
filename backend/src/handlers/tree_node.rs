use actix_web::{delete, post, put, web, HttpResponse};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::knowledge_tree::*;
use crate::models::task::PitfallRef;

#[post("/api/v1/tree-nodes")]
async fn create_node(
    pool: web::Data<SqlitePool>,
    body: web::Json<CreateTreeNode>,
) -> Result<HttpResponse, AppError> {
    let id = Uuid::new_v4().to_string();

    // Verify tree exists
    sqlx::query("SELECT id FROM knowledge_trees WHERE id = ?1")
        .bind(&body.tree_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Knowledge tree not found".to_string()))?;

    // Verify parent exists if specified
    if let Some(parent_id) = &body.parent_id {
        sqlx::query("SELECT id FROM tree_nodes WHERE id = ?1")
            .bind(parent_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|_| AppError::NotFound("Parent node not found".to_string()))?;
    }

    // Auto sort_order = max + 1
    let max_sort: Option<i32> = sqlx::query_scalar(
        "SELECT MAX(sort_order) FROM tree_nodes WHERE tree_id = ?1 AND parent_id IS ?2"
    )
    .bind(&body.tree_id)
    .bind(&body.parent_id)
    .fetch_one(pool.get_ref())
    .await?;

    let sort_order = max_sort.unwrap_or(-1) + 1;

    sqlx::query(
        "INSERT INTO tree_nodes (id, tree_id, parent_id, node_type, title, description, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )
    .bind(&id)
    .bind(&body.tree_id)
    .bind(&body.parent_id)
    .bind(&body.node_type)
    .bind(&body.title)
    .bind(&body.description)
    .bind(sort_order)
    .execute(pool.get_ref())
    .await?;

    let node = sqlx::query_as::<_, TreeNode>("SELECT * FROM tree_nodes WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Created().json(node))
}

#[put("/api/v1/tree-nodes/{id}")]
async fn update_node(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateTreeNode>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let existing = sqlx::query_as::<_, TreeNode>("SELECT * FROM tree_nodes WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Node not found".to_string()))?;

    let title = body.title.as_deref().unwrap_or(&existing.title);
    let description = body.description.as_deref().or(existing.description.as_deref());
    let node_type = body.node_type.as_deref().unwrap_or(&existing.node_type);

    sqlx::query(
        "UPDATE tree_nodes SET title = ?1, description = ?2, node_type = ?3,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?4"
    )
    .bind(title)
    .bind(description)
    .bind(node_type)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    let node = sqlx::query_as::<_, TreeNode>("SELECT * FROM tree_nodes WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(node))
}

#[delete("/api/v1/tree-nodes/{id}")]
async fn delete_node(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let result = sqlx::query("DELETE FROM tree_nodes WHERE id = ?1")
        .bind(&id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Node not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}

#[post("/api/v1/tree-nodes/{id}/reorder")]
async fn reorder_node(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<ReorderNode>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    // Verify node exists
    sqlx::query("SELECT id FROM tree_nodes WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Node not found".to_string()))?;

    // Verify new parent exists if specified
    if let Some(parent_id) = &body.parent_id {
        sqlx::query("SELECT id FROM tree_nodes WHERE id = ?1")
            .bind(parent_id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|_| AppError::NotFound("Parent node not found".to_string()))?;
    }

    sqlx::query(
        "UPDATE tree_nodes SET parent_id = ?1, sort_order = ?2,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?3"
    )
    .bind(&body.parent_id)
    .bind(body.sort_order)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    let node = sqlx::query_as::<_, TreeNode>("SELECT * FROM tree_nodes WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(node))
}

#[post("/api/v1/tree-nodes/{id}/pitfalls")]
async fn link_pitfall(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<PitfallRef>,
) -> Result<HttpResponse, AppError> {
    let node_id = path.into_inner();

    // Verify node and pitfall exist
    sqlx::query("SELECT id FROM tree_nodes WHERE id = ?1")
        .bind(&node_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Node not found".to_string()))?;

    sqlx::query("SELECT id FROM pitfalls WHERE id = ?1")
        .bind(&body.pitfall_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Pitfall not found".to_string()))?;

    sqlx::query(
        "INSERT OR IGNORE INTO node_pitfall_refs (node_id, pitfall_id) VALUES (?1, ?2)"
    )
    .bind(&node_id)
    .bind(&body.pitfall_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(serde_json::json!({"status": "linked"})))
}

#[delete("/api/v1/tree-nodes/{node_id}/pitfalls/{pitfall_id}")]
async fn unlink_pitfall(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, AppError> {
    let (node_id, pitfall_id) = path.into_inner();

    let result = sqlx::query(
        "DELETE FROM node_pitfall_refs WHERE node_id = ?1 AND pitfall_id = ?2"
    )
    .bind(&node_id)
    .bind(&pitfall_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Link not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}
