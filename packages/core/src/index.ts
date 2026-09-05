export { initBookReader } from "./book-reader";
export { initChapterScrubber } from "./chapter-scrubber";
export type { ChapterScrubber } from "./chapter-scrubber";
export {
  clearTextLayerHighlights,
  findMatchesInPage,
  highlightMatchesInTextLayer,
  indexPageText,
  rectsForMatch,
} from "./pdf-search";
export type { CssRect, SearchMatch, SearchOptions } from "./pdf-search";
export { okumaIconSvg, OKUMA_ICON_NAMES } from "./icons/index";
export type { OkumaIconName } from "./icons/index";
export type {
  BookReaderHandle,
  BookSource,
  Chapter,
  InitBookReaderOptions,
  PageLink,
  PageLinkBox,
  PageRawDims,
  PageSize,
  PageTextIndex,
  RenderTarget,
  TextLayerHandle,
  TextRun,
} from "./types";
