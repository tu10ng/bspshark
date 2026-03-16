mod common;

use actix_web::test;
use serde_json::{json, Value};

#[actix_web::test]
async fn crud_knowledge_items() {
    let (app, _pool) = common::spawn_test_app().await;

    // 1. Create a knowledge item
    let req = test::TestRequest::post()
        .uri("/api/v1/knowledge-items")
        .set_json(json!({
            "title": "SATA 控制器",
            "content": "SATA controller handles disk IO.",
            "tags": ["storage", "hardware"]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let item: Value = test::read_body_json(resp).await;
    let item_id = item["id"].as_str().unwrap();
    assert_eq!(item["title"], "SATA 控制器");
    assert_eq!(item["current_version"], 1);
    assert!(!item["slug"].as_str().unwrap().is_empty());

    // 2. List knowledge items
    let req = test::TestRequest::get()
        .uri("/api/v1/knowledge-items")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let items: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(items.len(), 1);

    // 3. Search by query
    let req = test::TestRequest::get()
        .uri("/api/v1/knowledge-items?q=SATA")
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let items: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(items.len(), 1);

    // 4. Get by ID (with refs)
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/knowledge-items/{}", item_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let detail: Value = test::read_body_json(resp).await;
    assert_eq!(detail["title"], "SATA 控制器");
    assert!(detail["wiki_references"].is_array());

    // 5. Update knowledge item — should bump version
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/knowledge-items/{}", item_id))
        .set_json(json!({
            "content": "SATA controller handles disk IO. Updated with AHCI info."
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let updated: Value = test::read_body_json(resp).await;
    assert_eq!(updated["current_version"], 2);

    // 6. Get version history
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/knowledge-items/{}/versions", item_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let versions: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(versions.len(), 2);
    // Versions returned in DESC order
    assert_eq!(versions[0]["version"], 2);
    assert_eq!(versions[1]["version"], 1);

    // 7. Get specific version
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/knowledge-items/{}/versions/1", item_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let v1: Value = test::read_body_json(resp).await;
    assert_eq!(v1["content"], "SATA controller handles disk IO.");

    // 8. Delete knowledge item
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/knowledge-items/{}", item_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);

    // 9. Verify deleted
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/knowledge-items/{}", item_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404);
}

#[actix_web::test]
async fn knowledge_relations() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create two knowledge items
    let req = test::TestRequest::post()
        .uri("/api/v1/knowledge-items")
        .set_json(json!({ "title": "Parent Item" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let parent: Value = test::read_body_json(resp).await;
    let parent_id = parent["id"].as_str().unwrap();

    let req = test::TestRequest::post()
        .uri("/api/v1/knowledge-items")
        .set_json(json!({ "title": "Child Item" }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let child: Value = test::read_body_json(resp).await;
    let child_id = child["id"].as_str().unwrap();

    // Create relation
    let req = test::TestRequest::post()
        .uri("/api/v1/knowledge-relations")
        .set_json(json!({
            "source_id": parent_id,
            "target_id": child_id,
            "relation_type": "parent_child"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let rel: Value = test::read_body_json(resp).await;
    let rel_id = rel["id"].as_str().unwrap();

    // Get relations for parent
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/knowledge-items/{}/relations", parent_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let rels: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(rels.len(), 1);
    assert_eq!(rels[0]["relation_type"], "parent_child");

    // Delete relation
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/knowledge-relations/{}", rel_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);
}

#[actix_web::test]
async fn wiki_auto_identify_sections() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create a wiki page with markdown containing H2 + experience (auto-identify always runs)
    let req = test::TestRequest::post()
        .uri("/api/v1/wiki/pages")
        .set_json(json!({
            "title": "Storage Guide",
            "slug": "storage-guide",
            "content": "Intro text.\n\n## SATA 控制器\n\nSATA controller info.\n\n> [!EXPERIENCE] AHCI Bug\n> Need to switch to AHCI in BIOS.\n\n## 文件系统\n\next4 is good."
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let page: Value = test::read_body_json(resp).await;
    let page_id = page["id"].as_str().unwrap();

    // Fetch page by ID — should include sections
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/wiki/pages/{}", page_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let detail: Value = test::read_body_json(resp).await;
    let sections = detail["sections"].as_array().unwrap();
    assert!(sections.len() >= 3); // freeform + knowledge + experience + knowledge

    // Verify knowledge items were created
    let req = test::TestRequest::get()
        .uri("/api/v1/knowledge-items")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let items: Vec<Value> = test::read_body_json(resp).await;
    assert!(items.len() >= 2); // "SATA 控制器" and "文件系统"

    // Verify experience was created
    let req = test::TestRequest::get()
        .uri("/api/v1/experiences?q=AHCI")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let exps: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(exps.len(), 1);
    assert_eq!(exps[0]["title"], "AHCI Bug");

    // Verify wiki page version was created
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/wiki/pages/{}/versions", page_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);
    let versions: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(versions.len(), 1);

    // Update the wiki page — should create new versions
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/wiki/pages/{}", page_id))
        .set_json(json!({
            "content": "Intro text updated.\n\n## SATA 控制器\n\nUpdated SATA info.\n\n## 文件系统\n\next4 is great."
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 200);

    // Verify wiki page has version 2
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/wiki/pages/{}/versions", page_id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    let versions: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(versions.len(), 2);

    // Verify the SATA knowledge item was updated
    let req = test::TestRequest::get()
        .uri("/api/v1/knowledge-items?q=SATA")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let items: Vec<Value> = test::read_body_json(resp).await;
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["current_version"], 2);
}
