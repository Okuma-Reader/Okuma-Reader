# Okuma-Reader

MIT-licensed monorepo for a two-page PDF/image book reader.

## Packages

| Package | Description |
|---------|-------------|
| [`@okuma-reader/core`](packages/core) | Reader controller + DOM contract |
| [`@okuma-reader/source-pdf`](packages/source-pdf) | pdf.js `BookSource` |
| [`@okuma-reader/source-images`](packages/source-images) | Image-set `BookSource` |
| [`@okuma-reader/astro`](packages/astro) | Astro UI shell + `mountOkumaReader` |

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

## Usage (Astro)

```astro
---
import OkumaReader from "@okuma-reader/astro/OkumaReader.astro";
---

<OkumaReader
  bookId="my-book"
  title="My Book"
  coverImageUrl="/cover.webp"
  darkColor="#3a2a1a"
  lightColor="#f3e7d3"
  backHref="/"
/>

<script>
  import { mountOkumaReader } from "@okuma-reader/astro/client";
  import { createPdfBookSource } from "@okuma-reader/source-pdf";
  import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

  const source = await createPdfBookSource({
    url: "/book.pdf",
    workerSrc: pdfWorker,
  });
  const root = document.getElementById("reader");
  if (root) void mountOkumaReader(root, { source, bookId: "my-book" });
</script>
```

Image books:

```ts
import { createImageBookSource } from "@okuma-reader/source-images";

const source = createImageBookSource({
  pages: [
    { src: "/pages/1.webp" },
    { src: "/pages/2.webp" },
  ],
});
```

## Architecture

`BookSource` supplies page rasters (and optionally text, links, chapters). Core owns spreads, zoom, search UI, scrubber, and progress in `localStorage` under `okuma-reader:progress:${bookId}`.

## Publish

1. Create the npm organization **`okuma-reader`** on npmjs.com  
2. Publish `@okuma-reader/core`, `source-pdf`, `source-images`, `astro`

## License

MIT
