import { initChapterScrubber } from "./chapter-scrubber";
import {
  clearTextLayerHighlights,
  findMatchesInPage,
  highlightMatchesInTextLayer,
  rectsForMatch,
  type PageTextIndex,
  type SearchMatch,
  type SearchOptions,
} from "./pdf-search";
import type { BookReaderHandle, InitBookReaderOptions, PageLink, TextLayerHandle } from "./types";

type SpreadPages = {
  left: number | null;
  right: number | null;
};

function pagesForSpread(spread: number, pageCount: number): SpreadPages {
  const left = 2 * spread;
  const right = 2 * spread + 1;
  return {
    left: left >= 1 && left <= pageCount ? left : null,
    right: right <= pageCount ? right : null,
  };
}

function maxSpread(pageCount: number): number {
  return Math.floor(pageCount / 2);
}

function spreadForPage(page: number): number {
  return Math.floor(page / 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clearLinkLayer(container: HTMLElement) {
  container.replaceChildren();
  container.hidden = true;
}

/**
 * Side-stack thickness as a fraction of page-face width, per page in the stack.
 * e.g. 0.001 → 100 unread pages ≈ 10% of the face width.
 */
const EDGE_WIDTH_PER_PAGE = 0.0003;
/** Extra stack scale per page on that side (≈1.06 at 300 pages). */
const STACK_SCALE_PER_PAGE = 0.05 / 300;
/** Horizontal hardcover peek beyond the page stack, as a fraction of page-face width. */
const COVER_OVERHANG_RATIO_X = 0.025;
/** Top hardcover peek beyond the page stack, as a fraction of page-face width. */
const COVER_OVERHANG_RATIO_TOP = 0.02;
/** Bottom hardcover peek beyond the page stack, as a fraction of page-face width. */
const COVER_OVERHANG_RATIO_BOTTOM = 0.02;
const ZOOM_MIN = 0.68;
const ZOOM_MAX = 3.83;
const ZOOM_STEP = 0.25;
/** Wait for zoom gestures to settle before asking the source to re-rasterize. */
const ZOOM_SETTLE_MS = 140;
/** Keep current ± this many spreads rasterized for instant page turns. */
const PREFETCH_SPREAD_RADIUS = 1;
const RASTER_CACHE_LIMIT = 12;

function progressStorageKey(bookId: string): string {
  return `okuma-reader:progress:${bookId}`;
}

function readSavedPage(bookId: string): number | null {
  try {
    const raw = localStorage.getItem(progressStorageKey(bookId));
    if (raw === null) return null;
    const page = Number(raw);
    return Number.isFinite(page) ? page : null;
  } catch {
    return null;
  }
}

function writeSavedPage(bookId: string, page: number) {
  try {
    localStorage.setItem(progressStorageKey(bookId), String(page));
  } catch {
    // Private mode / quota — resume is best-effort.
  }
}

function rasterToCanvas(raster: HTMLCanvasElement | ImageBitmap): HTMLCanvasElement | null {
  if (raster instanceof HTMLCanvasElement) return raster;
  const canvas = document.createElement("canvas");
  canvas.width = raster.width;
  canvas.height = raster.height;
  const context = canvas.getContext("2d");
  if (!context) {
    raster.close();
    return null;
  }
  context.drawImage(raster, 0, 0);
  raster.close();
  return canvas;
}

export async function initBookReader(
  root: HTMLElement,
  options: InitBookReaderOptions,
): Promise<BookReaderHandle> {
  const source = options.source;
  const bookId = options.bookId ?? root.dataset.bookId ?? "";
  if (!bookId) throw new Error("Missing bookId");

  const spreadEl = mustQuery(root, "#spread");
  const zoomShell = mustQuery(root, "#book-zoom-shell");
  const bookEl = mustQuery(root, "#book");
  const leftBtn = mustQuery(root, "[data-page='left']");
  const rightBtn = mustQuery(root, "[data-page='right']");
  const leftStack = mustQuery(leftBtn, ".page-stack");
  const rightStack = mustQuery(rightBtn, ".page-stack");
  const leftFace = mustQuery(leftBtn, ".page-face");
  const rightFace = mustQuery(rightBtn, ".page-face");
  const leftCanvas = mustQuery(leftBtn, "canvas") as HTMLCanvasElement;
  const rightCanvas = mustQuery(rightBtn, "canvas") as HTMLCanvasElement;
  const leftText = mustQuery(leftBtn, ".textLayer");
  const rightText = mustQuery(rightBtn, ".textLayer");
  const leftLinks = mustQuery(leftBtn, ".annotationLayer");
  const rightLinks = mustQuery(rightBtn, ".annotationLayer");
  const leftSearch = mustQuery(leftBtn, ".searchLayer");
  const rightSearch = mustQuery(rightBtn, ".searchLayer");
  const pageInput = mustQuery(root, "[data-page-input]") as HTMLInputElement;
  const pageScrubberEl = mustQuery(root, "[data-page-scrubber]");
  const pageCountLabel = mustQuery(root, "[data-page-count]");
  const zoomInBtn = mustQuery(root, "[data-zoom-in]");
  const zoomOutBtn = mustQuery(root, "[data-zoom-out]");
  const zoomResetBtn = mustQuery(root, "[data-zoom-reset]");
  const zoomLabel = mustQuery(root, "[data-zoom-label]");
  const turnPrevBtn = mustQuery(root, "[data-turn='prev']") as HTMLButtonElement;
  const turnNextBtn = mustQuery(root, "[data-turn='next']") as HTMLButtonElement;
  const fullscreenEnterBtn = mustQuery(root, "#fullscreen-enter") as HTMLButtonElement;
  const fullscreenExitBtn = mustQuery(root, "#fullscreen-exit") as HTMLButtonElement;
  const shortcutsOpenBtn = mustQuery(root, "#shortcuts-open") as HTMLButtonElement;
  const shortcutsDialog = mustQuery(root, "#shortcuts-dialog") as HTMLDialogElement;
  const shortcutsCloseBtn = mustQuery(root, "[data-shortcuts-close]");
  const spreadArea = mustQuery(root, "#spread-area");
  const searchOpenBtn = mustQuery(root, "#search-open") as HTMLButtonElement;
  const searchForm = mustQuery(root, "#reader-search") as HTMLFormElement;
  const searchInput = mustQuery(root, "[data-search-input]") as HTMLInputElement;
  const searchPrevBtn = mustQuery(root, "[data-search-prev]") as HTMLButtonElement;
  const searchNextBtn = mustQuery(root, "[data-search-next]") as HTMLButtonElement;
  const searchCount = mustQuery(root, "[data-search-count]");
  const searchCloseBtn = mustQuery(root, "[data-search-close]");
  const searchMatchCase = mustQuery(root, "[data-search-match-case]") as HTMLInputElement;
  const searchMatchDiacritics = mustQuery(
    root,
    "[data-search-match-diacritics]",
  ) as HTMLInputElement;
  const searchWholeWords = mustQuery(root, "[data-search-whole-words]") as HTMLInputElement;

  const pageCount = source.pageCount;
  const savedPage = readSavedPage(bookId);
  let spread = savedPage === null ? 0 : spreadForPage(clamp(Math.round(savedPage), 1, pageCount));
  let zoom = 1;
  /** Zoom level of the canvases currently on screen. */
  let renderedZoom = 1;
  let renderedLayout = { w: 0, h: 0 };
  let renderToken = 0;
  /** Bumped when CSS page size / DPR changes so stale prefetches stop. */
  let layoutEpoch = 0;
  let lastRasterLayout: { w: number; h: number; dpr: number } | null = null;
  let zoomTimer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;
  const abort = new AbortController();
  const { signal } = abort;
  const textLayers = new Map<HTMLElement, TextLayerHandle>();
  /** Offscreen rasters keyed by page + layout; avoids blanking the visible canvas. */
  const rasterCache = new Map<string, HTMLCanvasElement>();
  const inflightRasters = new Map<string, Promise<HTMLCanvasElement | null>>();

  pageInput.max = String(pageCount);
  pageCountLabel.textContent = `/ ${pageCount}`;
  const chapters = (await source.getChapters?.()) ?? [];
  bookEl.style.setProperty("--spine-thickness", String(pageCount * EDGE_WIDTH_PER_PAGE * 2));
  syncZoomUi();

  turnPrevBtn.addEventListener("click", () => goSpread(-1), { signal });
  turnNextBtn.addEventListener("click", () => goSpread(1), { signal });

  function isSpreadFullscreen(): boolean {
    return document.fullscreenElement === spreadArea;
  }

  function syncFullscreenUi() {
    fullscreenExitBtn.hidden = !isSpreadFullscreen();
  }

  async function enterFullscreen() {
    if (destroyed || isSpreadFullscreen()) return;
    try {
      await spreadArea.requestFullscreen();
    } catch {
      // User gesture denied / unsupported — ignore.
    }
  }

  async function exitFullscreen() {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // Already exited / unsupported — ignore.
    }
  }

  async function toggleFullscreen() {
    if (isSpreadFullscreen()) await exitFullscreen();
    else await enterFullscreen();
  }

  fullscreenEnterBtn.addEventListener("click", () => void enterFullscreen(), { signal });
  fullscreenExitBtn.addEventListener("click", () => void exitFullscreen(), {
    signal,
  });
  document.addEventListener(
    "fullscreenchange",
    () => {
      if (destroyed) return;
      syncFullscreenUi();
      // Layout often isn't final yet on fullscreenchange — wait for paint.
      scheduleFit();
    },
    { signal },
  );
  syncFullscreenUi();

  function openShortcuts() {
    if (!shortcutsDialog.open) shortcutsDialog.showModal();
    shortcutsOpenBtn.setAttribute("aria-expanded", "true");
  }

  function closeShortcuts() {
    if (shortcutsDialog.open) shortcutsDialog.close();
    shortcutsOpenBtn.setAttribute("aria-expanded", "false");
  }

  function toggleShortcuts() {
    if (shortcutsDialog.open) closeShortcuts();
    else openShortcuts();
  }

  shortcutsOpenBtn.addEventListener("click", () => openShortcuts(), { signal });
  shortcutsCloseBtn.addEventListener("click", () => closeShortcuts(), {
    signal,
  });
  shortcutsDialog.addEventListener(
    "click",
    (event) => {
      if (event.target === shortcutsDialog) closeShortcuts();
    },
    { signal },
  );
  shortcutsDialog.addEventListener(
    "close",
    () => {
      shortcutsOpenBtn.setAttribute("aria-expanded", "false");
    },
    { signal },
  );

  const pageTextCache = new Map<number, PageTextIndex>();
  let pageTextLoad: Promise<void> | null = null;
  let searchGen = 0;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let searchMatches: SearchMatch[] = [];
  let searchActive = 0;
  const paintedSearch: { page: number; layer: HTMLElement }[] = [];

  function searchOptions(): SearchOptions {
    return {
      matchCase: searchMatchCase.checked,
      matchDiacritics: searchMatchDiacritics.checked,
      wholeWords: searchWholeWords.checked,
    };
  }

  function syncSearchCount() {
    const total = searchMatches.length;
    const current = total === 0 ? 0 : searchActive + 1;
    searchCount.textContent = `${current} of ${total} matches`;
    searchPrevBtn.disabled = total === 0;
    searchNextBtn.disabled = total === 0;
  }

  function clearSearchPaint(layer: HTMLElement) {
    layer.replaceChildren();
    layer.hidden = true;
    const textRoot = layer.parentElement?.querySelector(":scope > .textLayer");
    if (textRoot instanceof HTMLElement) clearTextLayerHighlights(textRoot);
  }

  function clearSearchLayer(container: HTMLElement) {
    clearSearchPaint(container);
  }

  function forgetPaintedSearch(layer: HTMLElement) {
    const index = paintedSearch.findIndex((entry) => entry.layer === layer);
    if (index !== -1) paintedSearch.splice(index, 1);
  }

  function paintSearchLayer(layer: HTMLElement, pageNumber: number) {
    forgetPaintedSearch(layer);
    paintedSearch.push({ page: pageNumber, layer });
    layer.replaceChildren();
    if (searchForm.hidden || searchMatches.length === 0) {
      const textRoot = layer.parentElement?.querySelector(":scope > .textLayer");
      if (textRoot instanceof HTMLElement) clearTextLayerHighlights(textRoot);
      layer.hidden = true;
      return;
    }
    const pageIndex = pageTextCache.get(pageNumber);
    if (!pageIndex) {
      const textRoot = layer.parentElement?.querySelector(":scope > .textLayer");
      if (textRoot instanceof HTMLElement) clearTextLayerHighlights(textRoot);
      layer.hidden = true;
      return;
    }
    const textRoot = layer.parentElement?.querySelector(":scope > .textLayer");
    if (textRoot instanceof HTMLElement) {
      const pageMatches = searchMatches.flatMap((match, i) =>
        match.page === pageNumber
          ? [
              {
                start: match.start,
                end: match.end,
                current: i === searchActive,
              },
            ]
          : [],
      );
      if (pageMatches.length === 0) {
        clearTextLayerHighlights(textRoot);
        layer.hidden = true;
        return;
      }
      if (highlightMatchesInTextLayer(textRoot, pageIndex, pageMatches)) {
        layer.hidden = true;
        return;
      }
      clearTextLayerHighlights(textRoot);
    }
    const fragment = document.createDocumentFragment();
    let painted = 0;
    for (let i = 0; i < searchMatches.length; i++) {
      const match = searchMatches[i]!;
      if (match.page !== pageNumber) continue;
      for (const box of rectsForMatch(pageIndex, match.start, match.end)) {
        const mark = document.createElement("span");
        if (i === searchActive) mark.classList.add("is-current");
        mark.style.left = `${box.left}%`;
        mark.style.top = `${box.top}%`;
        mark.style.width = `${box.width}%`;
        mark.style.height = `${box.height}%`;
        fragment.append(mark);
        painted++;
      }
    }
    if (painted === 0) {
      layer.hidden = true;
      return;
    }
    layer.hidden = false;
    layer.append(fragment);
  }

  function refreshSearchHighlights() {
    for (const entry of paintedSearch.slice()) {
      paintSearchLayer(entry.layer, entry.page);
    }
  }

  async function loadAllPageText() {
    if (!source.getText) return;
    if (pageTextLoad) return pageTextLoad;
    pageTextLoad = (async () => {
      const pending: Promise<void>[] = [];
      for (let page = 1; page <= pageCount; page++) {
        pending.push(
          (async () => {
            const index = await source.getText!(page);
            if (index) pageTextCache.set(page, index);
          })(),
        );
      }
      await Promise.all(pending);
    })();
    try {
      await pageTextLoad;
    } catch (error) {
      pageTextLoad = null;
      throw error;
    }
  }

  async function runSearch() {
    if (destroyed) return;
    const gen = ++searchGen;
    const query = searchInput.value;
    if (!query.trim()) {
      searchMatches = [];
      searchActive = 0;
      syncSearchCount();
      refreshSearchHighlights();
      return;
    }
    await loadAllPageText();
    if (destroyed || gen !== searchGen) return;
    const options = searchOptions();
    const matches: SearchMatch[] = [];
    for (let page = 1; page <= pageCount; page++) {
      const index = pageTextCache.get(page);
      if (index) matches.push(...findMatchesInPage(index, query, options));
    }
    if (destroyed || gen !== searchGen) return;
    searchMatches = matches;
    const currentPage = displayedPage();
    const nearby = matches.findIndex((match) => match.page >= currentPage);
    searchActive = nearby === -1 ? 0 : nearby;
    syncSearchCount();
    if (matches.length > 0) await goToSearchMatch(searchActive);
    else refreshSearchHighlights();
  }

  function scheduleSearch() {
    window.clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTimer = undefined;
      void runSearch();
    }, 120);
  }

  async function goToSearchMatch(index: number) {
    if (destroyed || searchMatches.length === 0) return;
    searchActive = ((index % searchMatches.length) + searchMatches.length) % searchMatches.length;
    syncSearchCount();
    const match = searchMatches[searchActive]!;
    await goToPage(match.page);
    refreshSearchHighlights();
  }

  function openSearch() {
    closeShortcuts();
    searchForm.hidden = false;
    searchOpenBtn.setAttribute("aria-expanded", "true");
    searchInput.focus();
    searchInput.select();
    if (searchInput.value.trim() && searchMatches.length === 0) {
      void runSearch();
    }
  }

  function closeSearch() {
    window.clearTimeout(searchTimer);
    searchTimer = undefined;
    searchGen++;
    searchForm.hidden = true;
    searchOpenBtn.setAttribute("aria-expanded", "false");
    searchMatches = [];
    searchActive = 0;
    syncSearchCount();
    refreshSearchHighlights();
  }

  function toggleSearch() {
    if (searchForm.hidden) openSearch();
    else closeSearch();
  }

  searchForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      void goToSearchMatch(searchActive + 1);
    },
    { signal },
  );
  searchInput.addEventListener("input", () => scheduleSearch(), { signal });
  searchInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void goToSearchMatch(searchActive + (event.shiftKey ? -1 : 1));
    },
    { signal },
  );
  searchPrevBtn.addEventListener(
    "click",
    () => {
      void goToSearchMatch(searchActive - 1);
    },
    { signal },
  );
  searchNextBtn.addEventListener(
    "click",
    () => {
      void goToSearchMatch(searchActive + 1);
    },
    { signal },
  );
  searchCloseBtn.addEventListener("click", () => closeSearch(), { signal });
  searchOpenBtn.addEventListener("click", () => toggleSearch(), { signal });
  for (const box of [searchMatchCase, searchMatchDiacritics, searchWholeWords]) {
    box.addEventListener("change", () => void runSearch(), { signal });
  }
  syncSearchCount();

  let fitFrame = 0;
  function scheduleFit() {
    if (destroyed) return;
    window.cancelAnimationFrame(fitFrame);
    fitFrame = window.requestAnimationFrame(() => {
      fitFrame = window.requestAnimationFrame(() => {
        if (destroyed) return;
        if (spreadEl.clientWidth < 1 || spreadEl.clientHeight < 1) return;
        void showSpread();
      });
    });
  }

  window.addEventListener("resize", scheduleFit, { signal });

  /** One spread per gesture — trackpads send large deltas that would skip pages. */
  const WHEEL_PAGE_THRESHOLD = 40;
  const WHEEL_FLIP_COOLDOWN_MS = 30;
  let wheelPageDelta = 0;
  let wheelFlipLocked = false;
  let wheelFlipTimer: ReturnType<typeof setTimeout> | undefined;

  function onReaderWheel(event: WheelEvent) {
    if (destroyed) return;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      wheelPageDelta = 0;
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom(zoom * factor, true);
      return;
    }

    // At fit zoom there's nothing to pan — use the wheel to turn pages.
    if (zoom <= 1.001) {
      event.preventDefault();
      if (wheelFlipLocked) return;
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (delta === 0) return;
      if (Math.sign(delta) !== Math.sign(wheelPageDelta) && wheelPageDelta !== 0) {
        wheelPageDelta = 0;
      }
      wheelPageDelta += delta;
      if (Math.abs(wheelPageDelta) < WHEEL_PAGE_THRESHOLD) return;

      const direction = wheelPageDelta > 0 ? 1 : -1;
      wheelPageDelta = 0;
      wheelFlipLocked = true;
      goSpread(direction);
      window.clearTimeout(wheelFlipTimer);
      wheelFlipTimer = setTimeout(() => {
        wheelFlipLocked = false;
        wheelFlipTimer = undefined;
      }, WHEEL_FLIP_COOLDOWN_MS);
      return;
    }

    wheelPageDelta = 0;
    // Turn buttons sit above the scroller; forward wheel to pan when zoomed.
    if (event.currentTarget !== spreadEl) {
      spreadEl.scrollTop += event.deltaY;
      spreadEl.scrollLeft += event.deltaX;
    }
  }

  // Buttons sit above the scroller; keep wheel-zoom/pan/page-turn working over them.
  for (const btn of [turnPrevBtn, turnNextBtn, fullscreenExitBtn]) {
    btn.addEventListener("wheel", onReaderWheel, { passive: false, signal });
  }

  window.addEventListener(
    "keydown",
    (event) => {
      if (destroyed) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && !event.altKey) {
        event.preventDefault();
        openSearch();
        return;
      }
      if (!searchForm.hidden && event.key === "Escape") {
        event.preventDefault();
        closeSearch();
        return;
      }
      if (isEditableTarget(event.target)) return;
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        toggleShortcuts();
        return;
      }
      if (shortcutsDialog.open) return;
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        goToChapter(event.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goSpread(-1);
        return;
      }
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        goSpread(1);
        return;
      }
      if (event.key.toLowerCase() === "f" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        void toggleFullscreen();
      }
    },
    { signal },
  );

  const pageScrubber = initChapterScrubber(pageScrubberEl, {
    pageCount,
    chapters,
    getPage: () => displayedPage(),
    onSeek: (page) => goToPage(page),
  });

  zoomInBtn.addEventListener(
    "click",
    () => {
      setZoom(zoom + ZOOM_STEP);
    },
    { signal },
  );
  zoomOutBtn.addEventListener(
    "click",
    () => {
      setZoom(zoom - ZOOM_STEP);
    },
    { signal },
  );
  zoomResetBtn.addEventListener(
    "click",
    () => {
      setZoom(1);
    },
    { signal },
  );

  spreadEl.addEventListener("wheel", onReaderWheel, { passive: false, signal });

  let pinchStartDistance = 0;
  let pinchStartZoom = 1;

  function touchDistance(a: Touch, b: Touch): number {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function onPinchStart(event: TouchEvent) {
    if (destroyed || event.touches.length !== 2) return;
    pinchStartDistance = touchDistance(event.touches[0]!, event.touches[1]!);
    pinchStartZoom = zoom;
    wheelPageDelta = 0;
  }

  function onPinchMove(event: TouchEvent) {
    if (destroyed || event.touches.length !== 2 || pinchStartDistance < 1) return;
    event.preventDefault();
    const distance = touchDistance(event.touches[0]!, event.touches[1]!);
    setZoom(pinchStartZoom * (distance / pinchStartDistance), true);
  }

  function onPinchEnd(event: TouchEvent) {
    if (event.touches.length < 2) pinchStartDistance = 0;
  }

  // Pinch-to-zoom (bubbles from book, turn controls, etc.).
  spreadArea.addEventListener("touchstart", onPinchStart, {
    passive: true,
    signal,
  });
  spreadArea.addEventListener("touchmove", onPinchMove, {
    passive: false,
    signal,
  });
  spreadArea.addEventListener("touchend", onPinchEnd, { signal });
  spreadArea.addEventListener("touchcancel", onPinchEnd, { signal });

  let editingPageInput = false;

  pageInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        editingPageInput = false;
        goSpread(1);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        editingPageInput = false;
        goSpread(-1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        editingPageInput = false;
        void goToPage(Number(pageInput.value));
        pageInput.blur();
        return;
      }
      if (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") {
        editingPageInput = true;
      }
    },
    { signal },
  );

  pageInput.addEventListener(
    "input",
    () => {
      // Spinner clicks (and similar nudges) fire input without typing keydowns.
      if (editingPageInput) return;
      const requested = Number(pageInput.value);
      const current = displayedPage();
      if (!Number.isFinite(requested)) {
        syncPager();
        return;
      }
      if (requested > current) goSpread(1);
      else if (requested < current) goSpread(-1);
      else syncPager();
    },
    { signal },
  );

  pageInput.addEventListener(
    "change",
    () => {
      editingPageInput = false;
      void goToPage(Number(pageInput.value));
    },
    { signal },
  );

  pageInput.addEventListener(
    "blur",
    () => {
      editingPageInput = false;
    },
    { signal },
  );

  await showSpread();
  // Observe after the first paint so the initial RO callback can't cancel it
  // with a zero-size layout measurement.
  const resizeObserver = new ResizeObserver(scheduleFit);
  resizeObserver.observe(spreadEl);

  function displayedPage(): number {
    const { left, right } = pagesForSpread(spread, pageCount);
    return left ?? right ?? 1;
  }

  function goSpread(delta: number) {
    if (destroyed) return;
    window.clearTimeout(zoomTimer);
    zoomTimer = undefined;
    const next = clamp(spread + delta, 0, maxSpread(pageCount));
    if (next === spread) {
      syncPager();
      return;
    }
    spread = next;
    void showSpread();
  }

  function goToPage(page: number): Promise<void> {
    if (destroyed) return Promise.resolve();
    window.clearTimeout(zoomTimer);
    zoomTimer = undefined;
    if (!Number.isFinite(page)) {
      syncPager();
      return Promise.resolve();
    }
    const next = clamp(Math.round(page), 1, pageCount);
    const nextSpread = spreadForPage(next);
    if (nextSpread === spread) {
      syncPager();
      return Promise.resolve();
    }
    spread = nextSpread;
    return showSpread();
  }

  function goToChapter(direction: -1 | 1) {
    const starts = [...new Set(chapters.map((chapter) => spreadForPage(chapter.page)))].sort(
      (a, b) => a - b,
    );
    const stops = starts.length === 0 || starts[0] === 0 ? starts : [0, ...starts];
    const target =
      direction > 0
        ? stops.find((start) => start > spread)
        : [...stops].reverse().find((start) => start < spread);
    if (target === undefined) {
      if (direction > 0) void goToPage(pageCount);
      return;
    }
    const { left, right } = pagesForSpread(target, pageCount);
    void goToPage(left ?? right ?? 1);
  }

  function syncPager() {
    const currentPage = displayedPage();
    pageInput.value = String(currentPage);
    pageScrubber.setPage(currentPage);
    writeSavedPage(bookId, currentPage);
  }

  function syncZoomUi() {
    const rounded = Math.round(zoom * 100);
    zoomLabel.textContent = `${rounded}%`;
    bookEl.dataset.zoomed = zoom > 1.001 ? "true" : "false";
    (zoomOutBtn as HTMLButtonElement).disabled = zoom <= ZOOM_MIN + 0.001;
    (zoomInBtn as HTMLButtonElement).disabled = zoom >= ZOOM_MAX - 0.001;
  }

  function applyZoomPreview() {
    const scale = zoom / renderedZoom;
    if (!renderedLayout.w || Math.abs(scale - 1) < 0.001) {
      bookEl.style.transform = "";
      zoomShell.style.width = "";
      zoomShell.style.height = "";
      bookEl.classList.remove("is-preview-zoom");
      return;
    }
    zoomShell.style.width = `${renderedLayout.w * scale}px`;
    zoomShell.style.height = `${renderedLayout.h * scale}px`;
    bookEl.style.transform = `scale(${scale})`;
    bookEl.classList.add("is-preview-zoom");
  }

  function setZoom(next: number, fromWheel = false) {
    if (destroyed) return;
    if (fromWheel) {
      zoom = clamp(Math.round(next * 100) / 100, ZOOM_MIN, ZOOM_MAX);
    } else {
      zoom = clamp(Math.round(next / ZOOM_STEP) * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX);
    }
    syncZoomUi();
    // Instant CSS scale while the source catches up at settle time.
    applyZoomPreview();
    window.clearTimeout(zoomTimer);
    zoomTimer = setTimeout(() => {
      zoomTimer = undefined;
      void showSpread();
    }, ZOOM_SETTLE_MS);
  }

  function cancelTextLayer(container: HTMLElement) {
    const layer = textLayers.get(container);
    if (!layer) return;
    layer.cancel();
    textLayers.delete(container);
  }

  function clearTextLayer(container: HTMLElement) {
    cancelTextLayer(container);
    container.replaceChildren();
    container.hidden = true;
  }

  function rasterKey(pageNumber: number, cssWidth: number, cssHeight: number, dpr: number): string {
    return `${pageNumber}:${cssWidth}x${cssHeight}@${dpr}`;
  }

  function rememberRaster(key: string, canvas: HTMLCanvasElement) {
    rasterCache.delete(key);
    rasterCache.set(key, canvas);
    while (rasterCache.size > RASTER_CACHE_LIMIT) {
      const oldest = rasterCache.keys().next().value;
      if (oldest === undefined) break;
      rasterCache.delete(oldest);
    }
  }

  function invalidateRasterCache() {
    layoutEpoch++;
    rasterCache.clear();
    inflightRasters.clear();
  }

  function syncRasterLayout(cssWidth: number, cssHeight: number): number {
    const dpr = window.devicePixelRatio || 1;
    const prev = lastRasterLayout;
    if (!prev || prev.w !== cssWidth || prev.h !== cssHeight || prev.dpr !== dpr) {
      invalidateRasterCache();
      lastRasterLayout = { w: cssWidth, h: cssHeight, dpr };
    }
    return layoutEpoch;
  }

  async function getRaster(
    pageNumber: number,
    cssWidth: number,
    cssHeight: number,
    token?: number,
  ): Promise<HTMLCanvasElement | null> {
    if (destroyed) return null;
    const dpr = window.devicePixelRatio || 1;
    const key = rasterKey(pageNumber, cssWidth, cssHeight, dpr);
    const cached = rasterCache.get(key);
    if (cached) {
      rememberRaster(key, cached);
      return cached;
    }

    const existing = inflightRasters.get(key);
    if (existing) {
      const shared = await existing;
      if (destroyed || (token !== undefined && token !== renderToken)) return null;
      return shared;
    }

    const pending = (async (): Promise<HTMLCanvasElement | null> => {
      const epochAtStart = layoutEpoch;
      const rendered = await source.renderPage(pageNumber, {
        cssWidth,
        cssHeight,
        dpr,
      });
      if (destroyed || (token !== undefined && token !== renderToken)) return null;
      if (epochAtStart !== layoutEpoch) return null;

      const offscreen = rasterToCanvas(rendered);
      if (!offscreen) return null;

      if (destroyed || (token !== undefined && token !== renderToken)) return null;
      if (epochAtStart !== layoutEpoch) return null;

      rememberRaster(key, offscreen);
      return offscreen;
    })();

    inflightRasters.set(key, pending);
    try {
      return await pending;
    } finally {
      if (inflightRasters.get(key) === pending) inflightRasters.delete(key);
    }
  }

  function pagesAroundSpread(center: number): number[] {
    const pages = new Set<number>();
    const max = maxSpread(pageCount);
    for (let s = center - PREFETCH_SPREAD_RADIUS; s <= center + PREFETCH_SPREAD_RADIUS; s++) {
      if (s < 0 || s > max) continue;
      const { left, right } = pagesForSpread(s, pageCount);
      if (left !== null) pages.add(left);
      if (right !== null) pages.add(right);
    }
    return [...pages];
  }

  function prefetchAdjacent(center: number, cssWidth: number, cssHeight: number, epoch: number) {
    const pages = pagesAroundSpread(center).filter((pageNumber) => {
      const { left, right } = pagesForSpread(center, pageCount);
      return pageNumber !== left && pageNumber !== right;
    });

    void (async () => {
      for (const pageNumber of pages) {
        if (destroyed || epoch !== layoutEpoch) return;
        await getRaster(pageNumber, cssWidth, cssHeight);
      }
    })();
  }

  async function showSpread() {
    if (destroyed) return;
    // Don't bump renderToken until we know the stage has a real size — otherwise
    // a zero-size fit (common right as fullscreen/layout settles) cancels a good render.
    if (spreadEl.clientWidth < 1 || spreadEl.clientHeight < 1) return;

    const token = ++renderToken;
    const { left, right } = pagesForSpread(spread, pageCount);
    const canPrev = spread > 0;
    const canNext = spread < maxSpread(pageCount);
    const samplePageNumber = left ?? right;
    if (samplePageNumber === null) return;

    leftBtn.dataset.empty = String(left === null);
    rightBtn.dataset.empty = String(right === null);
    // End-sheet pastedowns: page 2 (front) and pageCount − 1 (back, mirrored).
    const backPastedownPage = pageCount > 2 ? pageCount - 1 : null;
    const pastedownFor = (page: number | null): "front" | "back" | null => {
      if (page === null) return null;
      if (page === 2) return "front";
      if (backPastedownPage !== null && page === backPastedownPage) return "back";
      return null;
    };
    const leftPastedown = pastedownFor(left);
    const rightPastedown = pastedownFor(right);
    if (leftPastedown) leftBtn.dataset.pastedown = leftPastedown;
    else delete leftBtn.dataset.pastedown;
    if (rightPastedown) rightBtn.dataset.pastedown = rightPastedown;
    else delete rightBtn.dataset.pastedown;
    turnPrevBtn.disabled = !canPrev;
    turnNextBtn.disabled = !canNext;
    syncPager();

    const closed = left === null || right === null;
    bookEl.dataset.closed = String(closed);
    if (closed) {
      bookEl.dataset.cover = right !== null ? "front" : "back";
    } else {
      delete bookEl.dataset.cover;
    }

    const firstPage = left ?? right!;
    const lastPage = right ?? left!;
    const pagesRead = firstPage - 1;
    const pagesRemaining = pageCount - lastPage;
    const bookProgress = pageCount > 0 ? pagesRead / pageCount : 0;
    bookEl.style.setProperty("--book-progress", String(bookProgress));
    // Pastedowns (page 2 / pageCount−1) are endpapers, not stack leaves.
    const leftEdgePages = Math.max(0, pagesRead - 1);
    const rightEdgePages = Math.max(0, pagesRemaining - 1);
    const leftRatio = closed ? 0 : leftEdgePages * EDGE_WIDTH_PER_PAGE;
    const rightRatio = closed ? 0 : rightEdgePages * EDGE_WIDTH_PER_PAGE;
    // Display overhang only when open; fit always reserves it so closed/open
    // share the same base face size.
    const overhangX = closed ? 0 : COVER_OVERHANG_RATIO_X;
    const overhangTop = closed ? 0 : COVER_OVERHANG_RATIO_TOP;
    const overhangBottom = closed ? 0 : COVER_OVERHANG_RATIO_BOTTOM;
    const leftStackScale = closed ? 1 : 1 + leftEdgePages * STACK_SCALE_PER_PAGE;
    const rightStackScale = closed ? 1 : 1 + rightEdgePages * STACK_SCALE_PER_PAGE;
    // Mid-book: scaleX → 1 so stacks don't overlap when z-index flips.
    const progressBend = Math.abs(2 * bookProgress - 1);
    const leftScaleX = 1 + (leftStackScale - 1) * progressBend;
    const rightScaleX = 1 + (rightStackScale - 1) * progressBend;
    // Fit against the book's thickest possible stack so base page size
    // stays constant across progress (avoids mid-book "growth").
    const peakStackPages = Math.max(0, pageCount - 2);
    const peakStackScale = 1 + peakStackPages * STACK_SCALE_PER_PAGE;
    const peakEdgeRatio = peakStackPages * EDGE_WIDTH_PER_PAGE;

    const sampleSize = await source.getPageSize(samplePageNumber);
    if (destroyed || token !== renderToken) return;

    const aspect = sampleSize.height / sampleSize.width;
    const stageStyle = getComputedStyle(mustQuery(root, "#spread-stage"));
    const padX =
      Number.parseFloat(stageStyle.paddingLeft) + Number.parseFloat(stageStyle.paddingRight);
    const padY =
      Number.parseFloat(stageStyle.paddingTop) + Number.parseFloat(stageStyle.paddingBottom);
    const availW = spreadEl.clientWidth - padX;
    const availH = spreadEl.clientHeight - padY;
    if (availW < 1 || availH < 1) return;

    // Always fit as an open spread (2 faces + peak edge + overhang + peak
    // stack height) so opening/closing doesn't change the base face size.
    const widthFromViewport = availW / (2 + peakEdgeRatio + 2 * COVER_OVERHANG_RATIO_X);
    const heightFromViewport =
      availH / (aspect * peakStackScale + COVER_OVERHANG_RATIO_TOP + COVER_OVERHANG_RATIO_BOTTOM);
    const cssWidth = Math.floor(Math.min(widthFromViewport, heightFromViewport) * zoom);
    const cssHeight = Math.floor(cssWidth * aspect);
    if (cssWidth < 1 || cssHeight < 1) return;
    const epoch = syncRasterLayout(cssWidth, cssHeight);

    // Closed cover board = open hardcover half (base face + outer overhang).
    const coverFaceW = Math.max(1, Math.floor(cssWidth * (1 + COVER_OVERHANG_RATIO_X)));
    const coverFaceH = Math.max(
      1,
      Math.floor(cssHeight + cssWidth * (COVER_OVERHANG_RATIO_TOP + COVER_OVERHANG_RATIO_BOTTOM)),
    );
    const leftFaceW = closed ? coverFaceW : Math.max(1, Math.floor(cssWidth * leftScaleX));
    const leftFaceH = closed ? coverFaceH : Math.max(1, Math.floor(cssHeight * leftStackScale));
    const rightFaceW = closed ? coverFaceW : Math.max(1, Math.floor(cssWidth * rightScaleX));
    const rightFaceH = closed ? coverFaceH : Math.max(1, Math.floor(cssHeight * rightStackScale));

    const overhangXPx = `${cssWidth * overhangX}px`;
    const overhangTopPx = `${cssWidth * overhangTop}px`;
    const overhangBottomPx = `${cssWidth * overhangBottom}px`;
    // Extra width beyond the base face+edge footprint; pulled back on the spine side.
    const leftOverlapX = `${cssWidth * (leftScaleX - 1) * (1 + leftRatio)}px`;
    const rightOverlapX = `${cssWidth * (rightScaleX - 1) * (1 + rightRatio)}px`;

    // Ratio only depends on reading position; face width updates on resize/zoom
    // and CSS keeps edge/cover thickness proportional.
    leftBtn.style.setProperty("--edge-ratio", String(leftRatio));
    rightBtn.style.setProperty("--edge-ratio", String(rightRatio));
    // 0–1 shade for page-stack shadows (1 ≈ thick side stack).
    const stackShadeFull = 0.06;
    leftStack.style.setProperty("--stack-shade", String(Math.min(1, leftRatio / stackShadeFull)));
    rightStack.style.setProperty("--stack-shade", String(Math.min(1, rightRatio / stackShadeFull)));
    leftStack.style.setProperty("--stack-scale", String(leftStackScale));
    rightStack.style.setProperty("--stack-scale", String(rightStackScale));
    leftStack.style.setProperty("--scale-x", String(leftScaleX));
    rightStack.style.setProperty("--scale-x", String(rightScaleX));
    // Thicker side paints above the other where scaled stacks overlap.
    if (closed) {
      leftBtn.style.zIndex = "";
      rightBtn.style.zIndex = "";
      leftStack.style.removeProperty("--stack-margin-top");
      leftStack.style.removeProperty("--stack-margin-bottom");
      leftStack.style.removeProperty("--stack-margin-start");
      leftStack.style.removeProperty("--stack-margin-end");
      rightStack.style.removeProperty("--stack-margin-top");
      rightStack.style.removeProperty("--stack-margin-bottom");
      rightStack.style.removeProperty("--stack-margin-start");
      rightStack.style.removeProperty("--stack-margin-end");
    } else if (pagesRead > pagesRemaining) {
      leftBtn.style.zIndex = "2";
      rightBtn.style.zIndex = "1";
    } else if (pagesRemaining > pagesRead) {
      leftBtn.style.zIndex = "1";
      rightBtn.style.zIndex = "2";
    } else {
      leftBtn.style.zIndex = "";
      rightBtn.style.zIndex = "";
    }
    if (!closed) {
      leftStack.style.setProperty("--stack-margin-top", overhangTopPx);
      leftStack.style.setProperty("--stack-margin-bottom", overhangBottomPx);
      leftStack.style.setProperty("--stack-margin-start", overhangXPx);
      leftStack.style.setProperty("--stack-margin-end", `-${leftOverlapX}`);
      rightStack.style.setProperty("--stack-margin-top", overhangTopPx);
      rightStack.style.setProperty("--stack-margin-bottom", overhangBottomPx);
      rightStack.style.setProperty("--stack-margin-start", overhangXPx);
      rightStack.style.setProperty("--stack-margin-end", `-${rightOverlapX}`);
    }
    leftBtn.style.setProperty("--page-face-width", `${leftFaceW}px`);
    rightBtn.style.setProperty("--page-face-width", `${rightFaceW}px`);
    bookEl.style.setProperty("--page-face-width", `${cssWidth}px`);
    bookEl.style.setProperty("--page-face-height", `${cssHeight}px`);
    bookEl.style.setProperty("--cover-overhang-top", overhangTopPx);
    bookEl.style.setProperty("--cover-overhang-bottom", overhangBottomPx);

    // Drop CSS preview before swapping in the new raster size so we don't
    // compound transform scale with the larger layout box.
    bookEl.style.transform = "";
    bookEl.classList.remove("is-preview-zoom");
    zoomShell.style.width = "";
    zoomShell.style.height = "";

    // Always pin face size so zoomed pages can't flex-shrink and overlap.
    sizeFace(leftFace, leftFaceW, leftFaceH);
    sizeFace(rightFace, rightFaceW, rightFaceH);
    randomizePaperPosition(leftStack, left);
    randomizePaperPosition(rightStack, right);

    await Promise.all([
      left !== null
        ? renderPage(left, leftCanvas, leftText, leftLinks, leftSearch, leftFaceW, leftFaceH, token)
        : clearPage(leftCanvas, leftText, leftLinks, leftSearch),
      right !== null
        ? renderPage(
            right,
            rightCanvas,
            rightText,
            rightLinks,
            rightSearch,
            rightFaceW,
            rightFaceH,
            token,
          )
        : clearPage(rightCanvas, rightText, rightLinks, rightSearch),
    ]);

    if (destroyed || token !== renderToken) return;

    renderedZoom = zoom;
    renderedLayout = {
      w: bookEl.offsetWidth,
      h: bookEl.offsetHeight,
    };
    applyZoomPreview();
    prefetchAdjacent(spread, cssWidth, cssHeight, epoch);
  }

  function executeNamedAction(action: string) {
    const { left, right } = pagesForSpread(spread, pageCount);
    switch (action) {
      case "FirstPage":
        void goToPage(1);
        return;
      case "LastPage":
        void goToPage(pageCount);
        return;
      case "NextPage":
        void goToPage(Math.max(left ?? 0, right ?? 0) + 1);
        return;
      case "PrevPage":
        void goToPage(Math.min(left ?? pageCount, right ?? pageCount) - 1);
    }
  }

  function bindPageLink(anchor: HTMLAnchorElement, link: PageLink) {
    const label = typeof link.label === "string" ? link.label : "";
    if (typeof link.url === "string" && link.url) {
      anchor.href = link.url;
      anchor.target = link.newWindow === false ? "_self" : "_blank";
      anchor.rel = "noopener noreferrer";
      if (label) anchor.title = label;
      return;
    }
    if (link.destPage != null) {
      const destPage = link.destPage;
      anchor.href = "#";
      if (label) anchor.title = label;
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        void goToPage(destPage);
      });
      return;
    }
    if (typeof link.action === "string" && link.action) {
      const action = link.action;
      anchor.href = "#";
      if (label) anchor.title = label;
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        executeNamedAction(action);
      });
    }
  }

  function fillLinkLayer(container: HTMLElement, links: PageLink[]) {
    container.replaceChildren();
    if (links.length === 0) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    const fragment = document.createDocumentFragment();
    for (const link of links) {
      if (!link.url && link.destPage == null && !link.action) continue;
      if (link.width < 1 || link.height < 1) continue;
      const anchor = document.createElement("a");
      anchor.style.left = `${link.left}px`;
      anchor.style.top = `${link.top}px`;
      anchor.style.width = `${link.width}px`;
      anchor.style.height = `${link.height}px`;
      bindPageLink(anchor, link);
      if (!anchor.href) continue;
      fragment.append(anchor);
    }
    if (!fragment.childNodes.length) {
      container.hidden = true;
      return;
    }
    container.append(fragment);
  }

  async function renderPage(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    textContainer: HTMLElement,
    linkContainer: HTMLElement,
    searchContainer: HTMLElement,
    cssWidth: number,
    cssHeight: number,
    token: number,
  ) {
    cancelTextLayer(textContainer);
    clearLinkLayer(linkContainer);
    clearSearchLayer(searchContainer);
    forgetPaintedSearch(searchContainer);

    const raster = await getRaster(pageNumber, cssWidth, cssHeight, token);
    if (!raster || destroyed || token !== renderToken) return;

    // Resize clears the bitmap; blit the cached raster in the same turn so
    // cache hits never show a white frame.
    canvas.width = raster.width;
    canvas.height = raster.height;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(raster, 0, 0);

    if (source.mountTextLayer) {
      textContainer.hidden = false;
      textContainer.replaceChildren();
      try {
        const handle = await source.mountTextLayer({
          container: textContainer,
          page: pageNumber,
          cssWidth,
          cssHeight,
        });
        if (destroyed || token !== renderToken) {
          handle?.cancel();
          textContainer.replaceChildren();
          textContainer.hidden = true;
          clearLinkLayer(linkContainer);
          clearSearchLayer(searchContainer);
          forgetPaintedSearch(searchContainer);
          return;
        }
        if (handle) textLayers.set(textContainer, handle);
      } catch {
        textContainer.replaceChildren();
        textContainer.hidden = true;
      }
    } else {
      clearTextLayer(textContainer);
    }

    if (source.getLinks) {
      const links = await source.getLinks(pageNumber, { cssWidth, cssHeight });
      if (destroyed || token !== renderToken) {
        clearLinkLayer(linkContainer);
        clearSearchLayer(searchContainer);
        forgetPaintedSearch(searchContainer);
        return;
      }
      fillLinkLayer(linkContainer, links);
    } else {
      clearLinkLayer(linkContainer);
    }

    if (destroyed || token !== renderToken) {
      clearSearchLayer(searchContainer);
      forgetPaintedSearch(searchContainer);
      return;
    }
    paintSearchLayer(searchContainer, pageNumber);
  }

  function clearPage(
    canvas: HTMLCanvasElement,
    textContainer: HTMLElement,
    linkContainer: HTMLElement,
    searchContainer: HTMLElement,
  ) {
    clearTextLayer(textContainer);
    clearLinkLayer(linkContainer);
    clearSearchLayer(searchContainer);
    forgetPaintedSearch(searchContainer);
    const context = canvas.getContext("2d");
    if (context) context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    canvas.style.width = "";
    canvas.style.height = "";
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    renderToken++;
    layoutEpoch++;
    window.clearTimeout(zoomTimer);
    zoomTimer = undefined;
    window.clearTimeout(searchTimer);
    searchTimer = undefined;
    window.clearTimeout(wheelFlipTimer);
    wheelFlipTimer = undefined;
    window.cancelAnimationFrame(fitFrame);
    fitFrame = 0;
    abort.abort();
    resizeObserver.disconnect();
    for (const handle of textLayers.values()) handle.cancel();
    textLayers.clear();
    rasterCache.clear();
    inflightRasters.clear();
    source.destroy?.();
  }

  return {
    destroy,
    goToPage,
    getPage: () => displayedPage(),
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function sizeFace(face: HTMLElement, width: number, height: number) {
  face.style.width = `${width}px`;
  face.style.height = `${height}px`;
}

/** New paper-texture offset whenever the face shows a different page. */
function randomizePaperPosition(stack: HTMLElement, page: number | null) {
  // Deterministically hash the page number to derive x and y offsets (0–100%)
  if (page == null) {
    stack.style.setProperty("--paper-position", "0% 0%");
    return;
  }
  // Simple hash to get predictable, page-dependent random coordinates
  // The constants are arbitrary primes for better mixing
  const hash = (n: number) => {
    let x = ((n * 2654435761) & 0xffffffff) >>> 0;
    let y = ((n * 1597334677) & 0xffffffff) >>> 0;
    // Bring into [0,100) range as a float
    return [Math.round(x % 10000), Math.round(y % 10000)];
  };
  const [x, y] = hash(page);
  stack.style.setProperty("--paper-position", `${x}% ${y}%`);
}

function mustQuery(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector(selector);
  if (!(el instanceof HTMLElement)) {
    throw new Error(`Missing element: ${selector}`);
  }
  return el;
}
