use actix_cors::Cors;
use actix_web::{web, App, HttpServer};

use backend::configure_app;
use backend::db;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Try .env in current dir, then parent dir (for monorepo root)
    dotenvy::dotenv()
        .or_else(|_| dotenvy::from_filename("../.env"))
        .ok();
    env_logger::init();

    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://bspshark.db".to_string());
    let pool = db::init_pool(&database_url).await;

    let port: u16 = std::env::var("BACKEND_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("BACKEND_PORT must be a valid port number");

    log::info!("Starting server on 0.0.0.0:{}", port);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_headers(vec!["Content-Type", "Authorization"])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
            .configure(configure_app)
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
