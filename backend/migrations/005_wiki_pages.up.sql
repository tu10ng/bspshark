-- Drop old articles table (never had a backend handler, only mock data)
DROP TABLE IF EXISTS articles;

-- Wiki pages (tree-structured documentation)
CREATE TABLE IF NOT EXISTS wiki_pages (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES wiki_pages(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Same-level slug uniqueness: COALESCE(parent_id, '') + slug must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_pages_parent_slug
    ON wiki_pages (COALESCE(parent_id, ''), slug);

-- Fast lookup by parent
CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent_id
    ON wiki_pages (parent_id);

-- Fast sibling ordering
CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent_sort
    ON wiki_pages (parent_id, sort_order);
