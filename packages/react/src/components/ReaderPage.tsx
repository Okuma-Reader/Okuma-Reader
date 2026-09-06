type ReaderPageProps = {
  side: "left" | "right";
};

export function ReaderPage({ side }: ReaderPageProps) {
  const face = (
    <span className="page-face">
      <canvas />
      <div className="textLayer" hidden />
      <div className="annotationLayer" hidden />
      <div className="searchLayer" hidden />
    </span>
  );

  return (
    <div className="page" data-page={side} data-empty="true">
      <span className="page-stack">
        <span className="page-shell">
          {side === "left" ? (
            <>
              <span className="page-edge" aria-hidden="true" />
              {face}
            </>
          ) : (
            <>
              {face}
              <span className="page-edge" aria-hidden="true" />
            </>
          )}
        </span>
        <span className="page-paper" aria-hidden="true" />
        <span className="page-tint" aria-hidden="true" />
        <span className="page-pastedown" aria-hidden="true" />
        <span className="page-fold" aria-hidden="true" />
        <span className="page-specular" aria-hidden="true" />
      </span>
    </div>
  );
}
