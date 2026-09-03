import { LinkButton } from "@/components/ui/button";
import { HeroMonkey } from "@/components/hero-monkey";

export default function HomePage() {
  return (
    <div className="site-container">
      {/* Explain the offer, link to the shop and show the 3D model. */}
      {/* Hero: explain the offer, link to Formy, and show the optional 3D model. */}
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-intro">
          <p className="eyebrow">Ręcznie wykonywane w Polsce</p>
          <h1 id="home-title">
            MonoMolds - więcej niż formy.
          </h1>
          <p className="home-description">
            Silikonowe formy do deserów - wykonywane z dbałością o każdy detal.
          </p>
          <LinkButton href="/sklep" className="mt-7">
            Poznaj nasze formy
            <span aria-hidden="true" className="ui-arrow">→</span>
          </LinkButton>
        </div>
        <HeroMonkey />
      </section>

      {/* These spaces will hold real photos when the catalogue is ready. */}
      {/* Reserved product spaces will receive real catalogue media later. */}
      <section id="poznaj-formy" className="home-products" aria-labelledby="products-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Od formy do deseru</p>
            <h2 id="products-title">Przyjrzyj się detalom.</h2>
          </div>
          <p>Przygotowujemy zdjęcia naszej kolekcji. Wkrótce zobaczysz tutaj formy i wykonane w nich desery.</p>
        </div>
        <div className="product-preview-grid">
          <article className="collection-placeholder">
            <div className="collection-placeholder-media"><span>Zdjęcie formy</span></div>
            <h3>Formy silikonowe</h3>
            <p>Miejsce na produkt, jego nazwę, wymiary i cenę.</p>
          </article>
          <article className="collection-placeholder">
            <div className="collection-placeholder-media"><span>Zdjęcie zestawu</span></div>
            <h3>Zestawy form</h3>
            <p>Miejsce na zdjęcie zestawu i opis jego zawartości.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
