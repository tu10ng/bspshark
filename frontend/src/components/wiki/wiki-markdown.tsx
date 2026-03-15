import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ExternalLinkIcon } from "lucide-react";
import { WikiHeading } from "./wiki-heading";
import { WikiCallout, type CalloutType } from "./wiki-callout";
import { rehypeCodeMeta } from "./code-block/rehype-code-meta";
import { CodeBlock } from "./code-block/code-block";

const CALLOUT_TYPES = new Set<string>(["NOTE", "TIP", "WARNING", "CAUTION", "IMPORTANT", "EXPERIENCE"]);

function extractBlockquoteText(children: React.ReactNode): string {
  const parts: string[] = [];
  React.Children.forEach(children, (child) => {
    if (typeof child === "string") {
      parts.push(child);
    } else if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.props.children) {
      parts.push(extractBlockquoteText(child.props.children));
    }
  });
  return parts.join("");
}

function stripCalloutPrefix(children: React.ReactNode): React.ReactNode {
  let stripped = false;
  return React.Children.map(children, (child) => {
    if (stripped) return child;
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.props.children) {
      const newChildren = stripCalloutPrefix(child.props.children);
      stripped = true;
      return React.cloneElement(child, {}, newChildren);
    }
    if (typeof child === "string" && !stripped) {
      const match = child.match(/^\[!(\w+)\]\s*/);
      if (match) {
        stripped = true;
        return child.slice(match[0].length);
      }
    }
    return child;
  });
}

const components: Components = {
  h1: ({ children }) => <WikiHeading level={1}>{children}</WikiHeading>,
  h2: ({ children }) => <WikiHeading level={2}>{children}</WikiHeading>,
  h3: ({ children }) => <WikiHeading level={3}>{children}</WikiHeading>,
  h4: ({ children }) => <WikiHeading level={4}>{children}</WikiHeading>,
  h5: ({ children }) => <WikiHeading level={5}>{children}</WikiHeading>,
  h6: ({ children }) => <WikiHeading level={6}>{children}</WikiHeading>,
  blockquote: ({ children }) => {
    const text = extractBlockquoteText(children);
    const match = text.match(/\[!(\w+)\]/);
    if (match && CALLOUT_TYPES.has(match[1])) {
      const type = match[1] as CalloutType;
      return <WikiCallout type={type}>{stripCalloutPrefix(children)}</WikiCallout>;
    }
    return <blockquote>{children}</blockquote>;
  },
  a: ({ href, children }) => {
    const isExternal = href?.startsWith("http");
    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
          <ExternalLinkIcon className="ml-1 inline-block size-3 align-baseline" />
        </a>
      );
    }
    return <a href={href}>{children}</a>;
  },
};

export function WikiMarkdown({ content }: { content: string }) {
  return (
    <div className="prose dark:prose-invert wiki-prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true }], rehypeCodeMeta]}
        components={{ ...components, pre: CodeBlock }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
