mod common;

use actix_web::test;

#[actix_rt::test]
async fn crud_task_with_artifacts() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create task
    let req = test::TestRequest::post()
        .uri("/api/v1/tasks")
        .set_json(serde_json::json!({
            "title": "实现用户注册",
            "description": "完成注册页面和后端API",
            "assignee": "张三",
            "assigned_by": "李四",
            "modules": ["auth", "user"],
            "due_date": "2026-04-01"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let body: serde_json::Value = test::read_body_json(resp).await;
    let task_id = body["task"]["id"].as_str().unwrap().to_string();
    assert_eq!(body["task"]["status"], "pending");

    // Get task detail
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/tasks/{}", task_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let detail: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(detail["title"], "实现用户注册");

    // Update task
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/tasks/{}", task_id))
        .set_json(serde_json::json!({ "status": "in_progress" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let task: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(task["status"], "in_progress");

    // Add artifact
    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/tasks/{}/artifacts", task_id))
        .set_json(serde_json::json!({
            "artifact_type": "design_doc",
            "title": "注册流程设计文档",
            "url": "https://docs.example.com/register"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let artifact: serde_json::Value = test::read_body_json(resp).await;
    let artifact_id = artifact["id"].as_str().unwrap().to_string();

    // Task detail now includes artifact
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/tasks/{}", task_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let detail: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(detail["artifacts"].as_array().unwrap().len(), 1);

    // Delete artifact
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/tasks/{}/artifacts/{}", task_id, artifact_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);

    // List tasks
    let req = test::TestRequest::get().uri("/api/v1/tasks").to_request();
    let resp = test::call_service(&app, req).await;
    let tasks: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(tasks.len(), 1);

    // Filter by assignee
    let req = test::TestRequest::get()
        .uri("/api/v1/tasks?assignee=%E5%BC%A0%E4%B8%89")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let tasks: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(tasks.len(), 1);

    // Delete task
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/tasks/{}", task_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);
}

#[actix_rt::test]
async fn task_node_linking_and_pitfall_auto_identify() {
    let (app, _pool) = common::spawn_test_app().await;

    // Setup: create tree with node and pitfall
    let req = test::TestRequest::post()
        .uri("/api/v1/knowledge-trees")
        .set_json(serde_json::json!({ "name": "认证流程", "module": "auth" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let tree: serde_json::Value = test::read_body_json(resp).await;
    let tree_id = tree["id"].as_str().unwrap();

    let req = test::TestRequest::post()
        .uri("/api/v1/tree-nodes")
        .set_json(serde_json::json!({
            "tree_id": tree_id,
            "node_type": "step",
            "title": "密码校验"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let node: serde_json::Value = test::read_body_json(resp).await;
    let node_id = node["id"].as_str().unwrap();

    let req = test::TestRequest::post()
        .uri("/api/v1/pitfalls")
        .set_json(serde_json::json!({
            "title": "密码明文存储",
            "severity": "critical"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let pitfall: serde_json::Value = test::read_body_json(resp).await;
    let pitfall_id = pitfall["id"].as_str().unwrap();

    // Link pitfall to node
    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/tree-nodes/{}/pitfalls", node_id))
        .set_json(serde_json::json!({ "pitfall_id": pitfall_id }))
        .to_request();
    test::call_service(&app, req).await;

    // Create task with module "auth" -> should auto-identify the pitfall
    let req = test::TestRequest::post()
        .uri("/api/v1/tasks")
        .set_json(serde_json::json!({
            "title": "修复密码安全",
            "modules": ["auth"]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let body: serde_json::Value = test::read_body_json(resp).await;
    let auto_pitfalls = body["auto_identified_pitfalls"].as_array().unwrap();
    assert_eq!(auto_pitfalls.len(), 1);
    assert_eq!(auto_pitfalls[0]["title"], "密码明文存储");

    let task_id = body["task"]["id"].as_str().unwrap();

    // Link node to task
    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/tasks/{}/nodes", task_id))
        .set_json(serde_json::json!({ "node_id": node_id }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);

    // Get task pitfalls via linked nodes
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/tasks/{}/pitfalls", task_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let pitfalls: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(pitfalls.len(), 1);

    // Unlink node from task
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/tasks/{}/nodes/{}", task_id, node_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);
}
