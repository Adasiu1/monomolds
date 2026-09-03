import Image from "next/image";

export function BrandLogo({ footer = false }: { footer?: boolean }) {
  const width = footer ? 160 : 120;
  const height = width / 2;

  return (
    <Image
      src="/brand/mono-molds-logo-white.png"
      alt="Mono Molds"
      width={width}
      height={height}
      unoptimized
      style={{
        display: "block",
        width,
        height,
        maxWidth: "100%",
        flexShrink: 0,
        objectFit: "contain",
      }}
    />
  );
}
