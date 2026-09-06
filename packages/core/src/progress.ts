/** localStorage key for reading progress (`okuma-reader:progress:${bookId}`). */
export function okumaProgressStorageKey(bookId: string): string {
  return `okuma-reader:progress:${bookId}`;
}

/** Saved 1-based page from localStorage, or `null` if missing/unreadable. */
export function readOkumaProgress(bookId: string): number | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(okumaProgressStorageKey(bookId));
    if (raw === null) return null;
    const page = Number(raw);
    return Number.isFinite(page) ? page : null;
  } catch {
    return null;
  }
}

/** Persist 1-based page for resume. Best-effort (private mode / quota). */
export function writeOkumaProgress(bookId: string, page: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(okumaProgressStorageKey(bookId), String(page));
  } catch {
    // Private mode / quota — resume is best-effort.
  }
}
