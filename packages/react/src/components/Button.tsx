import type { ReactNode } from "react";

type ButtonProps = {
  href: string;
  color: string;
  primary?: boolean;
  disabled?: boolean;
  download?: string | boolean;
  children?: ReactNode;
};

export function Button({
  href,
  color,
  primary = false,
  disabled = false,
  download,
  children,
}: ButtonProps) {
  const downloadAttr = download === true ? "" : typeof download === "string" ? download : undefined;

  return (
    <a
      href={disabled ? undefined : href}
      download={downloadAttr}
      className={primary ? "okuma-btn-primary" : "okuma-btn-secondary"}
      style={{ ["--color" as string]: color }}
      aria-disabled={disabled}
    >
      {children}
    </a>
  );
}
