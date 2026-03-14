mod common;

use actix_web::test;
use serde_json::Value;

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
