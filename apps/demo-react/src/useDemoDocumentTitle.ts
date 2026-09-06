import { useEffect } from "react";

const DEMO_TITLE = "Okuma-Reader React demo";

/** Hub: `Okuma-Reader React demo`. Book: `{book} — Okuma-Reader React demo`. */
export function useDemoDocumentTitle(bookTitle?: string) {
  useEffect(() => {
    document.title = bookTitle ? `${bookTitle} — ${DEMO_TITLE}` : DEMO_TITLE;
  }, [bookTitle]);
}
