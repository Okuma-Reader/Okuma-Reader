import type {
  BookSource,
  Chapter,
  PageSize,
  RenderTarget,
} from "@okuma-reader/core";

export type ImagePage = {
  /** Absolute or site-root URL to the page image. */
  src: string;
  width?: number;
  height?: number;
};

export type CreateImageBookSourceOptions = {
  pages: ImagePage[];
  chapters?: Chapter[];
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function createImageBookSource(
  options: CreateImageBookSourceOptions
): BookSource {
  const pages = options.pages;
  if (pages.length === 0) throw new Error("Image book source needs pages");
  const sizeCache = new Map<number, PageSize>();
  const imageCache = new Map<string, Promise<HTMLImageElement>>();

  function getImage(src: string) {
    let pending = imageCache.get(src);
    if (!pending) {
      pending = loadImage(src);
      imageCache.set(src, pending);
    }
    return pending;
  }

  const source: BookSource = {
    pageCount: pages.length,

    async getPageSize(page: number): Promise<PageSize> {
      const cached = sizeCache.get(page);
      if (cached) return cached;
      const entry = pages[page - 1];
      if (!entry) throw new Error(`Page out of range: ${page}`);
      if (entry.width && entry.height) {
        const size = { width: entry.width, height: entry.height };
        sizeCache.set(page, size);
        return size;
      }
      const img = await getImage(entry.src);
      const size = {
        width: entry.width ?? img.naturalWidth,
        height: entry.height ?? img.naturalHeight,
      };
      sizeCache.set(page, size);
      return size;
    },

    async renderPage(page: number, target: RenderTarget) {
      const entry = pages[page - 1];
      if (!entry) throw new Error(`Page out of range: ${page}`);
      const img = await getImage(entry.src);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(target.cssWidth * target.dpr));
      canvas.height = Math.max(1, Math.floor(target.cssHeight * target.dpr));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("2D canvas unavailable");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    },

    async getChapters() {
      return options.chapters ?? [];
    },

    destroy() {
      sizeCache.clear();
      imageCache.clear();
    },
  };

  return source;
}
