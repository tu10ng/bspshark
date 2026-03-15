/**
 * rehype plugin: extract meta info from code.data.meta and write to pre's data-* properties.
 * Must run AFTER rehype-highlight (needs language class from highlight).
 */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  data?: Record<string, unknown>;
}

function visit(tree: HastNode, callback: (node: HastNode) => void) {
  callback(tree);
  if (tree.children) {
    for (const child of tree.children) {
      visit(child, callback);
    }
  }
}

export function rehypeCodeMeta() {
  return (tree: HastNode) => {
    visit(tree, (node) => {
      if (node.tagName !== "pre" || !node.children) return;

      const codeNode = node.children.find(
        (c) => c.tagName === "code"
      );
      if (!codeNode) return;

      if (!node.properties) node.properties = {};

      // Extract language from code's className (set by rehype-highlight or markdown)
      const classNames = codeNode.properties?.className;
      if (Array.isArray(classNames)) {
        for (const cls of classNames) {
          if (typeof cls === "string" && cls.startsWith("language-")) {
            node.properties["data-lang"] = cls.slice("language-".length);
            break;
          } else if (typeof cls === "string" && cls.startsWith("hljs-")) {
            // fallback
          }
        }
      }

      // Extract meta string from code.data.meta (set by mdast-util-to-hast)
      const meta = codeNode.data?.meta;
      if (typeof meta !== "string" || !meta) return;

      // Parse and forward meta fields to pre's data-* attributes
      const titleMatch = meta.match(/title=["']([^"']+)["']/);
      if (titleMatch) node.properties["data-title"] = titleMatch[1];

      const hlMatch = meta.match(/hl_lines=["']([^"']+)["']/);
      if (hlMatch) node.properties["data-hl-lines"] = hlMatch[1];

      if (/\blinenums\b/.test(meta)) node.properties["data-linenums"] = "";
    });
  };
}
