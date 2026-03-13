-- Rollback: Restore node_type, rename experiences → pitfalls

PRAGMA foreign_keys=OFF;

-- 1. Rebuild tree_nodes with node_type column
CREATE TABLE tree_nodes_new (
    id TEXT PRIMARY KEY,
    tree_id TEXT NOT NULL REFERENCES knowledge_trees(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES tree_nodes_new(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL DEFAULT 'step' CHECK (node_type IN ('step', 'pitfall_ref', 'exception')),
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

INSERT INTO tree_nodes_new (id, tree_id, parent_id, node_type, title, description, sort_order, created_at, updated_at)
SELECT id, tree_id, parent_id, 'step', title, description, sort_order, created_at, updated_at
FROM tree_nodes;

DROP TABLE tree_nodes;
ALTER TABLE tree_nodes_new RENAME TO tree_nodes;

CREATE INDEX idx_tree_nodes_tree_id ON tree_nodes(tree_id);
CREATE INDEX idx_tree_nodes_parent_id ON tree_nodes(parent_id);
CREATE INDEX idx_tree_nodes_sort ON tree_nodes(tree_id, parent_id, sort_order);

-- 2. Rename experiences → pitfalls
ALTER TABLE experiences RENAME TO pitfalls;

-- 3. Rebuild node_experience_refs → node_pitfall_refs
CREATE TABLE node_pitfall_refs (
    node_id TEXT NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
    pitfall_id TEXT NOT NULL REFERENCES pitfalls(id) ON DELETE CASCADE,
    PRIMARY KEY (node_id, pitfall_id)
);

INSERT INTO node_pitfall_refs (node_id, pitfall_id)
SELECT node_id, experience_id FROM node_experience_refs;

DROP TABLE node_experience_refs;

-- 4. Drop new FTS, restore old
DROP TRIGGER IF EXISTS experiences_ai;
DROP TRIGGER IF EXISTS experiences_ad;
DROP TRIGGER IF EXISTS experiences_au;
DROP TABLE IF EXISTS experiences_fts;

CREATE VIRTUAL TABLE IF NOT EXISTS pitfalls_fts USING fts5(
    pitfall_id UNINDEXED,
    title,
    description,
    tags,
    tokenize='trigram'
);

INSERT INTO pitfalls_fts(pitfall_id, title, description, tags)
SELECT id, title, description, tags FROM pitfalls;

CREATE TRIGGER pitfalls_ai AFTER INSERT ON pitfalls BEGIN
    INSERT INTO pitfalls_fts(pitfall_id, title, description, tags)
    VALUES (new.id, new.title, new.description, new.tags);
END;

CREATE TRIGGER pitfalls_ad AFTER DELETE ON pitfalls BEGIN
    DELETE FROM pitfalls_fts WHERE pitfall_id = old.id;
END;

CREATE TRIGGER pitfalls_au AFTER UPDATE ON pitfalls BEGIN
    DELETE FROM pitfalls_fts WHERE pitfall_id = old.id;
    INSERT INTO pitfalls_fts(pitfall_id, title, description, tags)
    VALUES (new.id, new.title, new.description, new.tags);
END;

-- 5. Rename column back
ALTER TABLE tasks RENAME COLUMN discovered_experiences_notes TO discovered_pitfalls_notes;

PRAGMA foreign_keys=ON;
