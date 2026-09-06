import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import paper2 from "@okuma-reader/core/assets/paper2.webp";
import paperBook from "@okuma-reader/core/assets/paper-book-v2.webp";
import specularSingle from "@okuma-reader/core/assets/specularSinglePage.webp";
import specularDouble from "@okuma-reader/core/assets/specularDoublePage.webp";
import sideBook from "@okuma-reader/core/assets/side-book.webp";
import pastedown from "@okuma-reader/core/assets/pastedown.webp";
import bookFold from "@okuma-reader/core/assets/bookFold.webp";
import type { BookReaderHandle } from "@okuma-reader/core";
import { mountOkumaReaderFromConfig } from "./mount";
import type { OkumaReaderProps } from "./types";
import { ChapterScrubber } from "./components/ChapterScrubber";
import { ReaderToolbar } from "./components/ReaderToolbar";
import { ReaderSpread } from "./components/ReaderSpread";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { SmallScreenOverlay } from "./components/SmallScreenOverlay";
import "./styles/shell.css";

export type { OkumaReaderProps };

type Asset = string | { src: string };

function cssUrl(asset: Asset): string {
  const src = typeof asset === "string" ? asset : asset.src;
  return `url(${JSON.stringify(src)})`;
}

export function OkumaReader({
  bookId,
  title,
  subtitle,
  innerCoverImageUrl,
  accentColor = "black",
  scrubberTrackColor = "#d4d4d4",
  backHref,
  download,
  ownPage = true,
  source,
}: OkumaReaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<BookReaderHandle | null>(null);

  const style = useMemo(
    (): CSSProperties => ({
      ["--scrubber-track-color" as string]: scrubberTrackColor,
      ["--accent-color" as string]: accentColor,
      ["--inner-cover-image" as string]: `url(${JSON.stringify(innerCoverImageUrl)})`,
      ["--okuma-paper2" as string]: cssUrl(paper2),
      ["--okuma-paper-book" as string]: cssUrl(paperBook),
      ["--okuma-specular-single" as string]: cssUrl(specularSingle),
      ["--okuma-specular-double" as string]: cssUrl(specularDouble),
      ["--okuma-side-book" as string]: cssUrl(sideBook),
      ["--okuma-pastedown" as string]: cssUrl(pastedown),
      ["--okuma-book-fold" as string]: cssUrl(bookFold),
    }),
    [accentColor, innerCoverImageUrl, scrubberTrackColor],
  );

  const sourceKey = source ? JSON.stringify(source) : "";

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !sourceKey) return;

    const parsed = JSON.parse(sourceKey) as NonNullable<OkumaReaderProps["source"]>;
    let cancelled = false;
    void mountOkumaReaderFromConfig(root, { source: parsed, bookId }).then((handle) => {
      if (cancelled) {
        handle.destroy();
        return;
      }
      handleRef.current = handle;
    });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [bookId, sourceKey]);

  return (
    <div
      id="reader"
      ref={rootRef}
      className={ownPage ? "okuma-own-page" : undefined}
      data-book-id={bookId}
      style={style}
    >
      <ReaderToolbar title={title} subtitle={subtitle} backHref={backHref} download={download} />
      <ChapterScrubber />
      <ReaderSpread />
      <ShortcutsDialog />
      <SmallScreenOverlay backHref={backHref} accentColor={accentColor} download={download} />
    </div>
  );
}
