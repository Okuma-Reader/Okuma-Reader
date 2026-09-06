export type PageSize = {
  width: number;
  height: number;
};

export type RenderTarget = {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
};

export type Chapter = {
  title: string;
  page: number;
};

export type PageLinkBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PageLink = PageLinkBox & {
  url?: string;
  /** 1-based page for internal destinations (already resolved). */
  destPage?: number;
  action?: string;
  label?: string;
  newWindow?: boolean;
};

export type TextRun = {
  str: string;
  start: number;
  transform: number[];
  width: number;
  height: number;
  vertical: boolean;
  ascent: number;
};

export type PageRawDims = {
  pageWidth: number;
  pageHeight: number;
  pageX: number;
  pageY: number;
};

export type PageTextIndex = {
  page: number;
  text: string;
  runs: TextRun[];
  rawDims?: PageRawDims;
};

export type TextLayerHandle = {
  cancel(): void;
};

/**
 * Pluggable book backend. Core drives the reader chrome; sources supply pages.
 * Optional methods absent ⇒ search / text / links / chapters stay empty.
 */
export interface BookSource {
  readonly pageCount: number;
  getPageSize(page: number): Promise<PageSize>;
  renderPage(page: number, target: RenderTarget): Promise<HTMLCanvasElement | ImageBitmap>;
  getText?(page: number): Promise<PageTextIndex | null>;
  getLinks?(page: number, target: { cssWidth: number; cssHeight: number }): Promise<PageLink[]>;
  getChapters?(): Promise<Chapter[]>;
  mountTextLayer?(options: {
    container: HTMLElement;
    page: number;
    cssWidth: number;
    cssHeight: number;
  }): Promise<TextLayerHandle | null>;
  destroy?(): void;
}

export type InitBookReaderOptions = {
  source: BookSource;
  /** Overrides data-book-id when set. */
  bookId?: string;
  /**
   * When aborted, initialization bails without taking over the shell DOM, and a
   * live reader tears down. Used by React Strict Mode remounts.
   */
  signal?: AbortSignal;
};

export type BookReaderHandle = {
  destroy(): void;
  goToPage(page: number): Promise<void>;
  getPage(): number;
};
