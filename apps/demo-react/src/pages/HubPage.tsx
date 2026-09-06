import { Link } from "react-router-dom";

export function HubPage() {
  return (
    <main className="hub">
      <h1>Okuma-Reader React demo</h1>
      <p className="lede">Pick a demo source to open in the reader.</p>
      <ul>
        <li>
          <Link to="/images">
            <strong>Images</strong>
            <span>Le Petit Prince — 108 images</span>
          </Link>
        </li>
        <li>
          <Link to="/pdf">
            <strong>PDF</strong>
            <span>NGE Genocide Vol. 1 — 328 pages PDF</span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
