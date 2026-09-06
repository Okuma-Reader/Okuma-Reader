import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { BookReaderHandle } from "@okuma-reader/core";
import {
  buildOkumaShellCssVars,
  mountOkumaReaderFromConfig,
  OKUMA_READER_DEFAULTS,
  type OkumaReaderProps,
} from "@okuma-reader/shell";
import { ChapterScrubber } from "./components/ChapterScrubber";
import { ReaderToolbar } from "./components/ReaderToolbar";
import { ReaderSpread } from "./components/ReaderSpread";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { SmallScreenOverlay } from "./components/SmallScreenOverlay";
import "@okuma-reader/shell/styles.css";

export type { OkumaReaderProps };

export function OkumaReader({
  bookId,
  title,
  subtitle,
  innerCoverImageUrl,
  accentColor = OKUMA_READER_DEFAULTS.accentColor,
  scrubberTrackColor = OKUMA_READER_DEFAULTS.scrubberTrackColor,
  backHref,
  download,
  ownPage = OKUMA_READER_DEFAULTS.ownPage,
  source,
}: OkumaReaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<BookReaderHandle | null>(null);

  const style = useMemo(
    (): CSSProperties =>
      buildOkumaShellCssVars({
        innerCoverImageUrl,
        accentColor,
        scrubberTrackColor,
      }) as CSSProperties,
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
