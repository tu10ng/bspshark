use actix_web::{dev::ServiceResponse, test, web, App, Error};
use sqlx::SqlitePool;

pub async fn create_test_pool() -> SqlitePool {
    let pool = backend::db::init_pool("sqlite::memory:").await;
    pool
}

pub async fn spawn_test_app() -> (
    impl actix_web::dev::Service<actix_http::Request, Response = ServiceResponse, Error = Error>,
    SqlitePool,
) {
    let pool = create_test_pool().await;
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .configure(backend::configure_app),
    )
    .await;
    (app, pool)
}
