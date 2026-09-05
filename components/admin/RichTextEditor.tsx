"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Zero-dependency rich-text editor built on a contentEditable region and
 * document.execCommand. The HTML it produces is trusted (admin-authored only)
 * and rendered on the public post inside the same `.blog-prose` container, so
 * the editor is a live WYSIWYG preview of the published article.
 */
type Tool = {
  label: string;
  title: string;
  command: string;
  arg?: string;
  className?: string;
};

// Module scope: kept out of render so the toolbar never creates ref-reading
// closures during render (react-hooks/refs). Click handlers invoke them instead.
const TOOLS: Tool[] = [
  { label: "B", title: "Bold", command: "bold", className: "font-bold" },
  { label: "I", title: "Italic", command: "italic", className: "italic" },
  { label: "H2", title: "Heading 2", command: "formatBlock", arg: "<h2>" },
  { label: "H3", title: "Heading 3", command: "formatBlock", arg: "<h3>" },
  { label: "\u00b6", title: "Paragraph", command: "formatBlock", arg: "<p>" },
  { label: "\u2022 List", title: "Bulleted list", command: "insertUnorderedList" },
  { label: "1. List", title: "Numbered list", command: "insertOrderedList" },
  { label: "\u201c", title: "Quote", command: "formatBlock", arg: "<blockquote>" },
  { label: "Clear", title: "Clear formatting", command: "removeFormat" },
];

export function RichTextEditor({
  value,
  onChange,
  label = "Body",
  minHeight = 320,
}: {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Push external value changes into the editable region only when they differ
  // from what is already rendered, so typing never resets the caret.
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  function emit() {
    onChange(ref.current?.innerHTML ?? "");
  }

  function applyCommand(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  }

  function addLink() {
    const url = prompt("Link URL", "https://");
    if (url) applyCommand("createLink", url);
  }

  return (
    <div className="text-left">
      <span className="mb-1.5 block text-sm font-medium text-foreground/70">
        {label}
      </span>
      <div className="glass overflow-hidden rounded-3xl">
        <div className="flex flex-wrap gap-1 border-b border-foreground/10 p-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.title}
              type="button"
              title={tool.title}
              aria-label={tool.title}
              // Keep the current text selection by not stealing focus on click.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyCommand(tool.command, tool.arg)}
              className={cn(
                "pill px-3 py-1.5 text-xs font-semibold text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground",
                tool.className,
              )}
            >
              {tool.label}
            </button>
          ))}
          <button
            type="button"
            title="Insert link"
            aria-label="Insert link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={addLink}
            className="pill px-3 py-1.5 text-xs font-semibold text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            Link
          </button>
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          onInput={emit}
          onBlur={emit}
          className="blog-prose max-h-[60vh] overflow-y-auto px-5 py-4 focus:outline-none"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
