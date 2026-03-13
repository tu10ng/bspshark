mod common;

use actix_web::test;

#[actix_rt::test]
async fn crud_experience() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create
    let req = test::TestRequest::post()
        .uri("/api/v1/experiences")
        .set_json(serde_json::json!({
            "title": "NPE in UserService",
            "description": "当用户未设置nickname时抛出空指针",
            "severity": "high",
            "tags": ["java", "npe"]
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 201);
    let experience: serde_json::Value = test::read_body_json(resp).await;
    let id = experience["id"].as_str().unwrap().to_string();
    assert_eq!(experience["status"], "active");
    assert_eq!(experience["severity"], "high");

    // Get with references
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/experiences/{}", id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let detail: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(detail["title"], "NPE in UserService");
    assert!(detail["references"].as_array().unwrap().is_empty());

    // Update status to resolved
    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/experiences/{}", id))
        .set_json(serde_json::json!({
            "status": "resolved",
            "resolution_notes": "添加了空值检查"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    let updated: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(updated["status"], "resolved");
    assert_eq!(updated["resolution_notes"], "添加了空值检查");

    // List with status filter
    let req = test::TestRequest::get()
        .uri("/api/v1/experiences?status=resolved")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let experiences: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(experiences.len(), 1);

    let req = test::TestRequest::get()
        .uri("/api/v1/experiences?status=active")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let experiences: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(experiences.len(), 0);

    // Delete
    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/experiences/{}", id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 204);

    // Verify deleted
    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/experiences/{}", id))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 404);
}

#[actix_rt::test]
async fn experience_fts_search() {
    let (app, _pool) = common::spawn_test_app().await;

    // Create experiences
    for (title, desc) in [
        ("数据库连接超时", "MySQL连接池配置不当导致超时"),
        ("Redis缓存击穿", "高并发下缓存失效"),
        ("前端渲染白屏", "SSR水合失败"),
    ] {
        let req = test::TestRequest::post()
            .uri("/api/v1/experiences")
            .set_json(serde_json::json!({
                "title": title,
                "description": desc,
            }))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 201, "Failed to create experience: {}", title);
    }

    // Verify all 3 were created
    let req = test::TestRequest::get().uri("/api/v1/experiences").to_request();
    let resp = test::call_service(&app, req).await;
    let all: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(all.len(), 3, "Expected 3 experiences, got {}", all.len());

    // FTS search for "数据库"
    let req = test::TestRequest::get()
        .uri("/api/v1/experiences?q=%E6%95%B0%E6%8D%AE%E5%BA%93")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let results: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(results.len(), 1);
    assert_eq!(results[0]["title"], "数据库连接超时");

    // FTS search for "缓存" — should match "Redis缓存击穿"
    let req = test::TestRequest::get()
        .uri("/api/v1/experiences?q=%E7%BC%93%E5%AD%98")
        .to_request();
    let resp = test::call_service(&app, req).await;
    let results: Vec<serde_json::Value> = test::read_body_json(resp).await;
    assert_eq!(results.len(), 1);
}
