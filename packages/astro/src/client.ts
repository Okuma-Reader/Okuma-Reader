import { initBookReader, type BookReaderHandle, type BookSource } from "@okuma-reader/core";
import type { OkumaSourceConfig } from "./types";

export type MountOkumaReaderOptions = {
  source: BookSource;
  bookId?: string;
};

export type MountOkumaReaderFromConfigOptions = {
  source: OkumaSourceConfig;
  bookId?: string;
};

/**
 * Attach a BookSource to a rendered `#reader` root (client-side only).
 */
export async function mountOkumaReader(
  root: HTMLElement,
  options: MountOkumaReaderOptions,
): Promise<BookReaderHandle> {
  return initBookReader(root, {
    source: options.source,
    bookId: options.bookId,
  });
}

/**
 * Create a built-in BookSource from a serializable config and mount the reader.
 */
export async function mountOkumaReaderFromConfig(
  root: HTMLElement,
  options: MountOkumaReaderFromConfigOptions,
): Promise<BookReaderHandle> {
  const source = await createBookSourceFromConfig(options.source);
  return mountOkumaReader(root, {
    source,
    bookId: options.bookId,
  });
}

async function createBookSourceFromConfig(config: OkumaSourceConfig): Promise<BookSource> {
  if (config.type === "pdf") {
    let createPdfBookSource: typeof import("@okuma-reader/source-pdf").createPdfBookSource;
    try {
      ({ createPdfBookSource } = await import("@okuma-reader/source-pdf"));
    } catch {
      throw new Error(
        '@okuma-reader/source-pdf is required for source={{ type: "pdf" }}. Install it with: npm i @okuma-reader/source-pdf',
      );
    }
    return createPdfBookSource({
      url: config.url,
      workerSrc: config.workerSrc,
    });
  }

  let createImageBookSource: typeof import("@okuma-reader/source-images").createImageBookSource;
  try {
    ({ createImageBookSource } = await import("@okuma-reader/source-images"));
  } catch {
    throw new Error(
      '@okuma-reader/source-images is required for source={{ type: "images" }}. Install it with: npm i @okuma-reader/source-images',
    );
  }
  return createImageBookSource({
    pages: config.pages,
    chapters: config.chapters,
  });
}

export type { BookReaderHandle, BookSource, OkumaSourceConfig };
