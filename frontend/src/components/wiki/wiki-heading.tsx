import React from "react";

function extractText(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === "string") return child;
      if (typeof child === "number") return String(child);
      if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.props.children) {
        return extractText(child.props.children);
      }
      return "";
    })
    .join("");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function WikiHeading({
  level,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}) {
  const text = extractText(children);
  const id = slugify(text);
  const Tag = `h${level}` as const;

  return (
    <Tag id={id} className="group scroll-mt-20">
      {children}
      <a
        href={`#${id}`}
        className="ml-2 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60"
        aria-label={`Link to ${text}`}
      >
        &para;
      </a>
    </Tag>
  );
}
