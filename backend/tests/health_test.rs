mod common;

use actix_web::test;

#[actix_rt::test]
async fn health_returns_200() {
    let (app, _pool) = common::spawn_test_app().await;
    let req = test::TestRequest::get().uri("/api/v1/health").to_request();
    let resp = test::call_service(&app, req).await;

    assert!(resp.status().is_success());

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["status"], "ok");
    assert!(body["version"].is_string());
}
