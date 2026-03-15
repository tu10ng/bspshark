use actix_web::{delete, get, post, put, web, HttpResponse};
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::models::knowledge_item::{
    CreateKnowledgeItem, KnowledgeItemQuery, UpdateKnowledgeItem,
};
use crate::models::knowledge_relation::CreateKnowledgeRelation;
use crate::services::{knowledge, versioning};

// ---- Knowledge Items CRUD ----

#[get("/api/v1/knowledge-items")]
pub async fn list_knowledge_items(
    pool: web::Data<SqlitePool>,
    query: web::Query<KnowledgeItemQuery>,
) -> Result<HttpResponse, AppError> {
    let items = knowledge::list_knowledge_items(
        pool.get_ref(),
        query.q.as_deref(),
        query.tag.as_deref(),
    )
    .await?;

    Ok(HttpResponse::Ok().json(items))
}

#[post("/api/v1/knowledge-items")]
pub async fn create_knowledge_item(
    pool: web::Data<SqlitePool>,
    body: web::Json<CreateKnowledgeItem>,
) -> Result<HttpResponse, AppError> {
    let tags = body.tags.as_deref().unwrap_or(&[]);

    let item = knowledge::create_knowledge_item(
        pool.get_ref(),
        &body.title,
        body.content.as_deref().unwrap_or(""),
        body.slug.as_deref(),
        tags,
        None,
    )
    .await?;

    Ok(HttpResponse::Created().json(item))
}

#[get("/api/v1/knowledge-items/{id}")]
pub async fn get_knowledge_item(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let item = knowledge::get_knowledge_item_with_refs(pool.get_ref(), &id).await?;
    Ok(HttpResponse::Ok().json(item))
}

#[put("/api/v1/knowledge-items/{id}")]
pub async fn update_knowledge_item(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateKnowledgeItem>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let tags_owned: Option<Vec<String>> = body.tags.clone();

    let item = knowledge::update_knowledge_item(
        pool.get_ref(),
        &id,
        body.title.as_deref(),
        body.content.as_deref(),
        body.slug.as_deref(),
        tags_owned.as_deref(),
        None,
    )
    .await?;

    Ok(HttpResponse::Ok().json(item))
}

#[delete("/api/v1/knowledge-items/{id}")]
pub async fn delete_knowledge_item(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    knowledge::delete_knowledge_item(pool.get_ref(), &id).await?;
    Ok(HttpResponse::NoContent().finish())
}

// ---- Knowledge Relations ----

#[post("/api/v1/knowledge-relations")]
pub async fn create_knowledge_relation(
    pool: web::Data<SqlitePool>,
    body: web::Json<CreateKnowledgeRelation>,
) -> Result<HttpResponse, AppError> {
    let relation = knowledge::create_relation(
        pool.get_ref(),
        &body.source_id,
        &body.target_id,
        &body.relation_type,
        body.sort_order.unwrap_or(0),
    )
    .await?;

    Ok(HttpResponse::Created().json(relation))
}

#[delete("/api/v1/knowledge-relations/{id}")]
pub async fn delete_knowledge_relation(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    knowledge::delete_relation(pool.get_ref(), &id).await?;
    Ok(HttpResponse::NoContent().finish())
}

#[get("/api/v1/knowledge-items/{id}/relations")]
pub async fn get_knowledge_item_relations(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    // Verify item exists
    knowledge::get_knowledge_item(pool.get_ref(), &id).await?;
    let relations = knowledge::get_relations(pool.get_ref(), &id).await?;
    Ok(HttpResponse::Ok().json(relations))
}

// ---- Version History ----

#[get("/api/v1/knowledge-items/{id}/versions")]
pub async fn list_knowledge_item_versions(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    // Verify item exists
    knowledge::get_knowledge_item(pool.get_ref(), &id).await?;
    let versions = versioning::get_knowledge_versions(pool.get_ref(), &id).await?;
    Ok(HttpResponse::Ok().json(versions))
}

#[get("/api/v1/knowledge-items/{id}/versions/{version}")]
pub async fn get_knowledge_item_version(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, i64)>,
) -> Result<HttpResponse, AppError> {
    let (id, version) = path.into_inner();
    let ver = versioning::get_knowledge_version(pool.get_ref(), &id, version).await?;
    Ok(HttpResponse::Ok().json(ver))
}

// ---- Experience Versions ----

#[get("/api/v1/experiences/{id}/versions")]
pub async fn list_experience_versions(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let versions = versioning::get_experience_versions(pool.get_ref(), &id).await?;
    Ok(HttpResponse::Ok().json(versions))
}

// ---- Wiki Page Versions ----

#[get("/api/v1/wiki/pages/{id}/versions")]
pub async fn list_wiki_page_versions(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let versions = versioning::get_wiki_page_versions(pool.get_ref(), &id).await?;
    Ok(HttpResponse::Ok().json(versions))
}

#[get("/api/v1/wiki/pages/{id}/versions/{version}")]
pub async fn get_wiki_page_version(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, i64)>,
) -> Result<HttpResponse, AppError> {
    let (id, version) = path.into_inner();
    let ver = versioning::get_wiki_page_version(pool.get_ref(), &id, version).await?;
    Ok(HttpResponse::Ok().json(ver))
}
