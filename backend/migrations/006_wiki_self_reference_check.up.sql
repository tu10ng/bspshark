-- Rebuild wiki_pages with CHECK constraint preventing self-reference
-- SQLite does not support ALTER TABLE ADD CONSTRAINT

CREATE TABLE wiki_pages_new (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES wiki_pages_new(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CHECK (parent_id IS NULL OR parent_id != id)
);

INSERT INTO wiki_pages_new SELECT * FROM wiki_pages;

DROP TABLE wiki_pages;

ALTER TABLE wiki_pages_new RENAME TO wiki_pages;

-- Recreate indexes
CREATE UNIQUE INDEX idx_wiki_pages_parent_slug
    ON wiki_pages (COALESCE(parent_id, ''), slug);

CREATE INDEX idx_wiki_pages_parent_id
    ON wiki_pages (parent_id);

CREATE INDEX idx_wiki_pages_parent_sort
    ON wiki_pages (parent_id, sort_order);
