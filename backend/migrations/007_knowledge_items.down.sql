-- Rollback migration 007: Knowledge Items System

DROP TABLE IF EXISTS task_knowledge_refs;
DROP TABLE IF EXISTS wiki_page_versions;
DROP TABLE IF EXISTS experience_versions;
DROP TABLE IF EXISTS knowledge_item_versions;
DROP TABLE IF EXISTS knowledge_tree_roots;
DROP TABLE IF EXISTS knowledge_experience_refs;
DROP TABLE IF EXISTS knowledge_relations;
DROP TABLE IF EXISTS wiki_page_sections;
DROP TABLE IF EXISTS knowledge_items;

-- Note: ALTER TABLE DROP COLUMN is not supported in older SQLite.
-- The added columns (sections_enabled, content on experiences, view_config)
-- will remain but are harmless as they have defaults.
