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
        /// Ordered parts preserving the position of text and embedded experiences.
        parts: Vec<KnowledgePart>,
    },
    /// A standalone experience callout not under an H2 heading.
    Experience(ParsedExperience),
}

/// A part within a knowledge section, preserving insertion order.
#[derive(Debug, Clone, PartialEq)]
pub enum KnowledgePart {
    /// A block of text content.
    Text(String),
    /// An embedded experience callout.
    Experience(ParsedExperience),
}

/// A parsed experience from an `[!EXPERIENCE]` callout.
#[derive(Debug, Clone, PartialEq)]
pub struct ParsedExperience {
    pub title: String,
    pub content: String,
}

impl ParsedSection {
    /// Extract the concatenated text content from a Knowledge section (excluding experiences).
    pub fn knowledge_text_content(&self) -> String {
        match self {
            ParsedSection::Knowledge { parts, .. } => {
                let texts: Vec<&str> = parts
                    .iter()
                    .filter_map(|p| match p {
                        KnowledgePart::Text(t) => Some(t.as_str()),
                        KnowledgePart::Experience(_) => None,
                    })
                    .collect();
                texts.join("\n\n")
            }
            _ => String::new(),
        }
    }

    /// Extract all experiences from a Knowledge section, in order.
    pub fn knowledge_experiences(&self) -> Vec<&ParsedExperience> {
        match self {
            ParsedSection::Knowledge { parts, .. } => parts
                .iter()
                .filter_map(|p| match p {
                    KnowledgePart::Experience(e) => Some(e),
                    KnowledgePart::Text(_) => None,
                })
                .collect(),
            _ => Vec::new(),
        }
    }
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
    // (title, parts, current_text_buffer)
    let mut current_knowledge: Option<(String, Vec<KnowledgePart>, String)> = None;

