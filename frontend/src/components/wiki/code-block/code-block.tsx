import { Children, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { CopyButton } from "./copy-button";
import {
  LANG_DISPLAY_NAMES,
  extractTextFromChildren,
  splitIntoLines,
  parseHighlightLines,
} from "./utils";

type PreProps = ComponentPropsWithoutRef<"pre"> & {
  "data-lang"?: string;
  "data-title"?: string;
  "data-linenums"?: string;
  "data-hl-lines"?: string;
};

/**
 * CodeBlock replaces the default <pre> in react-markdown.
 * Reads data-* attributes set by rehype-code-meta to enable features.
 */
export function CodeBlock(props: PreProps) {
  const {
    children,
    "data-lang": lang,
    "data-title": title,
    "data-linenums": linenums,
    "data-hl-lines": hlLines,
    ...rest
  } = props;

  // Extract plain text for copy button
  const codeText = extractTextFromChildren(children as ReactNode);

  // Display name for the language
  const langDisplay = lang ? (LANG_DISPLAY_NAMES[lang] ?? lang) : undefined;

  // Determine if we need the table layout (line numbers, line highlighting, or diff)
  const isDiff = lang === "diff";
  const hasLinenums = linenums !== undefined;
  const hasHlLines = !!hlLines;
  const needsTable = hasLinenums || hasHlLines || isDiff;

  // Get the code element's children (the highlighted spans)
  const codeChildren = getCodeChildren(children);

  // Show header if there's a title or language
  const showHeader = !!(title || langDisplay);

  return (
    <div className="code-block-wrapper not-prose">
      {showHeader ? (
        <div className="code-block-header">
          <span className="code-block-label">
            {title || langDisplay}
          </span>
          <CopyButton text={codeText} variant="header" />
        </div>
      ) : (
        <div className="code-block-copy-float">
          <CopyButton text={codeText} variant="floating" />
        </div>
      )}

      <pre {...rest}>
        {needsTable ? (
          <code className={lang ? `language-${lang} hljs` : "hljs"}>
            <CodeTable
              codeChildren={codeChildren}
              showLineNumbers={hasLinenums}
              hlLines={hasHlLines ? parseHighlightLines(hlLines!) : undefined}
              isDiff={isDiff}
            />
          </code>
        ) : (
          children
        )}
      </pre>
    </div>
  );
}

/** Extract the inner children from the <code> element inside <pre> */
function getCodeChildren(preChildren: ReactNode): ReactNode {
  let codeChildren: ReactNode = preChildren;
  Children.forEach(preChildren, (child) => {
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === "code"
    ) {
      codeChildren = child.props.children;
    }
  });
  return codeChildren;
}

function CodeTable({
  codeChildren,
  showLineNumbers,
  hlLines,
  isDiff,
}: {
  codeChildren: ReactNode;
  showLineNumbers: boolean;
  hlLines?: Set<number>;
  isDiff: boolean;
}) {
  const lines = splitIntoLines(codeChildren);

  return (
    <table className="code-block-table">
      <tbody>
        {lines.map((lineContent, idx) => {
          const lineNum = idx + 1;
          const isHighlighted = hlLines?.has(lineNum) ?? false;

          // Diff detection: check if line text starts with + or -
          let diffClass = "";
          if (isDiff) {
            const lineText = lineContent
              .map((n) => (typeof n === "string" ? n : ""))
              .join("");
            if (lineText.startsWith("+")) diffClass = "code-line-diff-add";
            else if (lineText.startsWith("-")) diffClass = "code-line-diff-del";
          }

          const rowClass = [
            isHighlighted ? "code-line-highlight" : "",
            diffClass,
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <tr key={lineNum} className={rowClass || undefined}>
              {showLineNumbers && (
                <td className="code-line-number">{lineNum}</td>
              )}
              <td className="code-line-content">{lineContent}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
