use sqlx::SqliteConnection;

use crate::error::AppError;
use crate::models::knowledge_item::KnowledgeItem;
use crate::services::{experience, knowledge};

/// Represents a parsed section from Markdown content.
#[derive(Debug, Clone, PartialEq)]
pub enum ParsedSection {
    /// Free-form text not under any H2 heading.
    Freeform { content: String },
    /// A knowledge section identified by an H2 heading.
    Knowledge {
        title: String,
        /// Content under the H2, excluding any [!EXPERIENCE] callouts.
        content: String,
        /// Experience callouts found within this section.
        experiences: Vec<ParsedExperience>,
    },
    /// A standalone experience callout not under an H2 heading.
    Experience(ParsedExperience),
}

/// A parsed experience from an `[!EXPERIENCE]` callout.
#[derive(Debug, Clone, PartialEq)]
pub struct ParsedExperience {
    pub title: String,
    pub content: String,
}

/// Parse raw Markdown into structured sections.
///
/// Rules:
/// - `## Title` starts a Knowledge section (until next H2 or EOF)
/// - `> [!EXPERIENCE] Title` is extracted as an Experience
/// - Content before the first H2 or between sections is Freeform
/// - H3/H4 etc. do NOT create new sections; they stay within the current H2
pub fn parse_markdown(markdown: &str) -> Vec<ParsedSection> {
    let mut sections: Vec<ParsedSection> = Vec::new();
    let mut current_freeform = String::new();
    let mut current_knowledge: Option<(String, String, Vec<ParsedExperience>)> = None;

    let lines: Vec<&str> = markdown.lines().collect();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i];

        // Check for H2 heading: ## Title
        if let Some(title) = parse_h2(line) {
            // Flush current state
            flush_freeform(&mut current_freeform, &mut sections);
            flush_knowledge(&mut current_knowledge, &mut sections);

            current_knowledge = Some((title, String::new(), Vec::new()));
            i += 1;
            continue;
        }

        // Check for experience callout: > [!EXPERIENCE] Title
        if let Some((exp_title, exp_content, consumed)) = parse_experience_callout(&lines, i) {
            let exp = ParsedExperience {
                title: exp_title,
                content: exp_content,
            };

            if let Some((_, _, ref mut exps)) = current_knowledge {
                // Experience within a knowledge section
                exps.push(exp);
            } else {
                // Standalone experience (not under H2)
                flush_freeform(&mut current_freeform, &mut sections);
                sections.push(ParsedSection::Experience(exp));
            }

            i += consumed;
            // Skip trailing blank lines after callout
            while i < lines.len() && lines[i].trim().is_empty() {
                i += 1;
            }
            continue;
        }

        // Regular line
        if let Some((_, ref mut content, _)) = current_knowledge {
            if !content.is_empty() || !line.is_empty() {
                if !content.is_empty() {
                    content.push('\n');
                }
                content.push_str(line);
            }
        } else {
            if !current_freeform.is_empty() || !line.is_empty() {
                if !current_freeform.is_empty() {
                    current_freeform.push('\n');
                }
                current_freeform.push_str(line);
            }
        }

        i += 1;
    }

    // Flush remaining state
    flush_freeform(&mut current_freeform, &mut sections);
    flush_knowledge(&mut current_knowledge, &mut sections);

    sections
}

/// Parse an H2 heading line. Returns the title if it is an H2.
fn parse_h2(line: &str) -> Option<String> {
    let trimmed = line.trim_start();
    if trimmed.starts_with("## ") && !trimmed.starts_with("### ") {
        Some(trimmed[3..].trim().to_string())
    } else {
        None
    }
}

/// Parse an experience callout starting at line `start`.
/// Returns (title, content, lines_consumed) if found.
fn parse_experience_callout(lines: &[&str], start: usize) -> Option<(String, String, usize)> {
    let first_line = lines[start].trim_start();

    // Must start with > [!EXPERIENCE]
    if !first_line.starts_with("> [!EXPERIENCE]") {
        return None;
    }

    // Extract title from first line
    let title = first_line
        .strip_prefix("> [!EXPERIENCE]")
        .unwrap()
        .trim()
        .to_string();

    let mut content_lines: Vec<String> = Vec::new();
    let mut consumed = 1;

    // Consume continuation lines (lines starting with >)
    for line in &lines[start + 1..] {
        let trimmed = line.trim_start();
        if trimmed.starts_with("> ") {
            content_lines.push(trimmed[2..].to_string());
            consumed += 1;
        } else if trimmed == ">" {
            content_lines.push(String::new());
            consumed += 1;
        } else {
            break;
        }
    }

    let content = content_lines.join("\n").trim().to_string();

    Some((title, content, consumed))
}

