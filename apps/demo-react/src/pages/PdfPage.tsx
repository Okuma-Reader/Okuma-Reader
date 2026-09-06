import { OkumaReader } from "@okuma-reader/react";
import { useDemoDocumentTitle } from "../useDemoDocumentTitle";
import { publicUrl } from "../publicUrl";

const pdfUrl = publicUrl("nge-genocide-vol1/nge-genocide-vol1.pdf");

export function PdfPage() {
  useDemoDocumentTitle("NGE Genocide");

  return (
    <OkumaReader
      bookId="nge-genocide-vol1"
      title="Neon Genesis Evangelion: Genocide"
      subtitle="Volume 1"
      innerCoverImageUrl={publicUrl("nge-genocide-vol1/inner-cover.png")}
      accentColor="#694588"
      scrubberTrackColor="#DDCDE9"
      backHref={publicUrl("")}
      download={{
        href: pdfUrl,
      }}
      source={{
        type: "pdf",
        url: pdfUrl,
      }}
    />
  );
}
