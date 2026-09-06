import icons from "./material.json";

export type OkumaIconName =
  | "arrow-back"
  | "zoom-out"
  | "zoom-in"
  | "download"
  | "chevron-left"
  | "chevron-right"
  | "fullscreen"
  | "fullscreen-exit"
  | "devices"
  | "close"
  | "keyboard-command-key"
  | "keyboard-arrow-up"
  | "keyboard-arrow-down"
  | "search";

const aliases: Record<string, OkumaIconName> = {
  arrow_back: "arrow-back",
  zoom_out: "zoom-out",
  zoom_in: "zoom-in",
  chevron_left: "chevron-left",
  chevron_right: "chevron-right",
  fullscreen_exit: "fullscreen-exit",
  keyboard_arrow_up: "keyboard-arrow-up",
  keyboard_arrow_down: "keyboard-arrow-down",
};

type IconDef = { body: string; width?: number; height?: number };

function resolveName(name: string): OkumaIconName {
  const normalized = (aliases[name] ?? name) as OkumaIconName;
  if (!(normalized in icons)) {
    throw new Error(`Unknown okuma icon: ${name}`);
  }
  return normalized;
}

/** Inline SVG markup for toolbar / chrome icons (Material Symbols). */
export function okumaIconSvg(
  name: string,
  options: { size?: string | number; className?: string } = {},
): string {
  const key = resolveName(name);
  const icon = (icons as Record<string, IconDef>)[key]!;
  const size = options.size ?? "1.25em";
  const sizeAttr = typeof size === "number" ? `${size}px` : size;
  const cls = options.className ? ` class="${options.className}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizeAttr}" height="${sizeAttr}" viewBox="0 0 24 24"${cls} aria-hidden="true">${icon.body}</svg>`;
}

export const OKUMA_ICON_NAMES = Object.keys(icons) as OkumaIconName[];