fn flush_freeform(freeform: &mut String, sections: &mut Vec<ParsedSection>) {
    let trimmed = freeform.trim().to_string();
    if !trimmed.is_empty() {
        sections.push(ParsedSection::Freeform { content: trimmed });
    }
    freeform.clear();
}

fn flush_knowledge(
    knowledge: &mut Option<(String, String, Vec<ParsedExperience>)>,
    sections: &mut Vec<ParsedSection>,
) {
    if let Some((title, content, experiences)) = knowledge.take() {
        sections.push(ParsedSection::Knowledge {
            title,
            content: content.trim().to_string(),
            experiences,
        });
    }
}

/// Result of processing a wiki page's markdown through auto-identification.
#[derive(Debug)]
pub struct IdentifyResult {
    /// The sections created from parsing.
    pub sections: Vec<IdentifiedSection>,
    /// Knowledge items that were created or updated.
    pub knowledge_items: Vec<KnowledgeItem>,
    /// Number of experiences created or updated.
    pub experience_count: usize,
}

/// A section ready to be stored in wiki_page_sections.
#[derive(Debug, Clone)]
pub enum IdentifiedSection {
    Knowledge {
        knowledge_item_id: String,
        sort_order: i64,
    },
    Experience {
        experience_id: String,
        sort_order: i64,
    },
    Freeform {
        content: String,
        sort_order: i64,
    },
}

/// Process raw markdown: parse, match/create entities, return structured sections.
/// Also cleans up stale knowledge-experience refs for knowledge items in this wiki page.
pub async fn identify_and_create(
    conn: &mut SqliteConnection,
    wiki_page_id: &str,
    markdown: &str,
) -> Result<IdentifyResult, AppError> {
    let parsed = parse_markdown(markdown);

    let mut sections: Vec<IdentifiedSection> = Vec::new();
    let mut knowledge_items: Vec<KnowledgeItem> = Vec::new();
    let mut experience_count: usize = 0;
    let mut sort_order: i64 = 0;
    // Track (knowledge_item_id, experience_id) pairs created in this run
    let mut current_ke_pairs: Vec<(String, String)> = Vec::new();
    // Track all knowledge item IDs in this wiki page
    let mut page_ki_ids: Vec<String> = Vec::new();

    for parsed_section in &parsed {
        match parsed_section {
            ParsedSection::Freeform { content } => {
                sections.push(IdentifiedSection::Freeform {
                    content: content.clone(),
                    sort_order,
                });
                sort_order += 1;
            }
            ParsedSection::Knowledge {
                title,
                content,
                experiences,
            } => {
                // Match or create knowledge item
                let ki = match_or_create_knowledge(&mut *conn, title, content, wiki_page_id).await?;
                let ki_id = ki.id.clone();
                knowledge_items.push(ki);
                page_ki_ids.push(ki_id.clone());

                sections.push(IdentifiedSection::Knowledge {
                    knowledge_item_id: ki_id.clone(),
                    sort_order,
                });
                sort_order += 1;

                // Process embedded experiences
                for exp in experiences {
                    let exp_id =
                        match_or_create_experience(&mut *conn, &exp.title, &exp.content, wiki_page_id)
                            .await?;

                    // Link experience to knowledge item
                    knowledge::link_experience(&mut *conn, &ki_id, &exp_id).await?;
                    current_ke_pairs.push((ki_id.clone(), exp_id.clone()));

                    sections.push(IdentifiedSection::Experience {
                        experience_id: exp_id,
                        sort_order,
                    });
                    sort_order += 1;
                    experience_count += 1;
                }
            }
            ParsedSection::Experience(exp) => {
                let exp_id =
                    match_or_create_experience(&mut *conn, &exp.title, &exp.content, wiki_page_id)
                        .await?;

                sections.push(IdentifiedSection::Experience {
                    experience_id: exp_id,
                    sort_order,
                });
                sort_order += 1;
                experience_count += 1;
            }
        }
    }

    // Clean up stale knowledge-experience refs for knowledge items in this wiki page.
    // For each knowledge item referenced by this page, remove refs that are no longer
    // present in the current parse results.
    for ki_id in &page_ki_ids {
        let existing_refs: Vec<String> = sqlx::query_scalar(
            "SELECT experience_id FROM knowledge_experience_refs WHERE knowledge_item_id = ?",
        )
        .bind(ki_id)
        .fetch_all(&mut *conn)
        .await
        .map_err(AppError::from)?;

        for exp_id in &existing_refs {
            let still_linked = current_ke_pairs
                .iter()
                .any(|(k, e)| k == ki_id && e == exp_id);
            if !still_linked {
                // Check if this experience is linked to this knowledge item from another wiki page
                let other_page_count: i64 = sqlx::query_scalar(
                    "SELECT COUNT(*) FROM wiki_page_sections
                     WHERE experience_id = ? AND wiki_page_id != ?
                     AND wiki_page_id IN (
                         SELECT wiki_page_id FROM wiki_page_sections WHERE knowledge_item_id = ?
                     )",
                )
                .bind(exp_id)
                .bind(wiki_page_id)
                .bind(ki_id)
                .fetch_one(&mut *conn)
                .await
                .map_err(AppError::from)?;

                // Only remove if no other wiki page links this experience under this knowledge item
                if other_page_count == 0 {
                    sqlx::query(
                        "DELETE FROM knowledge_experience_refs
                         WHERE knowledge_item_id = ? AND experience_id = ?",
                    )
                    .bind(ki_id)
                    .bind(exp_id)
                    .execute(&mut *conn)
                    .await
                    .map_err(AppError::from)?;
                }
            }
        }
    }

    Ok(IdentifyResult {
        sections,
        knowledge_items,
        experience_count,
    })
}

