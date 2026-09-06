import { OkumaReader } from "@okuma-reader/react";

export function PdfPage() {
  return (
    <OkumaReader
      bookId="nge-genocide-vol1"
      title="NGE Genocide"
      subtitle="Vol. 1 — PDF demo"
      innerCoverImageUrl="/fixtures/nge-genocide-vol1/inner-cover.png"
      accentColor="#694588"
      scrubberTrackColor="#DDCDE9"
      backHref="/"
      download={{
        href: "/fixtures/nge-genocide-vol1.pdf",
      }}
      source={{
        type: "pdf",
        url: "/fixtures/nge-genocide-vol1.pdf",
      }}
    />
  );
}
