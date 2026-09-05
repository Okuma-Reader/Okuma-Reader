import {
  initBookReader,
  type BookReaderHandle,
  type BookSource,
} from "@okuma-reader/core";

export type MountOkumaReaderOptions = {
  source: BookSource;
  bookId?: string;
};

/**
 * Attach a BookSource to a rendered `#reader` root (client-side only).
 */
export async function mountOkumaReader(
  root: HTMLElement,
  options: MountOkumaReaderOptions
): Promise<BookReaderHandle> {
  return initBookReader(root, {
    source: options.source,
    bookId: options.bookId,
  });
}

export type { BookReaderHandle, BookSource };
