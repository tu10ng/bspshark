use actix_cors::Cors;
use actix_web::{App, HttpServer};

use backend::configure_app;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    env_logger::init();

    let port: u16 = std::env::var("BACKEND_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("BACKEND_PORT must be a valid port number");

    log::info!("Starting server on 0.0.0.0:{}", port);

    HttpServer::new(|| {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_headers(vec!["Content-Type", "Authorization"])
            .max_age(3600);

        App::new().wrap(cors).configure(configure_app)
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use actix_web::{test, App};
    use backend::configure_app;

    #[actix_rt::test]
    async fn test_health_endpoint() {
        let app = test::init_service(App::new().configure(configure_app)).await;
        let req = test::TestRequest::get().uri("/api/v1/health").to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["status"], "ok");
    }
}
