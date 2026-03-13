use actix_web::{delete, get, post, put, web, HttpResponse};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::experience::Experience;
use crate::models::knowledge_tree::*;

#[derive(serde::Deserialize)]
pub struct TreeQuery {
    pub module: Option<String>,
}

#[get("/api/v1/knowledge-trees")]
async fn list_trees(
    pool: web::Data<SqlitePool>,
    query: web::Query<TreeQuery>,
) -> Result<HttpResponse, AppError> {
    let trees = if let Some(module) = &query.module {
        sqlx::query_as::<_, KnowledgeTree>(
            "SELECT * FROM knowledge_trees WHERE module = ?1 ORDER BY created_at DESC"
        )
        .bind(module)
        .fetch_all(pool.get_ref())
        .await?
    } else {
        sqlx::query_as::<_, KnowledgeTree>(
            "SELECT * FROM knowledge_trees ORDER BY created_at DESC"
        )
        .fetch_all(pool.get_ref())
        .await?
    };

    Ok(HttpResponse::Ok().json(trees))
}

#[post("/api/v1/knowledge-trees")]
async fn create_tree(
    pool: web::Data<SqlitePool>,
    body: web::Json<CreateKnowledgeTree>,
) -> Result<HttpResponse, AppError> {
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO knowledge_trees (id, name, description, module) VALUES (?1, ?2, ?3, ?4)"
    )
    .bind(&id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(&body.module)
    .execute(pool.get_ref())
    .await?;

    let tree = sqlx::query_as::<_, KnowledgeTree>(
        "SELECT * FROM knowledge_trees WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(tree))
}

#[get("/api/v1/knowledge-trees/{id}")]
async fn get_tree(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let tree = sqlx::query_as::<_, KnowledgeTree>(
        "SELECT * FROM knowledge_trees WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| AppError::NotFound("Knowledge tree not found".to_string()))?;

    Ok(HttpResponse::Ok().json(tree))
}

#[put("/api/v1/knowledge-trees/{id}")]
async fn update_tree(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    body: web::Json<UpdateKnowledgeTree>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();

    let existing = sqlx::query_as::<_, KnowledgeTree>(
        "SELECT * FROM knowledge_trees WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| AppError::NotFound("Knowledge tree not found".to_string()))?;

    let name = body.name.as_deref().unwrap_or(&existing.name);
    let description = body.description.as_deref().or(existing.description.as_deref());
    let module = body.module.as_deref().or(existing.module.as_deref());

    sqlx::query(
        "UPDATE knowledge_trees SET name = ?1, description = ?2, module = ?3,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?4"
    )
    .bind(name)
    .bind(description)
    .bind(module)
    .bind(&id)
    .execute(pool.get_ref())
    .await?;

    let tree = sqlx::query_as::<_, KnowledgeTree>(
        "SELECT * FROM knowledge_trees WHERE id = ?1"
    )
    .bind(&id)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(tree))
}

#[delete("/api/v1/knowledge-trees/{id}")]
async fn delete_tree(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let result = sqlx::query("DELETE FROM knowledge_trees WHERE id = ?1")
        .bind(&id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Knowledge tree not found".to_string()));
    }

    Ok(HttpResponse::NoContent().finish())
}

#[get("/api/v1/knowledge-trees/{id}/nodes")]
async fn get_tree_nodes(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let tree_id = path.into_inner();

    // Verify tree exists
    sqlx::query_as::<_, KnowledgeTree>(
        "SELECT * FROM knowledge_trees WHERE id = ?1"
    )
    .bind(&tree_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|_| AppError::NotFound("Knowledge tree not found".to_string()))?;

    // Fetch all nodes for this tree
    let nodes = sqlx::query_as::<_, TreeNode>(
        "SELECT * FROM tree_nodes WHERE tree_id = ?1 ORDER BY sort_order"
    )
    .bind(&tree_id)
    .fetch_all(pool.get_ref())
    .await?;

    // Fetch all instance assignments for nodes in this tree
    let instance_assignments: Vec<(String, String)> = sqlx::query_as(
        "SELECT nia.node_id, nia.instance_id FROM node_instance_assignments nia
         JOIN tree_nodes tn ON nia.node_id = tn.id
         WHERE tn.tree_id = ?1"
    )
    .bind(&tree_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    // Fetch all experience refs for nodes in this tree
    let experience_refs: Vec<(String, Experience)> = {
        let refs = sqlx::query_as::<_, (String, String)>(
            "SELECT ner.node_id, ner.experience_id FROM node_experience_refs ner
             JOIN tree_nodes tn ON ner.node_id = tn.id
             WHERE tn.tree_id = ?1"
        )
        .bind(&tree_id)
        .fetch_all(pool.get_ref())
        .await?;

        let mut result = Vec::new();
        for (node_id, experience_id) in refs {
            if let Ok(experience) = sqlx::query_as::<_, Experience>(
                "SELECT * FROM experiences WHERE id = ?1"
            )
            .bind(&experience_id)
            .fetch_one(pool.get_ref())
            .await {
                result.push((node_id, experience));
            }
        }
        result
    };

    // Build nested tree
    let nested = build_nested_tree(&nodes, &experience_refs, &instance_assignments, None);
    Ok(HttpResponse::Ok().json(nested))
}

fn build_nested_tree(
    all_nodes: &[TreeNode],
    experience_refs: &[(String, Experience)],
    instance_assignments: &[(String, String)],
    parent_id: Option<&str>,
) -> Vec<TreeNodeNested> {
    let mut result: Vec<TreeNodeNested> = all_nodes
        .iter()
        .filter(|n| n.parent_id.as_deref() == parent_id)
        .map(|node| {
            let experiences: Vec<Experience> = experience_refs
                .iter()
                .filter(|(nid, _)| nid == &node.id)
                .map(|(_, e)| e.clone())
                .collect();

            let inst_ids: Vec<String> = instance_assignments
                .iter()
                .filter(|(nid, _)| nid == &node.id)
                .map(|(_, iid)| iid.clone())
                .collect();

            let children = build_nested_tree(all_nodes, experience_refs, instance_assignments, Some(&node.id));

            TreeNodeNested {
                node: TreeNode {
                    id: node.id.clone(),
                    tree_id: node.tree_id.clone(),
                    parent_id: node.parent_id.clone(),
                    title: node.title.clone(),
                    description: node.description.clone(),
                    sort_order: node.sort_order,
                    created_at: node.created_at.clone(),
                    updated_at: node.updated_at.clone(),
                },
                experiences,
                children,
                instance_ids: inst_ids,
            }
        })
        .collect();

    result.sort_by_key(|n| n.node.sort_order);
    result
}
