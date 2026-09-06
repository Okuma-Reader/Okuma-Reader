import type { Chapter } from "./types";

export type ChapterScrubber = {
  setPage: (page: number) => void;
  destroy: () => void;
};

type Segment = {
  title: string;
  start: number;
  end: number;
  el: HTMLElement;
};

const SNAP_PX = 14;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function maxSpread(pageCount: number): number {
  return Math.floor(pageCount / 2);
}

function spreadForPage(page: number): number {
  return Math.floor(page / 2);
}

function pagesForSpread(
  spread: number,
  pageCount: number,
): { left: number | null; right: number | null } {
  const left = 2 * spread;
  const right = 2 * spread + 1;
  return {
    left: left >= 1 && left <= pageCount ? left : null,
    right: right <= pageCount ? right : null,
  };
}

function pageForSpread(spread: number, pageCount: number): number {
  const { left, right } = pagesForSpread(spread, pageCount);
  return left ?? right ?? 1;
}

function spreadPageLabel(spread: number, pageCount: number): string {
  const { left, right } = pagesForSpread(spread, pageCount);
  if (left && right) return `Pages ${left}–${right}`;
  if (left) return `Page ${left}`;
  if (right) return `Page ${right}`;
  return "";
}

function chapterStartingOnSpread(chapters: Chapter[], spread: number): Chapter | undefined {
  let match: Chapter | undefined;
  for (const chapter of chapters) {
    if (spreadForPage(chapter.page) === spread) match = chapter;
  }
  return match;
}

function buildSegments(track: HTMLElement, lastSpread: number, chapters: Chapter[]): Segment[] {
  track.replaceChildren();
  const chapterSpreads = [...new Set(chapters.map((c) => spreadForPage(c.page)))].sort(
    (a, b) => a - b,
  );
  const starts =
    chapterSpreads.length === 0
      ? [0]
      : chapterSpreads[0] === 0
        ? chapterSpreads
        : [0, ...chapterSpreads];
  const segments: Segment[] = [];

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]!;
    const end = (starts[i + 1] ?? lastSpread + 1) - 1;
    const chapter = chapterStartingOnSpread(chapters, start);
    const title = chapter?.title ?? (start === 0 ? "Front matter" : "");
    const el = document.createElement("span");
    el.className = "chapter-scrubber-segment";
    el.style.flexGrow = String(Math.max(1, end - start + 1));
    el.dataset.start = String(start);
    if (title) el.setAttribute("aria-label", title);
    track.append(el);
    segments.push({
      title,
      start,
      end,
      el,
    });
  }
  return segments;
}

