use actix_web::{delete, get, post, put, web, HttpResponse};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::experience::Experience;
use crate::models::knowledge_item::KnowledgeItem;
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

#[derive(serde::Deserialize)]
pub struct TreeNodesQuery {
    pub as_of: Option<String>,
}

#[get("/api/v1/knowledge-trees/{id}/nodes")]
async fn get_tree_nodes(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    query: web::Query<TreeNodesQuery>,
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

    // Check if this tree has knowledge_tree_roots (new system)
    let root_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM knowledge_tree_roots WHERE tree_id = ?1",
    )
    .bind(&tree_id)
    .fetch_one(pool.get_ref())
    .await?;

    if root_count > 0 {
        // New system: build tree from knowledge_items + knowledge_relations
        let nested = build_tree_from_knowledge_items(pool.get_ref(), &tree_id, query.as_of.as_deref()).await?;
        return Ok(HttpResponse::Ok().json(nested));
    }

    // Legacy system: build tree from tree_nodes
    let nodes = sqlx::query_as::<_, TreeNode>(
        "SELECT * FROM tree_nodes WHERE tree_id = ?1 ORDER BY sort_order"
    )
    .bind(&tree_id)
    .fetch_all(pool.get_ref())
    .await?;

    let instance_assignments: Vec<(String, String)> = sqlx::query_as(
        "SELECT nia.node_id, nia.instance_id FROM node_instance_assignments nia
         JOIN tree_nodes tn ON nia.node_id = tn.id
         WHERE tn.tree_id = ?1"
    )
    .bind(&tree_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

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

    let nested = build_nested_tree(&nodes, &experience_refs, &instance_assignments, None);
    Ok(HttpResponse::Ok().json(nested))
}

/// Build a tree from the new knowledge_items system.
/// Returns TreeNodeNested[] (same structure as legacy) for backward compatibility.
async fn build_tree_from_knowledge_items(
    pool: &SqlitePool,
    tree_id: &str,
    _as_of: Option<&str>,
) -> Result<Vec<TreeNodeNested>, AppError> {
    // Get root knowledge items for this tree
    let roots = sqlx::query_as::<_, (String, i64)>(
        "SELECT knowledge_item_id, sort_order FROM knowledge_tree_roots
         WHERE tree_id = ?1 ORDER BY sort_order",
    )
    .bind(tree_id)
    .fetch_all(pool)
    .await?;

    // Collect all knowledge items reachable from these roots
    let all_items = sqlx::query_as::<_, KnowledgeItem>(
        "SELECT * FROM knowledge_items",
    )
    .fetch_all(pool)
    .await?;

    // Get all parent_child relations
    let relations = sqlx::query_as::<_, (String, String, i64)>(
        "SELECT source_id, target_id, sort_order FROM knowledge_relations
         WHERE relation_type = 'parent_child'
         ORDER BY sort_order",
    )
    .fetch_all(pool)
    .await?;

    // Get all experience refs
    let exp_refs = sqlx::query_as::<_, (String, String)>(
        "SELECT knowledge_item_id, experience_id FROM knowledge_experience_refs",
    )
    .fetch_all(pool)
    .await?;

    let all_experiences = sqlx::query_as::<_, Experience>(
        "SELECT * FROM experiences",
    )
    .fetch_all(pool)
    .await?;

    // Build experience map
    let exp_map: std::collections::HashMap<String, Experience> = all_experiences
        .into_iter()
        .map(|e| (e.id.clone(), e))
        .collect();

    let item_map: std::collections::HashMap<String, KnowledgeItem> = all_items
        .into_iter()
        .map(|i| (i.id.clone(), i))
        .collect();

    // Build nested tree starting from roots
    let mut result = Vec::new();
    for (root_id, root_sort) in &roots {
        if let Some(item) = item_map.get(root_id) {
            let nested = build_ki_nested(
                item,
                tree_id,
                *root_sort as i32,
                &item_map,
                &relations,
                &exp_refs,
                &exp_map,
            );
            result.push(nested);
        }
    }

    Ok(result)
}

/// Recursively build TreeNodeNested from a knowledge item and its children.
fn build_ki_nested(
    item: &KnowledgeItem,
    tree_id: &str,
    sort_order: i32,
    item_map: &std::collections::HashMap<String, KnowledgeItem>,
    relations: &[(String, String, i64)],
    exp_refs: &[(String, String)],
    exp_map: &std::collections::HashMap<String, Experience>,
) -> TreeNodeNested {
    // Find children (relations where this item is source)
    let mut children: Vec<TreeNodeNested> = relations
        .iter()
        .filter(|(src, _, _)| src == &item.id)
        .filter_map(|(_, target, child_sort)| {
            item_map.get(target).map(|child_item| {
                build_ki_nested(
                    child_item,
                    tree_id,
                    *child_sort as i32,
                    item_map,
                    relations,
                    exp_refs,
                    exp_map,
                )
            })
        })
        .collect();

    children.sort_by_key(|c| c.node.sort_order);

    // Get experiences for this item
    let experiences: Vec<Experience> = exp_refs
        .iter()
        .filter(|(ki_id, _)| ki_id == &item.id)
        .filter_map(|(_, eid)| exp_map.get(eid).cloned())
        .collect();

    TreeNodeNested {
        node: TreeNode {
            id: item.id.clone(),
            tree_id: tree_id.to_string(),
            parent_id: None, // Not used directly in the new system
            title: item.title.clone(),
            description: Some(item.content.clone()),
            sort_order,
            created_at: item.created_at.clone(),
            updated_at: item.updated_at.clone(),
        },
        experiences,
        children,
        instance_ids: Vec::new(), // Instances not yet migrated
    }
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
