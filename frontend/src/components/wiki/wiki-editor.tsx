"use client";

import { useEffect } from "react";
import { type Editor, useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import { uploadWikiFile } from "@/lib/api";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  LinkIcon,
  TableIcon,
  Undo,
  Redo,
  Minus,
  CodeSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

interface WikiEditorProps {
  content: string;
  editable: boolean;
  onChange?: (markdown: string) => void;
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const activeStates = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            strike: e.isActive("strike"),
            code: e.isActive("code"),
            h1: e.isActive("heading", { level: 1 }),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bulletList: e.isActive("bulletList"),
            orderedList: e.isActive("orderedList"),
            taskList: e.isActive("taskList"),
            blockquote: e.isActive("blockquote"),
            codeBlock: e.isActive("codeBlock"),
            link: e.isActive("link"),
          }
        : null,
  });

  if (!editor || !activeStates) return null;

  const items = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: activeStates.bold,
      title: "Bold",
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: activeStates.italic,
      title: "Italic",
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: activeStates.strike,
      title: "Strikethrough",
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCode().run(),
      active: activeStates.code,
      title: "Inline Code",
    },
    { separator: true },
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: activeStates.h1,
      title: "Heading 1",
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: activeStates.h2,
      title: "Heading 2",
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: activeStates.h3,
      title: "Heading 3",
    },
    { separator: true },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: activeStates.bulletList,
      title: "Bullet List",
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: activeStates.orderedList,
      title: "Ordered List",
    },
    {
      icon: ListTodo,
      action: () => editor.chain().focus().toggleTaskList().run(),
      active: activeStates.taskList,
      title: "Task List",
    },
    { separator: true },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: activeStates.blockquote,
      title: "Blockquote",
    },
    {
      icon: CodeSquare,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: activeStates.codeBlock,
      title: "Code Block",
    },
    {
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      active: false,
      title: "Horizontal Rule",
    },
    { separator: true },
    {
      icon: ImageIcon,
      action: () => {
        const url = window.prompt("Image URL");
        if (url) editor.chain().focus().setImage({ src: url }).run();
      },
      active: false,
      title: "Insert Image",
    },
    {
      icon: LinkIcon,
      action: () => {
        if (editor.isActive("link")) {
          editor.chain().focus().unsetLink().run();
        } else {
          const url = window.prompt("URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }
      },
      active: activeStates.link,
      title: "Link",
    },
    {
      icon: TableIcon,
      action: () =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
      active: false,
      title: "Insert Table",
    },
    { separator: true },
    {
      icon: Undo,
      action: () => editor.chain().focus().undo().run(),
      active: false,
      title: "Undo",
    },
    {
      icon: Redo,
      action: () => editor.chain().focus().redo().run(),
      active: false,
      title: "Redo",
    },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
      {items.map((item, i) => {
        if ("separator" in item) {
          return (
            <div key={i} className="mx-1 h-5 w-px bg-border" />
          );
        }
        const Icon = item.icon;
        return (
          <Button
            key={i}
            variant="ghost"
            size="icon-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={item.action}
            className={cn(item.active && "bg-muted")}
            title={item.title}
          >
            <Icon className="size-3.5" />
          </Button>
        );
      })}
    </div>
  );
}

export function WikiEditor({ content, editable, onChange }: WikiEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Image,
      Link.configure({
        openOnClick: !editable,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Heading ${node.attrs.level}`;
          }
          return "Start writing...";
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: "wiki-content prose prose-sm dark:prose-invert max-w-none min-h-[300px] outline-none px-6 py-4",
      },
      handlePaste: (_view, event) => {
        if (!editable || !editor) return false;

        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (!file) continue;

            event.preventDefault();

            uploadWikiFile(file).then((attachment) => {
              if (attachment.mime_type.startsWith("image/")) {
                editor
                  .chain()
                  .focus()
                  .setImage({ src: attachment.url })
                  .run();
              } else {
                editor
                  .chain()
                  .focus()
                  .insertContent(
                    `[${attachment.original_name}](${attachment.url})`
                  )
                  .run();
              }
            });
            return true;
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        if (!editable || !editor) return false;

        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        event.preventDefault();

        Array.from(files).forEach((file) => {
          uploadWikiFile(file).then((attachment) => {
            if (attachment.mime_type.startsWith("image/")) {
              editor
                .chain()
                .focus()
                .setImage({ src: attachment.url })
                .run();
            } else {
              editor
                .chain()
                .focus()
                .insertContent(
                  `[${attachment.original_name}](${attachment.url})`
                )
                .run();
            }
          });
        });
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (onChange) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChange((ed.storage as any).markdown.getMarkdown());
      }
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {editable && <EditorToolbar editor={editor} />}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
