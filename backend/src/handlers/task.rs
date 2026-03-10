use actix_web::{delete, get, post, put, web, HttpResponse};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::knowledge_tree::TreeNode;
use crate::models::pitfall::Pitfall;
use crate::models::task::*;

#[get("/api/v1/tasks")]
async fn list_tasks(
    pool: web::Data<SqlitePool>,
    query: web::Query<TaskQuery>,
) -> Result<HttpResponse, AppError> {
    let mut sql = "SELECT * FROM tasks WHERE 1=1".to_string();
    let mut binds: Vec<String> = vec![];

    if let Some(assignee) = &query.assignee {
        binds.push(assignee.clone());
        sql.push_str(&format!(" AND assignee = ?{}", binds.len()));
    }
    if let Some(status) = &query.status {
        binds.push(status.clone());
        sql.push_str(&format!(" AND status = ?{}", binds.len()));
    }
    if let Some(module) = &query.module {
        binds.push(format!("%\"{}\"%" , module.replace('"', "")));
        sql.push_str(&format!(" AND modules LIKE ?{}", binds.len()));
    }
    sql.push_str(" ORDER BY created_at DESC");

    let mut q = sqlx::query_as::<_, Task>(&sql);
    for b in &binds {
        q = q.bind(b);
    }
    let tasks = q.fetch_all(pool.get_ref()).await?;

    Ok(HttpResponse::Ok().json(tasks))
}

#[post("/api/v1/tasks")]
async fn create_task(
    pool: web::Data<SqlitePool>,
    body: web::Json<CreateTask>,
) -> Result<HttpResponse, AppError> {
    let id = Uuid::new_v4().to_string();
    let modules = serde_json::to_string(&body.modules.as_deref().unwrap_or(&[])).unwrap();

    sqlx::query(
        "INSERT INTO tasks (id, title, description, assignee, assigned_by, modules, due_date)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )
    .bind(&id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.assignee)
    .bind(&body.assigned_by)
    .bind(&modules)
    .bind(&body.due_date)
    .execute(pool.get_ref())
    .await?;

    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    // Auto-identify pitfalls based on modules
    let auto_pitfalls = identify_pitfalls_for_modules(
        pool.get_ref(),
        &body.modules.as_deref().unwrap_or(&[]),
    ).await?;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "task": task,
        "auto_identified_pitfalls": auto_pitfalls,
    })))
}

#[get("/api/v1/tasks/{id}")]
async fn get_task(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Task not found".to_string()))?;

    let nodes = sqlx::query_as::<_, TreeNode>(
        "SELECT tn.* FROM tree_nodes tn
         JOIN task_node_refs tnr ON tn.id = tnr.node_id
         WHERE tnr.task_id = ?1"
    )
    .bind(&id)
    .fetch_all(pool.get_ref())
    .await?;

    let artifacts = sqlx::query_as::<_, TaskArtifact>(
        "SELECT * FROM task_artifacts WHERE task_id = ?1 ORDER BY created_at"
    )
    .bind(&id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(TaskDetail { task, nodes, artifacts }))
}

#[put("/api/v1/tasks/{id}")]
async fn update_task(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateTask>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let existing = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Task not found".to_string()))?;

    let title = body.title.as_deref().unwrap_or(&existing.title);
    let description = body.description.as_deref().or(existing.description.as_deref());
    let assignee = body.assignee.as_deref().or(existing.assignee.as_deref());
    let assigned_by = body.assigned_by.as_deref().or(existing.assigned_by.as_deref());
    let status = body.status.as_deref().unwrap_or(&existing.status);
    let modules = body.modules.as_ref()
        .map(|m| serde_json::to_string(m).unwrap())
        .unwrap_or(existing.modules.clone());
    let discovered_pitfalls_notes = body.discovered_pitfalls_notes.as_deref()
        .or(existing.discovered_pitfalls_notes.as_deref());
    let due_date = body.due_date.as_deref().or(existing.due_date.as_deref());

    sqlx::query(
        "UPDATE tasks SET title = ?1, description = ?2, assignee = ?3, assigned_by = ?4,
         status = ?5, modules = ?6, discovered_pitfalls_notes = ?7, due_date = ?8,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?9"
    )
    .bind(title)
    .bind(description)
    .bind(assignee)
    .bind(assigned_by)
    .bind(status)
    .bind(&modules)
    .bind(discovered_pitfalls_notes)
    .bind(due_date)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(task))
}

