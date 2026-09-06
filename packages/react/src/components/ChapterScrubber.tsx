export function ChapterScrubber() {
  return (
    <div id="page-scrubber" data-page-scrubber>
      <div
        className="chapter-scrubber"
        data-scrubber-slider
        role="slider"
        tabIndex={0}
        aria-label="Jump to page"
        aria-valuemin={1}
        aria-valuenow={1}
        aria-valuemax={1}
      >
        <div className="chapter-scrubber-track" data-scrubber-track />
        <span className="chapter-scrubber-thumb" aria-hidden="true" />
        <div className="chapter-scrubber-tooltip" data-scrubber-tooltip hidden>
          <span data-scrubber-tooltip-title />
          <span data-scrubber-tooltip-page />
        </div>
      </div>
    </div>
  );
}
