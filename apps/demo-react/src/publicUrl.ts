/** Join a public-asset path with the demo base (`/` locally, `/Okuma-Reader/react/` on Pages). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\//, "")}`;
}

/** React Router basename (no trailing slash). Empty when serving from `/`. */
export function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base === "" || base === "/" ? undefined : base;
}
