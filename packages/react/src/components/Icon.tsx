import { okumaIconSvg } from "@okuma-reader/core/icons";

type IconProps = {
  name: string;
  className?: string;
  size?: number | string;
};

export function Icon({ name, className, size = "28px" }: IconProps) {
  const html = okumaIconSvg(name, {
    size,
    className: ["okuma-icon", className].filter(Boolean).join(" "),
  });
  return <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
}
