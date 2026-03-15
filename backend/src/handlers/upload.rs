use actix_multipart::Multipart;
use actix_web::{post, HttpResponse};
use futures::StreamExt;
use serde::Serialize;
use std::path::PathBuf;
use uuid::Uuid;

use crate::error::AppError;

const DEFAULT_MAX_UPLOAD_SIZE: usize = 20 * 1024 * 1024; // 20MB

#[derive(Serialize)]
struct UploadResponse {
    url: String,
    filename: String,
    size: usize,
    content_type: String,
}

fn get_max_upload_size() -> usize {
    std::env::var("MAX_UPLOAD_SIZE")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_MAX_UPLOAD_SIZE)
}

fn get_extension(filename: &str, content_type: &str) -> String {
    // Try to get extension from filename first
    if let Some(ext) = std::path::Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
    {
        return ext.to_lowercase();
    }
    // Fallback to content type
    match content_type {
        "image/png" => "png".to_string(),
        "image/jpeg" => "jpg".to_string(),
        "image/gif" => "gif".to_string(),
        "image/webp" => "webp".to_string(),
        "image/svg+xml" => "svg".to_string(),
        "application/pdf" => "pdf".to_string(),
        _ => "bin".to_string(),
    }
}

/// POST /api/v1/uploads — upload a file via multipart/form-data
#[post("/api/v1/uploads")]
pub async fn upload_file(mut payload: Multipart) -> Result<HttpResponse, AppError> {
    let max_size = get_max_upload_size();

    while let Some(item) = payload.next().await {
        let mut field = item.map_err(|e| AppError::BadRequest(e.to_string()))?;

        let original_filename = field
            .content_disposition()
            .and_then(|cd| cd.get_filename().map(|s| s.to_string()))
            .unwrap_or_else(|| "upload".to_string());
        let content_type = field
            .content_type()
            .map(|ct| ct.to_string())
            .unwrap_or_else(|| "application/octet-stream".to_string());

        let ext = get_extension(&original_filename, &content_type);
        let uuid = Uuid::new_v4();
        let now = chrono::Utc::now();
        let year = now.format("%Y").to_string();
        let month = now.format("%m").to_string();

        let dir = PathBuf::from("uploads").join(&year).join(&month);
        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to create upload dir: {}", e)))?;

        let stored_name = format!("{}.{}", uuid, ext);
        let file_path = dir.join(&stored_name);

        let mut bytes = Vec::new();
        while let Some(chunk) = field.next().await {
            let data = chunk.map_err(|e| AppError::BadRequest(e.to_string()))?;
            if bytes.len() + data.len() > max_size {
                return Err(AppError::BadRequest(format!(
                    "File too large. Maximum size is {} bytes",
                    max_size
                )));
            }
            bytes.extend_from_slice(&data);
        }

        let size = bytes.len();
        tokio::fs::write(&file_path, &bytes)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to write file: {}", e)))?;

        let url = format!("/api/v1/uploads/{}/{}/{}", year, month, stored_name);

        return Ok(HttpResponse::Ok().json(UploadResponse {
            url,
            filename: original_filename,
            size,
            content_type,
        }));
    }

    Err(AppError::BadRequest("No file provided".to_string()))
}
