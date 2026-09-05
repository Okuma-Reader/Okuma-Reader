import type { Chapter } from "@okuma-reader/core";

/**
 * PDF book loaded with pdf.js.
 *
 * @example
 * ```ts
 * { type: "pdf", url: "/books/my-book.pdf" }
 * ```
 */
export type OkumaPdfSourceConfig = {
  type: "pdf";
  /** Absolute or site-root URL of the PDF file. */
  url: string;
  /**
   * pdf.js worker script URL.
   * Defaults via `@okuma-reader/source-pdf` using `new URL(..., import.meta.url)`.
   * Override if your bundler does not rewrite that form.
   */
  workerSrc?: string;
};

/**
 * Book made of a fixed list of page images (e.g. WebP/PNG), in reading order.
 *
 * @example
 * ```ts
 * {
 *   type: "images",
 *   pages: [{ src: "/pages/1.webp" }, { src: "/pages/2.webp" }],
 * }
 * ```
 */
export type OkumaImagesSourceConfig = {
  type: "images";
  /**
   * One entry per page, 1-based reading order (index 0 = page 1).
   * `width` / `height` are optional hints; if omitted, dimensions are read from the image.
   */
  pages: { src: string; width?: number; height?: number }[];
  /** Optional chapter markers for the scrubber (`page` is 1-based). */
  chapters?: Chapter[];
};

/**
 * Serializable book source passed to {@link OkumaReaderProps.source}.
 * Prefer this over a manual `mountOkumaReader` call for PDF and image books.
 */
export type OkumaSourceConfig = OkumaPdfSourceConfig | OkumaImagesSourceConfig;

/**
 * Props for the `OkumaReader.astro` component.
 *
 * When {@link source} is set, the component mounts the reader on the client automatically.
 * Omit {@link source} only if you create a custom `BookSource` and call `mountOkumaReader` yourself.
 */
export interface OkumaReaderProps {
  /**
   * Unique identifier for this book. Used for `localStorage` reading progress
   * (`okuma-reader:progress:${bookId}`).
   */
  bookId: string;
  /** Book title shown in the toolbar. */
  title: string;
  /** Optional line under the title (e.g. volume or series name). */
  subtitle?: string;
  /**
   * Texture for the hardcover boards behind the page block when the book is open.
   * Extends slightly past the pages (overhang); not shown while the book is closed.
   */
  innerCoverImageUrl: string;
  /** Primary chrome color (borders, icons, accents). CSS color string. */
  darkColor: string;
  /** Soft background / highlight tint paired with {@link darkColor}. CSS color string. */
  lightColor: string;
  /** “Back” control target (toolbar and small-screen overlay). */
  backHref: string;
  /** When set, shows a download control pointing at this URL. */
  downloadUrl?: string;
  /**
   * Suggested filename for the download control.
   * Defaults to `${bookId}.pdf` when {@link downloadUrl} is set.
   */
  downloadFilename?: string;
  /**
   * When `true` (default), the reader owns the page: full viewport height and
   * `html`/`body` overflow locked. Set `false` to embed the reader in a layout.
   */
  ownPage?: boolean;
  /**
   * Declarative book source. When set, OkumaReader creates the `BookSource` and mounts itself.
   * Omit to mount manually via `mountOkumaReader` from `@okuma-reader/astro/client`.
   */
  source?: OkumaSourceConfig;
}
