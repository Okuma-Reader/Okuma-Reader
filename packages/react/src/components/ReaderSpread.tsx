import { Icon } from "./Icon";
import { ReaderPage } from "./ReaderPage";
import { SearchBar } from "./SearchBar";

export function ReaderSpread() {
  return (
    <div id="spread-area">
      <button
        type="button"
        id="fullscreen-exit"
        className="icon-button"
        aria-label="Exit fullscreen"
        title="Exit fullscreen"
        aria-expanded={true}
        hidden
      >
        <Icon name="fullscreen_exit" />
      </button>
      <button
        type="button"
        className="icon-button"
        id="turn-prev"
        data-turn="prev"
        aria-label="Previous pages"
      >
        <Icon name="chevron_left" />
      </button>
      <div id="spread">
        <div id="spread-stage">
          <div id="book-zoom-shell">
            <div id="book" data-closed="true" data-cover="front" data-zoomed="false">
              <span id="book-hardcover" aria-hidden="true">
                <span className="book-hardcover-specular" />
              </span>
              <ReaderPage side="left" />
              <ReaderPage side="right" />
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="icon-button"
        id="turn-next"
        data-turn="next"
        aria-label="Next pages"
      >
        <Icon name="chevron_right" />
      </button>
      <SearchBar />
    </div>
  );
}
