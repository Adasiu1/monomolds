type BrandLoaderProps = {
  label?: string;
  className?: string;
};

const logoPath =
  "M298 418 L164 335 C156 330 152 320 152 309 V198 C152 186 158 176 168 170 L286 98 C296 92 307 92 317 98 L438 170 C448 176 453 187 453 199 V304 C453 316 447 327 437 333 L353 383 C343 389 332 389 322 383 L213 318 C203 312 198 301 198 289 V220 C198 208 204 198 214 192 L298 143";

/** A monoline logo segment that loops like a ribbon being fed through a mould. */
export function BrandLoader({
  label = "Wczytujemy...",
  className = "",
}: BrandLoaderProps) {
  const classes = ["ui-brand-loader", className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="status" aria-live="polite">
      <svg
        className="ui-brand-loader-mark"
        viewBox="130 75 345 365"
        aria-hidden="true"
      >
        <path
          className="ui-brand-loader-track"
          d={logoPath}
          pathLength="100"
        />
        <path
          className="ui-brand-loader-snake"
          d={logoPath}
          pathLength="100"
        />
      </svg>
      <span className="ui-brand-loader-label">{label}</span>
    </div>
  );
}
