mod common;

use actix_web::test;
use serde_json::{json, Value};

#[actix_web::test]
async fn crud_wiki_pages() {
    let (app, _pool) = common::spawn_test_app().await;

    // 1. Create root page
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "title": "开发指南",
            "slug": "dev"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let dev_page: Value = test::read_body_json(resp).await;
    let dev_id = dev_page["id"].as_str().unwrap();

    // 2. GET tree — should have 1 root node
    let req = test::TestRequest::get().uri("/api/v1/wiki").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let tree: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(tree.len(), 1);
    assert_eq!(tree[0]["title"], "开发指南");

    // 3. Create child under dev
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "parent_id": dev_id,
            "title": "前端",
            "slug": "frontend"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let frontend_page: Value = test::read_body_json(resp).await;
    let frontend_id = frontend_page["id"].as_str().unwrap();

    // 4. Create grandchild under frontend
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "parent_id": frontend_id,
            "title": "Setup",
            "slug": "setup"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let setup_page: Value = test::read_body_json(resp).await;
    let setup_id = setup_page["id"].as_str().unwrap();

    // 5. GET tree — verify nesting: dev → frontend → setup
    let req = test::TestRequest::get().uri("/api/v1/wiki").to_request();
    let resp = test::call_service(&app, req).await;
    let tree: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(tree.len(), 1);
    assert_eq!(tree[0]["children"].as_array().unwrap().len(), 1);
    assert_eq!(tree[0]["children"][0]["title"], "前端");
    assert_eq!(tree[0]["children"][0]["children"][0]["title"], "Setup");

    // 6. GET by path
    let req = test::TestRequest::get()
        .uri("/api/v1/wiki/page?path=dev/frontend/setup")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let page: Value = test::read_body_json(resp).await;
    assert_eq!(page["path"], "dev/frontend/setup");
    assert_eq!(page["breadcrumbs"].as_array().unwrap().len(), 3);
    assert_eq!(page["breadcrumbs"][0]["slug"], "dev");
    assert_eq!(page["breadcrumbs"][1]["slug"], "frontend");
    assert_eq!(page["breadcrumbs"][2]["slug"], "setup");

    // 7. GET by ID
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/wiki/pages/{}", setup_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let page: Value = test::read_body_json(resp).await;
    assert_eq!(page["path"], "dev/frontend/setup");

    // 8. Update page
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/wiki/pages/{}", setup_id))
        .set_json(serde_json::json!({
            "title": "Setup v2"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let page: Value = test::read_body_json(resp).await;
    assert_eq!(page["title"], "Setup v2");

    // 9. Delete root — cascades to all children
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/wiki/pages/{}", dev_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);

    // 10. GET tree — empty
    let req = test::TestRequest::get().uri("/api/v1/wiki").to_request();
    let resp = test::call_service(&app, req).await;
    let tree: Vec<Value> = test::read_body_json(resp).await;
    assert!(tree.is_empty());
}

#[actix_web::test]
async fn slug_uniqueness() {
    let (app, _pool) = common::spawn_test_app().await;

    // 1. Create root "dev"
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "title": "Dev",
            "slug": "dev"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let dev_page: Value = test::read_body_json(resp).await;
    let dev_id = dev_page["id"].as_str().unwrap();

    // 2. Duplicate root "dev" — should fail
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "title": "Dev 2",
            "slug": "dev"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    // 3. "setup" under "dev" — ok
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "parent_id": dev_id,
            "title": "Setup",
            "slug": "setup"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);

    // 4. Duplicate "setup" under "dev" — should fail
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "parent_id": dev_id,
            "title": "Setup 2",
            "slug": "setup"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    // 5. "setup" at root — ok (different parent)
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "title": "Root Setup",
            "slug": "setup"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
}

#[actix_web::test]
async fn reserved_slugs() {
    let (app, _pool) = common::spawn_test_app().await;

    // "edit" — should fail
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "title": "Edit",
            "slug": "edit"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    // "new" — should fail
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "title": "New",
            "slug": "new"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
}

#[actix_web::test]
async fn path_not_found() {
    let (app, _pool) = common::spawn_test_app().await;

    // Nonexistent path
    let req = test::TestRequest::get()
        .uri("/api/v1/wiki/page?path=nonexistent")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404);

    // Create "dev" then try "dev/nonexistent"
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(serde_json::json!({
            "title": "Dev",
            "slug": "dev"
        }))
        .to_request();
    test::call_service(&app, req).await;

    let req = test::TestRequest::get()
        .uri("/api/v1/wiki/page?path=dev/nonexistent")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404);
}

