import type { OkumaDownloadConfig } from "../types";
import { Button } from "./Button";
import { Icon } from "./Icon";

type SmallScreenOverlayProps = {
  backHref?: string;
  accentColor: string;
  download?: OkumaDownloadConfig;
};

export function SmallScreenOverlay({ backHref, accentColor, download }: SmallScreenOverlayProps) {
  return (
    <div
      id="small-screen-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="small-screen-title"
    >
      <Icon name="devices" size="3rem" />
      <h2 id="small-screen-title">Screen too small</h2>
      <p>
        This reader needs more space for a two-page spread. Open it on a larger device, or download
        the PDF to read offline.
      </p>
      <div id="small-screen-actions">
        {download ? (
          <Button
            href={download.href}
            download={download.filename ?? true}
            color={accentColor}
            primary
          >
            <Icon name="download" />
            Download PDF
          </Button>
        ) : null}
        {backHref ? (
          <Button href={backHref} color={accentColor}>
            <Icon name="arrow_back" />
            Go back
          </Button>
        ) : null}
      </div>
    </div>
  );
}