/// Match an existing knowledge item by title, or create a new one.
/// If matched and content changed, updates and creates a new version.
async fn match_or_create_knowledge(
    conn: &mut SqliteConnection,
    title: &str,
    content: &str,
    wiki_page_id: &str,
) -> Result<KnowledgeItem, AppError> {
    if let Some(existing) = knowledge::find_by_title(&mut *conn, title).await? {
        // Check if content changed
        if existing.content != content || existing.title != title {
            knowledge::update_knowledge_item(
                &mut *conn,
                &existing.id,
                Some(title),
                Some(content),
                None,
                None,
                Some(wiki_page_id),
            )
            .await
        } else {
            Ok(existing)
        }
    } else {
        knowledge::create_knowledge_item(&mut *conn, title, content, None, &[], Some(wiki_page_id))
            .await
    }
}

/// Match an existing experience by title, or create a new one.
/// Returns the experience ID.
async fn match_or_create_experience(
    conn: &mut SqliteConnection,
    title: &str,
    content: &str,
    wiki_page_id: &str,
) -> Result<String, AppError> {
    if let Some(exp) = experience::find_by_title(&mut *conn, title).await? {
        experience::update_experience_content(&mut *conn, &exp, content, Some(wiki_page_id))
            .await?;
        Ok(exp.id)
    } else {
        experience::create_experience(&mut *conn, title, content, Some(wiki_page_id)).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_empty() {
        let sections = parse_markdown("");
        assert!(sections.is_empty());
    }

    #[test]
    fn test_parse_freeform_only() {
        let md = "Some introductory text.\n\nAnother paragraph.";
        let sections = parse_markdown(md);
        assert_eq!(sections.len(), 1);
        match &sections[0] {
            ParsedSection::Freeform { content } => {
                assert_eq!(content, "Some introductory text.\n\nAnother paragraph.");
            }
            _ => panic!("Expected Freeform section"),
        }
    }

    #[test]
    fn test_parse_single_knowledge() {
        let md = "## My Knowledge\n\nSome content here.\n\nMore content.";
        let sections = parse_markdown(md);
        assert_eq!(sections.len(), 1);
        match &sections[0] {
            ParsedSection::Knowledge {
                title,
                content,
                experiences,
            } => {
                assert_eq!(title, "My Knowledge");
                assert_eq!(content, "Some content here.\n\nMore content.");
                assert!(experiences.is_empty());
            }
            _ => panic!("Expected Knowledge section"),
        }
    }

    #[test]
    fn test_parse_multiple_knowledge() {
        let md = "## First\n\nContent 1.\n\n## Second\n\nContent 2.";
        let sections = parse_markdown(md);
        assert_eq!(sections.len(), 2);
        match &sections[0] {
            ParsedSection::Knowledge { title, content, .. } => {
                assert_eq!(title, "First");
                assert_eq!(content, "Content 1.");
            }
            _ => panic!("Expected Knowledge section"),
        }
        match &sections[1] {
            ParsedSection::Knowledge { title, content, .. } => {
                assert_eq!(title, "Second");
                assert_eq!(content, "Content 2.");
            }
            _ => panic!("Expected Knowledge section"),
        }
    }

    #[test]
    fn test_parse_freeform_before_knowledge() {
        let md = "Intro text.\n\n## Knowledge Title\n\nKnowledge content.";
        let sections = parse_markdown(md);
        assert_eq!(sections.len(), 2);
        match &sections[0] {
            ParsedSection::Freeform { content } => {
                assert_eq!(content, "Intro text.");
            }
            _ => panic!("Expected Freeform section"),
        }
        match &sections[1] {
            ParsedSection::Knowledge { title, .. } => {
                assert_eq!(title, "Knowledge Title");
            }
            _ => panic!("Expected Knowledge section"),
        }
    }

    #[test]
    fn test_parse_experience_in_knowledge() {
        let md = "## Topic\n\nSome content.\n\n> [!EXPERIENCE] Bug Found\n> The bug was tricky.\n> It caused crashes.\n\nMore content after.";
        let sections = parse_markdown(md);
        assert_eq!(sections.len(), 1);
        match &sections[0] {
            ParsedSection::Knowledge {
                title,
                content,
                experiences,
            } => {
                assert_eq!(title, "Topic");
                assert_eq!(content, "Some content.\n\nMore content after.");
                assert_eq!(experiences.len(), 1);
                assert_eq!(experiences[0].title, "Bug Found");
                assert_eq!(experiences[0].content, "The bug was tricky.\nIt caused crashes.");
            }
            _ => panic!("Expected Knowledge section"),
        }
    }

    #[test]
    fn test_parse_standalone_experience() {
        let md = "> [!EXPERIENCE] Standalone\n> Content here.";
        let sections = parse_markdown(md);
        assert_eq!(sections.len(), 1);
        match &sections[0] {
            ParsedSection::Experience(exp) => {
                assert_eq!(exp.title, "Standalone");
                assert_eq!(exp.content, "Content here.");
            }
            _ => panic!("Expected Experience section"),
        }
    }

    #[test]
    fn test_parse_h3_stays_in_knowledge() {
        let md = "## Main Topic\n\nIntro.\n\n### Sub Section\n\nSub content.\n\n### Another Sub\n\nMore.";
        let sections = parse_markdown(md);
        assert_eq!(sections.len(), 1);
        match &sections[0] {
            ParsedSection::Knowledge { title, content, .. } => {
                assert_eq!(title, "Main Topic");
                assert!(content.contains("### Sub Section"));
                assert!(content.contains("### Another Sub"));
            }
            _ => panic!("Expected Knowledge section"),
        }
    }

    #[test]
    fn test_parse_complex_document() {
        let md = r#"Welcome to this doc.

## SATA 控制器

SATA controller handles disk IO.

> [!EXPERIENCE] AHCI 模式问题
> BIOS 中需要切换到 AHCI。

### 详细配置

Configuration details here.

## 文件系统

ext4 is recommended.

## 网络

Network stuff."#;

        let sections = parse_markdown(md);
        assert_eq!(sections.len(), 4); // freeform + 3 knowledge

        match &sections[0] {
            ParsedSection::Freeform { content } => {
                assert_eq!(content, "Welcome to this doc.");
            }
            _ => panic!("Expected Freeform"),
        }
        match &sections[1] {
            ParsedSection::Knowledge {
                title,
                content,
                experiences,
            } => {
                assert_eq!(title, "SATA 控制器");
                assert!(content.contains("SATA controller"));
                assert!(content.contains("### 详细配置"));
                assert_eq!(experiences.len(), 1);
                assert_eq!(experiences[0].title, "AHCI 模式问题");
            }
            _ => panic!("Expected Knowledge"),
        }
        match &sections[2] {
            ParsedSection::Knowledge { title, .. } => {
                assert_eq!(title, "文件系统");
            }
            _ => panic!("Expected Knowledge"),
        }
    }

    #[test]
    fn test_roundtrip_consistency() {
        let md = "Intro.\n\n## Topic A\n\nContent A.\n\n## Topic B\n\nContent B.";
        let sections = parse_markdown(md);

        // Rebuild markdown from sections
        let rebuilt = super::super::wiki_compose::rebuild_markdown_from_parsed(&sections);

        // Parse again
        let sections2 = parse_markdown(&rebuilt);

        assert_eq!(sections.len(), sections2.len());
        for (s1, s2) in sections.iter().zip(sections2.iter()) {
            assert_eq!(s1, s2);
        }
    }
}
