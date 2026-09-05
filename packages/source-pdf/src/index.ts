import {
  AnnotationType,
  getDocument,
  GlobalWorkerOptions,
  TextLayer,
} from "pdfjs-dist";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  PageViewport,
  RenderTask,
} from "pdfjs-dist";
import {
  indexPageText,
  type BookSource,
  type Chapter,
  type PageLink,
  type PageSize,
  type RenderTarget,
  type TextLayerHandle,
} from "@okuma-reader/core";
import { loadPdfChapters, pageForDest } from "./chapters";

export type CreatePdfBookSourceOptions = {
  url: string;
  /** pdf.js worker URL. Required in most bundlers. */
  workerSrc: string;
};

type PdfLinkAnnot = {
  annotationType: number;
  rect?: number[];
  url?: string;
  dest?: string | unknown[] | null;
  action?: string;
  newWindow?: boolean;
  overlaidText?: string;
  quadPoints?: ArrayLike<number>;
};

function viewportBox(
  viewport: PageViewport,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const a = viewport.convertToViewportPoint(x1, y1);
  const b = viewport.convertToViewportPoint(x2, y2);
  const left = Math.min(a[0], b[0]);
  const top = Math.min(a[1], b[1]);
  return {
    left,
    top,
    width: Math.abs(b[0] - a[0]),
    height: Math.abs(b[1] - a[1]),
  };
}

function linkBoxes(annot: PdfLinkAnnot, viewport: PageViewport) {
  const quads = annot.quadPoints;
  if (quads && quads.length >= 8) {
    const boxes = [];
    for (let i = 0; i + 7 < quads.length; i += 8) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let j = 0; j < 8; j += 2) {
        const x = quads[i + j]!;
        const y = quads[i + j + 1]!;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      boxes.push(viewportBox(viewport, minX, minY, maxX, maxY));
    }
    return boxes;
  }
  const rect = annot.rect;
  if (!rect || rect.length < 4) return [];
  return [viewportBox(viewport, rect[0]!, rect[1]!, rect[2]!, rect[3]!)];
}

export async function createPdfBookSource(
  options: CreatePdfBookSourceOptions
): Promise<BookSource> {
  GlobalWorkerOptions.workerSrc = options.workerSrc;
  const pdf: PDFDocumentProxy = await getDocument({ url: options.url }).promise;
  const renderTasks = new Map<object, RenderTask>();
  const textLayers = new Set<TextLayer>();

  const source: BookSource = {
    pageCount: pdf.numPages,

    async getPageSize(page: number): Promise<PageSize> {
      const pdfPage = await pdf.getPage(page);
      const viewport = pdfPage.getViewport({ scale: 1 });
      return { width: viewport.width, height: viewport.height };
    },

    async renderPage(page: number, target: RenderTarget) {
      const pdfPage = await pdf.getPage(page);
      const base = pdfPage.getViewport({ scale: 1 });
      const cssScale = target.cssWidth / base.width;
      const canvasViewport = pdfPage.getViewport({
        scale: cssScale * target.dpr,
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(canvasViewport.width);
      canvas.height = Math.floor(canvasViewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("2D canvas unavailable");

      const task = pdfPage.render({
        canvas,
        canvasContext: context,
        viewport: canvasViewport,
      });
      renderTasks.set(canvas, task);
      try {
        await task.promise;
      } finally {
        if (renderTasks.get(canvas) === task) renderTasks.delete(canvas);
      }
      return canvas;
    },

    async getText(page: number) {
      const pdfPage = await pdf.getPage(page);
      const content = await pdfPage.getTextContent({
        includeMarkedContent: true,
      });
      const viewport = pdfPage.getViewport({ scale: 1 });
      const raw = viewport.rawDims as {
        pageWidth: number;
        pageHeight: number;
        pageX: number;
        pageY: number;
      };
      const index = indexPageText(page, content);
      index.rawDims = {
        pageWidth: raw.pageWidth,
        pageHeight: raw.pageHeight,
        pageX: raw.pageX,
        pageY: raw.pageY,
      };
      return index;
    },

    async getLinks(
      page: number,
      target: { cssWidth: number; cssHeight: number }
    ): Promise<PageLink[]> {
      const pdfPage = await pdf.getPage(page);
      const base = pdfPage.getViewport({ scale: 1 });
      const cssScale = target.cssWidth / base.width;
      const viewport = pdfPage.getViewport({ scale: cssScale });
      const annotations = (await pdfPage.getAnnotations({
        intent: "display",
      })) as PdfLinkAnnot[];
      const links: PageLink[] = [];
      for (const annot of annotations) {
        if (annot.annotationType !== AnnotationType.LINK) continue;
        if (!annot.url && annot.dest == null && !annot.action) continue;
        const label =
          typeof annot.overlaidText === "string" ? annot.overlaidText : "";
        let destPage: number | undefined;
        if (annot.dest != null && annot.dest !== "") {
          const resolved = await pageForDest(pdf, annot.dest);
          if (resolved !== null) destPage = resolved;
        }
        for (const box of linkBoxes(annot, viewport)) {
          if (box.width < 1 || box.height < 1) continue;
          links.push({
            ...box,
            url: typeof annot.url === "string" ? annot.url : undefined,
            destPage,
            action: typeof annot.action === "string" ? annot.action : undefined,
            label: label || undefined,
            newWindow: annot.newWindow,
          });
        }
      }
      return links;
    },

    async getChapters(): Promise<Chapter[]> {
      return loadPdfChapters(pdf);
    },

    async mountTextLayer(options): Promise<TextLayerHandle | null> {
      const pdfPage = await pdf.getPage(options.page);
      const base = pdfPage.getViewport({ scale: 1 });
      const cssScale = options.cssWidth / base.width;
      const viewport = pdfPage.getViewport({ scale: cssScale });
      options.container.hidden = false;
      options.container.replaceChildren();
      options.container.style.setProperty(
        "--total-scale-factor",
        String(cssScale)
      );
      const layer = new TextLayer({
        textContentSource: pdfPage.streamTextContent({
          includeMarkedContent: true,
        }),
        container: options.container,
        viewport,
      });
      textLayers.add(layer);
      try {
        await layer.render();
      } catch {
        textLayers.delete(layer);
        return null;
      }
      return {
        cancel() {
          layer.cancel();
          textLayers.delete(layer);
        },
      };
    },

    destroy() {
      for (const task of renderTasks.values()) {
        try {
          task.cancel();
        } catch {
          /* ignore */
        }
      }
      renderTasks.clear();
      for (const layer of textLayers) {
        try {
          layer.cancel();
        } catch {
          /* ignore */
        }
      }
      textLayers.clear();
      void pdf.cleanup();
    },
  };

  return source;
}

export { loadPdfChapters, pageForDest } from "./chapters";
