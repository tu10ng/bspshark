use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;

pub mod db;
pub mod error;
pub mod handlers;
pub mod models;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    version: &'static str,
}

#[get("/api/v1/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    })
}

pub fn configure_app(cfg: &mut web::ServiceConfig) {
    cfg.service(health)
        // Knowledge trees
        .service(handlers::knowledge_tree::list_trees)
        .service(handlers::knowledge_tree::create_tree)
        .service(handlers::knowledge_tree::get_tree)
        .service(handlers::knowledge_tree::update_tree)
        .service(handlers::knowledge_tree::delete_tree)
        .service(handlers::knowledge_tree::get_tree_nodes)
        // Tree nodes
        .service(handlers::tree_node::create_node)
        .service(handlers::tree_node::update_node)
        .service(handlers::tree_node::delete_node)
        .service(handlers::tree_node::reorder_node)
        .service(handlers::tree_node::link_pitfall)
        .service(handlers::tree_node::unlink_pitfall)
        // Pitfalls
        .service(handlers::pitfall::list_pitfalls)
        .service(handlers::pitfall::create_pitfall)
        .service(handlers::pitfall::get_pitfall)
        .service(handlers::pitfall::update_pitfall)
        .service(handlers::pitfall::delete_pitfall)
        // Knowledge instances
        .service(handlers::knowledge_instance::create_instance)
        .service(handlers::knowledge_instance::update_instance)
        .service(handlers::knowledge_instance::delete_instance)
        .service(handlers::knowledge_instance::list_instances)
        .service(handlers::knowledge_instance::assign_node_instance)
        .service(handlers::knowledge_instance::unassign_node_instance)
        // Tasks
        .service(handlers::task::list_tasks)
        .service(handlers::task::create_task)
        .service(handlers::task::get_task)
        .service(handlers::task::update_task)
        .service(handlers::task::delete_task)
        .service(handlers::task::link_task_node)
        .service(handlers::task::unlink_task_node)
        .service(handlers::task::create_artifact)
        .service(handlers::task::delete_artifact)
        .service(handlers::task::get_task_pitfalls);
}
