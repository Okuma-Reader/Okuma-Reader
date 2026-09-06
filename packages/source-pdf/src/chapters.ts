import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Chapter } from "@okuma-reader/core";

type OutlineNode = {
  title: string;
  dest: string | unknown[] | null;
  items: OutlineNode[];
};

function flattenOutline(nodes: OutlineNode[]): OutlineNode[] {
  const flat: OutlineNode[] = [];
  for (const node of nodes) {
    flat.push(node);
    if (node.items.length > 0) flat.push(...flattenOutline(node.items));
  }
  return flat;
}

export async function pageForDest(
  pdf: PDFDocumentProxy,
  dest: string | unknown[] | null,
): Promise<number | null> {
  if (dest === null) return null;
  const explicit = typeof dest === "string" ? await pdf.getDestination(dest) : dest;
  if (!Array.isArray(explicit) || explicit.length === 0) return null;
  const destRef = explicit[0];
  if (destRef && typeof destRef === "object") {
    const ref = destRef as { num: number; gen: number };
    const cached = pdf.cachedPageNumber(ref);
    if (cached) return cached;
    try {
      return (await pdf.getPageIndex(ref)) + 1;
    } catch {
      return null;
    }
  }
  if (typeof destRef === "number" && Number.isInteger(destRef)) {
    return destRef + 1;
  }
  return null;
}

/** Flatten the PDF outline and resolve each bookmark to a 1-based page. */
export async function loadPdfChapters(pdf: PDFDocumentProxy): Promise<Chapter[]> {
  const outline = (await pdf.getOutline()) as OutlineNode[] | null;
  if (!outline || outline.length === 0) return [];

  const seen = new Set<number>();
  const chapters: Chapter[] = [];
  for (const node of flattenOutline(outline)) {
    const page = await pageForDest(pdf, node.dest);
    if (page === null || page < 1 || page > pdf.numPages) continue;
    if (seen.has(page)) continue;
    seen.add(page);
    const title = node.title.replace(/\s+/g, " ").trim();
    if (!title) continue;
    chapters.push({ title, page });
  }
  chapters.sort((a, b) => a.page - b.page);
  return chapters;
}
