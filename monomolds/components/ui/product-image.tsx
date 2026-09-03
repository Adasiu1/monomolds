"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductImage({ src, alt }: { src?: string; alt: string }) {
  // Show a placeholder if a photo fails. A different photo can still be tried later.
  const [failedSrc, setFailedSrc] = useState<string>();
  return src && failedSrc !== src ? <Image src={src} alt={alt} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="ui-product-image" onError={() => setFailedSrc(src)} /> :
    <span className="ui-image-placeholder"><svg aria-hidden="true" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="8" width="36" height="32" rx="4"/><circle cx="17" cy="18" r="3"/><path d="m7 34 12-10 8 6 7-6 7 9"/></svg><span>{src ? "Zdjęcie niedostępne" : "Zdjęcie w przygotowaniu"}</span></span>;
}
