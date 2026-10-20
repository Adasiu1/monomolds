"use client";

import type { ModelViewerElement } from "@google/model-viewer";
import { useEffect, useRef, useState } from "react";

import { ProductImage } from "@/components/ui/product-image";
import type { CatalogueMedia } from "@/lib/catalogue/types";

type ModelStatus = "loading" | "ready" | "error";

export function ProductGallery({ media, productName }: { media: CatalogueMedia[]; productName: string }) {
  const [selectedId, setSelectedId] = useState(media[0]?.id ?? "");
  const selected = media.find((item) => item.id === selectedId) ?? media[0];
  const images = media.filter((item) => item.kind === "image");
  const thumbnails = [
    ...images,
    ...Array<null>(Math.max(0, 3 - images.length)).fill(null),
    ...media.filter((item) => item.kind === "model"),
  ];

  return (
    <div className="product-gallery">
      <div className="product-gallery-stage" aria-live="polite">
        {!selected ? (
          <ProductImage alt={productName} sizes="(max-width: 1023px) 100vw, 58vw" />
        ) : selected.kind === "image" ? (
          <ProductImage src={selected.url} alt={selected.alt} sizes="(max-width: 1023px) 100vw, 58vw" />
        ) : (
          <ProductModel media={selected} />
        )}
      </div>

      <div className="product-gallery-thumbnails" aria-label="Galeria produktu">
        {thumbnails.map((item, index) => item ? (
            <button
              key={item.id}
              type="button"
              className="product-gallery-thumbnail"
              aria-label={item.kind === "model" ? "Pokaż model 3D" : `Pokaż zdjęcie ${index + 1}`}
              aria-pressed={item.id === selected?.id}
              onClick={() => setSelectedId(item.id)}
            >
              {item.kind === "image" ? (
                <ProductImage src={item.url} alt="" sizes="88px" />
              ) : (
                <span className="product-gallery-model-label" aria-hidden="true">3D</span>
              )}
            </button>
          ) : (
            <span key={`photo-placeholder-${index}`} className="product-gallery-thumbnail product-gallery-thumbnail--placeholder" role="img" aria-label={`Zdjęcie ${index + 1} w przygotowaniu`}>
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="8" width="36" height="32" rx="4"/><circle cx="17" cy="18" r="3"/><path d="m7 34 12-10 8 6 7-6 7 9"/></svg>
              <span>Wkrótce</span>
            </span>
        ))}
      </div>
    </div>
  );
}

function ProductModel({ media }: { media: Extract<CatalogueMedia, { kind: "model" }> }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ModelStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const modelMount = mount;

    let disposed = false;
    let viewer: ModelViewerElement | undefined;
    const loaded = () => { if (!disposed) setStatus("ready"); };
    const failed = () => { if (!disposed) setStatus("error"); };

    async function load() {
      try {
        await import("@google/model-viewer");
        if (disposed) return;

        viewer = document.createElement("model-viewer") as ModelViewerElement;
        viewer.setAttribute("src", media.url);
        viewer.setAttribute("alt", media.alt);
        viewer.cameraControls = true;
        viewer.disablePan = true;
        viewer.disableZoom = true;
        viewer.interactionPrompt = "none";
        viewer.touchAction = "pan-y";
        if (media.posterUrl) viewer.setAttribute("poster", media.posterUrl);
        viewer.setAttribute("loading", "eager");
        viewer.setAttribute("shadow-intensity", "0.35");
        viewer.addEventListener("load", loaded);
        viewer.addEventListener("error", failed);
        modelMount.append(viewer);
      } catch {
        failed();
      }
    }

    setStatus("loading");
    void load();

    return () => {
      disposed = true;
      viewer?.removeEventListener("load", loaded);
      viewer?.removeEventListener("error", failed);
      viewer?.remove();
    };
  }, [attempt, media]);

  return (
    <div className="product-model">
      <div ref={mountRef} className="product-model-canvas" aria-hidden={status !== "ready"} />
      {status !== "ready" ? (
        <div className="product-model-status" role="status">
          <p>{status === "loading" ? "Ładujemy model 3D…" : "Nie udało się wczytać modelu 3D."}</p>
          {status === "error" ? (
            <button type="button" className="footer-link" onClick={() => setAttempt((value) => value + 1)}>
              Spróbuj ponownie
            </button>
          ) : null}
        </div>
      ) : (
        <p className="product-model-hint">Przeciągnij model, aby obejrzeć go z każdej strony.</p>
      )}
    </div>
  );
}
