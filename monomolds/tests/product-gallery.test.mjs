import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProductGallery } from "../components/catalogue/product-gallery.tsx";

const model = { kind: "model", id: "model", url: "/monkey.glb", alt: "Model małpki", posterUrl: null };
const render = (media) => renderToStaticMarkup(createElement(ProductGallery, { media, productName: "Forma" }));

test("model-only products show three photo placeholders and a working model control", () => {
  const html = render([model]);
  assert.equal((html.match(/product-gallery-thumbnail--placeholder/g) ?? []).length, 3);
  assert.match(html, /aria-label="Pokaż model 3D"/);
  assert.match(html, /aria-pressed="true"/);
});

test("products with no media still show the planned photo slots", () => {
  const html = render([]);
  assert.equal((html.match(/product-gallery-thumbnail--placeholder/g) ?? []).length, 3);
  assert.match(html, /Zdjęcie w przygotowaniu/);
});