#[delete("/api/v1/tasks/{id}")]
async fn delete_task(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let result = sqlx::query("DELETE FROM tasks WHERE id = ?1")
        .bind(&id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Task not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}

#[post("/api/v1/tasks/{id}/nodes")]
async fn link_task_node(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<NodeRef>,
) -> Result<HttpResponse, AppError> {
    let task_id = path.into_inner();

    sqlx::query("SELECT id FROM tasks WHERE id = ?1")
        .bind(&task_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Task not found".to_string()))?;

    sqlx::query("SELECT id FROM tree_nodes WHERE id = ?1")
        .bind(&body.node_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Node not found".to_string()))?;

    sqlx::query(
        "INSERT OR IGNORE INTO task_node_refs (task_id, node_id) VALUES (?1, ?2)"
    )
    .bind(&task_id)
    .bind(&body.node_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(serde_json::json!({"status": "linked"})))
}

#[delete("/api/v1/tasks/{task_id}/nodes/{node_id}")]
async fn unlink_task_node(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, AppError> {
    let (task_id, node_id) = path.into_inner();

    let result = sqlx::query(
        "DELETE FROM task_node_refs WHERE task_id = ?1 AND node_id = ?2"
    )
    .bind(&task_id)
    .bind(&node_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Link not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}

#[post("/api/v1/tasks/{id}/artifacts")]
async fn create_artifact(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<CreateArtifact>,
) -> Result<HttpResponse, AppError> {
    let task_id = path.into_inner();
    let id = Uuid::new_v4().to_string();

    sqlx::query("SELECT id FROM tasks WHERE id = ?1")
        .bind(&task_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Task not found".to_string()))?;

    sqlx::query(
        "INSERT INTO task_artifacts (id, task_id, artifact_type, title, url) VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(&id)
    .bind(&task_id)
    .bind(&body.artifact_type)
    .bind(&body.title)
    .bind(&body.url)
    .execute(pool.get_ref())
    .await?;

    let artifact = sqlx::query_as::<_, TaskArtifact>(
        "SELECT * FROM task_artifacts WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(artifact))
}

#[delete("/api/v1/tasks/{task_id}/artifacts/{artifact_id}")]
async fn delete_artifact(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, AppError> {
    let (task_id, artifact_id) = path.into_inner();

    let result = sqlx::query(
        "DELETE FROM task_artifacts WHERE id = ?1 AND task_id = ?2"
    )
    .bind(&artifact_id)
    .bind(&task_id)
    .execute(pool.get_ref())
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Artifact not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}

#[get("/api/v1/tasks/{id}/pitfalls")]
async fn get_task_pitfalls(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let task_id = path.into_inner();

    sqlx::query("SELECT id FROM tasks WHERE id = ?1")
        .bind(&task_id)
        .fetch_one(pool.get_ref())
        .await
        .map_err(|_| AppError::NotFound("Task not found".to_string()))?;

    // Get pitfalls via task -> nodes -> pitfalls
    let pitfalls = sqlx::query_as::<_, Pitfall>(
        "SELECT DISTINCT p.* FROM pitfalls p
         JOIN node_pitfall_refs npr ON p.id = npr.pitfall_id
         JOIN task_node_refs tnr ON npr.node_id = tnr.node_id
         WHERE tnr.task_id = ?1"
    )
    .bind(&task_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(pitfalls))
}

/// Auto-identify pitfalls for given modules
async fn identify_pitfalls_for_modules(
    pool: &SqlitePool,
    modules: &[String],
) -> Result<Vec<Pitfall>, AppError> {
    if modules.is_empty() {
        return Ok(vec![]);
    }

    let placeholders: Vec<String> = modules.iter().enumerate()
        .map(|(i, _)| format!("?{}", i + 1))
        .collect();
    let sql = format!(
        "SELECT DISTINCT p.* FROM pitfalls p
         JOIN node_pitfall_refs npr ON p.id = npr.pitfall_id
         JOIN tree_nodes tn ON npr.node_id = tn.id
         JOIN knowledge_trees kt ON tn.tree_id = kt.id
         WHERE kt.module IN ({})
         AND p.status = 'active'",
        placeholders.join(", ")
    );

    let mut q = sqlx::query_as::<_, Pitfall>(&sql);
    for module in modules {
        q = q.bind(module);
    }
    let pitfalls = q.fetch_all(pool).await?;
    Ok(pitfalls)
}
