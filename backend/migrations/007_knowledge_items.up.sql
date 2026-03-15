-- Migration 007: Knowledge Items System
-- Transforms knowledge management from tree_nodes to independent knowledge_items
-- with versioning, wiki sections, and knowledge relations.

-- ============================================================
-- 1. New Tables
-- ============================================================

-- 1.1 knowledge_items: atomic knowledge units with full Markdown content
CREATE TABLE knowledge_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL UNIQUE,
    tags TEXT NOT NULL DEFAULT '[]',
    current_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_knowledge_items_slug ON knowledge_items(slug);

-- 1.2 wiki_page_sections: ordered composition of a wiki page
CREATE TABLE wiki_page_sections (
    id TEXT PRIMARY KEY,
    wiki_page_id TEXT NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL CHECK (section_type IN ('knowledge', 'experience', 'freeform')),
    knowledge_item_id TEXT REFERENCES knowledge_items(id) ON DELETE SET NULL,
    experience_id TEXT REFERENCES experiences(id) ON DELETE SET NULL,
    freeform_content TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    CHECK (
        (section_type = 'knowledge' AND knowledge_item_id IS NOT NULL) OR
        (section_type = 'experience' AND experience_id IS NOT NULL) OR
        (section_type = 'freeform' AND freeform_content IS NOT NULL)
    )
);

CREATE INDEX idx_wiki_page_sections_page ON wiki_page_sections(wiki_page_id, sort_order);
CREATE INDEX idx_wiki_page_sections_knowledge ON wiki_page_sections(knowledge_item_id);
CREATE INDEX idx_wiki_page_sections_experience ON wiki_page_sections(experience_id);

-- 1.3 knowledge_relations: relationships between knowledge items
CREATE TABLE knowledge_relations (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('parent_child', 'precedes', 'related_to')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(source_id, target_id, relation_type)
);

CREATE INDEX idx_knowledge_relations_source ON knowledge_relations(source_id);
CREATE INDEX idx_knowledge_relations_target ON knowledge_relations(target_id);

-- 1.4 knowledge_experience_refs: many-to-many between knowledge_items and experiences
CREATE TABLE knowledge_experience_refs (
    knowledge_item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    PRIMARY KEY (knowledge_item_id, experience_id)
);

-- 1.5 knowledge_tree_roots: entry points for knowledge tree views
CREATE TABLE knowledge_tree_roots (
    tree_id TEXT NOT NULL REFERENCES knowledge_trees(id) ON DELETE CASCADE,
    knowledge_item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tree_id, knowledge_item_id)
);

-- ============================================================
-- 2. Version History Tables
-- ============================================================

-- 2.1 knowledge_item_versions
CREATE TABLE knowledge_item_versions (
    id TEXT PRIMARY KEY,
    knowledge_item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_wiki_page_id TEXT REFERENCES wiki_pages(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(knowledge_item_id, version)
);

CREATE INDEX idx_ki_versions_item ON knowledge_item_versions(knowledge_item_id, version);

-- 2.2 experience_versions
CREATE TABLE experience_versions (
    id TEXT PRIMARY KEY,
    experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    severity TEXT NOT NULL,
    status TEXT NOT NULL,
    resolution_notes TEXT,
    source_wiki_page_id TEXT REFERENCES wiki_pages(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(experience_id, version)
);

CREATE INDEX idx_exp_versions_item ON experience_versions(experience_id, version);

-- 2.3 wiki_page_versions
CREATE TABLE wiki_page_versions (
    id TEXT PRIMARY KEY,
    wiki_page_id TEXT NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sections_snapshot TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(wiki_page_id, version)
);

CREATE INDEX idx_wiki_versions_page ON wiki_page_versions(wiki_page_id, version);

-- ============================================================
-- 3. Modify Existing Tables
-- ============================================================

-- 3.1 wiki_pages: add sections_enabled flag
ALTER TABLE wiki_pages ADD COLUMN sections_enabled INTEGER NOT NULL DEFAULT 0;

-- 3.2 experiences: add full content field
ALTER TABLE experiences ADD COLUMN content TEXT DEFAULT '';

-- 3.3 knowledge_trees: add view_config for layout preferences
ALTER TABLE knowledge_trees ADD COLUMN view_config TEXT NOT NULL DEFAULT '{}';

-- ============================================================
-- 4. Data Migration: tree_nodes → knowledge_items
-- ============================================================

-- 4.1 Migrate tree_nodes to knowledge_items
-- Generate slug from id (since tree_nodes don't have slugs)
INSERT INTO knowledge_items (id, title, content, slug, tags, current_version, created_at, updated_at)
SELECT
    id,
    title,
    COALESCE(description, ''),
    'tn-' || id,  -- prefix with 'tn-' to ensure uniqueness
    '[]',
    1,
    created_at,
    updated_at
FROM tree_nodes;

-- 4.2 Create initial version snapshots for migrated knowledge items
INSERT INTO knowledge_item_versions (id, knowledge_item_id, version, title, content, created_at)
SELECT
    'kiv-' || id,
    id,
    1,
    title,
    COALESCE(description, ''),
    created_at
FROM tree_nodes;

-- 4.3 Migrate node_experience_refs to knowledge_experience_refs
INSERT INTO knowledge_experience_refs (knowledge_item_id, experience_id)
SELECT node_id, experience_id
FROM node_experience_refs;

-- 4.4 Migrate tree_nodes parent_id relationships to knowledge_relations
INSERT INTO knowledge_relations (id, source_id, target_id, relation_type, sort_order, created_at)
SELECT
    'kr-' || id,
    parent_id,
    id,
    'parent_child',
    sort_order,
    created_at
FROM tree_nodes
WHERE parent_id IS NOT NULL;

-- 4.5 Create knowledge_tree_roots for each tree's top-level nodes
INSERT INTO knowledge_tree_roots (tree_id, knowledge_item_id, sort_order)
SELECT tree_id, id, sort_order
FROM tree_nodes
WHERE parent_id IS NULL;

-- 4.6 Create task_knowledge_refs from task_node_refs
CREATE TABLE task_knowledge_refs (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    knowledge_item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, knowledge_item_id)
);

INSERT INTO task_knowledge_refs (task_id, knowledge_item_id)
SELECT task_id, node_id
FROM task_node_refs;