    let lines: Vec<&str> = markdown.lines().collect();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i];

        // Check for H2 heading: ## Title
        if let Some(title) = parse_h2(line) {
            // Flush current state
            flush_freeform(&mut current_freeform, &mut sections);
            flush_knowledge(&mut current_knowledge, &mut sections);

            current_knowledge = Some((title, Vec::new(), String::new()));
            i += 1;
            continue;
        }

        // Check for experience callout: > [!EXPERIENCE] Title
        if let Some((exp_title, exp_content, consumed)) = parse_experience_callout(&lines, i) {
            let exp = ParsedExperience {
                title: exp_title,
                content: exp_content,
            };

            if let Some((_, ref mut parts, ref mut text_buf)) = current_knowledge {
                // Flush pending text buffer before the experience
                let trimmed = text_buf.trim().to_string();
                if !trimmed.is_empty() {
                    parts.push(KnowledgePart::Text(trimmed));
                }
                text_buf.clear();
                // Add experience in order
                parts.push(KnowledgePart::Experience(exp));
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
        if let Some((_, _, ref mut text_buf)) = current_knowledge {
            if !text_buf.is_empty() || !line.is_empty() {
                if !text_buf.is_empty() {
                    text_buf.push('\n');
                }
                text_buf.push_str(line);
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
    knowledge: &mut Option<(String, Vec<KnowledgePart>, String)>,
    sections: &mut Vec<ParsedSection>,
) {
    if let Some((title, mut parts, text_buf)) = knowledge.take() {
        // Flush any remaining text buffer
        let trimmed = text_buf.trim().to_string();
        if !trimmed.is_empty() {
            parts.push(KnowledgePart::Text(trimmed));
        }
        sections.push(ParsedSection::Knowledge { title, parts });
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
    /// Number of knowledge items created (new).
    pub knowledge_created: usize,
    /// Number of knowledge items updated (existing, content changed).
    pub knowledge_updated: usize,
    /// Number of experiences created (new).
    pub experience_created: usize,
    /// Number of experiences updated (existing, content changed).
    pub experience_updated: usize,
    /// Warnings generated during identification (e.g., duplicate titles).
    pub warnings: Vec<String>,
}

/// A section ready to be stored in wiki_page_sections.
#[derive(Debug, Clone)]
pub enum IdentifiedSection {
    Knowledge {
        knowledge_item_id: String,
        sort_order: i64,
        /// JSON array describing the order of text/experience parts within this knowledge section.
        /// Stored in freeform_content to preserve experience positions for round-trip.
        /// Format: `[{"type":"text","content":"..."},{"type":"experience","id":"..."}]`
        parts_layout: Option<String>,
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

/// Merge duplicate H2 titles (case-insensitive) within the same page.
/// Later sections with the same title have their parts appended to the first occurrence.
fn merge_duplicate_h2(parsed: Vec<ParsedSection>) -> (Vec<ParsedSection>, Vec<String>) {
    let mut result: Vec<ParsedSection> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    // Map lowercase title → index in result
    let mut title_index: std::collections::HashMap<String, usize> = std::collections::HashMap::new();

    for section in parsed {
        match section {
            ParsedSection::Knowledge { title, parts } => {
                let key = title.to_lowercase();
                if let Some(&idx) = title_index.get(&key) {
                    // Duplicate! Merge parts into the first occurrence
                    warnings.push(format!(
                        "Duplicate H2 '{}' detected — content merged into first occurrence",
                        title
                    ));
                    if let ParsedSection::Knowledge {
                        parts: ref mut existing_parts,
                        ..
                    } = result[idx]
                    {
                        existing_parts.extend(parts);
                    }
                } else {
                    title_index.insert(key, result.len());
                    result.push(ParsedSection::Knowledge { title, parts });
                }
            }
            other => result.push(other),
        }
    }

    (result, warnings)
}

/// Process raw markdown: parse, match/create entities, return structured sections.
/// Also cleans up stale knowledge-experience refs for knowledge items in this wiki page.
pub async fn identify_and_create(
    conn: &mut SqliteConnection,
    wiki_page_id: &str,
    markdown: &str,
) -> Result<IdentifyResult, AppError> {
    let raw_parsed = parse_markdown(markdown);
    let (parsed, warnings) = merge_duplicate_h2(raw_parsed);

    let mut sections: Vec<IdentifiedSection> = Vec::new();
    let mut knowledge_items: Vec<KnowledgeItem> = Vec::new();
    let mut experience_count: usize = 0;
    let mut knowledge_created: usize = 0;
    let mut knowledge_updated: usize = 0;
    let mut experience_created: usize = 0;
    let mut experience_updated: usize = 0;
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
            ParsedSection::Knowledge { title, parts } => {
                // Collect text content for the knowledge item (excluding experiences)
                let text_content = parsed_section.knowledge_text_content();

                // Match or create knowledge item
                let match_result =
                    match_or_create_knowledge(&mut *conn, title, &text_content, wiki_page_id)
                        .await?;
                let ki = match match_result {
                    MatchResult::Created(ki) => {
                        knowledge_created += 1;
                        ki
                    }
                    MatchResult::Updated(ki) => {
                        knowledge_updated += 1;
                        ki
                    }
                    MatchResult::Unchanged(ki) => ki,
                };
                let ki_id = ki.id.clone();
                knowledge_items.push(ki);
                page_ki_ids.push(ki_id.clone());

                // Process all parts to get experience IDs and build layout
                let mut layout_entries: Vec<serde_json::Value> = Vec::new();
                let mut exp_ids_in_order: Vec<String> = Vec::new();
                let mut has_experiences = false;

                for part in parts {
                    match part {
                        KnowledgePart::Text(text) => {
                            layout_entries.push(serde_json::json!({
                                "type": "text",
                                "content": text
                            }));
                        }
                        KnowledgePart::Experience(exp) => {
                            has_experiences = true;
                            let (exp_id, was_created) = match_or_create_experience(
                                &mut *conn,
                                &exp.title,
                                &exp.content,
                                wiki_page_id,
                            )
                            .await?;
                            if was_created {
                                experience_created += 1;
                            } else {
                                experience_updated += 1;
                            }

                            knowledge::link_experience(&mut *conn, &ki_id, &exp_id).await?;
                            current_ke_pairs.push((ki_id.clone(), exp_id.clone()));

                            layout_entries.push(serde_json::json!({
                                "type": "experience",
                                "id": exp_id
                            }));
                            exp_ids_in_order.push(exp_id);
                        }
                    }
                }

                // Only store parts_layout if there are interleaved experiences
                let parts_layout = if has_experiences {
                    serde_json::to_string(&layout_entries).ok()
                } else {
                    None
                };

                // Emit knowledge section first
                sections.push(IdentifiedSection::Knowledge {
                    knowledge_item_id: ki_id.clone(),
                    sort_order,
                    parts_layout,
                });
                sort_order += 1;

                // Then emit experience sections in order
                for exp_id in exp_ids_in_order {
                    sections.push(IdentifiedSection::Experience {
                        experience_id: exp_id,
                        sort_order,
                    });
                    sort_order += 1;
                    experience_count += 1;
                }
            }
            ParsedSection::Experience(exp) => {
                let (exp_id, was_created) =
                    match_or_create_experience(&mut *conn, &exp.title, &exp.content, wiki_page_id)
                        .await?;
                if was_created {
                    experience_created += 1;
                } else {
                    experience_updated += 1;
                }

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
        knowledge_created,
        knowledge_updated,
        experience_created,
        experience_updated,
        warnings,
    })
}

/// Result of matching/creating a knowledge item.
enum MatchResult<T> {
    /// Found existing, no content change.
    Unchanged(T),
    /// Found existing, content was updated.
    Updated(T),
    /// Created new.
    Created(T),
}

/// Match an existing knowledge item by title, or create a new one.
/// If matched and content changed, updates and creates a new version.
/// Uses scoped matching: prefers knowledge items already linked to this wiki page.
async fn match_or_create_knowledge(
    conn: &mut SqliteConnection,
    title: &str,
    content: &str,
    wiki_page_id: &str,
) -> Result<MatchResult<KnowledgeItem>, AppError> {
    if let Some(existing) =
        knowledge::find_by_title_scoped(&mut *conn, title, wiki_page_id).await?
    {
        // Check if content changed
        if existing.content != content || existing.title != title {
            let updated = knowledge::update_knowledge_item(
                &mut *conn,
                &existing.id,
                Some(title),
                Some(content),
                None,
                None,
                Some(wiki_page_id),
            )
            .await?;
            Ok(MatchResult::Updated(updated))
        } else {
            Ok(MatchResult::Unchanged(existing))
        }
    } else {
        let created = knowledge::create_knowledge_item(
            &mut *conn,
            title,
            content,
            None,
            &[],
            Some(wiki_page_id),
        )
        .await?;
        Ok(MatchResult::Created(created))
    }
}

/// Match an existing experience by title, or create a new one.
/// Returns (experience_id, was_created).
/// Uses scoped matching: prefers experiences already linked to this wiki page.
async fn match_or_create_experience(
    conn: &mut SqliteConnection,
    title: &str,
    content: &str,
    wiki_page_id: &str,
) -> Result<(String, bool), AppError> {
    if let Some(exp) = experience::find_by_title_scoped(&mut *conn, title, wiki_page_id).await? {
        experience::update_experience_content(&mut *conn, &exp, content, Some(wiki_page_id))
            .await?;
        Ok((exp.id, false))
    } else {
        let id =
            experience::create_experience(&mut *conn, title, content, Some(wiki_page_id)).await?;
        Ok((id, true))
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
            ParsedSection::Knowledge { title, parts } => {
                assert_eq!(title, "My Knowledge");
                assert_eq!(parts.len(), 1);
                assert_eq!(
                    sections[0].knowledge_text_content(),
                    "Some content here.\n\nMore content."
                );
            }
            _ => panic!("Expected Knowledge section"),
        }
    }

    #[test]
    fn test_parse_multiple_knowledge() {
        let md = "## First\n\nContent 1.\n\n## Second\n\nContent 2.";
        let sections = parse_markdown(md);
        assert_eq!(sections.len(), 2);
        assert_eq!(sections[0].knowledge_text_content(), "Content 1.");
        assert_eq!(sections[1].knowledge_text_content(), "Content 2.");
        match &sections[0] {
            ParsedSection::Knowledge { title, .. } => assert_eq!(title, "First"),
            _ => panic!("Expected Knowledge section"),
        }
        match &sections[1] {
            ParsedSection::Knowledge { title, .. } => assert_eq!(title, "Second"),
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
            ParsedSection::Knowledge { title, parts } => {
                assert_eq!(title, "Topic");
                // Should have 3 parts: Text, Experience, Text (preserving position)
                assert_eq!(parts.len(), 3);
                match &parts[0] {
                    KnowledgePart::Text(t) => assert_eq!(t, "Some content."),
                    _ => panic!("Expected Text part"),
                }
                match &parts[1] {
                    KnowledgePart::Experience(e) => {
                        assert_eq!(e.title, "Bug Found");
                        assert_eq!(e.content, "The bug was tricky.\nIt caused crashes.");
                    }
                    _ => panic!("Expected Experience part"),
                }
                match &parts[2] {
                    KnowledgePart::Text(t) => assert_eq!(t, "More content after."),
                    _ => panic!("Expected Text part"),
                }
                // Text content concatenation
                assert_eq!(
                    sections[0].knowledge_text_content(),
                    "Some content.\n\nMore content after."
                );
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
        let text = sections[0].knowledge_text_content();
        match &sections[0] {
            ParsedSection::Knowledge { title, .. } => {
                assert_eq!(title, "Main Topic");
                assert!(text.contains("### Sub Section"));
                assert!(text.contains("### Another Sub"));
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
            ParsedSection::Knowledge { title, parts } => {
                assert_eq!(title, "SATA 控制器");
                let text = sections[1].knowledge_text_content();
                assert!(text.contains("SATA controller"));
                assert!(text.contains("### 详细配置"));
                let exps = sections[1].knowledge_experiences();
                assert_eq!(exps.len(), 1);
                assert_eq!(exps[0].title, "AHCI 模式问题");
                // Verify experience is between text parts
                assert!(parts.len() >= 3); // text, experience, text
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

    #[test]
    fn test_roundtrip_with_experience_position() {
        let md = "## Topic\n\nBefore text.\n\n> [!EXPERIENCE] Bug\n> Description\n\nAfter text.";
        let sections = parse_markdown(md);

        // Rebuild markdown from sections
        let rebuilt = super::super::wiki_compose::rebuild_markdown_from_parsed(&sections);

        // Parse again
        let sections2 = parse_markdown(&rebuilt);

        assert_eq!(sections.len(), sections2.len());
        for (s1, s2) in sections.iter().zip(sections2.iter()) {
            assert_eq!(s1, s2);
        }

        // Verify experience is in the middle, not at the end
        match &sections2[0] {
            ParsedSection::Knowledge { parts, .. } => {
                assert_eq!(parts.len(), 3);
                assert!(matches!(&parts[0], KnowledgePart::Text(_)));
                assert!(matches!(&parts[1], KnowledgePart::Experience(_)));
                assert!(matches!(&parts[2], KnowledgePart::Text(_)));
            }
            _ => panic!("Expected Knowledge"),
        }
    }

    #[test]
    fn test_merge_duplicate_h2() {
        let parsed = parse_markdown(
            "## Install\n\nLinux steps.\n\n## Install\n\nWindows steps.",
        );
        // parse_markdown returns 2 separate sections
        assert_eq!(parsed.len(), 2);

        // merge_duplicate_h2 combines them
        let (merged, warnings) = super::merge_duplicate_h2(parsed);
        assert_eq!(merged.len(), 1);
        assert_eq!(warnings.len(), 1);
        assert!(warnings[0].contains("Duplicate H2"));

        let text = merged[0].knowledge_text_content();
        assert!(text.contains("Linux steps."));
        assert!(text.contains("Windows steps."));
    }

    #[test]
    fn test_merge_duplicate_h2_case_insensitive() {
        let parsed = parse_markdown(
            "## Install\n\nLinux steps.\n\n## install\n\nWindows steps.",
        );
        let (merged, warnings) = super::merge_duplicate_h2(parsed);
        assert_eq!(merged.len(), 1);
        assert_eq!(warnings.len(), 1);
        // First title is preserved
        match &merged[0] {
            ParsedSection::Knowledge { title, .. } => assert_eq!(title, "Install"),
            _ => panic!("Expected Knowledge"),
        }
    }
}
