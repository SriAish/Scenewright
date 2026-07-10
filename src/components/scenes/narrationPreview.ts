interface DocNode {
  type?: string;
  text?: string;
  content?: DocNode[];
}

function extractText(node: DocNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(extractText).join("");
}

/** First non-empty paragraph's text from a narration doc, for the row's muted preview. Empty string if there is none. */
export function getFirstNarrationLine(doc: unknown): string {
  if (typeof doc !== "object" || doc === null) return "";
  const paragraphs = (doc as DocNode).content ?? [];
  for (const paragraph of paragraphs) {
    const text = extractText(paragraph).trim();
    if (text) return text;
  }
  return "";
}
