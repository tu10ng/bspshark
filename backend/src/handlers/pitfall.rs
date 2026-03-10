use actix_web::{delete, get, post, put, web, HttpResponse};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::pitfall::*;

#[get("/api/v1/pitfalls")]
async fn list_pitfalls(
    pool: web::Data<SqlitePool>,
    query: web::Query<PitfallQuery>,
) -> Result<HttpResponse, AppError> {
    let pitfalls = if let Some(q) = &query.q {
        let pattern = format!("%{}%", q);
        sqlx::query_as::<_, Pitfall>(
            "SELECT * FROM pitfalls
             WHERE title LIKE ?1 OR description LIKE ?1 OR tags LIKE ?1
             ORDER BY created_at DESC"
        )
        .bind(&pattern)
        .fetch_all(pool.get_ref())
        .await?
    } else {
        let mut sql = "SELECT * FROM pitfalls WHERE 1=1".to_string();
        let mut binds: Vec<String> = vec![];

        if let Some(status) = &query.status {
            binds.push(status.clone());
            sql.push_str(&format!(" AND status = ?{}", binds.len()));
        }
        if let Some(severity) = &query.severity {
            binds.push(severity.clone());
            sql.push_str(&format!(" AND severity = ?{}", binds.len()));
        }
        if let Some(tag) = &query.tag {
            binds.push(format!("%\"{}\"%" , tag.replace('"', "")));
            sql.push_str(&format!(" AND tags LIKE ?{}", binds.len()));
        }
        sql.push_str(" ORDER BY created_at DESC");

        let mut q = sqlx::query_as::<_, Pitfall>(&sql);
        for b in &binds {
            q = q.bind(b);
        }
        q.fetch_all(pool.get_ref()).await?
    };

    Ok(HttpResponse::Ok().json(pitfalls))
}

#[post("/api/v1/pitfalls")]
async fn create_pitfall(
    pool: web::Data<SqlitePool>,
    body: web::Json<CreatePitfall>,
) -> Result<HttpResponse, AppError> {
    let id = Uuid::new_v4().to_string();
    let severity = body.severity.as_deref().unwrap_or("medium");
    let tags = serde_json::to_string(&body.tags.as_deref().unwrap_or(&[])).unwrap();

    sqlx::query(
        "INSERT INTO pitfalls (id, title, description, severity, tags) VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(&id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(severity)
    .bind(&tags)
    .execute(pool.get_ref())
    .await?;

    let pitfall = sqlx::query_as::<_, Pitfall>("SELECT * FROM pitfalls WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Created().json(pitfall))
}

#[get("/api/v1/pitfalls/{id}")]
async fn get_pitfall(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let pitfall = sqlx::query_as::<_, Pitfall>("SELECT * FROM pitfalls WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Pitfall not found".to_string()))?;

    let references = sqlx::query_as::<_, PitfallReference>(
        "SELECT npr.node_id, tn.title as node_title, tn.tree_id, kt.name as tree_name
         FROM node_pitfall_refs npr
         JOIN tree_nodes tn ON npr.node_id = tn.id
         JOIN knowledge_trees kt ON tn.tree_id = kt.id
         WHERE npr.pitfall_id = ?1"
    )
    .bind(&id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(PitfallWithRefs { pitfall, references }))
}

#[put("/api/v1/pitfalls/{id}")]
async fn update_pitfall(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdatePitfall>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let existing = sqlx::query_as::<_, Pitfall>("SELECT * FROM pitfalls WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Pitfall not found".to_string()))?;

    let title = body.title.as_deref().unwrap_or(&existing.title);
    let description = body.description.as_deref().or(existing.description.as_deref());
    let severity = body.severity.as_deref().unwrap_or(&existing.severity);
    let status = body.status.as_deref().unwrap_or(&existing.status);
    let resolution_notes = body.resolution_notes.as_deref().or(existing.resolution_notes.as_deref());
    let tags = body.tags.as_ref()
        .map(|t| serde_json::to_string(t).unwrap())
        .unwrap_or(existing.tags.clone());

    sqlx::query(
        "UPDATE pitfalls SET title = ?1, description = ?2, severity = ?3, status = ?4,
         resolution_notes = ?5, tags = ?6, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ?7"
    )
    .bind(title)
    .bind(description)
    .bind(severity)
    .bind(status)
    .bind(resolution_notes)
    .bind(&tags)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    let pitfall = sqlx::query_as::<_, Pitfall>("SELECT * FROM pitfalls WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(pitfall))
}

#[delete("/api/v1/pitfalls/{id}")]
async fn delete_pitfall(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let result = sqlx::query("DELETE FROM pitfalls WHERE id = ?1")
        .bind(&id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Pitfall not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}
