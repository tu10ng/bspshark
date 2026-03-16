use sqlx::SqliteConnection;

use crate::error::AppError;
use crate::models::experience::Experience;
use crate::models::knowledge_item::KnowledgeItem;
use crate::models::wiki_page_section::{WikiPageSection, WikiPageSectionJoinRow};
use crate::services::auto_identify::ParsedSection;

/// Load sections for a wiki page and resolve their entities (knowledge items, experiences).
/// Uses a single JOIN query instead of N+1 individual queries.
pub async fn load_sections(
    conn: &mut SqliteConnection,
    wiki_page_id: &str,
) -> Result<Vec<WikiPageSection>, AppError> {
    let rows = sqlx::query_as::<_, WikiPageSectionJoinRow>(
        "SELECT
            wps.id, wps.section_type, wps.knowledge_item_id, wps.experience_id,
            wps.freeform_content, wps.sort_order,
            ki.id AS ki_id, ki.title AS ki_title, ki.content AS ki_content,
            ki.slug AS ki_slug, ki.tags AS ki_tags, ki.current_version AS ki_current_version,
            ki.created_at AS ki_created_at, ki.updated_at AS ki_updated_at,
            e.id AS exp_id, e.title AS exp_title, e.description AS exp_description,
            e.severity AS exp_severity, e.status AS exp_status,
            e.resolution_notes AS exp_resolution_notes, e.tags AS exp_tags,
            e.content AS exp_content, e.created_at AS exp_created_at,
            e.updated_at AS exp_updated_at
         FROM wiki_page_sections wps
         LEFT JOIN knowledge_items ki ON ki.id = wps.knowledge_item_id
         LEFT JOIN experiences e ON e.id = wps.experience_id
         WHERE wps.wiki_page_id = ?
         ORDER BY wps.sort_order",
    )
    .bind(wiki_page_id)
    .fetch_all(&mut *conn)
    .await
    .map_err(AppError::from)?;

    let sections = rows
        .into_iter()
        .map(|row| {
            let knowledge_item = row.ki_id.map(|ki_id| KnowledgeItem {
                id: ki_id,
                title: row.ki_title.unwrap_or_default(),
                content: row.ki_content.unwrap_or_default(),
                slug: row.ki_slug.unwrap_or_default(),
                tags: row.ki_tags.unwrap_or_else(|| "[]".to_string()),
                current_version: row.ki_current_version.unwrap_or(1),
                created_at: row.ki_created_at.unwrap_or_default(),
                updated_at: row.ki_updated_at.unwrap_or_default(),
            });

            let experience = row.exp_id.map(|exp_id| Experience {
                id: exp_id,
                title: row.exp_title.unwrap_or_default(),
                description: row.exp_description,
                severity: row.exp_severity.unwrap_or_else(|| "medium".to_string()),
                status: row.exp_status.unwrap_or_else(|| "active".to_string()),
                resolution_notes: row.exp_resolution_notes,
                tags: row.exp_tags.unwrap_or_else(|| "[]".to_string()),
                content: row.exp_content,
                created_at: row.exp_created_at.unwrap_or_default(),
                updated_at: row.exp_updated_at.unwrap_or_default(),
            });

            WikiPageSection {
                id: row.id,
                section_type: row.section_type,
                knowledge_item,
                experience,
                freeform_content: row.freeform_content,
                sort_order: row.sort_order,
            }
        })
        .collect();

    Ok(sections)
}

/// Rebuild Markdown from resolved sections (for editing).
/// Nests experience sections within their preceding knowledge section.
pub fn rebuild_markdown(sections: &[WikiPageSection]) -> String {
    let mut parts: Vec<String> = Vec::new();
    let mut current_knowledge_parts: Option<Vec<String>> = None;

    for section in sections {
        match section.section_type.as_str() {
            "knowledge" => {
                // Flush previous knowledge section (with its nested experiences)
                if let Some(ki_parts) = current_knowledge_parts.take() {
                    parts.push(ki_parts.join("\n\n"));
                }
                if let Some(ref ki) = section.knowledge_item {
                    current_knowledge_parts =
                        Some(vec![format!("## {}\n\n{}", ki.title, ki.content)]);
                }
            }
            "experience" => {
                if let Some(ref exp) = section.experience {
                    let title = &exp.title;
                    let content = exp
                        .content
                        .as_deref()
                        .or(exp.description.as_deref())
                        .unwrap_or("");
                    let quoted = content
                        .lines()
                        .map(|line| {
                            if line.is_empty() {
                                ">".to_string()
                            } else {
                                format!("> {}", line)
                            }
                        })
                        .collect::<Vec<_>>()
                        .join("\n");
                    let exp_block = format!("> [!EXPERIENCE] {}\n{}", title, quoted);

                    if let Some(ref mut ki_parts) = current_knowledge_parts {
                        // Nest within the current knowledge section
                        ki_parts.push(exp_block);
                    } else {
                        // Standalone experience
                        parts.push(exp_block);
                    }
                }
            }
            "freeform" => {
                // Flush any pending knowledge section
                if let Some(ki_parts) = current_knowledge_parts.take() {
                    parts.push(ki_parts.join("\n\n"));
                }
                if let Some(ref content) = section.freeform_content {
                    parts.push(content.clone());
                }
            }
            _ => {}
        }
    }

    // Flush final knowledge section
    if let Some(ki_parts) = current_knowledge_parts.take() {
        parts.push(ki_parts.join("\n\n"));
    }

    parts.join("\n\n")
}

