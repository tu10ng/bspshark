-- Knowledge Trees
CREATE TABLE IF NOT EXISTS knowledge_trees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    module TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Tree Nodes (self-referencing for free nesting)
CREATE TABLE IF NOT EXISTS tree_nodes (
    id TEXT PRIMARY KEY,
    tree_id TEXT NOT NULL REFERENCES knowledge_trees(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES tree_nodes(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL CHECK (node_type IN ('step', 'pitfall_ref', 'exception')),
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_tree_nodes_tree_id ON tree_nodes(tree_id);
CREATE INDEX idx_tree_nodes_parent_id ON tree_nodes(parent_id);
CREATE INDEX idx_tree_nodes_sort ON tree_nodes(tree_id, parent_id, sort_order);

-- Pitfalls (independent entities, referenced by multiple trees)
CREATE TABLE IF NOT EXISTS pitfalls (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'transformed')),
    resolution_notes TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- FTS5 full-text search index for pitfalls (standalone, trigram for CJK)
CREATE VIRTUAL TABLE IF NOT EXISTS pitfalls_fts USING fts5(
    pitfall_id UNINDEXED,
    title,
    description,
    tags,
    tokenize='trigram'
);

-- Triggers to keep FTS index in sync
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

-- Node-Pitfall references (many-to-many)
CREATE TABLE IF NOT EXISTS node_pitfall_refs (
    node_id TEXT NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
    pitfall_id TEXT NOT NULL REFERENCES pitfalls(id) ON DELETE CASCADE,
    PRIMARY KEY (node_id, pitfall_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assignee TEXT,
    assigned_by TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    modules TEXT NOT NULL DEFAULT '[]',
    discovered_pitfalls_notes TEXT,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Task-Node references (many-to-many)
CREATE TABLE IF NOT EXISTS task_node_refs (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, node_id)
);

-- Task Artifacts (URL links)
CREATE TABLE IF NOT EXISTS task_artifacts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('design_doc', 'arch_review_video', 'test_review_video', 'other')),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
