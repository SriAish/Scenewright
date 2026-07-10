/*
  Minimal Tiptap-compatible serialization for the temporary scene page:
  each line of textarea text becomes one paragraph node containing at
  most one text node. isPlainTextDoc guards the reverse direction so
  content with any other node shape (marks, headings, mentions, lists,
  from a future richer editor) is left untouched rather than flattened.
*/

interface DocNode {
  type?: string;
  text?: string;
  content?: DocNode[];
}

// The shape Tiptap itself produces for a blank editor.
export const EMPTY_DOC: DocNode = { type: "doc", content: [{ type: "paragraph" }] };

function isPlainTextParagraph(node: unknown): node is DocNode {
  if (typeof node !== "object" || node === null) return false;
  const paragraph = node as DocNode;
  if (paragraph.type !== "paragraph") return false;
  if (paragraph.content === undefined) return true;
  if (!Array.isArray(paragraph.content)) return false;
  if (paragraph.content.length === 0) return true;
  if (paragraph.content.length > 1) return false;

  const only = paragraph.content[0] as Record<string, unknown> | undefined;
  return (
    typeof only === "object" &&
    only !== null &&
    only.type === "text" &&
    typeof only.text === "string" &&
    Object.keys(only).length === 2
  );
}

/** True if doc is exactly the doc-of-paragraphs-of-one-text-node shape this editor writes. */
export function isPlainTextDoc(doc: unknown): boolean {
  if (typeof doc !== "object" || doc === null) return false;
  const node = doc as DocNode;
  if (node.type !== "doc" || !Array.isArray(node.content)) return false;
  return node.content.every(isPlainTextParagraph);
}

/** Deserializes a plain-text doc into one string per paragraph. Only valid when isPlainTextDoc(doc) is true. */
export function docToLines(doc: unknown): string[] {
  if (!isPlainTextDoc(doc)) return [];
  const node = doc as DocNode;
  return (node.content ?? []).map((paragraph) => paragraph.content?.[0]?.text ?? "");
}

/** Serializes one paragraph per line, matching the shape Tiptap produces for plain lines of text. */
export function linesToDoc(lines: string[]): DocNode {
  return {
    type: "doc",
    content: lines.map((line) =>
      line.length > 0 ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" },
    ),
  };
}