#[actix_web::test]
async fn reorder_pages() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create A(0), B(1), C(2)
    let mut ids = Vec::new();
    for (title, slug) in [("A", "a"), ("B", "b"), ("C", "c")] {
        let req = test::TestRequest::post()
            .uri("/api/v1/wiki/pages")
            .set_json(serde_json::json!({
                "title": title,
                "slug": slug
            }))
            .to_request();
        let resp = test::call_service(&app, req).await;
        let page: Value = test::read_body_json(resp).await;
        ids.push(page["id"].as_str().unwrap().to_string());
    }

    // Reorder: A→10, B→20, C→5 (C goes first)
    for (id, order) in [(&ids[0], 10), (&ids[1], 20), (&ids[2], 5)] {
        let req = test::TestRequest::put()
            .uri(&format!("/api/v1/wiki/pages/{}/reorder", id))
            .set_json(serde_json::json!({
                "sort_order": order
            }))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);
    }

    // GET tree and verify order: C(5), A(10), B(20)
    let req = test::TestRequest::get().uri("/api/v1/wiki").to_request();
    let resp = test::call_service(&app, req).await;
    let tree: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(tree[0]["title"], "C");
    assert_eq!(tree[1]["title"], "A");
    assert_eq!(tree[2]["title"], "B");
}

/// Helper: create a wiki page and return (id, Value)
async fn create_page(
    app: &impl actix_web::dev::Service<actix_http::Request, Response = actix_web::dev::ServiceResponse, Error = actix_web::Error>,
    title: &str,
    slug: &str,
    parent_id: Option<&str>,
) -> (String, Value) {
    let mut payload = json!({ "title": title, "slug": slug });
    if let Some(pid) = parent_id {
        payload["parent_id"] = json!(pid);
    }
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(&payload)
        .to_request();
    let resp = test::call_service(app, req).await;
    assert_eq!(resp.status(), 201, "Failed to create page '{}'", title);
    let page: Value = test::read_body_json(resp).await;
    let id = page["id"].as_str().unwrap().to_string();
    (id, page)
}

