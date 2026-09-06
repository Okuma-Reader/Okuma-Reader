import paper2 from "@okuma-reader/core/assets/paper2.webp";
import paperBook from "@okuma-reader/core/assets/paper-book-v2.webp";
import specularSingle from "@okuma-reader/core/assets/specularSinglePage.webp";
import specularDouble from "@okuma-reader/core/assets/specularDoublePage.webp";
import sideBook from "@okuma-reader/core/assets/side-book.webp";
import pastedown from "@okuma-reader/core/assets/pastedown.webp";
import bookFold from "@okuma-reader/core/assets/bookFold.webp";
import { OKUMA_READER_DEFAULTS } from "./types";

type Asset = string | { src: string };

function cssUrl(asset: Asset): string {
  const src = typeof asset === "string" ? asset : asset.src;
  return `url(${JSON.stringify(src)})`;
}

export type OkumaShellCssVarInputs = {
  innerCoverImageUrl: string;
  accentColor?: string;
  scrubberTrackColor?: string;
};

/** CSS custom properties for the `#reader` root (object form for React `style`). */
export function buildOkumaShellCssVars(input: OkumaShellCssVarInputs): Record<string, string> {
  return {
    "--scrubber-track-color": input.scrubberTrackColor ?? OKUMA_READER_DEFAULTS.scrubberTrackColor,
    "--accent-color": input.accentColor ?? OKUMA_READER_DEFAULTS.accentColor,
    "--inner-cover-image": `url(${JSON.stringify(input.innerCoverImageUrl)})`,
    "--okuma-paper2": cssUrl(paper2),
    "--okuma-paper-book": cssUrl(paperBook),
    "--okuma-specular-single": cssUrl(specularSingle),
    "--okuma-specular-double": cssUrl(specularDouble),
    "--okuma-side-book": cssUrl(sideBook),
    "--okuma-pastedown": cssUrl(pastedown),
    "--okuma-book-fold": cssUrl(bookFold),
  };
}

/** Same vars as a `style=""` attribute string (for Astro / HTML). */
export function okumaShellCssVarsStyle(input: OkumaShellCssVarInputs): string {
  return Object.entries(buildOkumaShellCssVars(input))
    .map(([name, value]) => `${name}: ${value}`)
    .join("; ");
}
