# Okuma-Reader

MIT-licensed monorepo for a two-page PDF/image book reader.

## Packages

| Package                                                 | Description                                |
| ------------------------------------------------------- | ------------------------------------------ |
| [`@okuma-reader/core`](packages/core)                   | Reader controller + DOM contract           |
| [`@okuma-reader/source-pdf`](packages/source-pdf)       | pdf.js `BookSource`                        |
| [`@okuma-reader/source-images`](packages/source-images) | Image-set `BookSource`                     |
| [`@okuma-reader/shell`](packages/shell)                 | Shared UI types, mount helpers, chrome CSS |
| [`@okuma-reader/astro`](packages/astro)                 | Astro UI shell + auto-mount                |
| [`@okuma-reader/react`](packages/react)                 | React UI shell + auto-mount                |

## Apps

| App                                           | Description                          |
| --------------------------------------------- | ------------------------------------ |
| [`@okuma-reader/demo-astro`](apps/demo-astro) | Astro demo — smoke-test both sources |
| [`@okuma-reader/demo-react`](apps/demo-react) | React demo — same fixtures via Vite  |

## Develop

```bash
npm install
npm run dev        # Astro demo → http://localhost:4322/
npm run dev:react  # React demo → http://localhost:4323/
```

**Astro demo** (`npm run dev`)

- Home: http://localhost:4322/
- Images: http://localhost:4322/images (Le Petit Prince, 108 pages)
- PDF: http://localhost:4322/pdf (NGE Genocide Vol.1, 328 pages)

**React demo** (`npm run dev:react`)

- Home: http://localhost:4323/
- Images: http://localhost:4323/images
- PDF: http://localhost:4323/pdf

## Install

UI packages keep source packages as **optional peer dependencies**. Install only what you use:

| Use case            | Packages                                              |
| ------------------- | ----------------------------------------------------- |
| PDF books (Astro)   | `@okuma-reader/astro` + `@okuma-reader/source-pdf`    |
| Image books (Astro) | `@okuma-reader/astro` + `@okuma-reader/source-images` |
| PDF books (React)   | `@okuma-reader/react` + `@okuma-reader/source-pdf`    |
| Image books (React) | `@okuma-reader/react` + `@okuma-reader/source-images` |
| Both sources        | UI package + both source packages                     |
| Custom `BookSource` | UI package only (omit the `source` prop)              |

```bash
# PDF-only (Astro)
npm i @okuma-reader/astro @okuma-reader/source-pdf

# Images-only (React)
npm i @okuma-reader/react @okuma-reader/source-images
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
  download={{ href: "/book.pdf" }}
  source={{ type: "pdf", url: "/book.pdf" }}
/>
```

Optional chrome defaults live in `OKUMA_READER_DEFAULTS` (`accentColor: "black"`, `scrubberTrackColor: "#d4d4d4"`, `ownPage: true`).

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

## Usage (React)

```tsx
import { OkumaReader } from "@okuma-reader/react";

export function BookPage() {
  return (
    <OkumaReader
      bookId="my-book"
      title="My Book"
      innerCoverImageUrl="/inner-cover.webp"
      accentColor="#3a2a1a"
      scrubberTrackColor="#f3e7d3"
      backHref="/"
      download={{ href: "/book.pdf" }}
      source={{ type: "pdf", url: "/book.pdf" }}
    />
  );
}
```

Custom `BookSource` (omit `source` and call `mountOkumaReader` yourself after rendering the shell, or use `OkumaReader` without `source` plus a manual mount):

```tsx
import { mountOkumaReader } from "@okuma-reader/react";

const root = document.getElementById("reader");
if (root) void mountOkumaReader(root, { source, bookId: "my-book" });
```

## Architecture

`BookSource` supplies page rasters (and optionally text, links, chapters). Core owns spreads, zoom, search UI, scrubber, and progress in `localStorage` under `okuma-reader:progress:${bookId}`.

`@okuma-reader/shell` holds the shared UI contract: prop/source types, `mountOkumaReader` helpers, and chrome CSS. The Astro and React packages are framework-specific markup + lifecycle adapters over that shell.

## Publish

Scoped packages default to private on npm — these packages set `"publishConfig": { "access": "public" }`.

```bash
npm login   # must be a member of the okuma-reader org
npm run check
npm publish -w @okuma-reader/core
npm publish -w @okuma-reader/source-pdf
npm publish -w @okuma-reader/source-images
npm publish -w @okuma-reader/shell
npm publish -w @okuma-reader/astro
npm publish -w @okuma-reader/react
```

Publish order matters: `core` first, then sources + `shell`, then `astro` / `react`.

## License

MIT
