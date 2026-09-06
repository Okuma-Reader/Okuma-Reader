# Okuma-Reader

MIT-licensed monorepo for a two-page PDF/image book reader.

## Packages

| Package | Description |
|---------|-------------|
| [`@okuma-reader/core`](packages/core) | Reader controller + DOM contract |
| [`@okuma-reader/source-pdf`](packages/source-pdf) | pdf.js `BookSource` |
| [`@okuma-reader/source-images`](packages/source-images) | Image-set `BookSource` |
| [`@okuma-reader/astro`](packages/astro) | Astro UI shell + auto-mount |

## Apps

| App | Description |
|-----|-------------|
| [`@okuma-reader/demo`](apps/demo) | Smoke-test both sources |

## Develop

```bash
npm install
npm run dev
```

- Images: http://localhost:4322/ (Le Petit Prince, 108 pages)
- PDF: http://localhost:4322/pdf (NGE Genocide Vol.1, 328 pages)

## Install

`@okuma-reader/astro` keeps source packages as **optional peer dependencies**. Install only what you use:

| Use case | Packages |
|----------|----------|
| PDF books | `@okuma-reader/astro` + `@okuma-reader/source-pdf` |
| Image books | `@okuma-reader/astro` + `@okuma-reader/source-images` |
| Both | all three |
| Custom `BookSource` | `@okuma-reader/astro` only (omit the `source` prop) |

```bash
# PDF-only
npm i @okuma-reader/astro @okuma-reader/source-pdf

# Images-only
npm i @okuma-reader/astro @okuma-reader/source-images
```

## Usage (Astro)

```astro
---
import { OkumaReader } from "@okuma-reader/astro";
---

<OkumaReader
  bookId="my-book"
  title="My Book"
  innerCoverImageUrl="/inner-cover.webp"
  accentColor="#3a2a1a"
  scrubberTrackColor="#f3e7d3"
  backHref="/"
  download={{ href: "/book.pdf", filename: "my-book.pdf" }}
  source={{ type: "pdf", url: "/book.pdf" }}
/>
```

`accentColor` defaults to `"black"`; `scrubberTrackColor` defaults to `"#d4d4d4"`. Both are optional.

The component is also available as a direct subpath if you prefer:

```ts
import OkumaReader from "@okuma-reader/astro/OkumaReader.astro";
```

Image books:

```astro
<OkumaReader
  bookId="my-book"
  title="My Book"
  innerCoverImageUrl="/inner-cover.webp"
  accentColor="#3a2a1a"
  scrubberTrackColor="#f3e7d3"
  backHref="/"
  source={{
    type: "images",
    pages: [
      { src: "/pages/1.webp" },
      { src: "/pages/2.webp" },
    ],
  }}
/>
```

For a custom `BookSource`, omit `source` and mount yourself:

```html
<script>
  import { mountOkumaReader } from "@okuma-reader/astro/client";
  // create your BookSource, then:
  const root = document.getElementById("reader");
  if (root) void mountOkumaReader(root, { source, bookId: "my-book" });
</script>
```

## Architecture

`BookSource` supplies page rasters (and optionally text, links, chapters). Core owns spreads, zoom, search UI, scrubber, and progress in `localStorage` under `okuma-reader:progress:${bookId}`.

## Publish

1. Create the npm organization **`okuma-reader`** on npmjs.com  
2. Publish `@okuma-reader/core`, `source-pdf`, `source-images`, `astro`

## License

MIT
