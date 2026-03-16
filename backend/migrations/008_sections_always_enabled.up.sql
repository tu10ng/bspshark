-- Make sections_enabled always on for all existing pages
UPDATE wiki_pages SET sections_enabled = 1 WHERE sections_enabled = 0;
