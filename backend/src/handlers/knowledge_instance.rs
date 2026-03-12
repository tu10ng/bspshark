use actix_web::{delete, get, post, put, web, HttpResponse};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::knowledge_instance::*;

#[post("/api/v1/knowledge-instances")]
async fn create_instance(
    pool: web::Data<SqlitePool>,
    body: web::Json<CreateInstance>,
) -> Result<HttpResponse, AppError> {
    let id = Uuid::new_v4().to_string();

    // Verify group node exists
    sqlx::query("SELECT id FROM tree_nodes WHERE id = ?1")
        .bind(&body.group_node_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Group node not found".to_string()))?;

    // Auto sort_order
    let max_sort: Option<i32> = sqlx::query_scalar(
        "SELECT MAX(sort_order) FROM knowledge_instances WHERE group_node_id = ?1",
    )
    .bind(&body.group_node_id)
    .fetch_one(pool.get_ref())
    .await?;

    let sort_order = max_sort.unwrap_or(-1) + 1;

    sqlx::query(
        "INSERT INTO knowledge_instances (id, group_node_id, name, description, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(&id)
    .bind(&body.group_node_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(sort_order)
    .execute(pool.get_ref())
    .await?;

    let instance =
        sqlx::query_as::<_, KnowledgeInstance>("SELECT * FROM knowledge_instances WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await?;

    Ok(HttpResponse::Created().json(instance))
}

#[put("/api/v1/knowledge-instances/{id}")]
async fn update_instance(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateInstance>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let existing =
        sqlx::query_as::<_, KnowledgeInstance>("SELECT * FROM knowledge_instances WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await
            .map_err(|_| AppError::NotFound("Instance not found".to_string()))?;

    let name = body.name.as_deref().unwrap_or(&existing.name);
    let description = body
        .description
        .as_deref()
        .or(existing.description.as_deref());

    sqlx::query(
        "UPDATE knowledge_instances SET name = ?1, description = ?2,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?3",
    )
    .bind(name)
    .bind(description)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    let instance =
        sqlx::query_as::<_, KnowledgeInstance>("SELECT * FROM knowledge_instances WHERE id = ?1")
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await?;

    Ok(HttpResponse::Ok().json(instance))
}

#[delete("/api/v1/knowledge-instances/{id}")]
async fn delete_instance(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let result = sqlx::query("DELETE FROM knowledge_instances WHERE id = ?1")
        .bind(&id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Instance not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}

#[get("/api/v1/tree-nodes/{group_id}/instances")]
async fn list_instances(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let group_id = path.into_inner();

    let instances = sqlx::query_as::<_, KnowledgeInstance>(
        "SELECT * FROM knowledge_instances WHERE group_node_id = ?1 ORDER BY sort_order",
    )
    .bind(&group_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(instances))
}

#[post("/api/v1/tree-nodes/{node_id}/instances/{instance_id}")]
async fn assign_node_instance(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, AppError> {
    let (node_id, instance_id) = path.into_inner();

    // Verify both exist
    sqlx::query("SELECT id FROM tree_nodes WHERE id = ?1")
        .bind(&node_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Node not found".to_string()))?;

    sqlx::query("SELECT id FROM knowledge_instances WHERE id = ?1")
        .bind(&instance_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Instance not found".to_string()))?;

    sqlx::query(
        "INSERT OR IGNORE INTO node_instance_assignments (node_id, instance_id) VALUES (?1, ?2)",
    )
    .bind(&node_id)
    .bind(&instance_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(serde_json::json!({"status": "assigned"})))
}

#[delete("/api/v1/tree-nodes/{node_id}/instances/{instance_id}")]
async fn unassign_node_instance(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, AppError> {
    let (node_id, instance_id) = path.into_inner();

    let result = sqlx::query(
        "DELETE FROM node_instance_assignments WHERE node_id = ?1 AND instance_id = ?2",
    )
    .bind(&node_id)
    .bind(&instance_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Assignment not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}
