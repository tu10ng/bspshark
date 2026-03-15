import { type ReactNode, Children, isValidElement, cloneElement } from "react";

/** Language identifier → display name mapping */
export const LANG_DISPLAY_NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  ruby: "Ruby",
  rs: "Rust",
  rust: "Rust",
  go: "Go",
  java: "Java",
  kt: "Kotlin",
  kotlin: "Kotlin",
  cs: "C#",
  csharp: "C#",
  cpp: "C++",
  c: "C",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  fish: "Fish",
  ps1: "PowerShell",
  powershell: "PowerShell",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  less: "Less",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  xml: "XML",
  md: "Markdown",
  markdown: "Markdown",
  dockerfile: "Dockerfile",
  docker: "Docker",
  makefile: "Makefile",
  graphql: "GraphQL",
  gql: "GraphQL",
  lua: "Lua",
  r: "R",
  swift: "Swift",
  dart: "Dart",
  elixir: "Elixir",
  ex: "Elixir",
  erl: "Erlang",
  erlang: "Erlang",
  hs: "Haskell",
  haskell: "Haskell",
  scala: "Scala",
  php: "PHP",
  perl: "Perl",
  diff: "Diff",
  ini: "INI",
  nginx: "Nginx",
  vim: "Vim",
  plaintext: "Plain Text",
  text: "Plain Text",
  txt: "Plain Text",
};

export interface CodeMeta {
  title?: string;
  hlLines?: string;
  linenums: boolean;
}

/** Parse meta string from fenced code blocks: title="file.py" hl_lines="2 3" linenums */
export function parseMeta(meta: string | undefined): CodeMeta {
  if (!meta) return { linenums: false };

  const result: CodeMeta = { linenums: false };

  // title="..." or title='...'
  const titleMatch = meta.match(/title=["']([^"']+)["']/);
  if (titleMatch) result.title = titleMatch[1];

  // hl_lines="2 3 5-7"
  const hlMatch = meta.match(/hl_lines=["']([^"']+)["']/);
  if (hlMatch) result.hlLines = hlMatch[1];

  // linenums (boolean flag)
  if (/\blinenums\b/.test(meta)) result.linenums = true;

  return result;
}

/** Parse highlight line spec like "2 3 5-7" into a Set of line numbers */
export function parseHighlightLines(hlLines: string): Set<number> {
  const result = new Set<number>();
  for (const part of hlLines.split(/\s+/)) {
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) result.add(i);
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) result.add(num);
    }
  }
  return result;
}

/** Recursively extract plain text from React children (for copy button) */
export function extractTextFromChildren(children: ReactNode): string {
  const parts: string[] = [];
  Children.forEach(children, (child) => {
    if (typeof child === "string") {
      parts.push(child);
    } else if (typeof child === "number") {
      parts.push(String(child));
    } else if (isValidElement<{ children?: ReactNode }>(child) && child.props.children) {
      parts.push(extractTextFromChildren(child.props.children));
    }
  });
  return parts.join("");
}

/**
 * Split rehype-highlight's span-based children into per-line groups.
 * Handles spans that contain newlines by cloning them for each line segment.
 * Returns an array where each element represents one line's ReactNode[].
 */
export function splitIntoLines(children: ReactNode): ReactNode[][] {
  const lines: ReactNode[][] = [[]];

  function processNode(node: ReactNode) {
    if (typeof node === "string") {
      const segments = node.split("\n");
      for (let i = 0; i < segments.length; i++) {
        if (i > 0) lines.push([]);
        if (segments[i]) lines[lines.length - 1].push(segments[i]);
      }
    } else if (typeof node === "number") {
      lines[lines.length - 1].push(String(node));
    } else if (isValidElement<{ children?: ReactNode }>(node) && node.props.children != null) {
      // Span from rehype-highlight — may contain newlines in its text children
      const innerLines = splitIntoLines(node.props.children);
      for (let i = 0; i < innerLines.length; i++) {
        if (i > 0) lines.push([]);
        if (innerLines[i].length > 0) {
          lines[lines.length - 1].push(
            cloneElement(node, { key: `${lines.length}-${i}` }, ...innerLines[i])
          );
        }
      }
    } else if (node != null && node !== false && node !== true) {
      lines[lines.length - 1].push(node);
    }
  }

  Children.forEach(children, processNode);

  // Remove trailing empty line (code blocks typically end with \n)
  if (lines.length > 1 && lines[lines.length - 1].length === 0) {
    lines.pop();
  }

  return lines;
}