/// Rebuild Markdown from parsed sections (for round-trip testing).
/// This is used by the auto_identify tests.
pub fn rebuild_markdown_from_parsed(sections: &[ParsedSection]) -> String {
    let mut parts: Vec<String> = Vec::new();

    for section in sections {
        match section {
            ParsedSection::Freeform { content } => {
                parts.push(content.clone());
            }
            ParsedSection::Knowledge {
                title,
                content,
                experiences,
            } => {
                let mut section_parts = vec![format!("## {}", title)];
                if !content.is_empty() {
                    section_parts.push(content.clone());
                }
                for exp in experiences {
                    let quoted = exp
                        .content
                        .lines()
                        .map(|line| {
                            if line.is_empty() {
                                ">".to_string()
                            } else {
                                format!("> {}", line)
                            }
                        })
                        .collect::<Vec<_>>()
                        .join("\n");
                    section_parts.push(format!("> [!EXPERIENCE] {}\n{}", exp.title, quoted));
                }
                parts.push(section_parts.join("\n\n"));
            }
            ParsedSection::Experience(exp) => {
                let quoted = exp
                    .content
                    .lines()
                    .map(|line| {
                        if line.is_empty() {
                            ">".to_string()
                        } else {
                            format!("> {}", line)
                        }
                    })
                    .collect::<Vec<_>>()
                    .join("\n");
                parts.push(format!("> [!EXPERIENCE] {}\n{}", exp.title, quoted));
            }
        }
    }

    parts.join("\n\n")
}

/// Save sections to the wiki_page_sections table.
/// Deletes existing sections and creates new ones.
pub async fn save_sections(
    conn: &mut SqliteConnection,
    wiki_page_id: &str,
    sections: &[crate::services::auto_identify::IdentifiedSection],
) -> Result<(), AppError> {
    // Delete existing sections
    sqlx::query("DELETE FROM wiki_page_sections WHERE wiki_page_id = ?")
        .bind(wiki_page_id)
        .execute(&mut *conn)
        .await
        .map_err(AppError::from)?;

    // Insert new sections
    for section in sections {
        let id = uuid::Uuid::new_v4().to_string();
        match section {
            crate::services::auto_identify::IdentifiedSection::Knowledge {
                knowledge_item_id,
                sort_order,
            } => {
                sqlx::query(
                    "INSERT INTO wiki_page_sections (id, wiki_page_id, section_type, knowledge_item_id, sort_order)
                     VALUES (?, ?, 'knowledge', ?, ?)",
                )
                .bind(&id)
                .bind(wiki_page_id)
                .bind(knowledge_item_id)
                .bind(sort_order)
                .execute(&mut *conn)
                .await
                .map_err(AppError::from)?;
            }
            crate::services::auto_identify::IdentifiedSection::Experience {
                experience_id,
                sort_order,
            } => {
                sqlx::query(
                    "INSERT INTO wiki_page_sections (id, wiki_page_id, section_type, experience_id, sort_order)
                     VALUES (?, ?, 'experience', ?, ?)",
                )
                .bind(&id)
                .bind(wiki_page_id)
                .bind(experience_id)
                .bind(sort_order)
                .execute(&mut *conn)
                .await
                .map_err(AppError::from)?;
            }
            crate::services::auto_identify::IdentifiedSection::Freeform {
                content,
                sort_order,
            } => {
                sqlx::query(
                    "INSERT INTO wiki_page_sections (id, wiki_page_id, section_type, freeform_content, sort_order)
                     VALUES (?, ?, 'freeform', ?, ?)",
                )
                .bind(&id)
                .bind(wiki_page_id)
                .bind(content)
                .bind(sort_order)
                .execute(&mut *conn)
                .await
                .map_err(AppError::from)?;
            }
        }
    }

    Ok(())
}

/// Create a JSON snapshot of current sections for version history.
pub async fn create_sections_snapshot(
    conn: &mut SqliteConnection,
    wiki_page_id: &str,
) -> Result<String, AppError> {
    let sections = load_sections(&mut *conn, wiki_page_id).await?;
    serde_json::to_string(&sections)
        .map_err(|e| AppError::Internal(format!("Failed to serialize sections: {}", e)))
}
