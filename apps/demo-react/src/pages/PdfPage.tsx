import { OkumaReader } from "@okuma-reader/react";
import { useDemoDocumentTitle } from "../useDemoDocumentTitle";

export function PdfPage() {
  useDemoDocumentTitle("NGE Genocide");

  return (
    <OkumaReader
      bookId="nge-genocide-vol1"
      title="Neon Genesis Evangelion: Genocide"
      subtitle="Volume 1"
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
