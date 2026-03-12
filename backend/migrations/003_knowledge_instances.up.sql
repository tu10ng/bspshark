-- Knowledge instances: parallel variants (e.g. Ubuntu vs Arch for GRUB)
CREATE TABLE IF NOT EXISTS knowledge_instances (
    id TEXT PRIMARY KEY,
    group_node_id TEXT NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Assigns child nodes to specific instances (no row = shared across all instances)
CREATE TABLE IF NOT EXISTS node_instance_assignments (
    node_id TEXT NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
    instance_id TEXT NOT NULL REFERENCES knowledge_instances(id) ON DELETE CASCADE,
    PRIMARY KEY (node_id, instance_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_instances_group ON knowledge_instances(group_node_id);
CREATE INDEX IF NOT EXISTS idx_node_instance_assignments_instance ON node_instance_assignments(instance_id);