#[actix_web::test]
async fn reorder_self_reference_rejected() {
    let (app, _pool) = common::spawn_test_app().await;
    let (a_id, _) = create_page(&app, "A", "a", None).await;

    // Move A under itself — should be rejected
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/wiki/pages/{}/reorder", a_id))
        .set_json(json!({ "parent_id": a_id, "sort_order": 0 }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
    let body: Value = test::read_body_json(resp).await;
    assert!(body["error"].as_str().unwrap().contains("own parent"));
}

#[actix_web::test]
async fn reorder_cycle_detection() {
    let (app, _pool) = common::spawn_test_app().await;

    // Build chain: A → B → C
    let (a_id, _) = create_page(&app, "A", "a", None).await;
    let (b_id, _) = create_page(&app, "B", "b", Some(&a_id)).await;
    let (c_id, _) = create_page(&app, "C", "c", Some(&b_id)).await;

    // Move A under C — should be rejected (cycle: A→B→C→A)
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/wiki/pages/{}/reorder", a_id))
        .set_json(json!({ "parent_id": c_id, "sort_order": 0 }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
    let body: Value = test::read_body_json(resp).await;
    assert!(body["error"].as_str().unwrap().contains("descendant"));
}

#[actix_web::test]
async fn batch_reorder_cycle_rejected() {
    let (app, _pool) = common::spawn_test_app().await;

    // Build chain: A → B → C
    let (a_id, _) = create_page(&app, "A", "a", None).await;
    let (b_id, _) = create_page(&app, "B", "b", Some(&a_id)).await;
    let (c_id, _) = create_page(&app, "C", "c", Some(&b_id)).await;

    // batch move: A under C — should be rejected
    let req = test::TestRequest::put()
        .uri("/api/v1/wiki/pages/reorder-batch")
        .set_json(json!({
            "items": [
                { "id": a_id, "parent_id": c_id, "sort_order": 0 }
            ]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);
}

#[actix_web::test]
async fn batch_reorder_success() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create root pages A(0), B(1), C(2)
    let (a_id, _) = create_page(&app, "A", "a", None).await;
    let (b_id, _) = create_page(&app, "B", "b", None).await;
    let (c_id, _) = create_page(&app, "C", "c", None).await;

    // Reverse order: C=0, B=1, A=2
    let req = test::TestRequest::put()
        .uri("/api/v1/wiki/pages/reorder-batch")
        .set_json(json!({
            "items": [
                { "id": c_id, "parent_id": null, "sort_order": 0 },
                { "id": b_id, "parent_id": null, "sort_order": 1 },
                { "id": a_id, "parent_id": null, "sort_order": 2 }
            ]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let body: Value = test::read_body_json(resp).await;
    assert_eq!(body["updated"], 3);

    // Verify order
    let req = test::TestRequest::get().uri("/api/v1/wiki").to_request();
    let resp = test::call_service(&app, req).await;
    let tree: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(tree[0]["title"], "C");
    assert_eq!(tree[1]["title"], "B");
    assert_eq!(tree[2]["title"], "A");
}

#[actix_web::test]
async fn reorder_cross_parent_move() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create: Root1 → Child, Root2
    let (root1_id, _) = create_page(&app, "Root1", "root1", None).await;
    let (child_id, _) = create_page(&app, "Child", "child", Some(&root1_id)).await;
    let (root2_id, _) = create_page(&app, "Root2", "root2", None).await;

    // Move Child from Root1 to Root2
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/wiki/pages/{}/reorder", child_id))
        .set_json(json!({ "parent_id": root2_id, "sort_order": 0 }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    // Verify Child is now under Root2
    let req = test::TestRequest::get().uri("/api/v1/wiki").to_request();
    let resp = test::call_service(&app, req).await;
    let tree: Vec<Value> = test::read_body_json(resp).await;

    // Root1 should have no children
    let root1 = tree.iter().find(|n| n["title"] == "Root1").unwrap();
    assert!(root1["children"].as_array().unwrap().is_empty());

    // Root2 should have Child
    let root2 = tree.iter().find(|n| n["title"] == "Root2").unwrap();
    assert_eq!(root2["children"][0]["title"], "Child");
}

#[actix_web::test]
async fn slug_format_validation() {
    let (app, _pool) = common::spawn_test_app().await;

    // Uppercase — should fail
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(json!({ "title": "Test", "slug": "MyPage" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    // Spaces — should fail
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(json!({ "title": "Test", "slug": "my page" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    // Leading hyphen — should fail
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(json!({ "title": "Test", "slug": "-leading" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    // Trailing hyphen — should fail
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(json!({ "title": "Test", "slug": "trailing-" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    // Valid slug — should succeed
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(json!({ "title": "Test", "slug": "my-page-123" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);

    // Chinese slug — should succeed
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(json!({ "title": "Test", "slug": "入门指南" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);

    // Mixed valid — should succeed
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(json!({ "title": "Test", "slug": "dev-开发" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
}
