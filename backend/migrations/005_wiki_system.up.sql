CREATE TABLE wiki_pages (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES wiki_pages(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    is_folder INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_wiki_pages_parent ON wiki_pages(parent_id);
CREATE INDEX idx_wiki_pages_sort ON wiki_pages(parent_id, sort_order);

CREATE TABLE wiki_attachments (
    id TEXT PRIMARY KEY,
    page_id TEXT REFERENCES wiki_pages(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_wiki_attachments_page ON wiki_attachments(page_id);

DROP TABLE IF EXISTS articles;