export function initChapterScrubber(
  root: HTMLElement,
  opts: {
    pageCount: number;
    chapters: Chapter[];
    getPage: () => number;
    onSeek: (page: number) => void;
  },
): ChapterScrubber {
  const { pageCount, chapters, getPage, onSeek } = opts;
  const sliderEl = root.querySelector("[data-scrubber-slider]");
  const trackEl = root.querySelector("[data-scrubber-track]");
  const tooltipEl = root.querySelector("[data-scrubber-tooltip]");
  const tooltipTitleEl = root.querySelector("[data-scrubber-tooltip-title]");
  const tooltipPageEl = root.querySelector("[data-scrubber-tooltip-page]");
  if (
    !(sliderEl instanceof HTMLElement) ||
    !(trackEl instanceof HTMLElement) ||
    !(tooltipEl instanceof HTMLElement) ||
    !(tooltipTitleEl instanceof HTMLElement) ||
    !(tooltipPageEl instanceof HTMLElement)
  ) {
    throw new Error("Chapter scrubber markup is incomplete");
  }
  const slider = sliderEl;
  const track = trackEl;
  const tooltip = tooltipEl;
  const tooltipTitle = tooltipTitleEl;
  const tooltipPage = tooltipPageEl;

  const lastSpread = maxSpread(pageCount);
  const segments = buildSegments(track, lastSpread, chapters);
  const chapterSpreads = [...new Set(chapters.map((c) => spreadForPage(c.page)))];
  let dragging = false;
  let hoverSpread: number | null = null;
  const abort = new AbortController();
  const { signal } = abort;

  slider.setAttribute("aria-valuemin", "0");
  slider.setAttribute("aria-valuemax", String(lastSpread));

  function segmentPlayed(segment: Segment, spread: number): number {
    const span = segment.end - segment.start + 1;
    if (spread < segment.start) return 0;
    if (spread > segment.end || (spread === segment.end && segment.end === lastSpread)) {
      return 1;
    }
    return (spread - segment.start) / span;
  }

  function xForSpread(spread: number): number {
    const segment =
      segments.find((item) => spread >= item.start && spread <= item.end) ??
      segments[segments.length - 1];
    if (!segment) return 0;
    const played = segmentPlayed(segment, spread);
    const rect = segment.el.getBoundingClientRect();
    return rect.left + played * rect.width;
  }

  function progressForSpread(spread: number): number {
    if (lastSpread <= 0) return 1;
    const sliderRect = slider.getBoundingClientRect();
    if (sliderRect.width <= 0) return spread / lastSpread;
    return clamp((xForSpread(spread) - sliderRect.left) / sliderRect.width, 0, 1);
  }

  function spreadFromClientX(clientX: number, snap: boolean): number {
    if (lastSpread <= 0) return 0;

    let raw = lastSpread;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!;
      const rect = segment.el.getBoundingClientRect();
      const next = segments[i + 1];
      const nextLeft = next?.el.getBoundingClientRect().left ?? rect.right;
      if (clientX < rect.left && i === 0) {
        raw = segment.start;
        break;
      }
      if (clientX <= rect.right) {
        const span = segment.end - segment.start + 1;
        const t = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
        raw = segment.start + Math.min(span - 1, Math.floor(t * span));
        break;
      }
      if (next && clientX < nextLeft) {
        raw = clientX < (rect.right + nextLeft) / 2 ? segment.end : next.start;
        break;
      }
    }
    raw = clamp(raw, 0, lastSpread);
    if (!snap || chapterSpreads.length === 0) return raw;

    let nearest = chapterSpreads[0]!;
    let nearestDist = Math.abs(xForSpread(nearest) - clientX);
    for (const start of chapterSpreads) {
      const dist = Math.abs(xForSpread(start) - clientX);
      if (dist < nearestDist) {
        nearest = start;
        nearestDist = dist;
      }
    }
    return nearestDist <= SNAP_PX ? nearest : raw;
  }

  function paint(spread: number, preview = false) {
    slider.style.setProperty("--scrubber-progress", String(progressForSpread(spread)));
    slider.setAttribute("aria-valuenow", String(spread));
    const title = titleAtSpread(spread);
    const pages = spreadPageLabel(spread, pageCount);
    const label = title ? `${title}, ${pages}` : pages;
    slider.setAttribute("aria-valuetext", label);

    for (const segment of segments) {
      segment.el.style.setProperty("--played", String(segmentPlayed(segment, spread)));
      const activeSpread = preview && hoverSpread !== null ? hoverSpread : spread;
      segment.el.classList.toggle(
        "is-active",
        activeSpread >= segment.start && activeSpread <= segment.end,
      );
    }
  }

  function titleAtSpread(spread: number): string {
    const segment =
      segments.find((item) => spread >= item.start && spread <= item.end) ?? segments[0];
    return segment?.title ?? "";
  }

  function showTooltip(clientX: number, spread: number) {
    const title = titleAtSpread(spread);
    tooltipTitle.textContent = title;
    tooltipTitle.hidden = !title;
    tooltipPage.textContent = spreadPageLabel(spread, pageCount);
    tooltip.hidden = false;
    const sliderRect = slider.getBoundingClientRect();
    const pad = 8;
    const half = tooltip.offsetWidth / 2;
    const minCenter = pad + half;
    const maxCenter = window.innerWidth - pad - half;
    const center =
      minCenter >= maxCenter ? window.innerWidth / 2 : clamp(clientX, minCenter, maxCenter);
    tooltip.style.setProperty("--tooltip-x", `${center - sliderRect.left}px`);
  }

  function hideTooltip() {
    if (dragging) return;
    tooltip.hidden = true;
    hoverSpread = null;
    paint(spreadForPage(getPage()));
  }

  function seekFromPointer(event: PointerEvent, snap: boolean) {
    const spread = spreadFromClientX(event.clientX, snap);
    hoverSpread = spread;
    paint(spread, true);
    showTooltip(event.clientX, spread);
    onSeek(pageForSpread(spread, pageCount));
  }

  slider.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      dragging = true;
      slider.classList.add("is-dragging");
      slider.setPointerCapture(event.pointerId);
      seekFromPointer(event, true);
    },
    { signal },
  );

  slider.addEventListener(
    "pointermove",
    (event) => {
      if (dragging) {
        seekFromPointer(event, true);
        return;
      }
      const spread = spreadFromClientX(event.clientX, false);
      hoverSpread = spread;
      paint(spreadForPage(getPage()), true);
      showTooltip(event.clientX, spread);
    },
    { signal },
  );

  slider.addEventListener(
    "pointerup",
    (event) => {
      if (!dragging) return;
      dragging = false;
      slider.classList.remove("is-dragging");
      if (slider.hasPointerCapture(event.pointerId)) {
        slider.releasePointerCapture(event.pointerId);
      }
      const spread = spreadFromClientX(event.clientX, true);
      onSeek(pageForSpread(spread, pageCount));
      paint(spread);
      if (!slider.matches(":hover")) hideTooltip();
    },
    { signal },
  );

  slider.addEventListener(
    "pointercancel",
    () => {
      dragging = false;
      slider.classList.remove("is-dragging");
      hideTooltip();
      paint(spreadForPage(getPage()));
    },
    { signal },
  );

  slider.addEventListener(
    "pointerleave",
    () => {
      if (!dragging) hideTooltip();
    },
    { signal },
  );

  paint(spreadForPage(getPage()));
  const resizeObserver = new ResizeObserver(() => {
    if (!dragging) paint(spreadForPage(getPage()));
  });
  resizeObserver.observe(slider);

  return {
    setPage(page: number) {
      if (dragging) return;
      paint(spreadForPage(page));
    },
    destroy() {
      abort.abort();
      resizeObserver.disconnect();
    },
  };
}
