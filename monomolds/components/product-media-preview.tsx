"use client";

import { useId, useState } from "react";

const views = [
  { id: "mold", label: "Forma", title: "Tu pokażemy formę", description: "Miejsce na zdjęcie produktu z widoczną fakturą i detalami silikonu." },
  { id: "result", label: "Efekt", title: "Tu pokażemy gotowy deser", description: "Miejsce na zdjęcie wypieku wykonanego w tej samej formie." },
  { id: "model", label: "3D", title: "Miejsce na model 3D", description: "Po dodaniu pliku GLB będzie można obejrzeć formę z każdej strony. Podgląd 3D nie jest jeszcze podłączony." },
] as const;

// Presentation only. Connect product assets and the on-demand GLB viewer
// once real media and the product data contract are supplied.
export function ProductMediaPreview() {
  const [selected, setSelected] = useState<(typeof views)[number]["id"]>("mold");
  const [keyboardSelection, setKeyboardSelection] = useState(false);
  const id = useId();
  const view = views.find((item) => item.id === selected)!;

  return (
    <div className="product-media-preview">
      <div className="media-toolbar">
        <span className="eyebrow">Podgląd produktu</span>
        <div className="media-controls" role="group" aria-label="Wybierz widok produktu" data-keyboard={keyboardSelection || undefined}>
          <span className="media-selection-indicator" aria-hidden="true"
            style={{ transform: `translateX(${views.findIndex((item) => item.id === selected) * 100}%)` }} />
          {views.map((item) => (
            <button key={item.id} type="button" aria-pressed={selected === item.id}
              aria-controls={id} onClick={(event) => {
                setKeyboardSelection(event.detail === 0);
                setSelected(item.id);
              }}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div id={id} className="media-placeholder" role="region" aria-label="Wybrany widok produktu" aria-live="polite">
        <svg aria-hidden="true" viewBox="0 0 96 96" className="media-placeholder-icon" fill="none" stroke="currentColor" strokeWidth="1.2">
          {selected === "model" ? <><path d="m48 12 32 18v36L48 84 16 66V30Z"/><path d="m16 30 32 18 32-18M48 48v36M48 12v36"/></> :
            <><rect x="14" y="20" width="68" height="56" rx="8"/><circle cx="35" cy="39" r="6"/><path d="m15 65 23-17 15 11 12-9 17 15"/></>}
        </svg>
        <p className="media-placeholder-title">{view.title}</p>
        <p className="media-placeholder-description">{view.description}</p>
        <span className="media-preview-label">Makieta - oczekujemy na materiały</span>
      </div>
      <p className="media-caption">Jedna forma. Zdjęcie, efekt i przestrzeń na więcej detali.</p>
    </div>
  );
}
