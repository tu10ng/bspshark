use sqlx::SqlitePool;

use crate::error::AppError;
use crate::models::knowledge_item::KnowledgeItem;
use crate::models::wiki_page_section::{WikiPageSection, WikiPageSectionRow};
use crate::services::auto_identify::ParsedSection;

/// Load sections for a wiki page and resolve their entities (knowledge items, experiences).
pub async fn load_sections(
    pool: &SqlitePool,
    wiki_page_id: &str,
) -> Result<Vec<WikiPageSection>, AppError> {
    let rows = sqlx::query_as::<_, WikiPageSectionRow>(
        "SELECT * FROM wiki_page_sections WHERE wiki_page_id = ? ORDER BY sort_order",
    )
    .bind(wiki_page_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)?;

    let mut sections = Vec::with_capacity(rows.len());

    for row in rows {
        let knowledge_item = if let Some(ref ki_id) = row.knowledge_item_id {
            sqlx::query_as::<_, KnowledgeItem>(
                "SELECT * FROM knowledge_items WHERE id = ?",
            )
            .bind(ki_id)
            .fetch_optional(pool)
            .await
            .map_err(AppError::from)?
        } else {
            None
        };

        let experience = if let Some(ref exp_id) = row.experience_id {
            sqlx::query_as::<_, crate::models::experience::Experience>(
                "SELECT * FROM experiences WHERE id = ?",
            )
            .bind(exp_id)
            .fetch_optional(pool)
            .await
            .map_err(AppError::from)?
        } else {
            None
        };

        sections.push(WikiPageSection {
            id: row.id,
            section_type: row.section_type,
            knowledge_item,
            experience,
            freeform_content: row.freeform_content,
            sort_order: row.sort_order,
        });
    }

    Ok(sections)
}

/// Rebuild Markdown from resolved sections (for editing).
pub fn rebuild_markdown(sections: &[WikiPageSection]) -> String {
    let mut parts: Vec<String> = Vec::new();

    for section in sections {
        match section.section_type.as_str() {
            "knowledge" => {
                if let Some(ref ki) = section.knowledge_item {
                    parts.push(format!("## {}\n\n{}", ki.title, ki.content));
                }
            }
            "experience" => {
                if let Some(ref exp) = section.experience {
                    let title = &exp.title;
                    let content = exp.content.as_deref()
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
                    parts.push(format!("> [!EXPERIENCE] {}\n{}", title, quoted));
                }
            }
            "freeform" => {
                if let Some(ref content) = section.freeform_content {
                    parts.push(content.clone());
                }
            }
            _ => {}
        }
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
    pool: &SqlitePool,
    wiki_page_id: &str,
    sections: &[crate::services::auto_identify::IdentifiedSection],
) -> Result<(), AppError> {
    // Delete existing sections
    sqlx::query("DELETE FROM wiki_page_sections WHERE wiki_page_id = ?")
        .bind(wiki_page_id)
        .execute(pool)
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
                .execute(pool)
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
                .execute(pool)
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
                .execute(pool)
                .await
                .map_err(AppError::from)?;
            }
        }
    }

    Ok(())
}

/// Create a JSON snapshot of current sections for version history.
pub async fn create_sections_snapshot(
    pool: &SqlitePool,
    wiki_page_id: &str,
) -> Result<String, AppError> {
    let sections = load_sections(pool, wiki_page_id).await?;
    serde_json::to_string(&sections)
        .map_err(|e| AppError::Internal(format!("Failed to serialize sections: {}", e)))
}
