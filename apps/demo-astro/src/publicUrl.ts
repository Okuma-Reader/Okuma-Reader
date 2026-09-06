/** Join a public-asset path with the demo base (`/` locally, `/Okuma-Reader/astro/` on Pages). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\//, "")}`;
}
