use actix_web::{dev::ServiceResponse, test, App, Error};

pub async fn spawn_test_app() -> impl actix_web::dev::Service<
    actix_http::Request,
    Response = ServiceResponse,
    Error = Error,
> {
    test::init_service(App::new().configure(backend::configure_app)).await
}
