mod common;

use actix_web::test;

#[actix_rt::test]
async fn crud_knowledge_tree() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create
    let req = test::TestRequest::post()
        .uri("/api/v1/knowledge-trees")
        .set_json(serde_json::json!({
            "name": "用户注册流程",
            "description": "新用户注册的完整流程",
            "module": "auth"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let tree: serde_json::Value = test::read_body_json(resp).await;
    let tree_id = tree["id"].as_str().unwrap().to_string();

    // List
    let req = test::TestRequest::get().uri("/api/v1/knowledge-trees").to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let trees: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(trees.len(), 1);

    // List with module filter
    let req = test::TestRequest::get()
        .uri("/api/v1/knowledge-trees?module=auth")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let trees: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(trees.len(), 1);

    let req = test::TestRequest::get()
        .uri("/api/v1/knowledge-trees?module=billing")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let trees: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(trees.len(), 0);

    // Get
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/knowledge-trees/{}", tree_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let tree: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(tree["name"], "用户注册流程");

    // Update
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/knowledge-trees/{}", tree_id))
        .set_json(serde_json::json!({ "name": "用户注册流程 v2" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let tree: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(tree["name"], "用户注册流程 v2");

    // Delete
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/knowledge-trees/{}", tree_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);
}

#[actix_rt::test]
async fn tree_nodes_nested() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create tree
    let req = test::TestRequest::post()
        .uri("/api/v1/knowledge-trees")
        .set_json(serde_json::json!({ "name": "测试树", "module": "test" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let tree: serde_json::Value = test::read_body_json(resp).await;
    let tree_id = tree["id"].as_str().unwrap().to_string();

    // Create root node
    let req = test::TestRequest::post()
        .uri("/api/v1/tree-nodes")
        .set_json(serde_json::json!({
            "tree_id": tree_id,
            "title": "步骤1"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let node1: serde_json::Value = test::read_body_json(resp).await;
    let node1_id = node1["id"].as_str().unwrap().to_string();

    // Create child node
    let req = test::TestRequest::post()
        .uri("/api/v1/tree-nodes")
        .set_json(serde_json::json!({
            "tree_id": tree_id,
            "parent_id": node1_id,
            "title": "异常场景"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);

    // Create an experience and link it
    let req = test::TestRequest::post()
        .uri("/api/v1/experiences")
        .set_json(serde_json::json!({
            "title": "数据库连接超时",
            "description": "高并发时连接池不够用",
            "severity": "high",
            "tags": ["database", "performance"]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let experience: serde_json::Value = test::read_body_json(resp).await;
    let experience_id = experience["id"].as_str().unwrap().to_string();

    // Link experience to node
    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/tree-nodes/{}/experiences", node1_id))
        .set_json(serde_json::json!({ "experience_id": experience_id }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);

    // Get nested tree
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/knowledge-trees/{}/nodes", tree_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let nodes: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(nodes.len(), 1); // 1 root node
    assert_eq!(nodes[0]["children"].as_array().unwrap().len(), 1); // 1 child
    assert_eq!(nodes[0]["experiences"].as_array().unwrap().len(), 1); // 1 experience

    // Unlink experience
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/tree-nodes/{}/experiences/{}", node1_id, experience_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);

    // Update node
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/tree-nodes/{}", node1_id))
        .set_json(serde_json::json!({ "title": "步骤1 (updated)" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let node: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(node["title"], "步骤1 (updated)");

    // Delete tree cascades nodes
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/knowledge-trees/{}", tree_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);
}
