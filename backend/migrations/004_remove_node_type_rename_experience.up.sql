-- Phase: Remove node_type from tree_nodes, rename pitfalls → experiences

PRAGMA foreign_keys=OFF;

-- 1. Rebuild tree_nodes without node_type column and CHECK constraint
CREATE TABLE tree_nodes_new (
    id TEXT PRIMARY KEY,
    tree_id TEXT NOT NULL REFERENCES knowledge_trees(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES tree_nodes_new(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO tree_nodes_new (id, tree_id, parent_id, title, description, sort_order, created_at, updated_at)
SELECT id, tree_id, parent_id, title, description, sort_order, created_at, updated_at
FROM tree_nodes;

DROP TABLE tree_nodes;
ALTER TABLE tree_nodes_new RENAME TO tree_nodes;

CREATE INDEX idx_tree_nodes_tree_id ON tree_nodes(tree_id);
CREATE INDEX idx_tree_nodes_parent_id ON tree_nodes(parent_id);
CREATE INDEX idx_tree_nodes_sort ON tree_nodes(tree_id, parent_id, sort_order);

-- 2. Rename pitfalls → experiences
ALTER TABLE pitfalls RENAME TO experiences;

-- 3. Rebuild node_pitfall_refs → node_experience_refs (column pitfall_id → experience_id)
CREATE TABLE node_experience_refs (
    node_id TEXT NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
    experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    PRIMARY KEY (node_id, experience_id)
);

INSERT INTO node_experience_refs (node_id, experience_id)
SELECT node_id, pitfall_id FROM node_pitfall_refs;

DROP TABLE node_pitfall_refs;

-- 4. Drop old FTS table and triggers, create new ones for experiences
DROP TRIGGER IF EXISTS pitfalls_ai;
DROP TRIGGER IF EXISTS pitfalls_ad;
DROP TRIGGER IF EXISTS pitfalls_au;
DROP TABLE IF EXISTS pitfalls_fts;

CREATE VIRTUAL TABLE IF NOT EXISTS experiences_fts USING fts5(
    experience_id UNINDEXED,
    title,
    description,
    tags,
    tokenize='trigram'
);

-- Populate FTS from existing data
INSERT INTO experiences_fts(experience_id, title, description, tags)
SELECT id, title, description, tags FROM experiences;

CREATE TRIGGER experiences_ai AFTER INSERT ON experiences BEGIN
    INSERT INTO experiences_fts(experience_id, title, description, tags)
    VALUES (new.id, new.title, new.description, new.tags);
END;

CREATE TRIGGER experiences_ad AFTER DELETE ON experiences BEGIN
    DELETE FROM experiences_fts WHERE experience_id = old.id;
END;

CREATE TRIGGER experiences_au AFTER UPDATE ON experiences BEGIN
    DELETE FROM experiences_fts WHERE experience_id = old.id;
    INSERT INTO experiences_fts(experience_id, title, description, tags)
    VALUES (new.id, new.title, new.description, new.tags);
END;

-- 5. Rename column in tasks
ALTER TABLE tasks RENAME COLUMN discovered_pitfalls_notes TO discovered_experiences_notes;

PRAGMA foreign_keys=ON;
