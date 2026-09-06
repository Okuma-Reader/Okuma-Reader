import { Icon } from "./Icon";

export function SearchBar() {
  return (
    <form id="reader-search" hidden autoComplete="off">
      <div>
        <div>
          <div>
            <input
              type="search"
              data-search-input
              placeholder="Find in book"
              aria-label="Find in book"
              spellCheck={false}
            />
            <div>
              <button
                className="icon-button"
                type="button"
                data-search-prev
                aria-label="Previous match"
              >
                <Icon name="keyboard_arrow_up" />
              </button>
              <button
                className="icon-button"
                type="button"
                data-search-next
                aria-label="Next match"
              >
                <Icon name="keyboard_arrow_down" />
              </button>
            </div>
            <span data-search-count aria-live="polite">
              0 of 0 matches
            </span>
          </div>
          <div>
            <label>
              <input type="checkbox" data-search-match-case />
              Match Case
            </label>
            <label>
              <input type="checkbox" data-search-match-diacritics />
              Match Diacritics
            </label>
            <label>
              <input type="checkbox" data-search-whole-words />
              Whole Words
            </label>
          </div>
        </div>
        <button className="icon-button" type="button" data-search-close aria-label="Close search">
          <Icon name="close" />
        </button>
      </div>
    </form>
  );
}
